import { convexTest } from "convex-test";
import { afterEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const originalInitialAdminClerkUserId = process.env.INITIAL_ADMIN_CLERK_USER_ID;

afterEach(() => {
  if (originalInitialAdminClerkUserId === undefined) {
    delete process.env.INITIAL_ADMIN_CLERK_USER_ID;
  } else {
    process.env.INITIAL_ADMIN_CLERK_USER_ID = originalInitialAdminClerkUserId;
  }
});

function asStaff(t: ReturnType<typeof convexTest>, clerkUserId: string) {
  return t.withIdentity({
    subject: clerkUserId,
    email: `${clerkUserId}@example.test`,
    name: clerkUserId,
  });
}

describe("first-administrator bootstrap", () => {
  it("requires an authenticated Clerk session before checking deployment configuration", async () => {
    process.env.INITIAL_ADMIN_CLERK_USER_ID = "user_initial_admin";
    const t = convexTest(schema, modules);

    await expect(t.query(api.users.bootstrapEligibility, {})).resolves.toEqual({
      status: "approval_required",
    });
    await expect(t.mutation(api.users.bootstrapFirstAdmin, {})).rejects.toThrow("Sign in is required");
  });

  it("fails closed when the allowlist is missing or belongs to a different Clerk user", async () => {
    const t = convexTest(schema, modules);
    const caller = asStaff(t, "user_Allowed");

    process.env.INITIAL_ADMIN_CLERK_USER_ID = "";
    await expect(caller.query(api.users.bootstrapEligibility, {})).resolves.toEqual({
      status: "approval_required",
    });
    await expect(caller.mutation(api.users.bootstrapFirstAdmin, {})).rejects.toThrow(
      "not configured for this deployment",
    );

    process.env.INITIAL_ADMIN_CLERK_USER_ID = "user_allowed";
    await expect(caller.query(api.users.bootstrapEligibility, {})).resolves.toEqual({
      status: "approval_required",
    });
    await expect(caller.mutation(api.users.bootstrapFirstAdmin, {})).rejects.toThrow(
      "not authorised for initial administrator activation",
    );
  });

  it("requires the allowlisted identity to synchronize a staff profile first", async () => {
    process.env.INITIAL_ADMIN_CLERK_USER_ID = "user_initial_admin";
    const t = convexTest(schema, modules);
    const caller = asStaff(t, "user_initial_admin");

    await expect(caller.query(api.users.bootstrapEligibility, {})).resolves.toEqual({
      status: "eligible",
    });
    await expect(caller.mutation(api.users.bootstrapFirstAdmin, {})).rejects.toThrow(
      "Run users.syncCurrent first",
    );
  });

  it("activates only the allowlisted pending profile, preserves roles, and audits the claim", async () => {
    process.env.INITIAL_ADMIN_CLERK_USER_ID = "  user_initial_admin  ";
    const t = convexTest(schema, modules);
    const caller = asStaff(t, "user_initial_admin");
    const userId = await caller.mutation(api.users.syncCurrent, {});
    await t.run(async (ctx) => await ctx.db.patch("users", userId, { roles: ["editor"] }));

    await expect(caller.query(api.users.bootstrapEligibility, {})).resolves.toEqual({
      status: "eligible",
    });
    await expect(caller.mutation(api.users.bootstrapFirstAdmin, {})).resolves.toEqual({ ok: true });
    await expect(caller.query(api.users.bootstrapEligibility, {})).resolves.toEqual({
      status: "approved",
    });

    const user = await t.run(async (ctx) => await ctx.db.get("users", userId));
    expect(user?.status).toBe("active");
    expect(user?.roles).toEqual(["editor", "admin"]);

    const audit = await t.run(async (ctx) =>
      ctx.db.query("auditLogs").withIndex("by_created_at").order("desc").take(5),
    );
    expect(audit.filter((entry) => entry.action === "user.bootstrap_admin")).toHaveLength(1);

    await expect(caller.mutation(api.users.bootstrapFirstAdmin, {})).rejects.toThrow(
      "An admin already exists",
    );
  });

  it("refuses to activate a suspended allowlisted account", async () => {
    process.env.INITIAL_ADMIN_CLERK_USER_ID = "user_initial_admin";
    const t = convexTest(schema, modules);
    const caller = asStaff(t, "user_initial_admin");
    const userId = await caller.mutation(api.users.syncCurrent, {});
    await t.run(async (ctx) => await ctx.db.patch("users", userId, { status: "suspended" }));

    await expect(caller.query(api.users.bootstrapEligibility, {})).resolves.toEqual({
      status: "approval_required",
    });
    await expect(caller.mutation(api.users.bootstrapFirstAdmin, {})).rejects.toThrow(
      "This account is suspended",
    );
  });

  it("refuses a new claim when any existing profile retains the administrator role", async () => {
    process.env.INITIAL_ADMIN_CLERK_USER_ID = "user_initial_admin";
    const t = convexTest(schema, modules);
    const caller = asStaff(t, "user_initial_admin");
    await caller.mutation(api.users.syncCurrent, {});
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("users", {
        clerkUserId: "user_previous_admin",
        email: "previous-admin@example.test",
        name: "Previous administrator",
        roles: ["admin"],
        status: "suspended",
        createdAt: now,
        updatedAt: now,
      });
    });

    await expect(caller.query(api.users.bootstrapEligibility, {})).resolves.toEqual({
      status: "approval_required",
    });
    await expect(caller.mutation(api.users.bootstrapFirstAdmin, {})).rejects.toThrow(
      "An admin already exists",
    );
  });
});
