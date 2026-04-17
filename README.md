# CarePoint

CarePoint is a Next.js (App Router) + TypeScript app for doctor discovery and appointment management, with:
- NextAuth authentication (GitHub + Supabase email/password)
- Supabase Postgres + Storage + Auth
- MFA for admin actions
- Resend email delivery
- Feedback email template via React Email

## 1) Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 2) Environment variables

Copy `.env.example` to `.env.local` and fill all required values.

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `RESEND_API_KEY`
- `FEEDBACK_TO_EMAIL`

Recommended / feature-specific:
- `SUPABASE_SERVICE_ROLE_KEY` (required for admin/server routes)
- `GITHUB_ID`, `GITHUB_SECRET` (if you keep GitHub OAuth enabled)
- `REMINDER_CRON_SECRET` (protects reminder cron endpoint)

## 3) Supabase setup

1. Create a Supabase project.
2. In SQL editor, run `supabase/schema.sql`.
3. (Optional for demo) run `supabase/seed.sql` to generate demo doctors, appointments, reviews, favorites, and notifications.
3. In Storage, create buckets:
   - `avatars` (public)
   - `doctor-licenses` (private)
   - `appointment-files` (private)
4. In Authentication:
   - Enable Email provider.
   - Configure redirect URLs for local + Vercel domains.

### Demo seed tip
- For the full seeded demo cast, create at least 6 auth users first (3 patient accounts + 3 doctor accounts), then run `supabase/seed.sql`.

## 4) Authentication setup

### Email/password
- Sign-up route: `POST /api/auth/signup` (Supabase Auth `signUp`)
- Sign-in route: NextAuth Credentials provider (Supabase `signInWithPassword`)

### GitHub OAuth (optional if you removed UI button)
1. Create a GitHub OAuth app.
2. Callback URL:
   - `http://localhost:3000/api/auth/callback/github`
3. Add `GITHUB_ID` / `GITHUB_SECRET`.

### NextAuth values
- `NEXTAUTH_URL` local: `http://localhost:3000`
- `NEXTAUTH_SECRET`: generate with:

```bash
openssl rand -base64 32
```

## 5) Admin + MFA

- Admin page: `/admin`
- Admin actions require MFA verification via `/mfa`.
- MFA code emails are sent through Resend.

Promote user to admin (SQL):

```sql
update user_profiles
set role = 'admin'
where id = '<auth_user_uuid>';
```

## 6) Feedback email

- UI page: `/feedback`
- API route: `POST /api/feedback`
- Template: `src/emails/FeedbackEmail.tsx`

## 7) Reminders cron

Endpoint:
- `POST /api/reminders/run`

Auth:
- header `x-cron-secret: <REMINDER_CRON_SECRET>`
  or
- header `Authorization: Bearer <REMINDER_CRON_SECRET>`

Use a Vercel Cron Job (or any scheduler) to call it every 5-15 minutes.

## 8) Data collection protocols (for diploma documentation)

The complete compliance pack is included in:
- `docs/compliance/README.md`
- `docs/compliance/privacy-notice.md`
- `docs/compliance/consent-text.md`
- `docs/compliance/access-control.md`
- `docs/compliance/data-minimization.md`
- `docs/compliance/security-controls.md`
- `docs/compliance/retention-policy.md`
- `docs/compliance/incident-response.md`
- `docs/compliance/data-rights-procedure.md`
- `docs/compliance/vendor-register.md`
- `docs/compliance/gdpr-mapping.md`

If you collect personal data (names, emails, cities, appointment details), these are the minimum protocols to keep documented:

1. Lawful basis + consent:
- Explain why data is collected (appointment management, verification, notifications).
- Show clear consent text for signup/feedback forms.

2. Privacy notice:
- What data is collected.
- Why.
- How long it is stored.
- Who can access it (patient/doctor/admin roles).

3. Access control:
- Enforce least privilege with RLS + role checks.
- Admin-only operations protected with MFA.

4. Data minimization:
- Collect only needed fields.
- Avoid storing plaintext sensitive metadata that is not required.

5. Encryption and secure transport:
- HTTPS everywhere (Vercel provides TLS).
- Use secure, httpOnly cookies for auth/MFA tokens.

6. Retention policy:
- Define when old records/logs are deleted or anonymized.
- Keep audit logs for admin actions.

7. Incident response (basic):
- Define who is informed and what steps are taken if unauthorized access occurs.

8. User rights handling:
- Add process for account/data deletion request in your demo documentation.

For an EU/Bulgaria school project, map these to GDPR principles (lawfulness, purpose limitation, minimization, integrity/confidentiality, storage limitation, accountability).

## 9) Push to GitHub

```bash
git add .
git commit -m "CarePoint features and security updates"
git push origin main
```

## 10) Deploy to Vercel

1. Import repository in Vercel.
2. Add the same environment variables from `.env.local` into Vercel Project Settings.
3. Deploy.
4. After deploy, set `NEXTAUTH_URL` in Vercel to your production URL and redeploy.
