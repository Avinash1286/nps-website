import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

export async function writeAudit(
  ctx: MutationCtx,
  actor: Doc<"users"> | null,
  entry: {
    action: string;
    entityType: string;
    entityId?: string;
    summary: string;
    metadata?: Record<string, string>;
  },
): Promise<void> {
  await ctx.db.insert("auditLogs", {
    actorId: actor?._id,
    actorClerkId: actor?.clerkUserId,
    ...entry,
    createdAt: Date.now(),
  });
}
