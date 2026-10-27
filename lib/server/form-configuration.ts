import "server-only";
import { isConfiguredSecret } from "@/lib/security/configuration";

/** Only checks this web deployment's configuration, not backend connectivity. */
export function getPublicFormConfiguration() {
  const fingerprintSecret = process.env.REQUEST_FINGERPRINT_SECRET;
  const formServiceSecret = process.env.FORM_SERVICE_SECRET;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!isConfiguredSecret(fingerprintSecret) || !isConfiguredSecret(formServiceSecret) || !convexUrl)
    return null;
  return { fingerprintSecret, formServiceSecret, convexUrl };
}

export function hasPublicFormConfiguration() {
  return getPublicFormConfiguration() !== null;
}
