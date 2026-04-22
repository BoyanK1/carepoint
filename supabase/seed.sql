-- CarePoint demo seed data (DEV / DEMO ONLY)
-- Run AFTER supabase/schema.sql.
-- This seed creates deterministic Bulgarian demo doctors and does not reuse
-- real user accounts as presentation personas.

begin;

create extension if not exists pgcrypto;

-- Always keep the owner account out of demo personas.
-- If this account exists, restore the display name that should be used in the app.
with owner_account as (
  select id, email
  from auth.users
  where lower(email) = 'fenabg47@gmail.com'
)
insert into public.user_profiles (id, full_name, email, email_hash, role, city)
select
  id,
  'Bobo K',
  null,
  md5(lower(trim(email))),
  'admin',
  null
from owner_account
on conflict (id) do update
set
  full_name = 'Bobo K',
  email = null,
  email_hash = excluded.email_hash;

-- 1) Demo auth users. They only exist so doctor/patient profile rows satisfy
-- auth.users foreign keys; they are separate from real presentation accounts.
with demo_users as (
  select *
  from (
    values
      ('10000000-0000-0000-0000-000000000001'::uuid, 'demo.doctor.01@demo.carepoint.bg', 'Д-р Мария Иванова',       'doctor',  'София'),
      ('10000000-0000-0000-0000-000000000002'::uuid, 'demo.doctor.02@demo.carepoint.bg', 'Д-р Георги Петров',       'doctor',  'Пловдив'),
      ('10000000-0000-0000-0000-000000000003'::uuid, 'demo.doctor.03@demo.carepoint.bg', 'Д-р Елена Димитрова',     'doctor',  'Варна'),
      ('10000000-0000-0000-0000-000000000004'::uuid, 'demo.doctor.04@demo.carepoint.bg', 'Д-р Николай Стоянов',     'doctor',  'Бургас'),
      ('10000000-0000-0000-0000-000000000005'::uuid, 'demo.doctor.05@demo.carepoint.bg', 'Д-р Анна Георгиева',      'doctor',  'Русе'),
      ('10000000-0000-0000-0000-000000000006'::uuid, 'demo.doctor.06@demo.carepoint.bg', 'Д-р Петър Николов',       'doctor',  'Стара Загора'),
      ('10000000-0000-0000-0000-000000000007'::uuid, 'demo.doctor.07@demo.carepoint.bg', 'Д-р Виктория Тодорова',   'doctor',  'Плевен'),
      ('10000000-0000-0000-0000-000000000008'::uuid, 'demo.doctor.08@demo.carepoint.bg', 'Д-р Даниел Василев',      'doctor',  'Велико Търново'),
      ('10000000-0000-0000-0000-000000000009'::uuid, 'demo.doctor.09@demo.carepoint.bg', 'Д-р Симона Христова',     'doctor',  'Благоевград'),
      ('10000000-0000-0000-0000-000000000010'::uuid, 'demo.doctor.10@demo.carepoint.bg', 'Д-р Иван Колев',          'doctor',  'Шумен'),
      ('10000000-0000-0000-0000-000000000011'::uuid, 'demo.doctor.11@demo.carepoint.bg', 'Д-р Радостина Ангелова',  'doctor',  'Добрич'),
      ('10000000-0000-0000-0000-000000000012'::uuid, 'demo.doctor.12@demo.carepoint.bg', 'Д-р Калин Михайлов',      'doctor',  'Хасково'),
      ('10000000-0000-0000-0000-000000000013'::uuid, 'demo.doctor.13@demo.carepoint.bg', 'Д-р Теодора Илиева',      'doctor',  'Перник'),
      ('10000000-0000-0000-0000-000000000014'::uuid, 'demo.doctor.14@demo.carepoint.bg', 'Д-р Борислав Павлов',     'doctor',  'Сливен'),
      ('10000000-0000-0000-0000-000000000015'::uuid, 'demo.doctor.15@demo.carepoint.bg', 'Д-р Габриела Маринова',   'doctor',  'Ямбол'),
      ('10000000-0000-0000-0000-000000000016'::uuid, 'demo.doctor.16@demo.carepoint.bg', 'Д-р Красимир Дончев',     'doctor',  'Пазарджик'),
      ('10000000-0000-0000-0000-000000000017'::uuid, 'demo.doctor.17@demo.carepoint.bg', 'Д-р Десислава Попова',    'doctor',  'Враца'),
      ('10000000-0000-0000-0000-000000000018'::uuid, 'demo.doctor.18@demo.carepoint.bg', 'Д-р Мартин Александров',  'doctor',  'Габрово'),
      ('10000000-0000-0000-0000-000000000019'::uuid, 'demo.doctor.19@demo.carepoint.bg', 'Д-р Яна Борисова',        'doctor',  'Казанлък'),
      ('10000000-0000-0000-0000-000000000020'::uuid, 'demo.doctor.20@demo.carepoint.bg', 'Д-р Стефан Захариев',     'doctor',  'Кърджали'),
      ('30000000-0000-0000-0000-000000000001'::uuid, 'demo.patient.01@demo.carepoint.bg', 'Мила Стоянова',          'patient', 'София'),
      ('30000000-0000-0000-0000-000000000002'::uuid, 'demo.patient.02@demo.carepoint.bg', 'Николай Тодоров',        'patient', 'Пловдив'),
      ('30000000-0000-0000-0000-000000000003'::uuid, 'demo.patient.03@demo.carepoint.bg', 'Десислава Колева',       'patient', 'Варна'),
      ('30000000-0000-0000-0000-000000000004'::uuid, 'demo.patient.04@demo.carepoint.bg', 'Кристиян Василев',       'patient', 'Бургас')
  ) as t(id, email, full_name, role, city)
)
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
select
  id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  email,
  crypt('CarePointDemo123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', full_name),
  now(),
  now()
from demo_users
on conflict (id) do update
set
  email = excluded.email,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

-- 2) Presentation profiles.
with demo_users as (
  select *
  from (
    values
      ('10000000-0000-0000-0000-000000000001'::uuid, 'demo.doctor.01@demo.carepoint.bg', 'Д-р Мария Иванова',       'doctor',  'София'),
      ('10000000-0000-0000-0000-000000000002'::uuid, 'demo.doctor.02@demo.carepoint.bg', 'Д-р Георги Петров',       'doctor',  'Пловдив'),
      ('10000000-0000-0000-0000-000000000003'::uuid, 'demo.doctor.03@demo.carepoint.bg', 'Д-р Елена Димитрова',     'doctor',  'Варна'),
      ('10000000-0000-0000-0000-000000000004'::uuid, 'demo.doctor.04@demo.carepoint.bg', 'Д-р Николай Стоянов',     'doctor',  'Бургас'),
      ('10000000-0000-0000-0000-000000000005'::uuid, 'demo.doctor.05@demo.carepoint.bg', 'Д-р Анна Георгиева',      'doctor',  'Русе'),
      ('10000000-0000-0000-0000-000000000006'::uuid, 'demo.doctor.06@demo.carepoint.bg', 'Д-р Петър Николов',       'doctor',  'Стара Загора'),
      ('10000000-0000-0000-0000-000000000007'::uuid, 'demo.doctor.07@demo.carepoint.bg', 'Д-р Виктория Тодорова',   'doctor',  'Плевен'),
      ('10000000-0000-0000-0000-000000000008'::uuid, 'demo.doctor.08@demo.carepoint.bg', 'Д-р Даниел Василев',      'doctor',  'Велико Търново'),
      ('10000000-0000-0000-0000-000000000009'::uuid, 'demo.doctor.09@demo.carepoint.bg', 'Д-р Симона Христова',     'doctor',  'Благоевград'),
      ('10000000-0000-0000-0000-000000000010'::uuid, 'demo.doctor.10@demo.carepoint.bg', 'Д-р Иван Колев',          'doctor',  'Шумен'),
      ('10000000-0000-0000-0000-000000000011'::uuid, 'demo.doctor.11@demo.carepoint.bg', 'Д-р Радостина Ангелова',  'doctor',  'Добрич'),
      ('10000000-0000-0000-0000-000000000012'::uuid, 'demo.doctor.12@demo.carepoint.bg', 'Д-р Калин Михайлов',      'doctor',  'Хасково'),
      ('10000000-0000-0000-0000-000000000013'::uuid, 'demo.doctor.13@demo.carepoint.bg', 'Д-р Теодора Илиева',      'doctor',  'Перник'),
      ('10000000-0000-0000-0000-000000000014'::uuid, 'demo.doctor.14@demo.carepoint.bg', 'Д-р Борислав Павлов',     'doctor',  'Сливен'),
      ('10000000-0000-0000-0000-000000000015'::uuid, 'demo.doctor.15@demo.carepoint.bg', 'Д-р Габриела Маринова',   'doctor',  'Ямбол'),
      ('10000000-0000-0000-0000-000000000016'::uuid, 'demo.doctor.16@demo.carepoint.bg', 'Д-р Красимир Дончев',     'doctor',  'Пазарджик'),
      ('10000000-0000-0000-0000-000000000017'::uuid, 'demo.doctor.17@demo.carepoint.bg', 'Д-р Десислава Попова',    'doctor',  'Враца'),
      ('10000000-0000-0000-0000-000000000018'::uuid, 'demo.doctor.18@demo.carepoint.bg', 'Д-р Мартин Александров',  'doctor',  'Габрово'),
      ('10000000-0000-0000-0000-000000000019'::uuid, 'demo.doctor.19@demo.carepoint.bg', 'Д-р Яна Борисова',        'doctor',  'Казанлък'),
      ('10000000-0000-0000-0000-000000000020'::uuid, 'demo.doctor.20@demo.carepoint.bg', 'Д-р Стефан Захариев',     'doctor',  'Кърджали'),
      ('30000000-0000-0000-0000-000000000001'::uuid, 'demo.patient.01@demo.carepoint.bg', 'Мила Стоянова',          'patient', 'София'),
      ('30000000-0000-0000-0000-000000000002'::uuid, 'demo.patient.02@demo.carepoint.bg', 'Николай Тодоров',        'patient', 'Пловдив'),
      ('30000000-0000-0000-0000-000000000003'::uuid, 'demo.patient.03@demo.carepoint.bg', 'Десислава Колева',       'patient', 'Варна'),
      ('30000000-0000-0000-0000-000000000004'::uuid, 'demo.patient.04@demo.carepoint.bg', 'Кристиян Василев',       'patient', 'Бургас')
  ) as t(id, email, full_name, role, city)
)
insert into public.user_profiles (id, full_name, email, email_hash, role, city)
select
  id,
  full_name,
  null,
  md5(lower(trim(email))),
  role,
  city
from demo_users
on conflict (id) do update
set
  full_name = excluded.full_name,
  email = null,
  email_hash = excluded.email_hash,
  role = excluded.role,
  city = excluded.city;

-- Re-apply owner protection after all demo profile work.
with owner_account as (
  select id, email
  from auth.users
  where lower(email) = 'fenabg47@gmail.com'
)
update public.user_profiles up
set
  full_name = 'Bobo K',
  email = null,
  email_hash = md5(lower(trim(owner_account.email)))
from owner_account
where up.id = owner_account.id;

-- 3) Twenty Bulgarian doctors with different specialties and cities.
with doctors as (
  select *
  from (
    values
      ('20000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Кардиолог',             'София'),
      ('20000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, 'Дерматолог',           'Пловдив'),
      ('20000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, 'Невролог',             'Варна'),
      ('20000000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000004'::uuid, 'Ортопед',              'Бургас'),
      ('20000000-0000-0000-0000-000000000005'::uuid, '10000000-0000-0000-0000-000000000005'::uuid, 'Педиатър',             'Русе'),
      ('20000000-0000-0000-0000-000000000006'::uuid, '10000000-0000-0000-0000-000000000006'::uuid, 'УНГ специалист',       'Стара Загора'),
      ('20000000-0000-0000-0000-000000000007'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, 'Офталмолог',           'Плевен'),
      ('20000000-0000-0000-0000-000000000008'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, 'Ендокринолог',         'Велико Търново'),
      ('20000000-0000-0000-0000-000000000009'::uuid, '10000000-0000-0000-0000-000000000009'::uuid, 'Гастроентеролог',      'Благоевград'),
      ('20000000-0000-0000-0000-000000000010'::uuid, '10000000-0000-0000-0000-000000000010'::uuid, 'Уролог',               'Шумен'),
      ('20000000-0000-0000-0000-000000000011'::uuid, '10000000-0000-0000-0000-000000000011'::uuid, 'Акушер-гинеколог',     'Добрич'),
      ('20000000-0000-0000-0000-000000000012'::uuid, '10000000-0000-0000-0000-000000000012'::uuid, 'Психиатър',            'Хасково'),
      ('20000000-0000-0000-0000-000000000013'::uuid, '10000000-0000-0000-0000-000000000013'::uuid, 'Ревматолог',           'Перник'),
      ('20000000-0000-0000-0000-000000000014'::uuid, '10000000-0000-0000-0000-000000000014'::uuid, 'Пулмолог',             'Сливен'),
      ('20000000-0000-0000-0000-000000000015'::uuid, '10000000-0000-0000-0000-000000000015'::uuid, 'Алерголог',            'Ямбол'),
      ('20000000-0000-0000-0000-000000000016'::uuid, '10000000-0000-0000-0000-000000000016'::uuid, 'Хирург',               'Пазарджик'),
      ('20000000-0000-0000-0000-000000000017'::uuid, '10000000-0000-0000-0000-000000000017'::uuid, 'Нефролог',             'Враца'),
      ('20000000-0000-0000-0000-000000000018'::uuid, '10000000-0000-0000-0000-000000000018'::uuid, 'Инфекционист',         'Габрово'),
      ('20000000-0000-0000-0000-000000000019'::uuid, '10000000-0000-0000-0000-000000000019'::uuid, 'Физиотерапевт',        'Казанлък'),
      ('20000000-0000-0000-0000-000000000020'::uuid, '10000000-0000-0000-0000-000000000020'::uuid, 'Съдов хирург',         'Кърджали')
  ) as t(id, user_id, specialty, city)
)
insert into public.doctor_profiles (id, user_id, specialty, city, verified)
select id, user_id, specialty, city, true
from doctors
on conflict (id) do update
set
  user_id = excluded.user_id,
  specialty = excluded.specialty,
  city = excluded.city,
  verified = true;

-- 4) Availability for all demo doctors.
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
  case when extract(day from dp.created_at)::int % 2 = 0 then time '08:30' else time '09:00' end,
  case when extract(day from dp.created_at)::int % 2 = 0 then time '16:30' else time '17:00' end,
  30,
  true
from public.doctor_profiles dp
cross join (values (1), (2), (3), (4), (5)) as d(day_of_week)
where dp.user_id between '10000000-0000-0000-0000-000000000001'::uuid
                    and '10000000-0000-0000-0000-000000000020'::uuid
on conflict (doctor_profile_id, day_of_week, start_time, end_time) do update
set
  slot_minutes = excluded.slot_minutes,
  is_active = true;

-- 5) A small set of appointments for dashboard/history demos.
with appointment_templates as (
  select *
  from (
    values
      ('20000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000001'::uuid,  2, interval '09:00', 'scheduled', 'Годишен кардиологичен преглед',              'unpaid',   30::numeric, null::interval),
      ('20000000-0000-0000-0000-000000000002'::uuid, '30000000-0000-0000-0000-000000000002'::uuid,  4, interval '11:00', 'confirmed', 'Контролен преглед при кожно раздразнение',    'paid',     25::numeric, interval '3 days'),
      ('20000000-0000-0000-0000-000000000003'::uuid, '30000000-0000-0000-0000-000000000003'::uuid,  7, interval '13:30', 'scheduled', 'Консултация за чести мигрени',                'pending',  35::numeric, null::interval),
      ('20000000-0000-0000-0000-000000000008'::uuid, '30000000-0000-0000-0000-000000000004'::uuid, 10, interval '10:30', 'scheduled', 'Проследяване на щитовидна жлеза',             'unpaid',   30::numeric, null::interval),
      ('20000000-0000-0000-0000-000000000011'::uuid, '30000000-0000-0000-0000-000000000001'::uuid, 14, interval '15:00', 'confirmed', 'Профилактичен гинекологичен преглед',         'paid',     40::numeric, interval '12 days'),
      ('20000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000002'::uuid, -9, interval '10:00', 'completed', 'Проследяване на кръвно налягане',             'paid',     30::numeric, interval '-10 days'),
      ('20000000-0000-0000-0000-000000000002'::uuid, '30000000-0000-0000-0000-000000000003'::uuid,-18, interval '15:30', 'completed', 'Преглед след лечение на акне',                'paid',     25::numeric, interval '-19 days'),
      ('20000000-0000-0000-0000-000000000003'::uuid, '30000000-0000-0000-0000-000000000004'::uuid,-28, interval '12:00', 'cancelled', 'Отменена неврологична консултация',           'refunded', 35::numeric, interval '-29 days')
  ) as t(doctor_profile_id, patient_user_id, day_offset, slot_time, status, reason, payment_status, deposit_amount, paid_offset)
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
  tpl.doctor_profile_id,
  tpl.patient_user_id,
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
where not exists (
  select 1
  from public.appointments a
  where a.doctor_profile_id = tpl.doctor_profile_id
    and a.patient_user_id = tpl.patient_user_id
    and a.starts_at = date_trunc('day', now()) + make_interval(days => tpl.day_offset) + tpl.slot_time
);

-- 6) Bulgarian review snippets so profile pages look populated.
with review_templates as (
  select *
  from (
    values
      ('20000000-0000-0000-0000-000000000001'::uuid, 5, 'Много внимателен преглед и ясно обяснение.'),
      ('20000000-0000-0000-0000-000000000002'::uuid, 5, 'Бърза консултация и професионално отношение.'),
      ('20000000-0000-0000-0000-000000000003'::uuid, 4, 'Получих подробен план за лечение.'),
      ('20000000-0000-0000-0000-000000000004'::uuid, 5, 'Препоръчвам, много спокоен и точен лекар.'),
      ('20000000-0000-0000-0000-000000000005'::uuid, 5, 'Чудесно отношение към деца и родители.'),
      ('20000000-0000-0000-0000-000000000006'::uuid, 4, 'Прегледът беше навреме и много полезен.'),
      ('20000000-0000-0000-0000-000000000007'::uuid, 5, 'Много добра апаратура и ясен съвет.'),
      ('20000000-0000-0000-0000-000000000008'::uuid, 5, 'Обяснява спокойно и отговаря на всички въпроси.'),
      ('20000000-0000-0000-0000-000000000009'::uuid, 4, 'Добро проследяване и практични препоръки.'),
      ('20000000-0000-0000-0000-000000000010'::uuid, 5, 'Дискретен и много професионален подход.'),
      ('20000000-0000-0000-0000-000000000011'::uuid, 5, 'Внимателен преглед и отлично отношение.'),
      ('20000000-0000-0000-0000-000000000012'::uuid, 4, 'Много човешко отношение и полезна консултация.'),
      ('20000000-0000-0000-0000-000000000013'::uuid, 5, 'Назначи правилни изследвания и план.'),
      ('20000000-0000-0000-0000-000000000014'::uuid, 4, 'Прегледът беше подробен и спокоен.'),
      ('20000000-0000-0000-0000-000000000015'::uuid, 5, 'Бързо установи проблема с алергията.'),
      ('20000000-0000-0000-0000-000000000016'::uuid, 5, 'Много уверен и внимателен специалист.'),
      ('20000000-0000-0000-0000-000000000017'::uuid, 4, 'Полезни насоки и добра организация.'),
      ('20000000-0000-0000-0000-000000000018'::uuid, 5, 'Обясни ясно терапията и следващите стъпки.'),
      ('20000000-0000-0000-0000-000000000019'::uuid, 5, 'Много добри упражнения и проследяване.'),
      ('20000000-0000-0000-0000-000000000020'::uuid, 4, 'Професионално отношение и точна диагноза.')
  ) as t(doctor_profile_id, rating, comment)
),
reviewers as (
  select *
  from (
    values
      (1, '30000000-0000-0000-0000-000000000001'::uuid),
      (2, '30000000-0000-0000-0000-000000000002'::uuid),
      (3, '30000000-0000-0000-0000-000000000003'::uuid),
      (4, '30000000-0000-0000-0000-000000000004'::uuid)
  ) as t(rn, reviewer_id)
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
  rt.doctor_profile_id,
  reviewers.reviewer_id,
  rt.rating,
  rt.comment,
  false,
  null
from (
  select
    review_templates.*,
    ((row_number() over (order by doctor_profile_id) - 1) % 4) + 1 as reviewer_rn
  from review_templates
) rt
join reviewers on reviewers.rn = rt.reviewer_rn
on conflict (doctor_profile_id, reviewer_id) do update
set
  rating = excluded.rating,
  comment = excluded.comment,
  verified_visit = excluded.verified_visit,
  verified_appointment_id = excluded.verified_appointment_id;

-- 7) Favorites and notifications for patient demo accounts.
insert into public.favorite_doctors (user_id, doctor_profile_id)
select pu.user_id, d.doctor_profile_id
from (
  values
    ('30000000-0000-0000-0000-000000000001'::uuid),
    ('30000000-0000-0000-0000-000000000002'::uuid)
) as pu(user_id)
cross join (
  values
    ('20000000-0000-0000-0000-000000000001'::uuid),
    ('20000000-0000-0000-0000-000000000002'::uuid),
    ('20000000-0000-0000-0000-000000000003'::uuid)
) as d(doctor_profile_id)
on conflict (user_id, doctor_profile_id) do nothing;

insert into public.notifications (user_id, category, title, message, is_read)
select *
from (
  values
    ('30000000-0000-0000-0000-000000000001'::uuid, 'appointment',        'Готова демо резервация', 'Имате предстоящи, завършени и отменени прегледи за презентацията.', false),
    ('30000000-0000-0000-0000-000000000002'::uuid, 'appointment',        'Потвърден час',          'Вашият дерматологичен преглед е потвърден.', false),
    ('10000000-0000-0000-0000-000000000001'::uuid, 'appointment',        'Нов пациент',            'Имате нова кардиологична консултация в графика.', false),
    ('10000000-0000-0000-0000-000000000003'::uuid, 'doctor-application', 'Профилът е видим',       'Вашият лекарски профил е потвърден и се показва в търсенето.', true)
) as n(user_id, category, title, message, is_read)
where not exists (
  select 1
  from public.notifications existing
  where existing.user_id = n.user_id
    and existing.title = n.title
);

commit;

-- Demo login note:
-- The seeded demo auth rows use password: CarePointDemo123!
-- Your real owner account fenabg47@gmail.com is never used as a demo persona,
-- and its profile name is restored to Bobo K when this script runs.
