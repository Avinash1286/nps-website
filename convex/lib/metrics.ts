import type { MutationCtx } from "../_generated/server";

export async function adjustCounter(ctx: MutationCtx, key: string, delta: number): Promise<void> {
  if (!delta) return;
  const existing = await ctx.db
    .query("counters")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  const now = Date.now();
  if (existing) {
    await ctx.db.patch("counters", existing._id, {
      value: Math.max(0, existing.value + delta),
      updatedAt: now,
    });
  } else if (delta > 0) {
    await ctx.db.insert("counters", { key, value: delta, updatedAt: now });
  }
}

export async function recordCreated(ctx: MutationCtx, prefix: string, status: string): Promise<void> {
  await adjustCounter(ctx, `${prefix}:total`, 1);
  await adjustCounter(ctx, `${prefix}:status:${status}`, 1);
}

export async function recordDeleted(ctx: MutationCtx, prefix: string, status: string): Promise<void> {
  await adjustCounter(ctx, `${prefix}:total`, -1);
  await adjustCounter(ctx, `${prefix}:status:${status}`, -1);
}

export async function recordStatusChanged(
  ctx: MutationCtx,
  prefix: string,
  previousStatus: string,
  nextStatus: string,
): Promise<void> {
  if (previousStatus === nextStatus) return;
  await adjustCounter(ctx, `${prefix}:status:${previousStatus}`, -1);
  await adjustCounter(ctx, `${prefix}:status:${nextStatus}`, 1);
}
