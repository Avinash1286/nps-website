import { ConvexError, v } from "convex/values";
import { env, internalQuery, mutation, query } from "./_generated/server";
import { assistantContextStatusValidator } from "./schema";
import { requireRole } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { plainText, singleLineText } from "./lib/input";
import { isConfiguredSecret } from "./lib/secrets";

const CONTEXT_LIMIT = 100;
const MAX_KEYWORDS = 20;

const assistantContextValidator = v.object({
  _id: v.id("assistantContexts"),
  _creationTime: v.number(),
  title: v.string(),
  category: v.string(),
  content: v.string(),
  keywords: v.array(v.string()),
  publicPath: v.optional(v.string()),
  priority: v.number(),
  status: assistantContextStatusValidator,
  publishedAt: v.optional(v.number()),
  createdBy: v.id("users"),
  updatedBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const contextInputValidator = v.object({
  title: v.string(),
  category: v.string(),
  content: v.string(),
  keywords: v.array(v.string()),
  publicPath: v.optional(v.string()),
  priority: v.number(),
  status: assistantContextStatusValidator,
});

function cleanKeywords(values: string[]): string[] {
  if (values.length > MAX_KEYWORDS) {
    throw new ConvexError({
      code: "INVALID_INPUT",
      message: `Assistant context may contain at most ${MAX_KEYWORDS} keywords.`,
    });
  }
  return [
    ...new Set(values.map((value) => singleLineText(value, "Keyword", 1, 60).toLocaleLowerCase("en-US"))),
  ];
}

function cleanPublicPath(value?: string): string | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const path = value.trim();
  if (
    path.length > 500 ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    /[\u0000-\u001F\u007F\s]/.test(path)
  ) {
    throw new ConvexError({
      code: "INVALID_INPUT",
      message: "Public path must be a same-origin route beginning with a single slash.",
    });
  }
  return path;
}

function cleanPriority(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > 100) {
    throw new ConvexError({
      code: "INVALID_INPUT",
      message: "Priority must be an integer between 0 and 100.",
    });
  }
  return value;
}

function configuredModel(): string {
  const configured = env.GEMINI_MODEL?.trim();
  return configured && /^gemini-[a-z0-9][a-z0-9.-]{1,80}$/i.test(configured)
    ? configured
    : "gemini-3.6-flash";
}

export const getConfiguration = query({
  args: {},
  returns: v.object({
    assistantEnabled: v.boolean(),
    geminiConfigured: v.boolean(),
    serviceSigningConfigured: v.boolean(),
    agentMounted: v.boolean(),
    provider: v.literal("gemini"),
    model: v.string(),
    publishedContextCount: v.number(),
    contextLimit: v.number(),
  }),
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    const [settings, publishedContexts] = await Promise.all([
      ctx.db
        .query("siteSettings")
        .withIndex("by_singleton_key", (q) => q.eq("singletonKey", "main"))
        .unique(),
      ctx.db
        .query("assistantContexts")
        .withIndex("by_status_and_priority_and_updated_at", (q) => q.eq("status", "published"))
        .take(CONTEXT_LIMIT),
    ]);
    return {
      assistantEnabled: settings?.assistantEnabled ?? false,
      geminiConfigured: isConfiguredSecret(env.GEMINI_API_KEY?.trim()),
      serviceSigningConfigured: isConfiguredSecret(env.ASSISTANT_SERVICE_SECRET?.trim()),
      agentMounted: true,
      provider: "gemini" as const,
      model: configuredModel(),
      publishedContextCount: publishedContexts.length,
      contextLimit: CONTEXT_LIMIT,
    };
  },
});

export const setEnabled = mutation({
  args: { enabled: v.boolean() },
  returns: v.union(
    v.object({ ok: v.literal(true), enabled: v.boolean() }),
    v.object({ ok: v.literal(false), message: v.string() }),
  ),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ["admin"]);
    const settings = await ctx.db
      .query("siteSettings")
      .withIndex("by_singleton_key", (q) => q.eq("singletonKey", "main"))
      .unique();
    if (!settings) {
      return { ok: false as const, message: "Complete Site settings before enabling the assistant." };
    }
    if (
      args.enabled &&
      (!isConfiguredSecret(env.GEMINI_API_KEY?.trim()) ||
        !isConfiguredSecret(env.ASSISTANT_SERVICE_SECRET?.trim()))
    ) {
      return {
        ok: false as const,
        message: "Complete the Gemini credential and signed gateway configuration first.",
      };
    }

    if (settings.assistantEnabled !== args.enabled) {
      const now = Date.now();
      await ctx.db.patch("siteSettings", settings._id, {
        assistantEnabled: args.enabled,
        updatedBy: actor._id,
        updatedAt: now,
      });
      await writeAudit(ctx, actor, {
        action: args.enabled ? "assistant.enabled" : "assistant.disabled",
        entityType: "siteSettings",
        entityId: settings._id,
        summary: `${args.enabled ? "Enabled" : "Disabled"} the public information assistant.`,
      });
    }
    return { ok: true as const, enabled: args.enabled };
  },
});

export const listContexts = query({
  args: { status: v.optional(assistantContextStatusValidator) },
  returns: v.array(assistantContextValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    if (args.status) {
      return await ctx.db
        .query("assistantContexts")
        .withIndex("by_status_and_priority_and_updated_at", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(CONTEXT_LIMIT);
    }
    return await ctx.db
      .query("assistantContexts")
      .withIndex("by_updated_at")
      .order("desc")
      .take(CONTEXT_LIMIT);
  },
});

export const upsertContext = mutation({
  args: {
    id: v.optional(v.id("assistantContexts")),
    context: contextInputValidator,
  },
  returns: v.id("assistantContexts"),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ["admin"]);
    const existing = args.id ? await ctx.db.get("assistantContexts", args.id) : null;
    if (args.id && !existing) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Assistant context was not found." });
    }
    if (!existing) {
      const contexts = await ctx.db.query("assistantContexts").withIndex("by_updated_at").take(CONTEXT_LIMIT);
      if (contexts.length >= CONTEXT_LIMIT) {
        throw new ConvexError({
          code: "LIMIT_REACHED",
          message: `Assistant context is limited to ${CONTEXT_LIMIT} records.`,
        });
      }
    }

    const now = Date.now();
    const cleaned = {
      title: singleLineText(args.context.title, "Title", 1, 160),
      category: singleLineText(args.context.category, "Category", 1, 80),
      content: plainText(args.context.content, "Content", 10, 12_000),
      keywords: cleanKeywords(args.context.keywords),
      publicPath: cleanPublicPath(args.context.publicPath),
      priority: cleanPriority(args.context.priority),
      status: args.context.status,
      publishedAt:
        args.context.status === "published" ? (existing?.publishedAt ?? now) : existing?.publishedAt,
      updatedBy: actor._id,
      updatedAt: now,
    };

    let id = existing?._id;
    if (existing) {
      await ctx.db.patch("assistantContexts", existing._id, cleaned);
    } else {
      id = await ctx.db.insert("assistantContexts", {
        ...cleaned,
        createdBy: actor._id,
        createdAt: now,
      });
    }

    await writeAudit(ctx, actor, {
      action: existing ? "assistant_context.updated" : "assistant_context.created",
      entityType: "assistantContexts",
      entityId: id,
      summary: `${existing ? "Updated" : "Created"} assistant context “${cleaned.title}”.`,
      metadata: { status: cleaned.status, category: cleaned.category },
    });
    return id!;
  },
});

export const removeContext = mutation({
  args: { id: v.id("assistantContexts") },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ["admin"]);
    const existing = await ctx.db.get("assistantContexts", args.id);
    if (!existing) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Assistant context was not found." });
    }
    await ctx.db.delete("assistantContexts", existing._id);
    await writeAudit(ctx, actor, {
      action: "assistant_context.deleted",
      entityType: "assistantContexts",
      entityId: existing._id,
      summary: `Deleted assistant context “${existing.title}”.`,
      metadata: { status: existing.status, category: existing.category },
    });
    return { ok: true };
  },
});

export const listPublishedContexts = internalQuery({
  args: {},
  returns: v.array(assistantContextValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("assistantContexts")
      .withIndex("by_status_and_priority_and_updated_at", (q) => q.eq("status", "published"))
      .order("desc")
      .take(CONTEXT_LIMIT);
  },
});
