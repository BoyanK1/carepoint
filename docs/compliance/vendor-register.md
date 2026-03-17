# Vendor / Processor Register

## 1) Supabase
- Role: Processor
- Purpose: Authentication, PostgreSQL database, storage
- Data categories: auth identifiers, profile data, appointments, files metadata
- Security notes: RLS policies, access keys, project-level auth settings
- DPA/terms: maintain provider terms and DPA reference in project records

## 2) Vercel
- Role: Processor
- Purpose: Hosting and deployment runtime
- Data categories: application runtime logs/metadata, request metadata
- Security notes: HTTPS termination, environment variable management
- DPA/terms: maintain provider terms and DPA reference in project records

## 3) Resend
- Role: Processor
- Purpose: transactional emails (MFA, feedback/notification mail)
- Data categories: recipient email, message metadata/content
- Security notes: API key protection, sender domain controls
- DPA/terms: maintain provider terms and DPA reference in project records

## Processor governance checklist
- [ ] Valid contract/terms reviewed
- [ ] Data categories mapped
- [ ] Security controls reviewed
- [ ] Access credentials scoped and rotated
