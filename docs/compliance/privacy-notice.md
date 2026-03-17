# CarePoint Privacy Notice

Last updated: [DATE]

## 1. Who we are
- Controller: CarePoint (student diploma project)
- Contact: fenabg47@gmail.com
- Project purpose: help patients discover doctors, request appointments, and manage appointment history.

## 2. What data we process
- Authentication data: email, auth user id (via Supabase Auth)
- Profile data: full name, city/region, avatar URL, role
- Doctor verification data: specialty, city, uploaded license file path/URL
- Appointment data: doctor/patient relations, date/time, status, reason/notes
- Communication data: appointment chat messages, uploaded appointment files
- Notification and audit data: notification entries, admin action logs
- Feedback data: name (optional), email (optional), message (required)
- Security data: rate-limit counters, technical request metadata for protection

## 3. Why we process data
- Account authentication and session management
- Appointment booking, cancellation, and rescheduling
- Doctor verification workflow
- Admin moderation and auditability
- Notifications and transaction emails
- Platform security (abuse prevention and access control)
- User support and quality improvement via feedback

## 4. Legal bases (GDPR)
- Article 6(1)(b): contract/performance (core booking and account functions)
- Article 6(1)(f): legitimate interests (security, anti-abuse, admin audit)
- Article 6(1)(a): consent (optional feedback/contact follow-up where applicable)

## 5. Data recipients / processors
- Supabase: authentication, database, storage
- Vercel: application hosting/deployment
- Resend: transactional email delivery

## 6. Data retention
See `retention-policy.md` for detailed schedules and deletion rules.

## 7. User rights
Users can request access, rectification, deletion, restriction, portability, and objection via fenabg47@gmail.com. Procedure is defined in `data-rights-procedure.md`.

## 8. Security controls
CarePoint applies role-based access checks, MFA for admin actions, RLS policies, HTTPS in production, and secure cookie settings. See `security-controls.md`.

## 9. Breach handling
Incidents are handled under `incident-response.md`, including assessment, containment, and notifications where required.
