"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { useState, type ReactNode } from "react";
import { authClient } from "@/lib/auth/student-client";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
const configuredConvexUrl =
  convexUrl &&
  !convexUrl.includes("your-deployment") &&
  convexSiteUrl &&
  !convexSiteUrl.includes("your-deployment")
    ? convexUrl
    : undefined;

export function StudentAuthProvider({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  if (!configuredConvexUrl) {
    return (
      <section className="grid min-h-[34rem] place-items-center bg-[#f7f8fd] px-4 py-16">
        <div className="w-full max-w-xl rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-[11px] font-extrabold tracking-[.18em] text-amber-700 uppercase">
            Student publishing
          </p>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-[#12123a]">
            Student workspace setup required
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The student workspace cannot connect to the school database. Add the public Convex deployment and
            site URLs to this environment, then restart the website.
          </p>
        </div>
      </section>
    );
  }

  return (
    <ConfiguredStudentAuthProvider url={configuredConvexUrl} initialToken={initialToken}>
      {children}
    </ConfiguredStudentAuthProvider>
  );
}

function ConfiguredStudentAuthProvider({
  url,
  initialToken,
  children,
}: {
  url: string;
  initialToken?: string | null;
  children: ReactNode;
}) {
  // This client is intentionally scoped to the student route subtree. Reusing
  // the global Clerk-authenticated client would make the two providers race to
  // replace each other's authentication token.
  const [studentConvexClient] = useState(() => new ConvexReactClient(url));

  return (
    <ConvexBetterAuthProvider
      client={studentConvexClient}
      authClient={authClient}
      initialToken={initialToken}
    >
      {children}
    </ConvexBetterAuthProvider>
  );
}
