import { ConvexError, v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { writeAudit } from "./lib/audit";
import { enqueueJob } from "./lib/jobs";
import { shortHash } from "./lib/input";
import { recordDeleted, recordStatusChanged } from "./lib/metrics";
import { adjustCampaignOutcome } from "./lib/newsletter";
import { isConfiguredSecret } from "./lib/secrets";

const CONTENT_TYPES = [
  "pages",
  "programs",
  "departments",
  "leadership",
  "teachers",
  "news",
  "notices",
  "events",
  "documents",
  "galleryAlbums",
  "testimonials",
  "faqs",
  "homeSections",
  "homeHighlights",
] as const;

const jobTypeValidator = v.union(
  v.literal("contact_receipt"),
  v.literal("contact_staff_alert"),
  v.literal("admission_receipt"),
  v.literal("admission_staff_alert"),
  v.literal("newsletter_confirmation"),
  v.literal("newsletter_campaign_batch"),
  v.literal("newsletter_campaign_delivery"),
  v.literal("event_confirmation"),
  v.literal("content_publish"),
  v.literal("content_expire"),
  v.literal("ai_response"),
  v.literal("retention_cleanup"),
);

const jobStatusValidator = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("retry"),
  v.literal("succeeded"),
  v.literal("dead"),
  v.literal("cancelled"),
);

const jobPayloadValidator = v.object({
  entityType: v.optional(v.string()),
  entityId: v.optional(v.string()),
  recipient: v.optional(v.string()),
  template: v.optional(v.string()),
  conversationId: v.optional(v.id("aiConversations")),
  messageId: v.optional(v.id("aiMessages")),
  userMessageId: v.optional(v.id("aiMessages")),
  campaignId: v.optional(v.id("newsletterCampaigns")),
  campaignGeneration: v.optional(v.number()),
  subscriberId: v.optional(v.id("newsletterSubscribers")),
  metadata: v.optional(v.record(v.string(), v.string())),
});

const jobValidator = v.object({
  _id: v.id("jobs"),
  _creationTime: v.number(),
  type: jobTypeValidator,
  status: jobStatusValidator,
  idempotencyKey: v.string(),
  payload: jobPayloadValidator,
  attempts: v.number(),
  maxAttempts: v.number(),
  runAt: v.number(),
  lockedAt: v.optional(v.number()),
  lastError: v.optional(v.string()),
  resultSummary: v.optional(v.string()),
  campaignOutcome: v.optional(v.union(v.literal("delivered"), v.literal("failed"), v.literal("suppressed"))),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const notificationDataValidator = v.union(
  v.object({ ticketNumber: v.string(), name: v.string(), subject: v.string() }),
  v.object({
    ticketNumber: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    subject: v.string(),
    message: v.string(),
    createdAt: v.number(),
  }),
  v.object({
    applicationNumber: v.string(),
    academicYear: v.string(),
    desiredGrade: v.string(),
    guardianName: v.string(),
  }),
  v.object({
    applicationNumber: v.string(),
    academicYear: v.string(),
    desiredGrade: v.string(),
    studentName: v.string(),
    guardianName: v.string(),
    guardianEmail: v.string(),
    guardianPhone: v.string(),
    submittedAt: v.number(),
  }),
  v.object({
    confirmationToken: v.string(),
    confirmationRouteTemplate: v.string(),
    unsubscribeToken: v.string(),
    unsubscribeRouteTemplate: v.string(),
  }),
  v.object({
    subject: v.string(),
    preheader: v.optional(v.string()),
    bodyText: v.string(),
    unsubscribeToken: v.string(),
    unsubscribeRouteTemplate: v.string(),
  }),
  v.object({
    registrationNumber: v.string(),
    name: v.string(),
    status: v.union(
      v.literal("registered"),
      v.literal("waitlisted"),
      v.literal("cancelled"),
      v.literal("attended"),
      v.literal("no_show"),
    ),
    attendees: v.number(),
    cancellationToken: v.string(),
    cancellationRouteTemplate: v.string(),
    event: v.object({
      title: v.string(),
      slug: v.string(),
      startAt: v.number(),
      endAt: v.number(),
      timezone: v.string(),
      venue: v.optional(v.string()),
      isOnline: v.boolean(),
      accessUrl: v.optional(v.string()),
    }),
  }),
);

const notificationContextValidator = v.object({
  suppressed: v.optional(v.boolean()),
  recipient: v.optional(v.string()),
  template: v.optional(v.string()),
  data: v.union(v.null(), notificationDataValidator),
});

export const refreshPublicationClock = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const clock = await ctx.db
      .query("publicationClock")
      .withIndex("by_singleton_key", (q) => q.eq("singletonKey", "main"))
      .unique();
    if (clock) {
      await ctx.db.patch("publicationClock", clock._id, { currentTime: now, updatedAt: now });
    } else {
      await ctx.db.insert("publicationClock", { singletonKey: "main", currentTime: now, updatedAt: now });
    }
    return null;
  },
});

function isUnsafeWebhookHost(hostname: string): boolean {
  const host = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
  if (
    !host ||
    host === "localhost" ||
    host === "metadata.google.internal" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan")
  ) {
    return true;
  }
  if (host.includes(":")) return true;
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return !host.includes(".");
  const octets = ipv4.slice(1).map(Number);
  if (octets.some((part) => part < 0 || part > 255)) return true;
  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && (second === 0 || second === 168)) ||
    (first === 198 && (second === 18 || second === 19))
  );
}

function notificationWebhookUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("NON_RETRYABLE: notification webhook URL is invalid.");
  }
  if (url.protocol !== "https:" || url.username || url.password || isUnsafeWebhookHost(url.hostname)) {
    throw new Error("NON_RETRYABLE: notification webhook must use a safe public HTTPS URL.");
  }
  const allowlist = (process.env.NOTIFICATION_WEBHOOK_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase().replace(/\.$/, ""))
    .filter(Boolean);
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (allowlist.length > 0 && !allowlist.includes(hostname)) {
    throw new Error("NON_RETRYABLE: notification webhook host is not allowlisted.");
  }
  return url.toString();
}

export const claim = internalMutation({
  args: { jobId: v.id("jobs") },
  returns: v.union(v.null(), jobValidator),
  handler: async (ctx, args) => {
    const job = await ctx.db.get("jobs", args.jobId);
    const now = Date.now();
    if (!job || !["queued", "retry"].includes(job.status) || job.runAt > now) return null;
    await ctx.db.patch("jobs", job._id, {
      status: "running",
      lockedAt: now,
      attempts: job.attempts + 1,
      updatedAt: now,
    });
    await recordStatusChanged(ctx, "jobs", job.status, "running");
    return { ...job, status: "running" as const, attempts: job.attempts + 1, lockedAt: now };
  },
});

export const succeed = internalMutation({
  args: {
    jobId: v.id("jobs"),
    resultSummary: v.optional(v.string()),
    deliveryOutcome: v.optional(v.union(v.literal("delivered"), v.literal("suppressed"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get("jobs", args.jobId);
    if (!job || job.status === "succeeded") return null;
    const now = Date.now();
    let campaignOutcome = job.campaignOutcome;
    if (
      job.type === "newsletter_campaign_delivery" &&
      job.payload.campaignId &&
      job.payload.campaignGeneration !== undefined &&
      !campaignOutcome
    ) {
      campaignOutcome = args.deliveryOutcome ?? "delivered";
      await adjustCampaignOutcome(ctx, {
        campaignId: job.payload.campaignId,
        generation: job.payload.campaignGeneration,
        outcome: campaignOutcome,
        delta: 1,
      });
    }
    await ctx.db.patch("jobs", job._id, {
      status: "succeeded",
      resultSummary: args.resultSummary?.slice(0, 1000),
      campaignOutcome,
      completedAt: now,
      lockedAt: undefined,
      lastError: undefined,
      updatedAt: now,
    });
    await recordStatusChanged(ctx, "jobs", job.status, "succeeded");
    return null;
  },
});

export const fail = internalMutation({
  args: { jobId: v.id("jobs"), error: v.string(), retryable: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get("jobs", args.jobId);
    if (!job || job.status === "succeeded" || job.status === "cancelled") return null;
    const now = Date.now();
    const retryable = args.retryable ?? true;
    const shouldRetry = retryable && job.attempts < job.maxAttempts;
    const delay = Math.min(60 * 60 * 1000, 2 ** Math.max(0, job.attempts - 1) * 30_000);
    const runAt = shouldRetry ? now + delay : job.runAt;
    let campaignOutcome = job.campaignOutcome;
    if (
      !shouldRetry &&
      job.type === "newsletter_campaign_delivery" &&
      job.payload.campaignId &&
      job.payload.campaignGeneration !== undefined &&
      !campaignOutcome
    ) {
      campaignOutcome = "failed";
      await adjustCampaignOutcome(ctx, {
        campaignId: job.payload.campaignId,
        generation: job.payload.campaignGeneration,
        outcome: "failed",
        delta: 1,
      });
    }
    if (
      !shouldRetry &&
      job.type === "newsletter_campaign_batch" &&
      job.payload.campaignId &&
      job.payload.campaignGeneration !== undefined
    ) {
      const campaign = await ctx.db.get("newsletterCampaigns", job.payload.campaignId);
      if (
        campaign &&
        campaign.generation === job.payload.campaignGeneration &&
        (campaign.status === "scheduled" || campaign.status === "queueing")
      ) {
        await ctx.db.patch("newsletterCampaigns", campaign._id, {
          status: "failed",
          completedAt: now,
          updatedAt: now,
        });
        await recordStatusChanged(ctx, "newsletterCampaigns", campaign.status, "failed");
        await writeAudit(ctx, null, {
          action: "newsletter_campaign.queue_failed",
          entityType: "newsletterCampaigns",
          entityId: campaign._id,
          summary: `Failed while queueing newsletter campaign ${campaign.title}.`,
        });
      }
    }
    await ctx.db.patch("jobs", job._id, {
      status: shouldRetry ? "retry" : "dead",
      runAt,
      lockedAt: undefined,
      lastError: args.error.slice(0, 2000),
      campaignOutcome,
      completedAt: shouldRetry ? undefined : now,
      updatedAt: now,
    });
    await recordStatusChanged(ctx, "jobs", job.status, shouldRetry ? "retry" : "dead");
    if (!shouldRetry && job.type === "ai_response" && job.payload.messageId) {
      const message = await ctx.db.get("aiMessages", job.payload.messageId);
      if (message && message.status !== "completed") {
        await ctx.db.patch("aiMessages", message._id, {
          status: "failed",
          error: args.error.slice(0, 1000),
          updatedAt: now,
        });
      }
    }
    if (shouldRetry) {
      await ctx.scheduler.runAfter(delay, internal.jobs.processOne, { jobId: job._id });
    }
    return null;
  },
});

export const queueCampaignBatch = internalMutation({
  args: {
    campaignId: v.id("newsletterCampaigns"),
    generation: v.number(),
  },
  returns: v.object({ queued: v.number(), done: v.boolean() }),
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get("newsletterCampaigns", args.campaignId);
    const now = Date.now();
    if (
      !campaign ||
      campaign.generation !== args.generation ||
      (campaign.status !== "scheduled" && campaign.status !== "queueing")
    ) {
      return { queued: 0, done: true };
    }
    if (campaign.scheduledAt !== undefined && campaign.scheduledAt > now) {
      await enqueueJob(ctx, {
        type: "newsletter_campaign_batch",
        idempotencyKey: `newsletter-batch:${campaign._id}:${campaign.generation}:wake:${campaign.scheduledAt}`,
        payload: {
          campaignId: campaign._id,
          campaignGeneration: campaign.generation,
        },
        runAt: campaign.scheduledAt,
        maxAttempts: 8,
      });
      return { queued: 0, done: false };
    }

    const audienceCutoff = campaign.audienceCutoff ?? now;
    const page = await ctx.db
      .query("newsletterSubscribers")
      .withIndex("by_status_confirmed_at", (q) =>
        q.eq("status", "active").gt("confirmedAt", 0).lte("confirmedAt", audienceCutoff),
      )
      .order("asc")
      .paginate({ cursor: campaign.paginationCursor ?? null, numItems: 75 });

    for (const subscriber of page.page) {
      await enqueueJob(ctx, {
        type: "newsletter_campaign_delivery",
        idempotencyKey: `newsletter-delivery:${campaign._id}:${campaign.generation}:${subscriber._id}`,
        payload: {
          campaignId: campaign._id,
          campaignGeneration: campaign.generation,
          subscriberId: subscriber._id,
          template: "newsletter-campaign",
        },
        maxAttempts: 5,
      });
    }

    const targetCount = campaign.targetCount + page.page.length;
    const processed = campaign.deliveredCount + campaign.failedCount + campaign.suppressedCount;
    const nextStatus = page.isDone ? (processed >= targetCount ? "completed" : "sending") : "queueing";
    await ctx.db.patch("newsletterCampaigns", campaign._id, {
      status: nextStatus,
      audienceCutoff,
      startedAt: campaign.startedAt ?? now,
      completedAt: nextStatus === "completed" ? now : undefined,
      paginationCursor: page.isDone ? undefined : page.continueCursor,
      targetCount,
      updatedAt: now,
    });
    await recordStatusChanged(ctx, "newsletterCampaigns", campaign.status, nextStatus);

    if (!page.isDone) {
      await enqueueJob(ctx, {
        type: "newsletter_campaign_batch",
        idempotencyKey: `newsletter-batch:${campaign._id}:${campaign.generation}:${shortHash(page.continueCursor)}`,
        payload: {
          campaignId: campaign._id,
          campaignGeneration: campaign.generation,
        },
        maxAttempts: 8,
      });
    } else {
      await writeAudit(ctx, null, {
        action: nextStatus === "completed" ? "newsletter_campaign.completed" : "newsletter_campaign.queued",
        entityType: "newsletterCampaigns",
        entityId: campaign._id,
        summary:
          nextStatus === "completed"
            ? `Completed newsletter campaign ${campaign.title} with no eligible recipients.`
            : `Queued newsletter campaign ${campaign.title} for ${targetCount} active subscribers.`,
      });
    }
    return { queued: page.page.length, done: page.isDone };
  },
});

export const loadContext = internalQuery({
  args: { jobId: v.id("jobs"), now: v.number() },
  returns: v.union(v.null(), notificationContextValidator),
  handler: async (ctx, args) => {
    const job = await ctx.db.get("jobs", args.jobId);
    if (!job) return null;
    const normalize = (table: string) =>
      job.payload.entityId ? (ctx.db as any).normalizeId(table, job.payload.entityId) : null;

    if (job.type === "contact_receipt" || job.type === "contact_staff_alert") {
      const id = normalize("contacts");
      const contact = id ? await (ctx.db as any).get("contacts", id) : null;
      if (!contact) return null;
      const data =
        job.type === "contact_receipt"
          ? { ticketNumber: contact.ticketNumber, name: contact.name, subject: contact.subject }
          : {
              ticketNumber: contact.ticketNumber,
              name: contact.name,
              email: contact.email,
              phone: contact.phone,
              subject: contact.subject,
              message: contact.message,
              createdAt: contact.createdAt,
            };
      return { recipient: job.payload.recipient, template: job.payload.template, data };
    }

    if (job.type === "admission_receipt" || job.type === "admission_staff_alert") {
      const id = normalize("admissions");
      const admission = id ? await (ctx.db as any).get("admissions", id) : null;
      if (!admission) return null;
      const data =
        job.type === "admission_receipt"
          ? {
              applicationNumber: admission.applicationNumber,
              academicYear: admission.academicYear,
              desiredGrade: admission.desiredGrade,
              guardianName: admission.guardian.name,
            }
          : {
              applicationNumber: admission.applicationNumber,
              academicYear: admission.academicYear,
              desiredGrade: admission.desiredGrade,
              studentName: [
                admission.student.firstName,
                admission.student.middleName,
                admission.student.lastName,
              ]
                .filter(Boolean)
                .join(" "),
              guardianName: admission.guardian.name,
              guardianEmail: admission.guardian.email,
              guardianPhone: admission.guardian.phone,
              submittedAt: admission.submittedAt,
            };
      return { recipient: job.payload.recipient, template: job.payload.template, data };
    }

    if (job.type === "newsletter_confirmation") {
      const id = normalize("newsletterSubscribers");
      const subscriber = id ? await (ctx.db as any).get("newsletterSubscribers", id) : null;
      const confirmationToken = subscriber?.confirmationToken;
      const unsubscribeToken = subscriber?.unsubscribeToken;
      if (!subscriber || !confirmationToken || !unsubscribeToken) return null;
      if (
        subscriber.status !== "pending" ||
        (subscriber.confirmationExpiresAt !== undefined && subscriber.confirmationExpiresAt <= args.now)
      ) {
        return { suppressed: true, recipient: undefined, template: job.payload.template, data: null };
      }
      return {
        recipient: job.payload.recipient,
        template: job.payload.template,
        data: {
          confirmationToken,
          confirmationRouteTemplate: "/newsletter/confirm?token={token}",
          unsubscribeToken,
          unsubscribeRouteTemplate: "/newsletter/unsubscribe?token={token}",
        },
      };
    }

    if (job.type === "newsletter_campaign_delivery") {
      const campaign = job.payload.campaignId
        ? await ctx.db.get("newsletterCampaigns", job.payload.campaignId)
        : null;
      const subscriber = job.payload.subscriberId
        ? await ctx.db.get("newsletterSubscribers", job.payload.subscriberId)
        : null;
      const eligible =
        campaign &&
        subscriber &&
        campaign.generation === job.payload.campaignGeneration &&
        (campaign.status === "queueing" || campaign.status === "sending") &&
        subscriber.status === "active";
      if (!eligible) {
        return { suppressed: true, recipient: undefined, template: job.payload.template, data: null };
      }
      return {
        suppressed: false,
        recipient: subscriber.email,
        template: job.payload.template,
        data: {
          subject: campaign.subject,
          preheader: campaign.preheader,
          bodyText: campaign.body,
          unsubscribeToken: subscriber.unsubscribeToken,
          unsubscribeRouteTemplate: "/newsletter/unsubscribe?token={token}",
        },
      };
    }

    if (job.type === "event_confirmation") {
      const id = normalize("eventRegistrations");
      const registration = id ? await (ctx.db as any).get("eventRegistrations", id) : null;
      const event = registration ? await ctx.db.get("events", registration.eventId) : null;
      if (!registration || !event) return null;
      const expectedStatus = job.payload.metadata?.expectedStatus;
      if (expectedStatus && registration.status !== expectedStatus) {
        return { suppressed: true, recipient: undefined, template: job.payload.template, data: null };
      }
      if (registration.status === "cancelled" && job.payload.template !== "event-cancelled") {
        return { suppressed: true, recipient: undefined, template: job.payload.template, data: null };
      }
      return {
        recipient: job.payload.recipient,
        template: job.payload.template,
        data: {
          registrationNumber: registration.registrationNumber,
          name: registration.name,
          status: registration.status,
          attendees: registration.attendees,
          cancellationToken: registration.cancellationToken,
          cancellationRouteTemplate: "/events/cancel?token={token}",
          event: {
            title: event.title,
            slug: event.slug,
            startAt: event.startAt,
            endAt: event.endAt,
            timezone: event.timezone,
            venue: event.venue,
            isOnline: event.isOnline,
            accessUrl: event.isOnline && registration.status === "registered" ? event.meetingUrl : undefined,
          },
        },
      };
    }

    return null;
  },
});

export const transitionContent = internalMutation({
  args: {
    type: v.string(),
    id: v.string(),
    transition: v.union(v.literal("publish"), v.literal("expire")),
  },
  returns: v.object({ changed: v.boolean() }),
  handler: async (ctx, args) => {
    if (!(CONTENT_TYPES as readonly string[]).includes(args.type)) {
      throw new ConvexError({ code: "INVALID_CONTENT_TYPE", message: "Invalid content type." });
    }
    const id = (ctx.db as any).normalizeId(args.type, args.id);
    if (!id) return { changed: false };
    const row = await (ctx.db as any).get(args.type, id);
    if (!row) return { changed: false };
    const now = Date.now();
    if (args.transition === "publish") {
      if (row.status !== "scheduled" || !row.publishAt || row.publishAt > now) return { changed: false };
      await (ctx.db as any).patch(args.type, id, { status: "published", publishedAt: now, updatedAt: now });
      await recordStatusChanged(ctx, `content:${args.type}`, row.status, "published");
      await writeAudit(ctx, null, {
        action: "content.auto_published",
        entityType: args.type,
        entityId: args.id,
        summary: "Automatically published scheduled content.",
      });
      return { changed: true };
    }
    if (row.status !== "published" || !row.expireAt || row.expireAt > now) return { changed: false };
    await (ctx.db as any).patch(args.type, id, { status: "archived", updatedAt: now });
    await recordStatusChanged(ctx, `content:${args.type}`, row.status, "archived");
    await writeAudit(ctx, null, {
      action: "content.auto_archived",
      entityType: args.type,
      entityId: args.id,
      summary: "Automatically archived expired content.",
    });
    return { changed: true };
  },
});

export const processOne = internalAction({
  args: { jobId: v.id("jobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.runMutation(internal.jobs.claim, { jobId: args.jobId });
    if (!job) return null;
    try {
      let resultSummary = "Completed.";
      let deliveryOutcome: "delivered" | "suppressed" | undefined;
      if (job.type === "content_publish" || job.type === "content_expire") {
        if (!job.payload.entityType || !job.payload.entityId)
          throw new Error("Content job payload is incomplete.");
        const result = await ctx.runMutation(internal.jobs.transitionContent, {
          type: job.payload.entityType,
          id: job.payload.entityId,
          transition: job.type === "content_publish" ? "publish" : "expire",
        });
        resultSummary = result.changed ? "Content transition applied." : "Content was already up to date.";
      } else if (job.type === "ai_response") {
        resultSummary = await ctx.runAction(internal.assistant.generateQueued, { jobId: job._id });
      } else if (job.type === "retention_cleanup") {
        const result = await ctx.runMutation(internal.jobs.cleanupRetention, {});
        resultSummary = `Removed ${result.deleted} expired records.`;
      } else if (job.type === "newsletter_campaign_batch") {
        if (!job.payload.campaignId || job.payload.campaignGeneration === undefined) {
          throw new Error("NON_RETRYABLE: newsletter campaign batch payload is incomplete.");
        }
        const result = await ctx.runMutation(internal.jobs.queueCampaignBatch, {
          campaignId: job.payload.campaignId,
          generation: job.payload.campaignGeneration,
        });
        resultSummary = result.done
          ? `Finished queueing campaign recipients (${result.queued} in final batch).`
          : `Queued ${result.queued} campaign recipients.`;
      } else {
        const context = await ctx.runQuery(internal.jobs.loadContext, {
          jobId: job._id,
          now: Date.now(),
        });
        if (context?.suppressed) {
          deliveryOutcome = "suppressed";
          resultSummary = "Suppressed notification for an ineligible recipient.";
        } else {
          if (!context?.data) throw new Error("NON_RETRYABLE: Notification context is unavailable.");
          const rawWebhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
          const webhookSecret = process.env.NOTIFICATION_WEBHOOK_SECRET?.trim();
          if (!rawWebhookUrl || !isConfiguredSecret(webhookSecret)) {
            await ctx.runMutation(internal.jobs.fail, {
              jobId: job._id,
              error:
                "NOTIFICATION_WEBHOOK_URL and a NOTIFICATION_WEBHOOK_SECRET of at least 32 characters are required.",
              retryable: false,
            });
            return null;
          }
          const webhookUrl = notificationWebhookUrl(rawWebhookUrl);
          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${webhookSecret}`,
              "x-idempotency-key": job.idempotencyKey,
            },
            body: JSON.stringify({
              version: 1,
              type: job.type,
              idempotencyKey: job.idempotencyKey,
              recipient: context.recipient,
              template: context.template,
              data: context.data,
            }),
            redirect: "error",
            signal: AbortSignal.timeout(12_000),
          });
          if (!response.ok) {
            const body = (await response.text()).slice(0, 500);
            const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
            throw new Error(
              `${retryable ? "RETRYABLE" : "NON_RETRYABLE"}: webhook returned ${response.status}: ${body}`,
            );
          }
          if (job.type === "newsletter_campaign_delivery") deliveryOutcome = "delivered";
          resultSummary = `Notification webhook accepted (${response.status}).`;
        }
      }
      await ctx.runMutation(internal.jobs.succeed, {
        jobId: job._id,
        resultSummary,
        deliveryOutcome,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown job failure.";
      const retryable =
        !message.includes("NON_RETRYABLE") &&
        !message.includes("Invalid content type") &&
        !message.includes("payload is incomplete");
      await ctx.runMutation(internal.jobs.fail, { jobId: job._id, error: message, retryable });
    }
    return null;
  },
});

export const dispatchDue = internalMutation({
  args: {},
  returns: v.object({ dispatched: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    const [queued, retry] = await Promise.all([
      ctx.db
        .query("jobs")
        .withIndex("by_status_run_at", (q) => q.eq("status", "queued").lte("runAt", now))
        .take(50),
      ctx.db
        .query("jobs")
        .withIndex("by_status_run_at", (q) => q.eq("status", "retry").lte("runAt", now))
        .take(50),
    ]);
    for (const job of [...queued, ...retry]) {
      await ctx.scheduler.runAfter(0, internal.jobs.processOne, { jobId: job._id });
    }
    return { dispatched: queued.length + retry.length };
  },
});

export const recoverStale = internalMutation({
  args: {},
  returns: v.object({ recovered: v.number() }),
  handler: async (ctx) => {
    const cutoff = Date.now() - 15 * 60 * 1000;
    const running = await ctx.db
      .query("jobs")
      .withIndex("by_status_locked_at", (q) =>
        q.eq("status", "running").gt("lockedAt", 0).lt("lockedAt", cutoff),
      )
      .take(100);
    let recovered = 0;
    for (const job of running) {
      if (job.lockedAt !== undefined && job.lockedAt < cutoff) {
        const nextStatus = job.attempts < job.maxAttempts ? "retry" : "dead";
        const now = Date.now();
        let campaignOutcome = job.campaignOutcome;
        if (
          nextStatus === "dead" &&
          job.type === "newsletter_campaign_delivery" &&
          job.payload.campaignId &&
          job.payload.campaignGeneration !== undefined &&
          !campaignOutcome
        ) {
          campaignOutcome = "failed";
          await adjustCampaignOutcome(ctx, {
            campaignId: job.payload.campaignId,
            generation: job.payload.campaignGeneration,
            outcome: "failed",
            delta: 1,
          });
        }
        if (
          nextStatus === "dead" &&
          job.type === "newsletter_campaign_batch" &&
          job.payload.campaignId &&
          job.payload.campaignGeneration !== undefined
        ) {
          const campaign = await ctx.db.get("newsletterCampaigns", job.payload.campaignId);
          if (
            campaign &&
            campaign.generation === job.payload.campaignGeneration &&
            (campaign.status === "scheduled" || campaign.status === "queueing")
          ) {
            await ctx.db.patch("newsletterCampaigns", campaign._id, {
              status: "failed",
              completedAt: now,
              updatedAt: now,
            });
            await recordStatusChanged(ctx, "newsletterCampaigns", campaign.status, "failed");
            await writeAudit(ctx, null, {
              action: "newsletter_campaign.queue_failed",
              entityType: "newsletterCampaigns",
              entityId: campaign._id,
              summary: `Timed out while queueing newsletter campaign ${campaign.title}.`,
            });
          }
        }
        await ctx.db.patch("jobs", job._id, {
          status: nextStatus,
          runAt: now,
          lockedAt: undefined,
          lastError: "Recovered after a stale worker lock.",
          campaignOutcome,
          completedAt: nextStatus === "dead" ? now : undefined,
          updatedAt: now,
        });
        await recordStatusChanged(ctx, "jobs", job.status, nextStatus);
        if (nextStatus === "dead" && job.type === "ai_response" && job.payload.messageId) {
          const message = await ctx.db.get("aiMessages", job.payload.messageId);
          if (message && message.status !== "completed") {
            await ctx.db.patch("aiMessages", message._id, {
              status: "failed",
              error: "The background assistant request timed out.",
              updatedAt: now,
            });
          }
        }
        recovered += 1;
      }
    }
    return { recovered };
  },
});

export const sweepPublication = internalMutation({
  args: {},
  returns: v.object({ published: v.number(), archived: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    let published = 0;
    let archived = 0;
    for (const type of CONTENT_TYPES) {
      const scheduled = await (ctx.db.query(type) as any)
        .withIndex("by_status_publish_at", (q: any) =>
          q.eq("status", "scheduled").gt("publishAt", 0).lte("publishAt", now),
        )
        .take(25);
      for (const row of scheduled) {
        await (ctx.db as any).patch(type, row._id, { status: "published", publishedAt: now, updatedAt: now });
        await recordStatusChanged(ctx, `content:${type}`, row.status, "published");
        await writeAudit(ctx, null, {
          action: "content.auto_published",
          entityType: type,
          entityId: row._id,
          summary: "Published scheduled content during the publication sweep.",
        });
        published += 1;
      }
      const expired = await (ctx.db.query(type) as any)
        .withIndex("by_status_expire_at", (q: any) =>
          q.eq("status", "published").gt("expireAt", 0).lte("expireAt", now),
        )
        .take(25);
      for (const row of expired) {
        if (row.expireAt !== undefined && row.expireAt <= now) {
          await (ctx.db as any).patch(type, row._id, { status: "archived", updatedAt: now });
          await recordStatusChanged(ctx, `content:${type}`, row.status, "archived");
          await writeAudit(ctx, null, {
            action: "content.auto_archived",
            entityType: type,
            entityId: row._id,
            summary: "Archived expired content during the publication sweep.",
          });
          archived += 1;
        }
      }
    }
    return { published, archived };
  },
});

function retentionDays(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : fallback;
}

const retentionPhaseValidator = v.union(
  v.literal("aiConversations"),
  v.literal("rateLimits"),
  v.literal("auditLogs"),
  v.literal("pendingSubscribers"),
  v.literal("unsubscribedSubscribers"),
  v.literal("bouncedSubscribers"),
  v.literal("resolvedContacts"),
  v.literal("closedContacts"),
  v.literal("spamContacts"),
  v.literal("enrolledAdmissions"),
  v.literal("declinedAdmissions"),
  v.literal("withdrawnAdmissions"),
  v.literal("eventRegistrations"),
  v.literal("succeededJobs"),
  v.literal("cancelledJobs"),
  v.literal("deadJobs"),
);

type RetentionPhase =
  | "aiConversations"
  | "rateLimits"
  | "auditLogs"
  | "pendingSubscribers"
  | "unsubscribedSubscribers"
  | "bouncedSubscribers"
  | "resolvedContacts"
  | "closedContacts"
  | "spamContacts"
  | "enrolledAdmissions"
  | "declinedAdmissions"
  | "withdrawnAdmissions"
  | "eventRegistrations"
  | "succeededJobs"
  | "cancelledJobs"
  | "deadJobs";

const RETENTION_PHASES: readonly RetentionPhase[] = [
  "aiConversations",
  "rateLimits",
  "auditLogs",
  "pendingSubscribers",
  "unsubscribedSubscribers",
  "bouncedSubscribers",
  "resolvedContacts",
  "closedContacts",
  "spamContacts",
  "enrolledAdmissions",
  "declinedAdmissions",
  "withdrawnAdmissions",
  "eventRegistrations",
  "succeededJobs",
  "cancelledJobs",
  "deadJobs",
] as const;

const RETENTION_BATCH_SIZE = 50;
const AI_MESSAGE_RETENTION_BATCH_SIZE = 40;
const REGISTRATION_RETENTION_BATCH_SIZE = 40;

function nextRetentionPhase(phase: RetentionPhase): RetentionPhase | null {
  const index = RETENTION_PHASES.indexOf(phase);
  return index >= 0 && index + 1 < RETENTION_PHASES.length ? RETENTION_PHASES[index + 1] : null;
}

export const cleanupRetention = internalMutation({
  args: {
    phase: v.optional(retentionPhaseValidator),
    cursor: v.optional(v.string()),
  },
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx, args): Promise<{ deleted: number }> => {
    const now = Date.now();
    const phase: RetentionPhase = args.phase ?? "aiConversations";
    let deleted = 0;
    const remove = async (table: string, id: any, counterPrefix?: string, status?: string) => {
      await (ctx.db as any).delete(table, id);
      if (counterPrefix && status) await recordDeleted(ctx, counterPrefix, status);
      deleted += 1;
    };
    const schedule = async (nextPhase: RetentionPhase, cursor?: string) => {
      await ctx.scheduler.runAfter(0, internal.jobs.cleanupRetention, {
        phase: nextPhase,
        ...(cursor ? { cursor } : {}),
      });
    };
    const finishBatch = async (batchWasFull: boolean) => {
      if (batchWasFull) {
        // Repeating a phase is safe only after every selected row was deleted,
        // which guarantees progress and prevents a self-scheduling hot loop.
        await schedule(phase);
      } else {
        const next = nextRetentionPhase(phase);
        if (next) await schedule(next);
      }
      return { deleted };
    };

    if (phase === "aiConversations") {
      const expiredConversations = await ctx.db
        .query("aiConversations")
        .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
        .take(2);
      const conversation = expiredConversations[0];
      if (!conversation) return await finishBatch(false);
      const messages = await ctx.db
        .query("aiMessages")
        .withIndex("by_conversation_created_at", (q) => q.eq("conversationId", conversation._id))
        .take(AI_MESSAGE_RETENTION_BATCH_SIZE);
      for (const message of messages) await remove("aiMessages", message._id);
      if (messages.length === AI_MESSAGE_RETENTION_BATCH_SIZE) {
        await schedule(phase);
        return { deleted };
      }
      if (conversation.agentThreadId) {
        // The component mutation schedules its own bounded continuation until
        // the durable Agent thread has been fully removed.
        await ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, {
          threadId: conversation.agentThreadId,
        });
      }
      await remove("aiConversations", conversation._id);
      if (expiredConversations.length > 1) await schedule(phase);
      else {
        const next = nextRetentionPhase(phase);
        if (next) await schedule(next);
      }
      return { deleted };
    }

    if (phase === "rateLimits") {
      const rateCutoff = now - 7 * 24 * 60 * 60 * 1000;
      const rows = await ctx.db
        .query("rateLimits")
        .withIndex("by_updated_at", (q) => q.lt("updatedAt", rateCutoff))
        .take(RETENTION_BATCH_SIZE);
      for (const row of rows) await remove("rateLimits", row._id);
      return await finishBatch(rows.length === RETENTION_BATCH_SIZE);
    }

    if (phase === "auditLogs") {
      const auditCutoff = now - retentionDays("AUDIT_RETENTION_DAYS", 730) * 24 * 60 * 60 * 1000;
      const rows = await ctx.db
        .query("auditLogs")
        .withIndex("by_created_at", (q) => q.lt("createdAt", auditCutoff))
        .take(RETENTION_BATCH_SIZE);
      for (const row of rows) await remove("auditLogs", row._id);
      return await finishBatch(rows.length === RETENTION_BATCH_SIZE);
    }

    if (phase === "pendingSubscribers") {
      const rows = await ctx.db
        .query("newsletterSubscribers")
        .withIndex("by_status_confirmation_expires_at", (q) =>
          q.eq("status", "pending").gt("confirmationExpiresAt", 0).lt("confirmationExpiresAt", now),
        )
        .take(RETENTION_BATCH_SIZE);
      for (const row of rows) {
        await remove("newsletterSubscribers", row._id, "workflows:newsletter", row.status);
      }
      return await finishBatch(rows.length === RETENTION_BATCH_SIZE);
    }

    if (phase === "unsubscribedSubscribers" || phase === "bouncedSubscribers") {
      const status = phase === "unsubscribedSubscribers" ? "unsubscribed" : "bounced";
      const cutoff = now - retentionDays("NEWSLETTER_SUPPRESSION_RETENTION_DAYS", 1095) * 24 * 60 * 60 * 1000;
      const rows = await ctx.db
        .query("newsletterSubscribers")
        .withIndex("by_status_updated_at", (q) => q.eq("status", status).lt("updatedAt", cutoff))
        .take(RETENTION_BATCH_SIZE);
      for (const row of rows) {
        await remove("newsletterSubscribers", row._id, "workflows:newsletter", row.status);
      }
      if (rows.length > 0) {
        await writeAudit(ctx, null, {
          action: "retention.sensitive_records_deleted",
          entityType: "retention",
          summary: `Retention cleanup deleted ${rows.length} ${status} newsletter suppression records.`,
          metadata: { newsletterSuppressions: String(rows.length), status },
        });
      }
      return await finishBatch(rows.length === RETENTION_BATCH_SIZE);
    }

    if (phase === "resolvedContacts" || phase === "closedContacts" || phase === "spamContacts") {
      const status =
        phase === "resolvedContacts" ? "resolved" : phase === "closedContacts" ? "closed" : "spam";
      const cutoff = now - retentionDays("WORKFLOW_RETENTION_DAYS", 1095) * 24 * 60 * 60 * 1000;
      const rows = await ctx.db
        .query("contacts")
        .withIndex("by_status_updated_at", (q) => q.eq("status", status).lt("updatedAt", cutoff))
        .take(RETENTION_BATCH_SIZE);
      for (const row of rows) await remove("contacts", row._id, "workflows:contacts", row.status);
      return await finishBatch(rows.length === RETENTION_BATCH_SIZE);
    }

    if (phase === "enrolledAdmissions" || phase === "declinedAdmissions" || phase === "withdrawnAdmissions") {
      const status =
        phase === "enrolledAdmissions"
          ? "enrolled"
          : phase === "declinedAdmissions"
            ? "declined"
            : "withdrawn";
      const cutoff = now - retentionDays("ADMISSION_RETENTION_DAYS", 2555) * 24 * 60 * 60 * 1000;
      const rows = await ctx.db
        .query("admissions")
        .withIndex("by_status_updated_at", (q) => q.eq("status", status).lt("updatedAt", cutoff))
        .take(RETENTION_BATCH_SIZE);
      for (const row of rows) {
        await remove("admissions", row._id, "workflows:admissions", row.status);
      }
      if (rows.length > 0) {
        await writeAudit(ctx, null, {
          action: "retention.sensitive_records_deleted",
          entityType: "retention",
          summary: `Retention cleanup deleted ${rows.length} terminal ${status} admission records.`,
          metadata: { terminalAdmissions: String(rows.length), status },
        });
      }
      return await finishBatch(rows.length === RETENTION_BATCH_SIZE);
    }

    if (phase === "eventRegistrations") {
      const cutoff = now - retentionDays("WORKFLOW_RETENTION_DAYS", 1095) * 24 * 60 * 60 * 1000;
      const page = await ctx.db
        .query("eventRegistrations")
        .withIndex("by_created_at", (q) => q.lt("createdAt", cutoff))
        .order("asc")
        .paginate({ cursor: args.cursor ?? null, numItems: REGISTRATION_RETENTION_BATCH_SIZE });
      for (const row of page.page) {
        const event = await ctx.db.get("events", row.eventId);
        // A cursor advances past retained registrations, so a young event can
        // never pin the cleanup loop in front of older eligible rows.
        if (event && event.endAt >= cutoff) continue;
        if (
          event?.registeredAttendeeCount !== undefined &&
          (row.status === "registered" || row.status === "attended" || row.status === "no_show")
        ) {
          await ctx.db.patch("events", event._id, {
            registeredAttendeeCount: Math.max(0, event.registeredAttendeeCount - row.attendees),
          });
        }
        await remove("eventRegistrations", row._id, "workflows:eventRegistrations", row.status);
      }
      if (!page.isDone) await schedule(phase, page.continueCursor);
      else {
        const next = nextRetentionPhase(phase);
        if (next) await schedule(next);
      }
      return { deleted };
    }

    if (phase === "succeededJobs" || phase === "cancelledJobs" || phase === "deadJobs") {
      const status =
        phase === "succeededJobs" ? "succeeded" : phase === "cancelledJobs" ? "cancelled" : "dead";
      const cutoff = now - retentionDays("JOB_RETENTION_DAYS", 90) * 24 * 60 * 60 * 1000;
      const rows = await ctx.db
        .query("jobs")
        .withIndex("by_status_updated_at", (q) => q.eq("status", status).lt("updatedAt", cutoff))
        .take(RETENTION_BATCH_SIZE);
      for (const row of rows) {
        await remove("jobs", row._id, "jobs", row.status);
      }
      return await finishBatch(rows.length === RETENTION_BATCH_SIZE);
    }

    return { deleted };
  },
});
