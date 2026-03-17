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
  add column if not exists rescheduled_from uuid references appointments(id) on delete set null,
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists deposit_amount numeric(10,2) not null default 0,
  add column if not exists payment_provider text,
  add column if not exists payment_reference text,
  add column if not exists paid_at timestamptz,
  add column if not exists external_calendar_event_id text;

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

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_payment_status_check'
  ) then
    alter table appointments
      add constraint appointments_payment_status_check
      check (payment_status in ('unpaid', 'pending', 'paid', 'refunded', 'failed'));
  end if;
end;
$$;

alter table doctor_reviews
  add column if not exists verified_visit boolean not null default false,
  add column if not exists verified_appointment_id uuid references appointments(id) on delete set null;

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

create table if not exists appointment_messages (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(trim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists appointment_files (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  uploader_user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes integer,
  created_at timestamptz not null default now()
);

create table if not exists appointment_reminders (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('24h', '1h')),
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  unique (appointment_id, reminder_type)
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

create index if not exists idx_appointment_messages_lookup
  on appointment_messages(appointment_id, created_at desc);

create index if not exists idx_appointment_files_lookup
  on appointment_files(appointment_id, created_at desc);

create index if not exists idx_appointment_reminders_pending
  on appointment_reminders(status, scheduled_for);

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

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

alter table public.patients enable row level security;
alter table public.doctors enable row level security;
alter table public.appointments enable row level security;
alter table public.user_profiles enable row level security;
alter table public.doctor_applications enable row level security;
alter table public.doctor_profiles enable row level security;
alter table public.doctor_reviews enable row level security;
alter table public.patient_history enable row level security;
alter table public.doctor_availability enable row level security;
alter table public.favorite_doctors enable row level security;
alter table public.notifications enable row level security;
alter table public.appointment_events enable row level security;
alter table public.appointment_messages enable row level security;
alter table public.appointment_files enable row level security;
alter table public.appointment_reminders enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.security_rate_limits enable row level security;

drop policy if exists "patients_admin_only" on public.patients;
create policy "patients_admin_only"
  on public.patients
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "doctors_admin_only" on public.doctors;
create policy "doctors_admin_only"
  on public.doctors
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "appointments_read_own_or_admin" on public.appointments;
create policy "appointments_read_own_or_admin"
  on public.appointments
  for select
  using (
    patient_user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.doctor_profiles dp
      where dp.id = appointments.doctor_profile_id
        and dp.user_id = auth.uid()
    )
  );

drop policy if exists "appointments_insert_own" on public.appointments;
create policy "appointments_insert_own"
  on public.appointments
  for insert
  with check (
    patient_user_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "appointments_update_own_or_admin" on public.appointments;
create policy "appointments_update_own_or_admin"
  on public.appointments
  for update
  using (
    patient_user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.doctor_profiles dp
      where dp.id = appointments.doctor_profile_id
        and dp.user_id = auth.uid()
    )
  )
  with check (
    patient_user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.doctor_profiles dp
      where dp.id = appointments.doctor_profile_id
        and dp.user_id = auth.uid()
    )
  );

drop policy if exists "user_profiles_read_own_or_admin" on public.user_profiles;
create policy "user_profiles_read_own_or_admin"
  on public.user_profiles
  for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "user_profiles_insert_own_or_admin" on public.user_profiles;
create policy "user_profiles_insert_own_or_admin"
  on public.user_profiles
  for insert
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "user_profiles_update_own_or_admin" on public.user_profiles;
create policy "user_profiles_update_own_or_admin"
  on public.user_profiles
  for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "doctor_applications_read_own_or_admin" on public.doctor_applications;
create policy "doctor_applications_read_own_or_admin"
  on public.doctor_applications
  for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "doctor_applications_insert_own_or_admin" on public.doctor_applications;
create policy "doctor_applications_insert_own_or_admin"
  on public.doctor_applications
  for insert
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "doctor_applications_update_admin_only" on public.doctor_applications;
create policy "doctor_applications_update_admin_only"
  on public.doctor_applications
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "doctor_profiles_read_verified_or_owner_or_admin" on public.doctor_profiles;
create policy "doctor_profiles_read_verified_or_owner_or_admin"
  on public.doctor_profiles
  for select
  using (verified = true or user_id = auth.uid() or public.is_admin());

drop policy if exists "doctor_profiles_insert_own_or_admin" on public.doctor_profiles;
create policy "doctor_profiles_insert_own_or_admin"
  on public.doctor_profiles
  for insert
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "doctor_profiles_update_own_or_admin" on public.doctor_profiles;
create policy "doctor_profiles_update_own_or_admin"
  on public.doctor_profiles
  for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "doctor_reviews_read_all" on public.doctor_reviews;
create policy "doctor_reviews_read_all"
  on public.doctor_reviews
  for select
  using (true);

drop policy if exists "doctor_reviews_insert_own" on public.doctor_reviews;
create policy "doctor_reviews_insert_own"
  on public.doctor_reviews
  for insert
  with check (reviewer_id = auth.uid());

drop policy if exists "doctor_reviews_update_own" on public.doctor_reviews;
create policy "doctor_reviews_update_own"
  on public.doctor_reviews
  for update
  using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid());

drop policy if exists "doctor_reviews_delete_own" on public.doctor_reviews;
create policy "doctor_reviews_delete_own"
  on public.doctor_reviews
  for delete
  using (reviewer_id = auth.uid() or public.is_admin());

drop policy if exists "patient_history_admin_only" on public.patient_history;
create policy "patient_history_admin_only"
  on public.patient_history
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "doctor_availability_read_verified_or_owner_or_admin" on public.doctor_availability;
create policy "doctor_availability_read_verified_or_owner_or_admin"
  on public.doctor_availability
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.doctor_profiles dp
      where dp.id = doctor_availability.doctor_profile_id
        and (dp.verified = true or dp.user_id = auth.uid())
    )
  );

drop policy if exists "doctor_availability_manage_owner_or_admin" on public.doctor_availability;
create policy "doctor_availability_manage_owner_or_admin"
  on public.doctor_availability
  for all
  using (
    public.is_admin()
    or exists (
      select 1
      from public.doctor_profiles dp
      where dp.id = doctor_availability.doctor_profile_id
        and dp.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.doctor_profiles dp
      where dp.id = doctor_availability.doctor_profile_id
        and dp.user_id = auth.uid()
    )
  );

drop policy if exists "favorite_doctors_manage_own" on public.favorite_doctors;
create policy "favorite_doctors_manage_own"
  on public.favorite_doctors
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notifications_read_own" on public.notifications;
create policy "notifications_read_own"
  on public.notifications
  for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications
  for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "appointment_events_read_related_or_admin" on public.appointment_events;
create policy "appointment_events_read_related_or_admin"
  on public.appointment_events
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.appointments a
      left join public.doctor_profiles dp on dp.id = a.doctor_profile_id
      where a.id = appointment_events.appointment_id
        and (
          a.patient_user_id = auth.uid()
          or dp.user_id = auth.uid()
        )
    )
  );

drop policy if exists "appointment_events_insert_admin_only" on public.appointment_events;
create policy "appointment_events_insert_admin_only"
  on public.appointment_events
  for insert
  with check (public.is_admin());

drop policy if exists "appointment_messages_read_related_or_admin" on public.appointment_messages;
create policy "appointment_messages_read_related_or_admin"
  on public.appointment_messages
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.appointments a
      left join public.doctor_profiles dp on dp.id = a.doctor_profile_id
      where a.id = appointment_messages.appointment_id
        and (
          a.patient_user_id = auth.uid()
          or dp.user_id = auth.uid()
        )
    )
  );

drop policy if exists "appointment_messages_insert_sender_related" on public.appointment_messages;
create policy "appointment_messages_insert_sender_related"
  on public.appointment_messages
  for insert
  with check (
    sender_user_id = auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1
        from public.appointments a
        left join public.doctor_profiles dp on dp.id = a.doctor_profile_id
        where a.id = appointment_messages.appointment_id
          and (
            a.patient_user_id = auth.uid()
            or dp.user_id = auth.uid()
          )
      )
    )
  );

drop policy if exists "appointment_messages_delete_own_or_admin" on public.appointment_messages;
create policy "appointment_messages_delete_own_or_admin"
  on public.appointment_messages
  for delete
  using (sender_user_id = auth.uid() or public.is_admin());

drop policy if exists "appointment_files_read_related_or_admin" on public.appointment_files;
create policy "appointment_files_read_related_or_admin"
  on public.appointment_files
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.appointments a
      left join public.doctor_profiles dp on dp.id = a.doctor_profile_id
      where a.id = appointment_files.appointment_id
        and (
          a.patient_user_id = auth.uid()
          or dp.user_id = auth.uid()
        )
    )
  );

drop policy if exists "appointment_files_insert_uploader_related" on public.appointment_files;
create policy "appointment_files_insert_uploader_related"
  on public.appointment_files
  for insert
  with check (
    uploader_user_id = auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1
        from public.appointments a
        left join public.doctor_profiles dp on dp.id = a.doctor_profile_id
        where a.id = appointment_files.appointment_id
          and (
            a.patient_user_id = auth.uid()
            or dp.user_id = auth.uid()
          )
      )
    )
  );

drop policy if exists "appointment_files_delete_own_or_admin" on public.appointment_files;
create policy "appointment_files_delete_own_or_admin"
  on public.appointment_files
  for delete
  using (uploader_user_id = auth.uid() or public.is_admin());

drop policy if exists "appointment_reminders_admin_only" on public.appointment_reminders;
create policy "appointment_reminders_admin_only"
  on public.appointment_reminders
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin_audit_logs_admin_only" on public.admin_audit_logs;
create policy "admin_audit_logs_admin_only"
  on public.admin_audit_logs
  for all
  using (public.is_admin())
  with check (public.is_admin());
