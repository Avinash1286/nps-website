import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { currentUser } from "./lib/auth";
import { normalizedEmail, plainText } from "./lib/input";
import { writeAudit } from "./lib/audit";
import { roleValidator, userStatusValidator } from "./schema";

const BOOTSTRAP_USER_SCAN_LIMIT = 1_000;

async function scanBootstrapUsers(ctx: Pick<QueryCtx, "db">) {
  const users = await ctx.db.query("users").take(BOOTSTRAP_USER_SCAN_LIMIT + 1);
  return {
    hasAdmin: users.some((candidate) => candidate.roles.includes("admin")),
    reviewRequired: users.length > BOOTSTRAP_USER_SCAN_LIMIT,
  };
}

const currentUserValidator = v.object({
  _id: v.id("users"),
  clerkUserId: v.string(),
  email: v.string(),
  name: v.string(),
  imageUrl: v.optional(v.string()),
  phone: v.optional(v.string()),
  roles: v.array(roleValidator),
  status: userStatusValidator,
  lastLoginAt: v.optional(v.number()),
});

export const current = query({
  args: {},
  returns: v.union(v.null(), currentUserValidator),
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return null;
    return {
      _id: user._id,
      clerkUserId: user.clerkUserId,
      email: user.email,
      name: user.name,
      imageUrl: user.imageUrl,
      phone: user.phone,
      roles: user.roles,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
    };
  },
});

export const syncCurrent = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in is required." });
    }
    if (!identity.email) {
      throw new ConvexError({
        code: "EMAIL_REQUIRED",
        message: "The Clerk JWT must include the email claim.",
      });
    }

    const now = Date.now();
    const email = normalizedEmail(identity.email);
    const name = plainText(
      identity.name ?? ([identity.givenName, identity.familyName].filter(Boolean).join(" ") || email),
      "Name",
      1,
      120,
    );
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (existing) {
      await ctx.db.patch("users", existing._id, {
        email,
        name,
        imageUrl: identity.pictureUrl,
        lastLoginAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("users", {
      clerkUserId: identity.subject,
      email,
      name,
      imageUrl: identity.pictureUrl,
      roles: [],
      status: "pending",
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await writeAudit(ctx, null, {
      action: "user.synced",
      entityType: "users",
      entityId: id,
      summary: `Created pending staff profile for ${email}.`,
    });
    return id;
  },
});

/**
 * Non-disclosing route guard for the one-time bootstrap screen. It never
 * returns the allowlisted Clerk ID or explains why a caller is ineligible.
 */
export const bootstrapEligibility = query({
  args: {},
  returns: v.object({
    status: v.union(v.literal("eligible"), v.literal("approved"), v.literal("approval_required")),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { status: "approval_required" as const };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (user?.status === "active" && user.roles.length > 0) {
      return { status: "approved" as const };
    }
    if (user?.status === "suspended") {
      return { status: "approval_required" as const };
    }

    const initialAdminClerkUserId = process.env.INITIAL_ADMIN_CLERK_USER_ID?.trim();
    if (!initialAdminClerkUserId || identity.subject !== initialAdminClerkUserId) {
      return { status: "approval_required" as const };
    }

    const availability = await scanBootstrapUsers(ctx);
    if (availability.hasAdmin || availability.reviewRequired) {
      return { status: "approval_required" as const };
    }
    return { status: "eligible" as const };
  },
});

/**
 * One-time deployment bootstrap. The caller's authenticated Clerk user ID
 * must exactly match INITIAL_ADMIN_CLERK_USER_ID in this deployment.
 */
export const bootstrapFirstAdmin = mutation({
  args: {},
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in is required." });
    }

    const initialAdminClerkUserId = process.env.INITIAL_ADMIN_CLERK_USER_ID?.trim();
    if (!initialAdminClerkUserId) {
      throw new ConvexError({
        code: "BOOTSTRAP_DISABLED",
        message: "First-administrator activation is not configured for this deployment.",
      });
    }
    if (identity.subject !== initialAdminClerkUserId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "This Clerk account is not authorised for initial administrator activation.",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user) {
      throw new ConvexError({ code: "PROFILE_REQUIRED", message: "Run users.syncCurrent first." });
    }
    if (user.status === "suspended") {
      throw new ConvexError({ code: "ACCOUNT_DISABLED", message: "This account is suspended." });
    }

    // Roles are stored as an array and cannot be queried through the status index.
    // Keep this one-time check bounded and fail closed if manual review is needed.
    const availability = await scanBootstrapUsers(ctx);
    if (availability.hasAdmin) {
      throw new ConvexError({ code: "ALREADY_BOOTSTRAPPED", message: "An admin already exists." });
    }
    if (availability.reviewRequired) {
      throw new ConvexError({
        code: "BOOTSTRAP_REVIEW_REQUIRED",
        message: "Too many staff profiles exist for automatic first-administrator activation.",
      });
    }

    const now = Date.now();
    await ctx.db.patch("users", user._id, {
      roles: [...new Set([...user.roles, "admin" as const])],
      status: "active",
      updatedAt: now,
    });
    await writeAudit(ctx, user, {
      action: "user.bootstrap_admin",
      entityType: "users",
      entityId: user._id,
      summary: `Bootstrapped the first administrator (${user.email}).`,
    });
    return { ok: true };
  },
});
