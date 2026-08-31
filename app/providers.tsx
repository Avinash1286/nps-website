"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";

const clerkKeyValue = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convexUrlValue = process.env.NEXT_PUBLIC_CONVEX_URL;
const clerkPublishableKey = clerkKeyValue && !clerkKeyValue.includes("replace") ? clerkKeyValue : undefined;
const convexUrl = convexUrlValue && !convexUrlValue.includes("your-deployment") ? convexUrlValue : undefined;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

/** Staff-only providers. Keeping Clerk below the public route tree prevents
 * anonymous visitors from paying for the admin authentication runtime and its
 * cross-origin handshake. */
export function StaffProviders({ children }: { children: ReactNode }) {
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
  return children;
}

/** Clerk UI is required on the staff sign-in route, but Convex is not. */
export function StaffSignInProvider({ children }: { children: ReactNode }) {
  if (!clerkPublishableKey) return children;
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
