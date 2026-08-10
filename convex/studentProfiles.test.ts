import betterAuthTest from "@convex-dev/better-auth/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, components } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const studentIssuer = "https://student-auth.convex.site";

function setup() {
  const t = convexTest(schema, modules);
  betterAuthTest.register(t);
  return t;
}

async function studentIdentity(t: ReturnType<typeof setup>, email: string, name: string) {
  const now = Date.now();
  const authUser = await t.run(
    async (ctx) =>
      await ctx.runMutation(components.betterAuth.adapter.create, {
        input: {
          model: "user",
          data: { email, emailVerified: false, name, createdAt: now, updatedAt: now },
        },
      }),
  );
  const session = await t.run(
    async (ctx) =>
      await ctx.runMutation(components.betterAuth.adapter.create, {
        input: {
          model: "session",
          data: {
            userId: authUser._id,
            token: `profile-session-${authUser._id}`,
            expiresAt: now + 60 * 60 * 1000,
            createdAt: now,
            updatedAt: now,
          },
        },
      }),
  );
  return {
    authUserId: authUser._id as string,
    client: t.withIdentity({
      subject: authUser._id,
      issuer: studentIssuer,
      tokenIdentifier: `${studentIssuer}|${authUser._id}`,
      sessionId: session._id,
      email,
      name,
    }),
  };
}

describe("student profiles", () => {
  it("does not expose or mutate a profile for anonymous or Clerk identities", async () => {
    const t = setup();
    expect(await t.query(api.studentProfiles.getCurrent, {})).toBeNull();
    await expect(
      t.mutation(api.studentProfiles.updateDisplayName, { name: "Anonymous User" }),
    ).rejects.toThrow(/sign in is required/i);

    const clerkUser = t.withIdentity({
      subject: "clerk-staff-profile-test",
      issuer: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      email: "staff@example.edu.np",
      name: "Staff User",
    });
    expect(await clerkUser.query(api.studentProfiles.getCurrent, {})).toBeNull();
    await expect(
      clerkUser.mutation(api.studentProfiles.updateDisplayName, { name: "Staff User" }),
    ).rejects.toThrow(/student sign in is required/i);
  });

  it("updates only the signed-in student's normalized display name", async () => {
    const t = setup();
    const first = await studentIdentity(t, "first-profile@example.com", "First Student");
    const second = await studentIdentity(t, "second-profile@example.com", "Second Student");

    await second.client.mutation(api.studentProfiles.updateDisplayName, { name: "Second Student" });
    const updated = await first.client.mutation(api.studentProfiles.updateDisplayName, {
      name: "  First   Writer\n  ",
    });

    expect(updated).toMatchObject({
      name: "First Writer",
      email: "first-profile@example.com",
    });
    expect(await first.client.query(api.studentProfiles.getCurrent, {})).toEqual(updated);
    expect(await second.client.query(api.studentProfiles.getCurrent, {})).toMatchObject({
      name: "Second Student",
      email: "second-profile@example.com",
    });

    const stored = await t.run(async (ctx) =>
      ctx.db
        .query("studentProfiles")
        .withIndex("by_auth_user_id", (q) => q.eq("authUserId", first.authUserId))
        .unique(),
    );
    expect(stored?.name).toBe("First Writer");
    expect(stored?.email).toBe("first-profile@example.com");
  });

  it("validates display names on the server", async () => {
    const t = setup();
    const { client } = await studentIdentity(t, "validation-profile@example.com", "Valid Student");

    await expect(client.mutation(api.studentProfiles.updateDisplayName, { name: " " })).rejects.toThrow(
      /between 2 and 120 characters/i,
    );
    await expect(
      client.mutation(api.studentProfiles.updateDisplayName, { name: "x".repeat(121) }),
    ).rejects.toThrow(/between 2 and 120 characters/i);
  });

  it("denies suspended students", async () => {
    const t = setup();
    const student = await studentIdentity(t, "suspended-profile@example.com", "Suspended Student");
    await student.client.mutation(api.studentProfiles.updateDisplayName, { name: "Suspended Student" });

    await t.run(async (ctx) => {
      const profile = await ctx.db
        .query("studentProfiles")
        .withIndex("by_auth_user_id", (q) => q.eq("authUserId", student.authUserId))
        .unique();
      await ctx.db.patch("studentProfiles", profile!._id, {
        status: "suspended",
        updatedAt: Date.now(),
      });
    });

    await expect(student.client.query(api.studentProfiles.getCurrent, {})).rejects.toThrow(/suspended/i);
    await expect(
      student.client.mutation(api.studentProfiles.updateDisplayName, { name: "Not Allowed" }),
    ).rejects.toThrow(/suspended/i);
  });
});
