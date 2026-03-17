# Security Controls Summary

## Application controls
- NextAuth session checks for protected pages/routes
- Middleware protection for authenticated and MFA-required paths
- Trusted-origin checks on state-changing API routes
- Rate limiting on high-risk endpoints (signup, booking, uploads, MFA)
- Strict input validation and type constraints in API handlers

## Data controls
- Supabase RLS policies across core tables
- Role-based access checks for admin and doctor actions
- Signed URL usage for private files where required
- File signature checks and size limits for uploads

## Transport/session controls
- HTTPS in production (Vercel)
- `httpOnly`, `sameSite`, `secure` cookie settings in production
- Security headers and CSP via middleware

## Monitoring and traceability
- Appointment event logs
- Admin audit logs
- Notification event records
