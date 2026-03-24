-- CarePoint demo seed data (DEV / DEMO ONLY)
-- Run AFTER supabase/schema.sql
-- This script is idempotent where possible.

begin;

-- 1) Ensure all auth users have a basic profile row.
insert into public.user_profiles (id, full_name, email, email_hash, role, city)
select
  u.id,
  coalesce(
    nullif(trim((u.raw_user_meta_data ->> 'full_name')), ''),
    initcap(replace(split_part(coalesce(u.email, ''), '@', 1), '.', ' '))
  ) as full_name,
  null as email,
  md5(lower(trim(coalesce(u.email, '')))) as email_hash,
  'patient' as role,
  case ((row_number() over (order by u.created_at, u.id) - 1) % 4)
    when 0 then 'Plovdiv'
    when 1 then 'Sofia'
    when 2 then 'Varna'
    else 'Burgas'
  end as city
from auth.users u
on conflict (id) do update
set
  full_name = coalesce(public.user_profiles.full_name, excluded.full_name),
  email = null,
  email_hash = coalesce(public.user_profiles.email_hash, excluded.email_hash),
  city = coalesce(public.user_profiles.city, excluded.city);

-- 2) Promote users #2..#4 to doctor role (if they are not admins).
with ranked_users as (
  select u.id, row_number() over (order by u.created_at, u.id) as rn
  from auth.users u
),
doctor_candidates as (
  select id from ranked_users where rn between 2 and 4
)
update public.user_profiles up
set role = 'doctor'
where up.id in (select id from doctor_candidates)
  and up.role <> 'admin';

-- Keep first user as patient for booking demo (unless admin).
with first_user as (
  select u.id
  from auth.users u
  order by u.created_at, u.id
  limit 1
)
update public.user_profiles up
set role = 'patient'
where up.id in (select id from first_user)
  and up.role <> 'admin';

-- 3) Ensure doctor_profiles exist for doctor users.
with doctor_users as (
  select
    up.id as user_id,
    row_number() over (order by up.created_at, up.id) as rn,
    up.city
  from public.user_profiles up
  where up.role = 'doctor'
)
insert into public.doctor_profiles (user_id, specialty, city, verified)
select
  du.user_id,
  case ((du.rn - 1) % 5)
    when 0 then 'Cardiology'
    when 1 then 'Dermatology'
    when 2 then 'Neurology'
    when 3 then 'Orthopedics'
    else 'Pediatrics'
  end as specialty,
  coalesce(du.city, 'Sofia') as city,
  true as verified
from doctor_users du
where not exists (
  select 1 from public.doctor_profiles dp where dp.user_id = du.user_id
);

-- Ensure existing doctor profiles are verified.
update public.doctor_profiles dp
set verified = true
where dp.verified is distinct from true
  and exists (
    select 1
    from public.user_profiles up
    where up.id = dp.user_id and up.role = 'doctor'
  );

-- 4) Add default Mon-Fri availability for verified doctors.
insert into public.doctor_availability (
  doctor_profile_id,
  day_of_week,
  start_time,
  end_time,
  slot_minutes,
  is_active
)
select
  dp.id,
  d.day_of_week,
  time '09:00',
  time '17:00',
  30,
  true
from public.doctor_profiles dp
cross join (values (1), (2), (3), (4), (5)) as d(day_of_week)
where dp.verified = true
on conflict (doctor_profile_id, day_of_week, start_time, end_time) do update
set
  slot_minutes = excluded.slot_minutes,
  is_active = true;

-- 5) Create demo appointments: one future scheduled + one past completed per doctor.
with patient_user as (
  select up.id
  from public.user_profiles up
  where up.role in ('patient', 'admin')
  order by up.created_at, up.id
  limit 1
),
doctor_rows as (
  select
    dp.id as doctor_profile_id,
    row_number() over (order by dp.created_at, dp.id) as rn
  from public.doctor_profiles dp
  where dp.verified = true
)
insert into public.appointments (
  doctor_profile_id,
  patient_user_id,
  starts_at,
  ends_at,
  status,
  reason,
  payment_status,
  deposit_amount,
  paid_at
)
select
  dr.doctor_profile_id,
  pu.id,
  date_trunc('day', now()) + make_interval(days => dr.rn + 1) + interval '09:00',
  date_trunc('day', now()) + make_interval(days => dr.rn + 1) + interval '09:30',
  'scheduled',
  'Regular check-up',
  'unpaid',
  20,
  null
from doctor_rows dr
cross join patient_user pu
where not exists (
  select 1
  from public.appointments a
  where a.doctor_profile_id = dr.doctor_profile_id
    and a.patient_user_id = pu.id
    and a.starts_at = date_trunc('day', now()) + make_interval(days => dr.rn + 1) + interval '09:00'
);

with patient_user as (
  select up.id
  from public.user_profiles up
  where up.role in ('patient', 'admin')
  order by up.created_at, up.id
  limit 1
),
doctor_rows as (
  select
    dp.id as doctor_profile_id,
    row_number() over (order by dp.created_at, dp.id) as rn
  from public.doctor_profiles dp
  where dp.verified = true
)
insert into public.appointments (
  doctor_profile_id,
  patient_user_id,
  starts_at,
  ends_at,
  status,
  reason,
  payment_status,
  deposit_amount,
  paid_at
)
select
  dr.doctor_profile_id,
  pu.id,
  date_trunc('day', now()) - make_interval(days => dr.rn + 7) + interval '14:00',
  date_trunc('day', now()) - make_interval(days => dr.rn + 7) + interval '14:30',
  'completed',
  'Follow-up visit',
  'paid',
  20,
  date_trunc('day', now()) - make_interval(days => dr.rn + 8) + interval '12:00'
from doctor_rows dr
cross join patient_user pu
where not exists (
  select 1
  from public.appointments a
  where a.doctor_profile_id = dr.doctor_profile_id
    and a.patient_user_id = pu.id
    and a.starts_at = date_trunc('day', now()) - make_interval(days => dr.rn + 7) + interval '14:00'
);

-- 6) Seed reviews for completed visits.
with completed_visits as (
  select
    a.id as appointment_id,
    a.doctor_profile_id,
    a.patient_user_id,
    row_number() over (partition by a.doctor_profile_id order by a.starts_at desc) as rn
  from public.appointments a
  where a.status = 'completed'
    and a.doctor_profile_id is not null
    and a.patient_user_id is not null
),
latest_completed as (
  select * from completed_visits where rn = 1
)
insert into public.doctor_reviews (
  doctor_profile_id,
  reviewer_id,
  rating,
  comment,
  verified_visit,
  verified_appointment_id
)
select
  lc.doctor_profile_id,
  lc.patient_user_id,
  case ((row_number() over (order by lc.doctor_profile_id) - 1) % 3)
    when 0 then 5
    when 1 then 4
    else 5
  end as rating,
  case ((row_number() over (order by lc.doctor_profile_id) - 1) % 3)
    when 0 then 'Very professional and helpful.'
    when 1 then 'Clear explanation and smooth appointment.'
    else 'Great experience, highly recommended.'
  end as comment,
  true,
  lc.appointment_id
from latest_completed lc
on conflict (doctor_profile_id, reviewer_id) do update
set
  rating = excluded.rating,
  comment = excluded.comment,
  verified_visit = true,
  verified_appointment_id = excluded.verified_appointment_id;

-- 7) Seed favorite doctors for demo patient.
with patient_user as (
  select up.id
  from public.user_profiles up
  where up.role in ('patient', 'admin')
  order by up.created_at, up.id
  limit 1
),
top_doctors as (
  select dp.id, row_number() over (order by dp.created_at, dp.id) as rn
  from public.doctor_profiles dp
  where dp.verified = true
)
insert into public.favorite_doctors (user_id, doctor_profile_id)
select pu.id, td.id
from patient_user pu
join top_doctors td on td.rn <= 2
on conflict (user_id, doctor_profile_id) do nothing;

-- 8) Seed a few notifications.
with patient_user as (
  select up.id
  from public.user_profiles up
  where up.role in ('patient', 'admin')
  order by up.created_at, up.id
  limit 1
),
doctor_user as (
  select dp.user_id
  from public.doctor_profiles dp
  where dp.verified = true
  order by dp.created_at, dp.id
  limit 1
)
insert into public.notifications (user_id, category, title, message, is_read)
select pu.id, 'appointment', 'Demo booking ready', 'Your seeded appointments are ready for testing.', false
from patient_user pu
where not exists (
  select 1
  from public.notifications n
  where n.user_id = pu.id
    and n.title = 'Demo booking ready'
)
union all
select du.user_id, 'appointment', 'New demo patient booking', 'A demo patient appointment was seeded for your profile.', false
from doctor_user du
where not exists (
  select 1
  from public.notifications n
  where n.user_id = du.user_id
    and n.title = 'New demo patient booking'
);

commit;

-- Notes:
-- - If you only have one auth user, doctor/patient demo split will be limited.
-- - For best demo, create at least 3 users first:
--   1 patient account + 2 doctor accounts.
