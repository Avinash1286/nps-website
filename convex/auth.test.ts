import betterAuthTest from "@convex-dev/better-auth/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import {
  createAuth,
  createAuthOptions,
  hasAcceptedStudentTerms,
  studentSiteOrigin,
  studentTrustedOrigins,
} from "./auth";
import schema from "./schema";
import { modules } from "./test.setup";

describe("student registration terms", () => {
  it("requires an explicit boolean acceptance value", () => {
    expect(hasAcceptedStudentTerms({ termsAccepted: true })).toBe(true);
    expect(hasAcceptedStudentTerms({ termsAccepted: false })).toBe(false);
    expect(hasAcceptedStudentTerms({ termsAccepted: "true" })).toBe(false);
    expect(hasAcceptedStudentTerms({})).toBe(false);
    expect(hasAcceptedStudentTerms(null)).toBe(false);
  });

  it("rejects unaccepted registrations and records accepted terms", async () => {
    const t = convexTest(schema, modules);
    betterAuthTest.register(t);

    await t.run(async (ctx) => {
      const auth = createAuth(ctx);
      await expect(
        auth.api.signUpEmail({
          body: {
            name: "Missing Acceptance",
            email: "missing-acceptance@example.com",
            password: "a-secure-student-password",
          },
        }),
      ).rejects.toThrow(/accept the terms/i);
    });

    await t.run(async (ctx) => {
      const auth = createAuth(ctx);
      await auth.api.signUpEmail({
        body: {
          name: "Accepted Student",
          email: "accepted@example.com",
          password: "a-secure-student-password",
          termsAccepted: true,
        },
      });
    });

    const profile = await t.run(async (ctx) =>
      ctx.db
        .query("studentProfiles")
        .withIndex("by_email", (q) => q.eq("email", "accepted@example.com"))
        .unique(),
    );
    expect(profile?.termsAcceptedAt).toEqual(expect.any(Number));
  });
});

describe("student authentication origins", () => {
  it("keeps the canonical origin and accepts only explicit additional exact origins", () => {
    const previousSiteUrl = process.env.SITE_URL;
    const previousTrustedOrigins = process.env.STUDENT_AUTH_TRUSTED_ORIGINS;
    try {
      process.env.SITE_URL = "http://localhost:3000";
      process.env.STUDENT_AUTH_TRUSTED_ORIGINS =
        "https://nepalpoliceschool.vercel.app, https://nepalpoliceschool.vercel.app";

      expect(studentSiteOrigin()).toBe("http://localhost:3000");
      expect(studentTrustedOrigins()).toEqual([
        "http://localhost:3000",
        "https://nepalpoliceschool.vercel.app",
      ]);
    } finally {
      if (previousSiteUrl === undefined) delete process.env.SITE_URL;
      else process.env.SITE_URL = previousSiteUrl;
      if (previousTrustedOrigins === undefined) delete process.env.STUDENT_AUTH_TRUSTED_ORIGINS;
      else process.env.STUDENT_AUTH_TRUSTED_ORIGINS = previousTrustedOrigins;
    }
  });

  it("rejects insecure remote and non-origin allowlist values", () => {
    const previousTrustedOrigins = process.env.STUDENT_AUTH_TRUSTED_ORIGINS;
    try {
      process.env.STUDENT_AUTH_TRUSTED_ORIGINS = "http://example.com";
      expect(() => studentTrustedOrigins("http://localhost:3000")).toThrow(/must use HTTPS/i);

      process.env.STUDENT_AUTH_TRUSTED_ORIGINS = "https://example.com/path";
      expect(() => studentTrustedOrigins("http://localhost:3000")).toThrow(/exact application origins/i);

      process.env.STUDENT_AUTH_TRUSTED_ORIGINS = "https://*.vercel.app";
      expect(() => studentTrustedOrigins("http://localhost:3000")).toThrow(/wildcard origins/i);

      process.env.STUDENT_AUTH_TRUSTED_ORIGINS = "http://localhost:3000";
      expect(() => studentTrustedOrigins("https://example.com")).toThrow(/must not add localhost/i);
    } finally {
      if (previousTrustedOrigins === undefined) delete process.env.STUDENT_AUTH_TRUSTED_ORIGINS;
      else process.env.STUDENT_AUTH_TRUSTED_ORIGINS = previousTrustedOrigins;
    }
  });

  it("preserves exact HTTPS schemes in Better Auth's dynamic base URL", () => {
    const previousSiteUrl = process.env.SITE_URL;
    const previousTrustedOrigins = process.env.STUDENT_AUTH_TRUSTED_ORIGINS;
    const previousSecret = process.env.BETTER_AUTH_SECRET;
    try {
      process.env.SITE_URL = "http://localhost:3000";
      process.env.STUDENT_AUTH_TRUSTED_ORIGINS = "https://nepalpoliceschool.vercel.app";
      process.env.BETTER_AUTH_SECRET = "test-secret-that-is-at-least-thirty-two-characters";

      const options = createAuthOptions({} as never);
      expect(options.baseURL).toEqual({
        allowedHosts: ["http://localhost:3000", "https://nepalpoliceschool.vercel.app"],
        protocol: "auto",
        fallback: "http://localhost:3000",
      });
      expect(options.trustedOrigins).toEqual([
        "http://localhost:3000",
        "https://nepalpoliceschool.vercel.app",
      ]);
    } finally {
      if (previousSiteUrl === undefined) delete process.env.SITE_URL;
      else process.env.SITE_URL = previousSiteUrl;
      if (previousTrustedOrigins === undefined) delete process.env.STUDENT_AUTH_TRUSTED_ORIGINS;
      else process.env.STUDENT_AUTH_TRUSTED_ORIGINS = previousTrustedOrigins;
      if (previousSecret === undefined) delete process.env.BETTER_AUTH_SECRET;
      else process.env.BETTER_AUTH_SECRET = previousSecret;
    }
  });
});
