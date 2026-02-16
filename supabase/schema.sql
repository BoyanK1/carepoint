-- CarePoint schema
-- Enable extensions if needed
-- create extension if not exists "uuid-ossp";

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  email text,
  phone text
);

create table if not exists doctors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  specialty text
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references doctors(id) on delete set null,
  starts_at timestamptz not null,
  status text not null default 'scheduled'
);

create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  full_name text,
  email text,
  role text not null default 'patient',
  city text,
  avatar_url text
);

create table if not exists doctor_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  specialty text,
  city text,
  license_path text,
  license_url text,
  status text not null default 'pending'
);

create table if not exists doctor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  specialty text,
  city text,
  verified boolean not null default false
);

create table if not exists doctor_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  doctor_profile_id uuid not null references doctor_profiles(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text not null check (char_length(trim(comment)) >= 5),
  unique (doctor_profile_id, reviewer_id)
);

create table if not exists patient_history (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  recorded_at timestamptz not null default now(),
  notes text
);

create index if not exists idx_doctor_reviews_doctor_profile_id
  on doctor_reviews(doctor_profile_id);

create index if not exists idx_doctor_reviews_reviewer_id
  on doctor_reviews(reviewer_id);

create table if not exists security_rate_limits (
  key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_security_rate_limits_updated_at
  on security_rate_limits(updated_at);

create or replace function public.check_rate_limit(
  p_key text,
  p_window_seconds integer,
  p_max_requests integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_ts timestamptz := now();
  state_row security_rate_limits%rowtype;
begin
  if p_key is null or length(trim(p_key)) = 0 then
    return false;
  end if;

  if p_window_seconds <= 0 or p_max_requests <= 0 then
    return false;
  end if;

  insert into security_rate_limits as rl (key, window_started_at, request_count, updated_at)
  values (p_key, current_ts, 1, current_ts)
  on conflict (key)
  do update
    set window_started_at =
      case
        when extract(epoch from (current_ts - rl.window_started_at)) >= p_window_seconds
          then current_ts
        else rl.window_started_at
      end,
        request_count =
      case
        when extract(epoch from (current_ts - rl.window_started_at)) >= p_window_seconds
          then 1
        else rl.request_count + 1
      end,
        updated_at = current_ts
  returning * into state_row;

  return state_row.request_count <= p_max_requests;
end;
$$;

revoke all on table security_rate_limits from anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to anon, authenticated;

-- RLS notes:
-- Enable row level security and add policies that fit your app.
-- Example:
-- alter table patients enable row level security;
-- create policy "Read patients" on patients for select using (auth.role() = 'authenticated');
