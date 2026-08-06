import { ConvexError } from "convex/values";
import { isConfiguredSecret } from "./secrets";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

export type StaffRole = "admin" | "publisher" | "editor" | "admissions";

type AuthContext = Pick<QueryCtx | MutationCtx, "auth" | "db">;

export async function currentUser(ctx: AuthContext): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
}

export async function requireUser(ctx: AuthContext): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in is required." });
  }
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
  if (!user) {
    throw new ConvexError({
      code: "PROFILE_REQUIRED",
      message: "Your staff profile has not been synchronized yet.",
    });
  }
  if (user.status !== "active") {
    throw new ConvexError({ code: "ACCOUNT_DISABLED", message: "This account is not active." });
  }
  return user;
}

export async function requireRole(ctx: AuthContext, allowed: readonly StaffRole[]): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (!user.roles.some((role) => allowed.includes(role))) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: `One of these roles is required: ${allowed.join(", ")}.`,
    });
  }
  return user;
}

export function secureEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export function requireServiceSecret(provided: string, environmentKey: string): void {
  const expected = process.env[environmentKey];
  if (!isConfiguredSecret(expected) || !secureEqual(provided, expected)) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Invalid service credential." });
  }
}
