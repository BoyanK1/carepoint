# CarePoint

CarePoint is a Next.js (App Router) app with NextAuth, Supabase, and Resend for feedback email.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Environment variables

Create `.env.local` using `.env.example` as a template.

## Supabase setup

1. Create a Supabase project and copy the project URL + anon key.
2. Paste them into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. In the SQL editor, run `supabase/schema.sql` to create tables.
4. Create two storage buckets:
   - `avatars` (public)
   - `doctor-licenses` (private recommended)
5. Optional: add RLS policies (see `supabase/schema.sql` notes).

## NextAuth setup

1. Create a GitHub OAuth app and set the callback URL to:
   - `http://localhost:3000/api/auth/callback/github`
2. Add `GITHUB_ID` and `GITHUB_SECRET` to `.env.local`.
3. Set `NEXTAUTH_URL` and `NEXTAUTH_SECRET`.
   - Generate a secret with `openssl rand -base64 32`.

## Supabase email/password auth

- Sign-up uses `/api/auth/signup` which calls Supabase Auth `signUp`.
- Sign-in uses NextAuth Credentials provider and Supabase `signInWithPassword`.

## Admin panel and doctor verification

- Admins review doctor applications at `/admin`.
- Doctor applicants upload a license at `/doctor/apply`.
- Admin role is stored in `user_profiles.role` (`patient`, `doctor_pending`, `doctor`, or `admin`).
  - You can promote a user to admin with:
    `update user_profiles set role = 'admin' where email = '<email>';`
- If `doctor-licenses` is private, the admin panel uses signed URLs for license access.

## MFA (email code)

- Admin routes require a one-time email code at `/mfa`.
- Codes are sent with Resend.

## Resend feedback email

1. Create a Resend API key and add `RESEND_API_KEY` to `.env.local`.
2. Set `FEEDBACK_TO_EMAIL` to the inbox that should receive feedback.
3. Optional: update the `from` address in `src/app/api/feedback/route.ts` once your domain is verified.

## Push to GitHub

```bash
git status
git add .
git commit -m "Initial CarePoint app"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

That’s it. If you want, I can now hook doctor search + appointments to real DB data.
