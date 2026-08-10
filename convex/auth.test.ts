import betterAuthTest from "@convex-dev/better-auth/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { createAuth, hasAcceptedStudentTerms } from "./auth";
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
