import agentTest from "@convex-dev/agent/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, components, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

type TestInstance = ReturnType<typeof convexTest>;

async function insertUser(
  t: TestInstance,
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

async function enableAssistant(t: TestInstance, updatedBy: Awaited<ReturnType<typeof insertUser>>) {
  await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.insert("siteSettings", {
      singletonKey: "main",
      schoolName: "Nepal Police School",
      shortName: "NPS",
      tagline: "Learning with service",
      description: "Official school website",
      contact: {
        address: "Garuda",
        city: "Rautahat",
        country: "Nepal",
        phone: "+977 0000000000",
        email: "school@example.test",
      },
      social: {},
      seo: {},
      academicYear: "2083",
      timezone: "Asia/Kathmandu",
      admissionsOpen: false,
      assistantEnabled: true,
      maintenanceMode: false,
      updatedBy,
      updatedAt: now,
    });
  });
}

describe("assistant administration", () => {
  it("changes availability without requiring public contact details", async () => {
    const t = convexTest(schema, modules);
    const adminId = await insertUser(t, "admin-user", ["admin"]);
    await insertUser(t, "editor-user", ["editor"]);
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("siteSettings", {
        singletonKey: "main",
        schoolName: "Nepal Police School",
        shortName: "NPS",
        tagline: "Learning with service",
        description: "Official school website",
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
        assistantEnabled: true,
        maintenanceMode: false,
        updatedBy: adminId,
        updatedAt: now,
      });
    });

    await expect(
      t.withIdentity({ subject: "editor-user" }).mutation(api.assistantAdmin.setEnabled, {
        enabled: false,
      }),
    ).rejects.toThrow();

    const result = await t.withIdentity({ subject: "admin-user" }).mutation(api.assistantAdmin.setEnabled, {
      enabled: false,
    });
    expect(result).toEqual({ ok: true, enabled: false });
    const settings = await t.run(async (ctx) =>
      ctx.db
        .query("siteSettings")
        .withIndex("by_singleton_key", (q) => q.eq("singletonKey", "main"))
        .unique(),
    );
    expect(settings?.assistantEnabled).toBe(false);
    expect(settings?.contact).toMatchObject({ phone: "", email: "" });
  });

  it("enforces admin-only context CRUD and grounds only published records", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "editor-user", ["editor"]);
    await insertUser(t, "admin-user", ["admin"]);
    const asEditor = t.withIdentity({ subject: "editor-user" });
    const asAdmin = t.withIdentity({ subject: "admin-user" });

    await expect(
      asEditor.mutation(api.assistantAdmin.upsertContext, {
        context: {
          title: "Private draft",
          category: "Admissions",
          content: "This draft must never be used for a visitor answer.",
          keywords: ["draft"],
          priority: 50,
          status: "draft",
        },
      }),
    ).rejects.toThrow();

    const draftId = await asAdmin.mutation(api.assistantAdmin.upsertContext, {
      context: {
        title: "Private draft",
        category: "Admissions",
        content: "This draft must never be used for a visitor answer.",
        keywords: ["Draft", "draft"],
        priority: 50,
        status: "draft",
      },
    });
    const publishedId = await asAdmin.mutation(api.assistantAdmin.upsertContext, {
      context: {
        title: "School transport",
        category: "Services",
        content: "Published transport information for families and students.",
        keywords: ["Bus", "transport"],
        publicPath: "/campus-life/transport",
        priority: 80,
        status: "published",
      },
    });

    const published = await asAdmin.query(api.assistantAdmin.listContexts, {
      status: "published",
    });
    expect(published.map((context) => context._id)).toEqual([publishedId]);
    expect(published[0]?.keywords).toEqual(["bus", "transport"]);
    expect(published[0]?.publishedAt).toEqual(expect.any(Number));

    const grounding = await t.query(internal.assistantAdmin.listPublishedContexts, {});
    expect(grounding.map((context) => context._id)).toEqual([publishedId]);
    expect(grounding.some((context) => context._id === draftId)).toBe(false);

    await asAdmin.mutation(api.assistantAdmin.removeContext, { id: publishedId });
    expect(await t.run(async (ctx) => await ctx.db.get("assistantContexts", publishedId))).toBeNull();
    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_entity_created_at", (q) => q.eq("entityType", "assistantContexts"))
        .order("desc")
        .first(),
    );
    expect(audit?.action).toBe("assistant_context.deleted");
  });

  it("validates bounded context input", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "admin-user", ["admin"]);
    const asAdmin = t.withIdentity({ subject: "admin-user" });
    await expect(
      asAdmin.mutation(api.assistantAdmin.upsertContext, {
        context: {
          title: "Invalid priority",
          category: "General",
          content: "This context has enough content to pass the content length boundary.",
          keywords: [],
          priority: 101,
          status: "published",
        },
      }),
    ).rejects.toThrow(/priority/i);
    await expect(
      asAdmin.mutation(api.assistantAdmin.upsertContext, {
        context: {
          title: "Too many keywords",
          category: "General",
          content: "This context has enough content to pass the content length boundary.",
          keywords: Array.from({ length: 21 }, (_, index) => `keyword-${index}`),
          priority: 10,
          status: "published",
        },
      }),
    ).rejects.toThrow(/at most 20 keywords/i);
  });
});

describe("assistant durability", () => {
  it("creates one durable Agent prompt and removes both stores after expiry", async () => {
    const t = convexTest(schema, modules);
    agentTest.register(t);
    const adminId = await insertUser(t, "admin-user", ["admin"]);
    await enableAssistant(t, adminId);

    const prepared = await t.mutation(internal.assistantData.prepare, {
      fingerprint: "fingerprint-test-001",
      sessionId: "session-test-001",
      message: "विद्यालयको बस सेवा कहिले चल्छ?",
      signatureKey: "signature-test-001",
    });
    const localConversation = await t.run(async (ctx) =>
      ctx.db.get("aiConversations", prepared.conversationId),
    );
    const localUserMessage = await t.run(async (ctx) => ctx.db.get("aiMessages", prepared.userMessageId));
    expect(localConversation?.agentThreadId).toBe(prepared.agentThreadId);
    expect(localUserMessage?.agentMessageId).toBe(prepared.agentPromptMessageId);

    const componentMessages = await t.query(components.agent.messages.listMessagesByThreadId, {
      threadId: prepared.agentThreadId,
      order: "asc",
      paginationOpts: { cursor: null, numItems: 10 },
    });
    expect(componentMessages.page).toHaveLength(1);
    expect(componentMessages.page[0]?.message?.role).toBe("user");

    await t.run(async (ctx) => {
      await ctx.db.patch("aiConversations", prepared.conversationId, {
        expiresAt: Date.now() - 1,
      });
    });
    await t.mutation(internal.jobs.cleanupRetention, {});

    expect(await t.run(async (ctx) => ctx.db.get("aiConversations", prepared.conversationId))).toBeNull();
    expect(await t.run(async (ctx) => ctx.db.get("aiMessages", prepared.userMessageId))).toBeNull();
    expect(await t.run(async (ctx) => ctx.db.get("aiMessages", prepared.assistantMessageId))).toBeNull();
    expect(
      await t.query(components.agent.threads.getThread, { threadId: prepared.agentThreadId }),
    ).toBeNull();
    const retainedMessages = await t.query(components.agent.messages.listMessagesByThreadId, {
      threadId: prepared.agentThreadId,
      order: "asc",
      paginationOpts: { cursor: null, numItems: 10 },
    });
    expect(retainedMessages.page).toEqual([]);
  });

  it("loads the exact queued user/assistant pair even after newer messages exist", async () => {
    const t = convexTest(schema, modules);
    const { conversationId, firstUserId, firstAssistantId } = await t.run(async (ctx) => {
      const now = Date.now();
      const conversationId = await ctx.db.insert("aiConversations", {
        ownerKey: "owner-key",
        agentThreadId: "agent-thread",
        title: "First question",
        status: "active",
        lastMessageAt: now,
        expiresAt: now + 60_000,
        createdAt: now,
        updatedAt: now,
      });
      const firstUserId = await ctx.db.insert("aiMessages", {
        conversationId,
        role: "user",
        content: "First exact question",
        status: "completed",
        agentMessageId: "agent-prompt-first",
        createdAt: now,
        updatedAt: now,
      });
      const firstAssistantId = await ctx.db.insert("aiMessages", {
        conversationId,
        role: "assistant",
        content: "",
        status: "pending",
        createdAt: now + 1,
        updatedAt: now,
      });
      await ctx.db.insert("aiMessages", {
        conversationId,
        role: "user",
        content: "Newer unrelated question",
        status: "completed",
        agentMessageId: "agent-prompt-newer",
        createdAt: now + 2,
        updatedAt: now + 2,
      });
      await ctx.db.insert("aiMessages", {
        conversationId,
        role: "assistant",
        content: "Newer answer",
        status: "completed",
        createdAt: now + 3,
        updatedAt: now + 3,
      });
      return { conversationId, firstUserId, firstAssistantId };
    });

    const jobId = await t.mutation(internal.assistantData.queueFailure, {
      conversationId,
      userMessageId: firstUserId,
      assistantMessageId: firstAssistantId,
      error: "Transient provider failure",
    });
    const job = await t.run(async (ctx) => ctx.db.get("jobs", jobId));
    expect(job?.payload.userMessageId).toBe(firstUserId);

    const queued = await t.query(internal.assistantData.loadQueued, { jobId });
    expect(queued).toMatchObject({
      assistantMessageId: firstAssistantId,
      message: "First exact question",
      agentPromptMessageId: "agent-prompt-first",
    });
  });
});
