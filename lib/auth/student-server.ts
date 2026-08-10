import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

function requiredServerUrl(name: "NEXT_PUBLIC_CONVEX_URL" | "NEXT_PUBLIC_CONVEX_SITE_URL"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for student authentication.`);
  return value;
}

const studentAuth = convexBetterAuthNextJs({
  convexUrl: requiredServerUrl("NEXT_PUBLIC_CONVEX_URL"),
  convexSiteUrl: requiredServerUrl("NEXT_PUBLIC_CONVEX_SITE_URL"),
});

export const studentAuthHandler = studentAuth.handler;
export const getStudentAuthToken = studentAuth.getToken;
export const isStudentAuthenticated = studentAuth.isAuthenticated;
export const preloadStudentAuthQuery = studentAuth.preloadAuthQuery;
export const fetchStudentAuthQuery = studentAuth.fetchAuthQuery;
export const fetchStudentAuthMutation = studentAuth.fetchAuthMutation;
export const fetchStudentAuthAction = studentAuth.fetchAuthAction;
