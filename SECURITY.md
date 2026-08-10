# Security policy

## Reporting a vulnerability

Do not open a public issue containing credentials, personal information, or exploit details. Report security concerns privately to the organization responsible for operating this deployment. Include the affected route, impact, reproduction steps, and any relevant request identifier without including real student data.

## Sensitive data

- Never place credentials in site settings, CMS content, browser code, logs, screenshots, or source control.
- Do not collect student documents until an approved retention policy and authorized download path exist.
- Do not send admissions, contact, student, guardian, or private staff records to Gemini.
- Rotate Clerk, Better Auth, Convex, Gemini, email, Turnstile, and shared-service credentials after suspected exposure.

## Production controls

- Clerk staff access must be invite-only with MFA.
- Student authentication and Clerk staff authentication must retain separate issuers and separate credentials.
  Never authorize a staff row by subject alone; verify that the identity was issued by the configured Clerk
  tenant first.
- Keep Better Auth origin checks and database-backed rate limiting enabled. Before open production enrollment,
  configure a verified transactional-email path for password recovery and, where required, email verification.
- Student articles must be owner-scoped while private. Public queries may return only administrator-approved
  content and must exclude email addresses and moderation notes.
- Convex roles must be least-privilege and reviewed regularly.
- Set `INITIAL_ADMIN_CLERK_USER_ID` to the immutable ID of one MFA-protected, invited Clerk account only while claiming the first administrator. The server must derive the caller identity from the verified Clerk session; remove the allowlist immediately after a successful claim.
- Configure Convex backups, usage limits, and exception monitoring.
- Restrict notification egress with `NOTIFICATION_WEBHOOK_ALLOWED_HOSTS`; the delivery endpoint must be a public HTTPS origin with no URL credentials or redirects.
- Review audit logs and failed background jobs.
- Test role boundaries, form abuse controls, upload validation, and AI prompt-injection defenses before each material release.
