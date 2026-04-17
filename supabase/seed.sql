-- CarePoint demo seed data (DEV / DEMO ONLY)
-- Run AFTER supabase/schema.sql
-- This script expects existing auth users and turns the first few into a demo cast.

begin;

-- 1) Build presentation-ready user profiles from the earliest auth users.
with personas as (
  select *
  from (
    values
      (1, 'Mila Petrova', 'patient', 'Plovdiv'),
      (2, 'Dr. Ivan Georgiev', 'doctor', 'Sofia'),
      (3, 'Dr. Elena Dimitrova', 'doctor', 'Varna'),
      (4, 'Dr. Martin Nikolov', 'doctor', 'Burgas'),
      (5, 'Nikolay Todorov', 'patient', 'Sofia'),
      (6, 'Desislava Stoyanova', 'patient', 'Plovdiv')
  ) as t(rn, full_name, role, city)
),
ranked_users as (
  select
    u.id,
    u.email,
    u.raw_user_meta_data,
    row_number() over (order by u.created_at, u.id) as rn
  from auth.users u
)
insert into public.user_profiles (id, full_name, email, email_hash, role, city)
select
  ru.id,
  coalesce(
    p.full_name,
    nullif(trim((ru.raw_user_meta_data ->> 'full_name')), ''),
    initcap(replace(split_part(coalesce(ru.email, ''), '@', 1), '.', ' '))
  ) as full_name,
  null as email,
  md5(lower(trim(coalesce(ru.email, '')))) as email_hash,
  coalesce(p.role, 'patient') as role,
  coalesce(
    p.city,
    case ((ru.rn - 1) % 4)
      when 0 then 'Plovdiv'
      when 1 then 'Sofia'
      when 2 then 'Varna'
      else 'Burgas'
    end
  ) as city
from ranked_users ru
left join personas p on p.rn = ru.rn
on conflict (id) do update
set
  full_name = coalesce(excluded.full_name, public.user_profiles.full_name),
  email = null,
  email_hash = coalesce(excluded.email_hash, public.user_profiles.email_hash),
  role = case
    when public.user_profiles.role = 'admin' then public.user_profiles.role
    else excluded.role
  end,
  city = coalesce(excluded.city, public.user_profiles.city);

-- 2) Ensure doctor profiles exist and look intentional in the demo.
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
  case du.rn
    when 1 then 'Cardiology'
    when 2 then 'Dermatology'
    when 3 then 'Neurology'
    when 4 then 'Orthopedics'
    else 'Pediatrics'
  end as specialty,
  coalesce(du.city, 'Sofia') as city,
  true as verified
from doctor_users du
where not exists (
  select 1
  from public.doctor_profiles dp
  where dp.user_id = du.user_id
);

with doctor_users as (
  select
    up.id as user_id,
    row_number() over (order by up.created_at, up.id) as rn,
    up.city
  from public.user_profiles up
  where up.role = 'doctor'
)
update public.doctor_profiles dp
set
  specialty = case doctor_users.rn
    when 1 then 'Cardiology'
    when 2 then 'Dermatology'
    when 3 then 'Neurology'
    when 4 then 'Orthopedics'
    else 'Pediatrics'
  end,
  city = coalesce(doctor_users.city, dp.city, 'Sofia'),
  verified = true
from doctor_users
where doctor_users.user_id = dp.user_id;

-- 3) Add default Mon-Fri availability for verified doctors.
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

-- 4) Seed a mix of upcoming, completed, and cancelled appointments.
with patient_users as (
  select
    up.id,
    row_number() over (order by up.created_at, up.id) as rn
  from public.user_profiles up
  where up.role in ('patient', 'admin')
),
doctor_rows as (
  select
    dp.id as doctor_profile_id,
    row_number() over (order by dp.created_at, dp.id) as rn
  from public.doctor_profiles dp
  where dp.verified = true
),
appointment_templates as (
  select *
  from (
    values
      (1, 1,  3, interval '09:00', 'scheduled', 'Annual heart health consultation',          'unpaid',   30::numeric, null::interval),
      (2, 2,  5, interval '11:00', 'confirmed', 'Skin irritation follow-up and treatment plan', 'paid',     25::numeric, interval '4 days'),
      (3, 3,  8, interval '13:30', 'scheduled', 'Migraine management review',                'pending',  35::numeric, null::interval),
      (1, 1, -14, interval '10:00', 'completed', 'Post-checkup blood pressure review',       'paid',     30::numeric, interval '-15 days'),
      (2, 2, -21, interval '15:30', 'completed', 'Acne treatment progress review',           'paid',     25::numeric, interval '-22 days'),
      (3, 3, -28, interval '12:00', 'cancelled', 'Cancelled neurology consultation',         'refunded', 35::numeric, interval '-29 days')
  ) as t(doctor_rn, patient_rn, day_offset, slot_time, status, reason, payment_status, deposit_amount, paid_offset)
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
  paid_at,
  canceled_at
)
select
  dr.doctor_profile_id,
  pu.id,
  date_trunc('day', now()) + make_interval(days => tpl.day_offset) + tpl.slot_time,
  date_trunc('day', now()) + make_interval(days => tpl.day_offset) + tpl.slot_time + interval '30 minutes',
  tpl.status,
  tpl.reason,
  tpl.payment_status,
  tpl.deposit_amount,
  case
    when tpl.paid_offset is null then null
    else date_trunc('day', now()) + tpl.paid_offset + interval '09:00'
  end,
  case
    when tpl.status = 'cancelled'
      then date_trunc('day', now()) + make_interval(days => tpl.day_offset - 2) + interval '10:00'
    else null
  end
from appointment_templates tpl
join doctor_rows dr on dr.rn = tpl.doctor_rn
join patient_users pu on pu.rn = tpl.patient_rn
where not exists (
  select 1
  from public.appointments a
  where a.doctor_profile_id = dr.doctor_profile_id
    and a.patient_user_id = pu.id
    and a.starts_at = date_trunc('day', now()) + make_interval(days => tpl.day_offset) + tpl.slot_time
);

-- 5) Seed reviews for the latest completed visit per doctor.
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

-- 6) Seed favorite doctors for the first two patient users.
with patient_users as (
  select
    up.id,
    row_number() over (order by up.created_at, up.id) as rn
  from public.user_profiles up
  where up.role in ('patient', 'admin')
),
top_doctors as (
  select
    dp.id,
    row_number() over (order by dp.created_at, dp.id) as rn
  from public.doctor_profiles dp
  where dp.verified = true
)
insert into public.favorite_doctors (user_id, doctor_profile_id)
select pu.id, td.id
from patient_users pu
join top_doctors td on td.rn <= 2
where pu.rn <= 2
on conflict (user_id, doctor_profile_id) do nothing;

-- 7) Seed a few notifications so the inbox looks populated.
with notification_rows as (
  select *
  from (
    values
      (1, 'appointment',        'Demo booking ready', 'Your dashboard now has upcoming, completed, and cancelled visits ready for the presentation.', false),
      (2, 'appointment',        'New patient booking', 'A new cardiology patient booked a consultation for later this week.', false),
      (3, 'doctor-application', 'Profile verified', 'Your doctor profile is fully verified and visible in search.', true),
      (5, 'appointment',        'Reminder sent', 'You have a confirmed dermatology follow-up coming up soon.', false)
  ) as t(user_rn, category, title, message, is_read)
),
ranked_profiles as (
  select
    up.id,
    row_number() over (order by up.created_at, up.id) as rn
  from public.user_profiles up
)
insert into public.notifications (user_id, category, title, message, is_read)
select rp.id, nr.category, nr.title, nr.message, nr.is_read
from notification_rows nr
join ranked_profiles rp on rp.rn = nr.user_rn
where not exists (
  select 1
  from public.notifications n
  where n.user_id = rp.id
    and n.title = nr.title
);

commit;

-- Notes:
-- - Create at least 6 auth users first for the full demo cast.
-- - The first 6 users become 3 doctors and 3 patients automatically.
-- - Re-running this script keeps the same presentation-friendly records where possible.
