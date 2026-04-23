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

## Supabase setup

### 1. Run the schema

Open the Supabase SQL editor and run:

```sql
-- contents of supabase/schema.sql
```

The full schema file is in:

- `supabase/schema.sql`

### 2. Optional demo data

If you want a presentation-ready database with Bulgarian doctors, patients, appointments, reviews, and notifications, run:

- `supabase/seed.sql`

This file is optional, but it is useful for demos and local presentation, so it is intentionally kept in the repo.

### 3. Create storage buckets

In Supabase Storage create:

- `avatars` as public
- `doctor-licenses` as private
- `appointment-files` as private

### 4. Configure auth

In Supabase Authentication:

- enable Email provider
- add local and production redirect URLs

Suggested redirect URLs:

- `http://localhost:3000/auth`
- `http://localhost:3000`
- your Vercel production domain
- your Vercel preview domains if needed

## Run locally

Start the development server:

```bash
npm run dev
```

Then open:

- `http://localhost:3000`

## Local presentation fallback

If Vercel is unavailable during presentation, you can still run the app locally.

### Fastest fallback

```bash
cd carepoint
npm install
npm run dev
```

Open:

- `http://localhost:3000`

### Production-like local run

```bash
npm install
npm run build
npm start
```

This is useful if you want to present the optimized version locally.

## What was verified locally

The project was checked with:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

The application also boots locally with the existing setup and can be presented from `localhost:3000` if needed.

## Admin and MFA

- Admin panel: `/admin`
- MFA page: `/mfa`

To promote a user to admin manually:

```sql
update user_profiles
set role = 'admin'
where id = '<auth_user_uuid>';
```

## Email behavior

- account confirmation emails are sent through Supabase Auth
- feedback and some app notifications use Resend
- signup confirmation redirects now point back to `/auth?confirmed=1` instead of `localhost` in production

## Reminders cron

Endpoint:

- `POST /api/reminders/run`

Protect it with:

- header `x-cron-secret: <REMINDER_CRON_SECRET>`
  or
- header `Authorization: Bearer <REMINDER_CRON_SECRET>`

If you use Vercel Cron, configure it to call that route periodically.

## Deploy to Vercel

### Option 1: GitHub import

1. Push the repository to GitHub.
2. Import it into Vercel.
3. Add the same environment variables from `.env.local`.
4. Set `NEXTAUTH_URL` to the production domain.
5. Redeploy.

### Option 2: CLI

```bash
npx vercel
npx vercel deploy --prod -y
```

## Troubleshooting

### Confirmation email opens the wrong link

Make sure:

- Supabase redirect URLs are set correctly
- `NEXTAUTH_URL` is the real production URL on Vercel
- the latest deployment includes the signup redirect fix

### Admin actions fail

Check:

- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXTAUTH_SECRET`
- `RESEND_API_KEY`
- MFA flow and email delivery

### App works on Vercel but not locally

Usually this means one of the following:

- `.env.local` is missing required values
- `NEXTAUTH_URL` is not set to `http://localhost:3000`
- Supabase auth redirect URLs do not include localhost

## Project structure

Key locations:

- `src/app` - pages and API routes
- `src/components` - reusable UI
- `src/lib` - auth, security, appointments, Supabase helpers
- `supabase/schema.sql` - database schema
- `supabase/seed.sql` - optional demo data

## License / use

This repository is currently structured as a project repo rather than a published package. If you intend to distribute it publicly, add a proper license file before doing so.
