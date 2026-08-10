import { NextResponse } from "next/server";
import { isConfiguredSecret } from "@/lib/security/configuration";

export const dynamic = "force-dynamic";

function isConfiguredUrl(value: string | undefined, allowLocalhost = false) {
  if (!value || /your[_-]|example|replace/i.test(value)) return false;
  try {
    const url = new URL(value);
    if (allowLocalhost && ["localhost", "127.0.0.1"].includes(url.hostname)) return true;
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function GET() {
  const turnstileConfigured = Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || process.env.TURNSTILE_SECRET_KEY,
  );
  const configuration = {
    siteUrl: isConfiguredUrl(process.env.NEXT_PUBLIC_SITE_URL, process.env.NODE_ENV !== "production"),
    convex: isConfiguredUrl(process.env.NEXT_PUBLIC_CONVEX_URL),
    studentAuthProxy: isConfiguredUrl(process.env.NEXT_PUBLIC_CONVEX_SITE_URL),
    clerk: Boolean(
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_") &&
      !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("replace") &&
      process.env.CLERK_SECRET_KEY?.startsWith("sk_") &&
      !process.env.CLERK_SECRET_KEY.includes("replace"),
    ),
    ...(process.env.NEXT_PUBLIC_CLERK_FAPI
      ? { clerkCustomFrontendApi: isConfiguredUrl(process.env.NEXT_PUBLIC_CLERK_FAPI) }
      : {}),
    assistantGateway: isConfiguredSecret(process.env.ASSISTANT_SERVICE_SECRET),
    formSigning: isConfiguredSecret(process.env.FORM_SERVICE_SECRET),
    requestFingerprinting: isConfiguredSecret(process.env.REQUEST_FINGERPRINT_SECRET),
    turnstile: turnstileConfigured
      ? Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY)
      : true,
  };
  const ready = Object.values(configuration).every(Boolean);

  return NextResponse.json(
    {
      status: ready ? "ready" : "configuration_required",
      service: "nps-digital-school",
      checkScope: "configuration_only",
      configuration,
      timestamp: new Date().toISOString(),
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
