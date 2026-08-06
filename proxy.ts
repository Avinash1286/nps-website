import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("replace") &&
  process.env.CLERK_SECRET_KEY &&
  !process.env.CLERK_SECRET_KEY.includes("replace"),
);

const protectedProxy = clerkConfigured
  ? clerkMiddleware(async (auth, request) => {
      if (isAdminRoute(request)) await auth.protect();
    })
  : null;

export function proxy(request: NextRequest, event: NextFetchEvent) {
  // Keeping the project buildable before secrets are provisioned makes the
  // setup screen reachable without weakening configured production routes.
  if (!protectedProxy) return NextResponse.next();
  return protectedProxy(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
