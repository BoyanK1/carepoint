# Access Control and MFA Policy

## 1. Access model
- Roles used in CarePoint:
  - `patient`
  - `doctor_pending`
  - `doctor`
  - `admin`

## 2. Authorization principles
- Default deny: access is denied unless explicitly allowed.
- Least privilege: each role gets only required permissions.
- Server-side enforcement: protected routes/actions verify session and role on backend.

## 3. Admin protections
- Admin-only actions (e.g., approve/reject doctor applications) require:
  - authenticated session
  - admin role
  - valid MFA verification token

## 4. Data-layer controls
- Supabase Row-Level Security (RLS) is enabled for core tables.
- Policies enforce owner/admin visibility and updates.

## 5. Auditability
- Admin decisions are recorded in `admin_audit_logs` with timestamps and actor IDs.
