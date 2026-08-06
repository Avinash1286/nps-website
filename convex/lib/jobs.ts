import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { recordCreated } from "./metrics";

export async function enqueueJob(
  ctx: MutationCtx,
  input: {
    type: Doc<"jobs">["type"];
    idempotencyKey: string;
    payload: Doc<"jobs">["payload"];
    runAt?: number;
    maxAttempts?: number;
  },
): Promise<Id<"jobs">> {
  const existing = await ctx.db
    .query("jobs")
    .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", input.idempotencyKey))
    .unique();
  if (existing) return existing._id;

  const now = Date.now();
  const jobId = await ctx.db.insert("jobs", {
    type: input.type,
    status: "queued",
    idempotencyKey: input.idempotencyKey,
    payload: input.payload,
    attempts: 0,
    maxAttempts: input.maxAttempts ?? 5,
    runAt: input.runAt ?? now,
    createdAt: now,
    updatedAt: now,
  });
  await recordCreated(ctx, "jobs", "queued");
  await ctx.scheduler.runAfter(Math.max(0, (input.runAt ?? now) - now), internal.jobs.processOne, {
    jobId,
  });
  return jobId;
}
