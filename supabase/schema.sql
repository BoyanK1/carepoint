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

create table if not exists patient_history (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  recorded_at timestamptz not null default now(),
  notes text
);

-- RLS notes:
-- Enable row level security and add policies that fit your app.
-- Example:
-- alter table patients enable row level security;
-- create policy "Read patients" on patients for select using (auth.role() = 'authenticated');
