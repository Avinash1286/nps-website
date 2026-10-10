# NPS Digital School

Production-oriented website and content platform for Nepal Police School, Garuda, Rautahat. The application uses Next.js, Convex, Clerk, and Gemini.

## Product surfaces

- Public school website with dedicated routes for academics, leadership, faculty, school life, news, notices, events, downloads, admissions, search, and governance pages.
- Validated contact, admissions, double-opt-in newsletter, campaign delivery, and event-registration workflows.
- Invite-only staff administration with role-based publishing, media, submissions, users, jobs, and audit history.
- Separate email/password student accounts for private article drafts, administrative review, and approved
  public student writing. Student accounts never grant staff-console access.
- Gemini information assistant grounded in published school content. The browser never receives the Gemini credential.
- Convex database, storage, scheduled jobs, retention cleanup, notification queues, and publication scheduling.

This project deliberately does not implement attendance, grades, fees, examination results, or a student-information system. Those require a separately specified authoritative system and stronger student-record controls.

## Requirements

- Node.js 22 or newer
- A Convex project
- A Clerk application with a JWT template named `convex`
- A paid Google AI project and Gemini authorization key for production
- Optional: Cloudflare Turnstile and an idempotent notification-delivery webhook

## Local setup

1. Install locked dependencies:

   ```bash
   npm ci
   ```

2. Copy `.env.example` to `.env.local` and configure the public Convex URL, matching
   `NEXT_PUBLIC_CONVEX_SITE_URL`, Clerk keys, and the Clerk Frontend API origin used by the production CSP.

3. Start Convex once and follow its project setup prompt:

   ```bash
   npx convex dev
   ```

4. In Clerk, create the `convex` JWT template and configure its issuer in `convex/auth.config.ts`. Disable public staff registration, invite staff explicitly, and require MFA.

5. Set backend-only variables in the Convex deployment:

   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-domain.clerk.accounts.dev
   npx convex env set SITE_URL http://localhost:3000
   npx convex env set BETTER_AUTH_SECRET your-random-32-byte-or-longer-secret
   npx convex env set INITIAL_ADMIN_CLERK_USER_ID user_replace_with_the_designated_admin_id
   npx convex env set SEED_SECRET another-long-random-secret
   npx convex env set GEMINI_API_KEY your-google-ai-authorization-key
   npx convex env set GEMINI_MODEL gemini-3.6-flash
   npx convex env set ASSISTANT_SERVICE_SECRET the-same-secret-used-by-next
   npx convex env set FORM_SERVICE_SECRET the-same-form-secret-used-by-next
   npx convex env set NOTIFICATION_WEBHOOK_URL https://notifications.example.edu.np/nps
   npx convex env set NOTIFICATION_WEBHOOK_SECRET a-long-random-webhook-secret
   npx convex env set NOTIFICATION_WEBHOOK_ALLOWED_HOSTS notifications.example.edu.np
   ```

   If one non-production Convex deployment must temporarily serve localhost and one named preview, add only
   that exact HTTPS origin with `STUDENT_AUTH_TRUSTED_ORIGINS`. Do not use a wildcard or share the production
   auth deployment with localhost. Separate Convex deployments remain the production setup.

   Generate `BETTER_AUTH_SECRET` once per deployment with a cryptographically secure generator (for example,
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`). Do not reuse the Clerk
   secret or expose this value through a `NEXT_PUBLIC_*` variable. Set the production `SITE_URL` to the exact
   public HTTPS origin.

   The notification webhook is optional during development. Without it, delivery jobs remain visible and retryable in the admin job workflow, but no email is sent.

6. Run the website and Convex together:

   ```bash
   npm run dev
   ```

Copy the intended administrator's immutable `user_...` ID from the matching Clerk environment and set it as `INITIAL_ADMIN_CLERK_USER_ID` on the corresponding Convex deployment. After that exact account signs in, open `/admin/bootstrap` and activate it. The browser sends no bootstrap credential or user ID; Convex derives the authenticated Clerk subject from the verified session. The claim works only while no profile holds the administrator role. Remove the allowlist immediately after activation:

```bash
npx convex env remove INITIAL_ADMIN_CLERK_USER_ID
```

Development and production Clerk applications normally issue different user IDs, so configure each Convex deployment separately. Append `--prod` to the `env set` and `env remove` commands only after verifying that production is the intended target. Then seed the verified baseline content as described in [`convex/README.md`](./convex/README.md).

## Quality commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run check
```

## Production deployment

Deploy Convex and the web build together from CI or the hosting provider:

```bash
npx convex deploy --cmd "npm run build"
```

Use a production Convex deploy key, production Clerk keys, a production site origin, and separate preview deployments. Never expose `GEMINI_API_KEY`, `CLERK_SECRET_KEY`, Turnstile secrets, deploy keys, or shared service secrets through `NEXT_PUBLIC_*` variables.

Before launch:

- Replace baseline copy with information verified by the school administration.
- Configure the official domain, email sender, contact recipients, admissions cycle, webhook allowlist, and retention policy.
- Invite staff and test every role against unauthorized reads and writes.
- Enable Convex backups and external exception monitoring.
- Verify all public forms, notification jobs, uploads, publication scheduling, and AI answers against the production backend.
- Review the privacy, terms, accessibility, and admissions consent wording with the responsible school authority.

## Security model

- Clerk authenticates invited staff; Convex functions enforce authorization for every protected read and write.
- Better Auth handles student passwords and sessions in an isolated Convex component. Staff authorization also
  checks the Clerk issuer, so a student identity cannot resolve a staff role even if identifiers collide.
- Students can edit only their own eligible drafts. Only an administrator can approve an article, and public
  article queries return approved contributions without account email or private review notes.
- Public queries return published content only.
- Public forms use server-side validation, honeypots, request fingerprint limits, idempotency keys, and optional Turnstile verification.
- Convex Storage IDs are stored instead of permanent media URLs; public media URLs should be treated as bearer links.
- Gemini runs through durable Convex Agent threads with bounded history, exact-message retries, rate limiting, and grounding limited to published site/admin context; it has no access to admissions or contact records.
- Administrative changes are attributed in audit logs, and background jobs are visible and retryable.

See [SECURITY.md](./SECURITY.md) for reporting and operational guidance.

## Google Search discovery

Set the web deployment's `NEXT_PUBLIC_SITE_URL` to the public HTTPS origin, currently
`https://nepalpoliceschool.vercel.app`. Canonicals and sitemap URLs use this origin;
Vercel's production hostname is the fallback when the optional override is missing or invalid.

After deploying the latest `master` commit to Production:

1. Open `/robots.txt` and `/sitemap.xml` on the public domain. Public pages should be crawlable,
   and the sitemap should contain canonical public URLs. Keep staff and student routes private.
2. Verify the URL-prefix property `https://nepalpoliceschool.vercel.app/` in Google Search Console.
   The supplied HTML method requires `/google0553287e66d39a3e.html` to serve exactly
   `google-site-verification: google0553287e66d39a3e.html`. Keep the file after verification.
3. Submit `sitemap.xml` in the property's Sitemaps report.
4. Use URL Inspection to run a live test and request indexing for the homepage, `/about`,
   `/academics`, `/admissions`, and `/contact`. Use the sitemap for the other published pages.
5. Review Page Indexing for excluded or failed URLs after Google processes the site. Check that
   the administrator's site-wide search-indexing opt-out is disabled for the public launch;
   respect individual pages intentionally marked `noIndex`.

Google decides whether and when to index pages. Sitemap submission and indexing requests do not
guarantee inclusion or ranking. See Google's [recrawl guidance](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
and [canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
