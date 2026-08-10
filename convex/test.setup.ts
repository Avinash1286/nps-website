/// <reference types="vite/client" />

process.env.SITE_URL ??= "http://localhost:3000";
process.env.CONVEX_SITE_URL ??= "https://student-auth.convex.site";
process.env.BETTER_AUTH_SECRET ??= "test-only-student-auth-secret-32-characters";
process.env.CLERK_JWT_ISSUER_DOMAIN ??= "https://convex.test";

export const modules = import.meta.glob("./**/*.ts");
