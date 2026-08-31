import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("replace") &&
  process.env.CLERK_SECRET_KEY &&
  !process.env.CLERK_SECRET_KEY.includes("replace"),
);

// Authentication/authorization is enforced by the protected resource itself
// (app/admin/layout.tsx and Convex role checks). Clerk middleware remains here
// to attach verified session state to matching requests.
const clerkProxy = clerkConfigured ? clerkMiddleware() : null;

export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!clerkProxy) return NextResponse.next();
  return clerkProxy(request, event);
}

export const config = {
  matcher: ["/admin/:path*", "/sign-in/:path*"],
};
