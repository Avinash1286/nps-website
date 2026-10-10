import "server-only";

const LOCAL_SITE_URL = "http://localhost:3000";

/** Resolve the canonical public origin without publishing localhost metadata
 * from a Vercel production deployment when an explicit site URL is absent. */
export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  for (const candidate of [configured, vercelHost ? `https://${vercelHost}` : undefined]) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if ((url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password) {
        return url.origin;
      }
    } catch {
      // An invalid optional override must not turn production canonicals into localhost URLs.
    }
  }
  return LOCAL_SITE_URL;
}
