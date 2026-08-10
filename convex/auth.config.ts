import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";

export const betterAuthConfig = {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig;

export default {
  providers: [
    ...betterAuthConfig.providers,
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
