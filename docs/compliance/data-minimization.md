# Data Minimization Register

## Objective
Collect and retain only data required to provide platform functionality and security.

## Field-level minimization decisions
- Passwords: never stored by app code; handled by Supabase Auth.
- Profile email duplication: avoid plaintext duplication in app profile table where possible.
- Feedback: only message is required; name/email remain optional.
- Appointments: reason/notes optional and length-limited.
- Doctor verification: only files needed for credential validation.

## Operational rules
- No collection of unrelated personal attributes.
- No use of personal data for advertising/tracking purposes.
- Introduce new fields only with documented purpose and retention rule.
