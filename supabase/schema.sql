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
  email_hash text,
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

create extension if not exists btree_gist;

alter table appointments
  add column if not exists doctor_profile_id uuid references doctor_profiles(id) on delete set null,
  add column if not exists patient_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists ends_at timestamptz,
  add column if not exists reason text,
  add column if not exists canceled_at timestamptz,
  add column if not exists canceled_by uuid references auth.users(id) on delete set null,
  add column if not exists rescheduled_from uuid references appointments(id) on delete set null;

alter table user_profiles
  add column if not exists email_hash text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_status_check'
  ) then
    alter table appointments
      add constraint appointments_status_check
      check (status in ('scheduled', 'confirmed', 'completed', 'cancelled'));
  end if;
end;
$$;

update appointments
set ends_at = starts_at + interval '30 minutes'
where ends_at is null and starts_at is not null;

alter table appointments
  alter column ends_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_ends_after_start'
  ) then
    alter table appointments
      add constraint appointments_ends_after_start
      check (ends_at > starts_at);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_doctor_slot_excl'
  ) then
    alter table appointments
      add constraint appointments_doctor_slot_excl
      exclude using gist (
        doctor_profile_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      )
      where (doctor_profile_id is not null and status in ('scheduled', 'confirmed'));
  end if;
end;
$$;

create table if not exists doctor_availability (
  id uuid primary key default gen_random_uuid(),
  doctor_profile_id uuid not null references doctor_profiles(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_minutes int not null default 30 check (slot_minutes between 10 and 180),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (doctor_profile_id, day_of_week, start_time, end_time)
);

create table if not exists favorite_doctors (
  user_id uuid not null references auth.users(id) on delete cascade,
  doctor_profile_id uuid not null references doctor_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, doctor_profile_id)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists appointment_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  event_note text,
  created_at timestamptz not null default now()
);

create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  application_id uuid references doctor_applications(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_appointments_patient_user_id
  on appointments(patient_user_id, starts_at desc);

create index if not exists idx_appointments_doctor_profile_id
  on appointments(doctor_profile_id, starts_at);

create index if not exists idx_notifications_user_id
  on notifications(user_id, created_at desc);

create index if not exists idx_admin_audit_logs_created_at
  on admin_audit_logs(created_at desc);

create index if not exists idx_user_profiles_email_hash
  on user_profiles(email_hash);

create index if not exists idx_doctor_availability_lookup
  on doctor_availability(doctor_profile_id, day_of_week, is_active);

insert into doctor_availability (doctor_profile_id, day_of_week, start_time, end_time, slot_minutes)
select dp.id, day_of_week, time '09:00', time '17:00', 30
from doctor_profiles dp
cross join (values (1), (2), (3), (4), (5)) as days(day_of_week)
where dp.verified = true
on conflict (doctor_profile_id, day_of_week, start_time, end_time) do nothing;

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
