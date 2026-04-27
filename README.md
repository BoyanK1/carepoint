# CarePoint

CarePoint is a full-stack medical appointment platform built with Next.js, TypeScript, NextAuth, and Supabase.

It supports three core roles:
- patients who browse doctors, book appointments, track history, and receive notifications
- doctors who manage their schedule, view appointments, and monitor activity
- admins who review doctor applications and perform protected actions with MFA

## Main features

- doctor discovery by name, specialty, and city
- appointment booking with slot validation
- doctor-managed schedules
- appointment history, notifications, favorites, reviews, and feedback
- admin approval flow for doctors
- MFA for admin-sensitive actions
- encrypted sensitive appointment text fields
- Supabase-backed PostgreSQL database and storage

## Tech stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- NextAuth
- Supabase (Postgres, Auth, Storage)
- Tailwind CSS
- Resend
- Vercel

## Requirements

Before you run the project, make sure you have:

- Node.js 20+
- npm
- a Supabase project
- a Resend API key if you want emails to work

## Getting the project

Clone the repository and install dependencies:

```bash
git clone https://github.com/BoyanK1/carepoint.git
cd carepoint
npm install
```
## Accounts
Admin Account - fenabg47@gmail.com
Password - Bobo2009

Doctor Account - demo.presentation.doctor@demo.carepoint.bg
Password - CarePointDoctor123!
## Environment variables

Copy the example file and fill in your own values:

```bash
cp .env.example .env.local
```

Required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
APPOINTMENT_ENCRYPTION_KEY=

GITHUB_ID=
GITHUB_SECRET=

RESEND_API_KEY=
FEEDBACK_TO_EMAIL=
REMINDER_CRON_SECRET=
```

Notes:

- `NEXTAUTH_URL` should be `http://localhost:3000` for local work.
- In production, set `NEXTAUTH_URL` to your real Vercel domain.
- If `APPOINTMENT_ENCRYPTION_KEY` is not set, the app falls back to `NEXTAUTH_SECRET` for sensitive-field encryption.
- `SUPABASE_SERVICE_ROLE_KEY` is required for admin/server features.


```bash
npm run dev
```

### Production-like local run

```bash
npm install
npm run build
npm start
```

## What was verified locally

The project was checked with:

```bash
npm run lint
npx tsc --noEmit
npm run build
```


## Admin and MFA

- Admin panel: `/admin`
- MFA page: `/mfa`

To promote a user to admin manually:

```sql
update user_profiles
set role = 'admin'
where id = '<auth_user_uuid>';
```
