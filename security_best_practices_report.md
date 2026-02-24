# CarePoint Security Review (2026-02-24)

## Executive Summary
The project already had a good baseline (JWT sessions, MFA challenge flow, MIME checks on uploads, CSP/security headers in middleware, and server-side auth checks).  
I found and fixed several high-impact gaps: missing request-origin validation on mutation routes, missing signup throttling/validation, and plaintext email duplication in `user_profiles`.

## Fixed Findings

### [HIGH] F1 - Missing origin validation on mutation endpoints (CSRF hardening gap)
- Evidence:
  - `/Users/boyankoprinkov/care-point/src/lib/security/request-guard.ts:40`
  - Applied checks across sensitive routes:
    - `/Users/boyankoprinkov/care-point/src/app/api/auth/signup/route.ts:29`
    - `/Users/boyankoprinkov/care-point/src/app/api/appointments/route.ts:166`
    - `/Users/boyankoprinkov/care-point/src/app/api/appointments/[id]/route.ts:33`
    - `/Users/boyankoprinkov/care-point/src/app/api/profile/avatar/route.ts:42`
    - `/Users/boyankoprinkov/care-point/src/app/api/doctor/apply/route.ts:23`
    - `/Users/boyankoprinkov/care-point/src/app/api/admin/applications/[id]/approve/route.ts:16`
    - `/Users/boyankoprinkov/care-point/src/app/api/admin/applications/[id]/reject/route.ts:16`
    - `/Users/boyankoprinkov/care-point/src/app/api/doctors/[doctorId]/favorite/route.ts:13`
    - `/Users/boyankoprinkov/care-point/src/app/api/doctors/[doctorId]/reviews/route.ts:101`
- Fix:
  - Added `hasTrustedOrigin(request)` guard and return `403` for invalid origin.

### [HIGH] F2 - Signup abuse/bruteforce/account-creation spam risk
- Evidence:
  - `/Users/boyankoprinkov/care-point/src/app/api/auth/signup/route.ts:38`
- Fix:
  - Added rate limiting (`signup` namespace, 15-minute window).
  - Added email format validation and strong-password policy.

### [MEDIUM] F3 - Plaintext email duplicated in app profile table
- Evidence:
  - Old behavior wrote `email` directly in `user_profiles`.
- Fix:
  - Signup now stores `email_hash` and sets profile `email` to `null`:
    - `/Users/boyankoprinkov/care-point/src/app/api/auth/signup/route.ts:102`
    - `/Users/boyankoprinkov/care-point/src/lib/security/pii.ts:11`
  - Added schema support/index:
    - `/Users/boyankoprinkov/care-point/supabase/schema.sql:34`
    - `/Users/boyankoprinkov/care-point/supabase/schema.sql:89`
    - `/Users/boyankoprinkov/care-point/supabase/schema.sql:207`
  - Email for notifications now pulled from `auth.users` via admin API instead of profile table:
    - `/Users/boyankoprinkov/care-point/src/lib/supabase/auth-users.ts:3`

### [MEDIUM] F4 - Missing throttling on upload/booking heavy operations
- Evidence:
  - `/Users/boyankoprinkov/care-point/src/app/api/profile/avatar/route.ts:51`
  - `/Users/boyankoprinkov/care-point/src/app/api/appointments/route.ts:177`
  - `/Users/boyankoprinkov/care-point/src/app/api/appointments/[id]/route.ts:44`
  - `/Users/boyankoprinkov/care-point/src/app/api/doctor/apply/route.ts:32`
- Fix:
  - Added rate-limit calls to reduce abuse/spam and protect resources.

## Password Hashing Clarification
- Password hashing is already handled by Supabase Auth internals (salted hashing on auth side), and the app does not store raw passwords:
  - `/Users/boyankoprinkov/care-point/src/app/api/auth/signup/route.ts:85`
  - `/Users/boyankoprinkov/care-point/src/lib/auth.ts:28`

## Residual Risks / Next Steps
1. Existing historical rows in `user_profiles.email` are not automatically scrubbed by this patch; only new/updated flows avoid plaintext duplication.
2. This app uses Supabase service-role in server routes. Keep these routes tightly authenticated/authorized (already done), and avoid exposing service keys client-side.
3. Ensure Supabase RLS policies are enabled and strict for all public tables (especially storage buckets and profile tables).
