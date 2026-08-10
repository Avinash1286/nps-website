import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent } from "../auth";
import { normalizedEmail, plainText } from "./input";

type StudentAuthContext = QueryCtx | MutationCtx;

function normalizedIssuer(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

async function hasBetterAuthIdentity(ctx: StudentAuthContext): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  const expectedIssuer = process.env.CONVEX_SITE_URL?.trim();
  if (!identity || !expectedIssuer) return false;

  const normalizedIdentityIssuer = normalizedIssuer(identity.issuer);
  if (normalizedIdentityIssuer !== normalizedIssuer(expectedIssuer)) return false;

  return identity.tokenIdentifier === `${identity.issuer}|${identity.subject}`;
}

export async function currentStudentAuthUser(ctx: StudentAuthContext) {
  if (!(await hasBetterAuthIdentity(ctx))) return undefined;
  return await authComponent.safeGetAuthUser(ctx);
}

export async function currentStudentProfile(ctx: StudentAuthContext): Promise<Doc<"studentProfiles"> | null> {
  const authUser = await currentStudentAuthUser(ctx);
  if (!authUser) return null;
  return await ctx.db
    .query("studentProfiles")
    .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
    .unique();
}

export async function ensureStudentProfile(ctx: MutationCtx): Promise<Doc<"studentProfiles">> {
  if (!(await hasBetterAuthIdentity(ctx))) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Student sign in is required." });
  }
  const authUser = await authComponent.getAuthUser(ctx);
  const existing = await ctx.db
    .query("studentProfiles")
    .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
    .unique();
  if (existing) {
    if (existing.status !== "active") {
      throw new ConvexError({ code: "ACCOUNT_DISABLED", message: "This student account is suspended." });
    }
    return existing;
  }

  const now = Date.now();
  const id = await ctx.db.insert("studentProfiles", {
    authUserId: authUser._id,
    email: normalizedEmail(authUser.email),
    name: plainText(authUser.name, "Name", 1, 120),
    status: "active",
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
  });
  return (await ctx.db.get("studentProfiles", id))!;
}

export async function requireStudentProfile(ctx: StudentAuthContext): Promise<Doc<"studentProfiles">> {
  const profile = await currentStudentProfile(ctx);
  if (!profile) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Student sign in is required." });
  }
  if (profile.status !== "active") {
    throw new ConvexError({ code: "ACCOUNT_DISABLED", message: "This student account is suspended." });
  }
  return profile;
}
