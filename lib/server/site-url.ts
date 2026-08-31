import "server-only";

const LOCAL_SITE_URL = "http://localhost:3000";

/** Resolve the canonical public origin without publishing localhost metadata
 * from a Vercel production deployment when an explicit site URL is absent. */
export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  const candidate = configured || (vercelHost ? `https://${vercelHost}` : LOCAL_SITE_URL);

  try {
    return new URL(candidate).origin;
  } catch {
    return LOCAL_SITE_URL;
  }
}
