"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexReactClient, ConvexProvider } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";

const clerkKeyValue = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convexUrlValue = process.env.NEXT_PUBLIC_CONVEX_URL;
const clerkPublishableKey = clerkKeyValue && !clerkKeyValue.includes("replace") ? clerkKeyValue : undefined;
const convexUrl = convexUrlValue && !convexUrlValue.includes("your-deployment") ? convexUrlValue : undefined;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

/**
 * Application services are intentionally optional at build time. Production
 * features display their own setup state until both public keys are present.
 */
export function Providers({ children }: { children: ReactNode }) {
  if (clerkPublishableKey && convexClient) {
    return (
      <ClerkProvider
        publishableKey={clerkPublishableKey}
        signInUrl="/sign-in"
        signInFallbackRedirectUrl="/admin"
      >
        <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
          {children}
        </ConvexProviderWithClerk>
      </ClerkProvider>
    );
  }

  if (clerkPublishableKey) {
    return (
      <ClerkProvider
        publishableKey={clerkPublishableKey}
        signInUrl="/sign-in"
        signInFallbackRedirectUrl="/admin"
      >
        {children}
      </ClerkProvider>
    );
  }

  if (convexClient) {
    return <ConvexProvider client={convexClient}>{children}</ConvexProvider>;
  }

  return children;
}
