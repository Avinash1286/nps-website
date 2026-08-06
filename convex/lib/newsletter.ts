import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { writeAudit } from "./audit";
import { recordStatusChanged } from "./metrics";

type CampaignOutcome = "delivered" | "failed" | "suppressed";

export async function adjustCampaignOutcome(
  ctx: MutationCtx,
  input: {
    campaignId: Id<"newsletterCampaigns">;
    generation: number;
    outcome: CampaignOutcome;
    delta: 1 | -1;
  },
): Promise<void> {
  const campaign = await ctx.db.get("newsletterCampaigns", input.campaignId);
  if (!campaign || campaign.generation !== input.generation) return;

  const field =
    input.outcome === "delivered"
      ? "deliveredCount"
      : input.outcome === "failed"
        ? "failedCount"
        : "suppressedCount";
  const nextValue = Math.max(0, campaign[field] + input.delta);
  const totals = {
    deliveredCount: field === "deliveredCount" ? nextValue : campaign.deliveredCount,
    failedCount: field === "failedCount" ? nextValue : campaign.failedCount,
    suppressedCount: field === "suppressedCount" ? nextValue : campaign.suppressedCount,
  };
  const processed = totals.deliveredCount + totals.failedCount + totals.suppressedCount;
  let nextStatus = campaign.status;
  if (input.delta < 0 && campaign.status === "completed") nextStatus = "sending";
  if (input.delta > 0 && campaign.status === "sending" && processed >= campaign.targetCount) {
    nextStatus = "completed";
  }
  const now = Date.now();
  await ctx.db.patch("newsletterCampaigns", campaign._id, {
    [field]: nextValue,
    status: nextStatus,
    completedAt: nextStatus === "completed" ? (campaign.completedAt ?? now) : undefined,
    updatedAt: now,
  });
  if (nextStatus !== campaign.status) {
    await recordStatusChanged(ctx, "newsletterCampaigns", campaign.status, nextStatus);
    await writeAudit(ctx, null, {
      action:
        nextStatus === "completed"
          ? "newsletter_campaign.completed"
          : "newsletter_campaign.delivery_reopened",
      entityType: "newsletterCampaigns",
      entityId: campaign._id,
      summary:
        nextStatus === "completed"
          ? `Completed newsletter campaign ${campaign.title}.`
          : `Reopened delivery tracking for newsletter campaign ${campaign.title}.`,
    });
  }
}
