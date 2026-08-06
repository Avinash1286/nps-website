import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";

export async function enforceRateLimit(
  ctx: MutationCtx,
  options: {
    key: string;
    scope: string;
    limit: number;
    windowMs: number;
    blockMs?: number;
  },
): Promise<number> {
  const now = Date.now();
  const blockUntil = (windowStartedAt: number) =>
    options.blockMs === undefined ? windowStartedAt + options.windowMs : now + options.blockMs;
  const row = await ctx.db
    .query("rateLimits")
    .withIndex("by_key_scope", (q) => q.eq("key", options.key).eq("scope", options.scope))
    .unique();

  if (row?.blockedUntil && row.blockedUntil > now) {
    throw new ConvexError({
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again later.",
      retryAfterMs: row.blockedUntil - now,
    });
  }

  if (!row || now - row.windowStartedAt >= options.windowMs) {
    const blockedUntil = options.limit <= 1 ? now + (options.blockMs ?? options.windowMs) : undefined;
    if (row) {
      await ctx.db.patch("rateLimits", row._id, {
        windowStartedAt: now,
        count: 1,
        blockedUntil,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("rateLimits", {
        key: options.key,
        scope: options.scope,
        windowStartedAt: now,
        count: 1,
        blockedUntil,
        updatedAt: now,
      });
    }
    return options.limit - 1;
  }

  if (row.count >= options.limit) {
    const blockedUntil = blockUntil(row.windowStartedAt);
    await ctx.db.patch("rateLimits", row._id, { blockedUntil, updatedAt: now });
    throw new ConvexError({
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again later.",
      retryAfterMs: blockedUntil - now,
    });
  }

  const nextCount = row.count + 1;
  const blockedUntil = nextCount >= options.limit ? blockUntil(row.windowStartedAt) : undefined;
  await ctx.db.patch("rateLimits", row._id, { count: nextCount, blockedUntil, updatedAt: now });
  return Math.max(0, options.limit - nextCount);
}
