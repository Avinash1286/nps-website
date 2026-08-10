# Convex backend

This directory contains the production data model and server functions for the public website, staff CMS, forms, media, scheduled work, and the school assistant.

## First deployment

1. Create or select a Convex project, then run `npx convex dev` from the repository root. This deploys the schema, auth configuration, functions, and cron definitions. It also replaces the checked-in generated-compatible files in `convex/_generated` with deployment-specific canonical bindings.
2. In Clerk, create a JWT template named `convex`. Set `CLERK_JWT_ISSUER_DOMAIN` in both Convex development and production deployments to the corresponding Clerk issuer URL.
3. Set deployment secrets with `npx convex env set NAME value`:
   - `INITIAL_ADMIN_CLERK_USER_ID`: immutable `user_...` ID of the single Clerk account allowed to claim the first administrator role. Configure it separately for each deployment and remove it immediately after activation.
   - `SITE_URL`: exact Next.js origin used by the student authentication proxy, such as `http://localhost:3000`
     for development or the canonical HTTPS origin in production.
   - `BETTER_AUTH_SECRET`: an independent cryptographically random secret of at least 32 bytes for student
     password/session authentication. Never expose it through browser environment variables.
   - `SEED_SECRET`: backend-only baseline seed secret.
   - `ASSISTANT_SERVICE_SECRET`: a random secret of at least 32 characters shared only by the Next.js assistant route and Convex action; never expose it to browsers. The route signs a canonical request payload with HMAC-SHA256 rather than sending this secret as a function argument.
   - `FORM_SERVICE_SECRET`: a separate, random secret of at least 32 characters shared only by the Next.js form routes and Convex form actions. Never expose it to browsers.
   - `GEMINI_API_KEY`: Google Gemini API key. The assistant uses the Convex Agent component with Gemini and stores bounded, durable conversation threads in Convex so retries can continue from the exact saved user message.
   - Optional `GEMINI_MODEL`: a valid `gemini-*` model ID; defaults to `gemini-3.6-flash`.
   - `NOTIFICATION_WEBHOOK_URL` and `NOTIFICATION_WEBHOOK_SECRET`: idempotent email/notification delivery endpoint and a random bearer secret of at least 32 characters. The URL must be a public HTTPS endpoint without embedded credentials.
   - Optional `NOTIFICATION_WEBHOOK_ALLOWED_HOSTS`: comma-separated exact hostnames allowed for webhook egress. Set this in production for an additional SSRF boundary.
   - Optional retention controls: `AUDIT_RETENTION_DAYS` (default 730), `WORKFLOW_RETENTION_DAYS` (default 1095), `ADMISSION_RETENTION_DAYS` (default 2555), `NEWSLETTER_SUPPRESSION_RETENTION_DAYS` (default 1095), and `JOB_RETENTION_DAYS` (default 90).
4. Copy the intended administrator's immutable user ID from the matching Clerk environment and set `INITIAL_ADMIN_CLERK_USER_ID` on this Convex deployment. Sign in as that exact account and call `users.syncCurrent`, then call `users.bootstrapFirstAdmin({})`. The mutation derives the Clerk subject from the authenticated session and accepts no client-provided credential or identity. It fails closed when the allowlist is absent, mismatched, or an administrator role already exists. Remove `INITIAL_ADMIN_CLERK_USER_ID` immediately after a successful claim. Append `--prod` to environment commands only when deliberately targeting the production deployment.
5. Seed safe baseline content once (the mutation is idempotent):

   ```powershell
   npx convex run seed:baseline '{"seedSecret":"YOUR_SEED_SECRET"}'
   ```

   An active administrator may instead call `seed.baseline({})` from a trusted admin interface. The seed deliberately leaves admissions and the AI assistant disabled until official contact/cycle details and service credentials have been reviewed.

6. Deploy production functions with `npx convex deploy`, and set `NEXT_PUBLIC_CONVEX_URL` to the production deployment URL in the Next.js host.

## Operational notes

- Public queries return only currently published, non-expired content and omit editor identifiers/private contact fields.
- Home-page copy lives in `homeSections` (one published row per section: `hero`, `about`, `management`, `news`, `eca`, `gallery`, `alumni`) and `homeHighlights` (ordered cards for the hero carousel, the About pillars, and the ECA activities). Both go through the standard content pipeline, so drafts, scheduling, expiry, audit, and media-reference protection all apply. Each home section falls back to built-in wording whenever its record is missing or unpublished.
- Assistant requests include a millisecond timestamp and lowercase hex HMAC-SHA256 signature over `JSON.stringify({requestTimestamp,fingerprint,sessionId,message,history:history ?? []})`. Signatures are accepted for 120 seconds and cannot be replayed.
- Assistant answers are grounded only in published site records and published `assistantContexts` maintained by administrators. The bounded context catalog is scored for each question before the top sources enter the prompt; drafts, archived context, admissions, contacts, and other private workflow records are never included.
- Gemini credentials, model selection, and the assistant signing secret remain Convex deployment environment variables. They are declared in `convex.config.ts` and are never returned by assistant diagnostics or exposed to the browser.
- Public form writes are exposed only through `formActions:submitContact`, `formActions:submitAdmission`, `formActions:subscribeNewsletter`, and `formActions:registerEvent`. The web layer must verify Turnstile, derive the fingerprint server-side, and attach a millisecond timestamp plus lowercase hex HMAC-SHA256 signature. Signatures are accepted for 120 seconds. The underlying mutations are internal, idempotent, and rate-limited.
- Media uploads use a short-lived Convex upload URL and must be finalized. Finalization checks storage metadata, MIME type, and the 50 MB size limit. Image/video URL fields accept only same-origin paths or HTTPS `*.convex.cloud` URLs; uploaded storage IDs are preferred. In-use files cannot be deleted.
- Notification jobs POST a versioned, template-specific minimum-data payload to the configured webhook with `Authorization: Bearer …` and `X-Idempotency-Key`. The receiver must deduplicate that key and return a 2xx response only after accepting delivery. Webhook redirects, URL credentials, localhost, private/link-local IPs, and common internal hostnames are rejected. Raw database records, request fingerprints, child birth dates/addresses, and internal notes are never sent.
- Newsletter campaigns are admin-only. Scheduling snapshots active subscribers at queue start, builds delivery jobs in bounded batches, re-checks subscription status immediately before each send, and records delivered, failed, and suppressed totals. Campaign email bodies are stored and sent as plain text; the webhook template is responsible for safe HTML rendering and replacing `{token}` in the supplied unsubscribe route template with a URL-encoded token.
- Newsletter confirmation and unsubscribe capabilities are distinct, cryptographically random tokens. Confirmation links expire after seven days; expired pending subscriptions are removed by retention cleanup, while unsubscribe tokens remain stable for suppression compliance.
- Retention never removes active admissions or active newsletter subscribers. Terminal admissions (`enrolled`, `declined`, `withdrawn`) age from their last status update and default to seven years; unsubscribed/bounced newsletter addresses default to three years. Eligible rows are selected through status/time indexes, counters are decremented, and aggregate sensitive-record deletion audits contain counts only.
- Cron jobs dispatch/recover work, publish/expire scheduled content, and enforce retention. Failed jobs use exponential retry and become `dead` after their attempt limit; admins can retry them. Succeeded, cancelled, and dead jobs expire after `JOB_RETENTION_DAYS`.
- Clerk users synchronize as `pending` with no roles. Only an administrator can activate them and grant `admin`, `publisher`, `editor`, or `admissions` access.
- Student accounts are isolated in the Better Auth component and cannot enter the Clerk-backed administration
  console. Application rows contain only the student profile and article workflow data; passwords remain inside
  the authentication component. Article ownership and moderation transitions are enforced in Convex, and only
  `published` articles are returned by public queries.
