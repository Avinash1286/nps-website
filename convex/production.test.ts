import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

async function insertUser(
  t: ReturnType<typeof convexTest>,
  clerkUserId: string,
  roles: Array<"admin" | "publisher" | "editor" | "admissions">,
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("users", {
      clerkUserId,
      email: `${clerkUserId}@example.test`,
      name: clerkUserId,
      roles,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  });
}

describe("production authorization boundaries", () => {
  it("rejects unauthenticated dashboard access and limits admissions staff to admissions data", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.admin.dashboard, {})).rejects.toThrow();

    await insertUser(t, "admissions-user", ["admissions"]);
    const asAdmissions = t.withIdentity({ subject: "admissions-user" });
    const admissions = await asAdmissions.query(api.admin.listSubmissions, {
      type: "admissions",
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(admissions.page).toEqual([]);
    await expect(
      asAdmissions.query(api.admin.listSubmissions, {
        type: "contacts",
        paginationOpts: { numItems: 10, cursor: null },
      }),
    ).rejects.toThrow();
  });

  it("does not let staff bypass newsletter double opt-in", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "admin-user", ["admin"]);
    const subscriberId = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("newsletterSubscribers", {
        lastIdempotencyKey: "test-idempotency-key",
        email: "pending@example.test",
        status: "pending",
        consentAt: now,
        confirmationExpiresAt: now + 60_000,
        confirmationToken: "confirmation-token",
        unsubscribeToken: "unsubscribe-token",
        createdAt: now,
        updatedAt: now,
      });
    });
    const asAdmin = t.withIdentity({ subject: "admin-user" });

    // Deliberately bypass generated client types to verify the server-side validator rejects reactivation.
    await expect(
      asAdmin.mutation(api.admin.updateSubscriber, {
        subscriberId,
        // @ts-expect-error "active" intentionally exercises the runtime validator.
        status: "active",
      }),
    ).rejects.toThrow();
    await asAdmin.mutation(api.admin.updateSubscriber, { subscriberId, status: "unsubscribed" });
    const subscriber = await t.run(async (ctx) => await ctx.db.get("newsletterSubscribers", subscriberId));
    expect(subscriber?.status).toBe("unsubscribed");

    const listed = await asAdmin.query(api.admin.listSubscribers, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(listed.page[0]).not.toHaveProperty("lastIdempotencyKey");
    expect(listed.page[0]).not.toHaveProperty("confirmationToken");
    expect(listed.page[0]).not.toHaveProperty("unsubscribeToken");
  });

  it("enforces staff-role invariants on the server", async () => {
    const t = convexTest(schema, modules);
    const adminId = await insertUser(t, "admin-user", ["admin"]);
    const asAdmin = t.withIdentity({ subject: "admin-user" });

    await expect(
      asAdmin.mutation(api.admin.updateUser, {
        userId: adminId,
        roles: [],
        status: "active",
      }),
    ).rejects.toThrow(/at least one administration role/i);
  });

  it("reserves operational site settings for administrators", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "publisher-user", ["publisher"]);
    const asPublisher = t.withIdentity({ subject: "publisher-user" });
    await expect(asPublisher.query(api.admin.getSiteSettings, {})).rejects.toThrow();
  });

  it("allows administrators to leave public phone and email unset", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "admin-user", ["admin"]);
    const asAdmin = t.withIdentity({ subject: "admin-user" });

    const settingsId = await asAdmin.mutation(api.admin.updateSiteSettings, {
      settings: {
        schoolName: "Nepal Police School",
        shortName: "NPS",
        tagline: "Learning with service",
        description: "Official school website information.",
        contact: {
          address: "Garuda",
          city: "Rautahat",
          country: "Nepal",
          phone: "",
          email: "",
        },
        social: {},
        seo: {},
        academicYear: "2083",
        timezone: "Asia/Kathmandu",
        admissionsOpen: false,
        assistantEnabled: false,
        maintenanceMode: false,
      },
    });

    const settings = await t.run(async (ctx) => ctx.db.get("siteSettings", settingsId));
    expect(settings?.contact).toMatchObject({ phone: "", email: "" });
  });

  it("rejects oversized administration pages at the server boundary", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "admin-user", ["admin"]);
    await expect(
      t.withIdentity({ subject: "admin-user" }).query(api.admin.listUsers, {
        paginationOpts: { numItems: 101, cursor: null },
      }),
    ).rejects.toThrow(/between 1 and 100/i);
  });

  it("applies actor and entity audit filters together", async () => {
    const t = convexTest(schema, modules);
    const adminId = await insertUser(t, "admin-user", ["admin"]);
    const otherId = await insertUser(t, "other-user", ["editor"]);
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("auditLogs", {
        actorId: adminId,
        action: "content.updated",
        entityType: "news",
        summary: "Updated news.",
        createdAt: now,
      });
      await ctx.db.insert("auditLogs", {
        actorId: adminId,
        action: "content.updated",
        entityType: "pages",
        summary: "Updated page.",
        createdAt: now + 1,
      });
      await ctx.db.insert("auditLogs", {
        actorId: otherId,
        action: "content.updated",
        entityType: "news",
        summary: "Another actor updated news.",
        createdAt: now + 2,
      });
    });

    const result = await t.withIdentity({ subject: "admin-user" }).query(api.admin.listAuditLogs, {
      actorId: adminId,
      entityType: "news",
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(result.page).toHaveLength(1);
    expect(result.page[0]?.summary).toBe("Updated news.");
  });

  it("rejects a content payload whose shape does not match its declared collection", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "admin-user", ["admin"]);
    const asAdmin = t.withIdentity({ subject: "admin-user" });
    await expect(
      asAdmin.mutation(
        api.admin.upsertContent,
        // Deliberately bypass generated types to exercise the runtime
        // discriminated-union validator at the public function boundary.
        {
          payload: { type: "pages", data: { question: "Mismatched", answer: "Payload" } },
        } as never,
      ),
    ).rejects.toThrow();
  });

  it("does not publish content whose declared publication time is still in the future", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "publisher-user", ["publisher"]);
    const asPublisher = t.withIdentity({ subject: "publisher-user" });
    await expect(
      asPublisher.mutation(api.admin.upsertContent, {
        payload: {
          type: "pages",
          data: {
            slug: "future-published-page",
            title: "Future published page",
            body: "This record must use scheduled status while its publication time is in the future.",
            status: "published",
            publishAt: Date.now() + 86_400_000,
          },
        },
      }),
    ).rejects.toThrow(/scheduled status/i);
  });

  it("prevents an administrator from promoting a waitlist beyond event capacity", async () => {
    const t = convexTest(schema, modules);
    const adminId = await insertUser(t, "admin-user", ["admin"]);
    const { eventId, waitlistedId } = await t.run(async (ctx) => {
      const now = Date.now();
      const eventId = await ctx.db.insert("events", {
        slug: "capacity-test",
        title: "Capacity test",
        description: "A production capacity invariant test event.",
        startAt: now + 86_400_000,
        endAt: now + 90_000_000,
        timezone: "Asia/Kathmandu",
        isOnline: false,
        capacity: 2,
        registeredAttendeeCount: 2,
        registrationEnabled: true,
        featured: false,
        seo: {},
        status: "published",
        publishedAt: now,
        createdBy: adminId,
        updatedBy: adminId,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("eventRegistrations", {
        idempotencyKey: "registered-idempotency",
        eventId,
        registrationNumber: "NPS-E-REGISTERED",
        name: "Registered Family",
        email: "registered@example.test",
        attendees: 2,
        consent: true,
        status: "registered",
        cancellationToken: "registered-cancel-token",
        createdAt: now,
        updatedAt: now,
      });
      const waitlistedId = await ctx.db.insert("eventRegistrations", {
        idempotencyKey: "waitlisted-idempotency",
        eventId,
        registrationNumber: "NPS-E-WAITLISTED",
        name: "Waitlisted Family",
        email: "waitlisted@example.test",
        attendees: 1,
        consent: true,
        status: "waitlisted",
        cancellationToken: "waitlisted-cancel-token",
        createdAt: now + 1,
        updatedAt: now + 1,
      });
      return { eventId, waitlistedId };
    });
    const asAdmin = t.withIdentity({ subject: "admin-user" });

    await expect(
      asAdmin.mutation(api.admin.updateSubmission, {
        type: "eventRegistrations",
        id: waitlistedId,
        status: "registered",
      }),
    ).rejects.toThrow(/at capacity/i);

    await t.run(async (ctx) => await ctx.db.patch("events", eventId, { capacity: 3 }));
    await asAdmin.mutation(api.admin.updateSubmission, {
      type: "eventRegistrations",
      id: waitlistedId,
      status: "registered",
    });
    const result = await t.run(async (ctx) => ({
      event: await ctx.db.get("events", eventId),
      registration: await ctx.db.get("eventRegistrations", waitlistedId),
      jobs: await ctx.db
        .query("jobs")
        .withIndex("by_type_status", (q) => q.eq("type", "event_confirmation").eq("status", "queued"))
        .take(10),
    }));
    expect(result.event?.registeredAttendeeCount).toBe(3);
    expect(result.registration?.status).toBe("registered");
    expect(result.jobs.some((job) => job.payload.template === "event-confirmation")).toBe(true);
  });
});

describe("public staff contact privacy", () => {
  it("publishes teacher contact details only when showContact is enabled", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "publisher-user", ["publisher"]);
    const teacherId = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("teachers", {
        slug: "privacy-test-teacher",
        name: "Privacy Test Teacher",
        title: "Teacher",
        bio: "A verified profile used to test public contact controls.",
        qualifications: ["M.Ed."],
        subjects: ["English"],
        email: "teacher@example.test",
        phone: "+977 9800000000",
        showContact: false,
        order: 1,
        seo: {},
        status: "published",
        publishedAt: now,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    });

    const hidden = await t.query(api.content.getTeacher, { slug: "privacy-test-teacher" });
    expect(hidden).not.toBeNull();
    if (!hidden) throw new Error("Expected the published teacher to be visible.");
    expect(hidden.email).toBeUndefined();
    expect(hidden.phone).toBeUndefined();
    expect(hidden).not.toHaveProperty("createdBy");
    expect(hidden).not.toHaveProperty("updatedBy");

    await t.run(async (ctx) => await ctx.db.patch("teachers", teacherId, { showContact: true }));
    const visible = await t.query(api.content.getTeacher, { slug: "privacy-test-teacher" });
    expect(visible).not.toBeNull();
    if (!visible) throw new Error("Expected the published teacher to remain visible.");
    expect(visible.email).toBe("teacher@example.test");
    expect(visible.phone).toBe("+977 9800000000");
  });
});

describe("server-owned publication time", () => {
  it("does not let callers reveal a notice before its configured start", async () => {
    const t = convexTest(schema, modules);
    const publisherId = await insertUser(t, "clock-publisher", ["publisher"]);
    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert("publicationClock", {
        singletonKey: "main",
        currentTime: now,
        updatedAt: now,
      });
      await ctx.db.insert("notices", {
        slug: "future-notice",
        title: "Future notice",
        body: "This notice must remain hidden until the server-owned clock reaches its start time.",
        priority: "normal",
        audiences: ["all"],
        startAt: now + 86_400_000,
        seo: {},
        status: "published",
        publishedAt: now,
        createdBy: publisherId,
        updatedBy: publisherId,
        createdAt: now,
        updatedAt: now,
      });
    });

    const hidden = await t.query(api.content.listNotices, {
      limit: 10,
      now: now + 7 * 86_400_000,
    });
    expect(hidden).toHaveLength(0);

    await t.run(async (ctx) => {
      const clock = await ctx.db
        .query("publicationClock")
        .withIndex("by_singleton_key", (q) => q.eq("singletonKey", "main"))
        .unique();
      await ctx.db.patch("publicationClock", clock!._id, {
        currentTime: now + 2 * 86_400_000,
        updatedAt: now + 2 * 86_400_000,
      });
    });
    const visible = await t.query(api.content.listNotices, { limit: 10, now });
    expect(visible).toHaveLength(1);
  });
});

describe("legacy event capacity reconciliation", () => {
  it("counts every bounded legacy registration before decrementing on cancellation", async () => {
    const t = convexTest(schema, modules);
    const publisherId = await insertUser(t, "publisher-user", ["publisher"]);
    const { eventId, cancellationToken } = await t.run(async (ctx) => {
      const now = Date.now();
      const eventId = await ctx.db.insert("events", {
        slug: "legacy-capacity-test",
        title: "Legacy capacity test",
        description: "A legacy event without a materialized attendee counter.",
        startAt: now + 86_400_000,
        endAt: now + 90_000_000,
        timezone: "Asia/Kathmandu",
        isOnline: false,
        capacity: 2,
        registrationEnabled: true,
        featured: false,
        seo: {},
        status: "published",
        publishedAt: now,
        createdBy: publisherId,
        updatedBy: publisherId,
        createdAt: now,
        updatedAt: now,
      });
      let cancellationToken = "";
      for (let index = 0; index < 10; index += 1) {
        const token = `legacy-cancel-${index}`;
        if (index === 0) cancellationToken = token;
        await ctx.db.insert("eventRegistrations", {
          idempotencyKey: `legacy-registration-${index}`,
          eventId,
          registrationNumber: `NPS-E-LEGACY-${index}`,
          name: `Legacy family ${index}`,
          email: `legacy-${index}@example.test`,
          attendees: 1,
          consent: true,
          status: "registered",
          cancellationToken: token,
          createdAt: now + index,
          updatedAt: now + index,
        });
      }
      return { eventId, cancellationToken };
    });

    await t.mutation(api.forms.cancelEventRegistration, { token: cancellationToken });
    const event = await t.run(async (ctx) => await ctx.db.get("events", eventId));
    expect(event?.registeredAttendeeCount).toBe(9);
  });
});

describe("retention invariants", () => {
  it("decrements the materialized event attendee count when an old registration is removed", async () => {
    const t = convexTest(schema, modules);
    const publisherId = await insertUser(t, "retention-publisher", ["publisher"]);
    const eventId = await t.run(async (ctx) => {
      const now = Date.now();
      const old = now - 4 * 365.25 * 24 * 60 * 60 * 1000;
      const eventId = await ctx.db.insert("events", {
        slug: "retention-capacity-test",
        title: "Retention capacity test",
        description: "An old completed event used to verify retention counters.",
        startAt: old - 3_600_000,
        endAt: old,
        timezone: "Asia/Kathmandu",
        isOnline: false,
        capacity: 10,
        registeredAttendeeCount: 2,
        registrationEnabled: false,
        featured: false,
        seo: {},
        status: "archived",
        createdBy: publisherId,
        updatedBy: publisherId,
        createdAt: old,
        updatedAt: old,
      });
      await ctx.db.insert("eventRegistrations", {
        idempotencyKey: "retention-registration",
        eventId,
        registrationNumber: "NPS-E-RETENTION",
        name: "Retention family",
        email: "retention@example.test",
        attendees: 1,
        consent: true,
        status: "registered",
        cancellationToken: "retention-cancel-token",
        createdAt: old,
        updatedAt: old,
      });
      return eventId;
    });

    await t.mutation(internal.jobs.cleanupRetention, { phase: "eventRegistrations" });
    const result = await t.run(async (ctx) => ({
      event: await ctx.db.get("events", eventId),
      registrations: await ctx.db
        .query("eventRegistrations")
        .withIndex("by_event_created_at", (q) => q.eq("eventId", eventId))
        .take(10),
    }));
    expect(result.registrations).toHaveLength(0);
    expect(result.event?.registeredAttendeeCount).toBe(1);
  });

  it("immediately continues a full retention batch until the expired rows are drained", async () => {
    vi.useFakeTimers();
    try {
      const t = convexTest(schema, modules);
      await t.run(async (ctx) => {
        const old = Date.now() - 8 * 24 * 60 * 60 * 1000;
        for (let index = 0; index < 55; index += 1) {
          await ctx.db.insert("rateLimits", {
            key: `expired-rate-${index}`,
            scope: "retention-test",
            windowStartedAt: old,
            count: 1,
            updatedAt: old,
          });
        }
      });

      await t.mutation(internal.jobs.cleanupRetention, { phase: "rateLimits" });
      const afterFirstBatch = await t.run(async (ctx) => await ctx.db.query("rateLimits").take(100));
      expect(afterFirstBatch).toHaveLength(5);

      await t.finishAllScheduledFunctions(vi.runAllTimers);
      const afterContinuations = await t.run(async (ctx) => await ctx.db.query("rateLimits").take(100));
      expect(afterContinuations).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("drains every message before removing expired AI conversations", async () => {
    vi.useFakeTimers();
    try {
      const t = convexTest(schema, modules);
      await t.run(async (ctx) => {
        const old = Date.now() - 24 * 60 * 60 * 1000;
        for (let conversationIndex = 0; conversationIndex < 2; conversationIndex += 1) {
          const conversationId = await ctx.db.insert("aiConversations", {
            ownerKey: `expired-owner-${conversationIndex}`,
            status: "closed",
            lastMessageAt: old,
            expiresAt: old,
            createdAt: old,
            updatedAt: old,
          });
          for (let messageIndex = 0; messageIndex < 45; messageIndex += 1) {
            await ctx.db.insert("aiMessages", {
              conversationId,
              role: messageIndex % 2 === 0 ? "user" : "assistant",
              content: `Expired message ${conversationIndex}-${messageIndex}`,
              status: "completed",
              createdAt: old + messageIndex,
              updatedAt: old + messageIndex,
            });
          }
        }
      });

      await t.mutation(internal.jobs.cleanupRetention, { phase: "aiConversations" });
      const afterFirstBatch = await t.run(async (ctx) => await ctx.db.query("aiMessages").take(200));
      expect(afterFirstBatch).toHaveLength(50);

      await t.finishAllScheduledFunctions(vi.runAllTimers);
      const remaining = await t.run(async (ctx) => ({
        conversations: await ctx.db.query("aiConversations").take(10),
        messages: await ctx.db.query("aiMessages").take(200),
      }));
      expect(remaining.conversations).toHaveLength(0);
      expect(remaining.messages).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("public content collection limits", () => {
  it("returns the requested published FAQ range beyond the former 50-record ceiling", async () => {
    const t = convexTest(schema, modules);
    const adminId = await insertUser(t, "content-admin", ["admin"]);
    await t.run(async (ctx) => {
      const now = Date.now();
      for (let order = 0; order < 75; order += 1) {
        await ctx.db.insert("faqs", {
          question: `Question ${order}`,
          answer: `Verified answer ${order}`,
          category: "Admissions",
          order,
          status: "published",
          publishedAt: now,
          createdBy: adminId,
          updatedBy: adminId,
          createdAt: now + order,
          updatedAt: now + order,
        });
      }
    });

    const faqs = await t.query(api.content.listFaqs, {
      category: "Admissions",
      limit: 75,
      now: Date.now(),
    });
    expect(faqs).toHaveLength(75);
    expect(faqs[0]?.question).toBe("Question 0");
    expect(faqs.at(-1)?.question).toBe("Question 74");
  });
});

describe("media pagination invariants", () => {
  it("filters ready media in the folder index before selecting a page", async () => {
    const t = convexTest(schema, modules);
    const adminId = await insertUser(t, "media-admin", ["admin"]);
    const storageIds = await t.run(async (ctx) => {
      const readyStorageId = await ctx.storage.store(new Blob(["ready"], { type: "image/png" }));
      const deletedStorageId = await ctx.storage.store(new Blob(["deleted"], { type: "image/png" }));
      await ctx.db.insert("mediaAssets", {
        storageId: readyStorageId,
        fileName: "ready.png",
        mimeType: "image/png",
        size: 5,
        folder: "news",
        status: "ready",
        uploadedBy: adminId,
        createdAt: 1,
        updatedAt: 1,
      });
      await ctx.db.insert("mediaAssets", {
        storageId: deletedStorageId,
        fileName: "deleted.png",
        mimeType: "image/png",
        size: 7,
        folder: "news",
        status: "deleted",
        uploadedBy: adminId,
        createdAt: 2,
        updatedAt: 2,
        deletedAt: 2,
      });
      return { readyStorageId, deletedStorageId };
    });

    const asAdmin = t.withIdentity({ subject: "media-admin" });
    const page = await asAdmin.query(api.media.listMedia, {
      folder: "news",
      paginationOpts: { cursor: null, numItems: 1 },
    });

    expect(page.page).toHaveLength(1);
    expect(page.page[0]?.fileName).toBe("ready.png");
    expect(page.page[0]?.url).toMatch(/^https?:\/\//);
    expect(page.isDone).toBe(true);
    await expect(
      asAdmin.query(api.media.getMediaByStorageId, { storageId: storageIds.readyStorageId }),
    ).resolves.toMatchObject({ fileName: "ready.png", status: "ready" });
    await expect(
      asAdmin.query(api.media.getMediaByStorageId, { storageId: storageIds.deletedStorageId }),
    ).resolves.toBeNull();
  });

  it("paginates gallery items without a fixed album-size ceiling", async () => {
    const t = convexTest(schema, modules);
    const adminId = await insertUser(t, "gallery-admin", ["admin"]);
    const albumId = await t.run(async (ctx) => {
      const albumId = await ctx.db.insert("galleryAlbums", {
        slug: "pagination-album",
        title: "Pagination album",
        featured: false,
        order: 0,
        seo: {},
        status: "draft",
        createdBy: adminId,
        updatedBy: adminId,
        createdAt: 1,
        updatedAt: 1,
      });
      for (let order = 0; order < 3; order += 1) {
        await ctx.db.insert("galleryItems", {
          albumId,
          url: `https://example.test/gallery-${order}.jpg`,
          mediaType: "image",
          alt: `Gallery item ${order}`,
          order,
          visible: true,
          createdBy: adminId,
          createdAt: order + 1,
          updatedAt: order + 1,
        });
      }
      return albumId;
    });
    const asAdmin = t.withIdentity({ subject: "gallery-admin" });

    const first = await asAdmin.query(api.media.listGalleryItemsAdmin, {
      albumId,
      paginationOpts: { cursor: null, numItems: 2 },
    });
    const second = await asAdmin.query(api.media.listGalleryItemsAdmin, {
      albumId,
      paginationOpts: { cursor: first.continueCursor, numItems: 2 },
    });

    expect(first.page.map((item) => item.order)).toEqual([0, 1]);
    expect(first.isDone).toBe(false);
    expect(second.page.map((item) => item.order)).toEqual([2]);
    expect(second.isDone).toBe(true);
  });
});
