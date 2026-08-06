import { createThread, saveMessage, saveMessages } from "@convex-dev/agent";
import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { enqueueJob } from "./lib/jobs";
import { plainText, safeKey, shortHash } from "./lib/input";
import { enforceRateLimit } from "./lib/rateLimit";

const preparedRequestValidator = v.object({
  conversationId: v.id("aiConversations"),
  userMessageId: v.id("aiMessages"),
  assistantMessageId: v.id("aiMessages"),
  message: v.string(),
  ownerKey: v.string(),
  agentThreadId: v.string(),
  agentPromptMessageId: v.string(),
  remaining: v.number(),
});

const citationValidator = v.object({
  type: v.string(),
  title: v.string(),
  slug: v.optional(v.string()),
  url: v.optional(v.string()),
  excerpt: v.optional(v.string()),
});

export const prepare = internalMutation({
  args: { fingerprint: v.string(), sessionId: v.string(), message: v.string(), signatureKey: v.string() },
  returns: preparedRequestValidator,
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("siteSettings")
      .withIndex("by_singleton_key", (q) => q.eq("singletonKey", "main"))
      .unique();
    if (!settings?.assistantEnabled) {
      throw new ConvexError({ code: "ASSISTANT_DISABLED", message: "The school assistant is unavailable." });
    }

    const fingerprint = safeKey(args.fingerprint, "fingerprint");
    const sessionId = safeKey(args.sessionId, "sessionId");
    const message = plainText(args.message, "Message", 2, 1500);
    await enforceRateLimit(ctx, {
      key: safeKey(args.signatureKey, "signatureKey"),
      scope: "assistant:signed-request",
      limit: 1,
      windowMs: 5 * 60 * 1000,
      blockMs: 5 * 60 * 1000,
    });
    const remainingFingerprint = await enforceRateLimit(ctx, {
      key: fingerprint,
      scope: "assistant:fingerprint",
      limit: 12,
      windowMs: 10 * 60 * 1000,
      blockMs: 30 * 60 * 1000,
    });
    const remainingSession = await enforceRateLimit(ctx, {
      key: sessionId,
      scope: "assistant:session",
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });

    const ownerKey = shortHash(`${fingerprint}:${sessionId}`);
    const now = Date.now();
    let conversation = await ctx.db
      .query("aiConversations")
      .withIndex("by_owner_updated_at", (q) => q.eq("ownerKey", ownerKey))
      .order("desc")
      .first();

    if (!conversation || conversation.status !== "active" || conversation.expiresAt <= now) {
      const identity = await ctx.auth.getUserIdentity();
      const user = identity
        ? await ctx.db
            .query("users")
            .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
            .unique()
        : null;
      const agentThreadId = await createThread(ctx, components.agent, {
        userId: ownerKey,
        title: message.slice(0, 100),
      });
      const conversationId = await ctx.db.insert("aiConversations", {
        ownerKey,
        userId: user?._id,
        agentThreadId,
        title: message.slice(0, 100),
        status: "active",
        lastMessageAt: now,
        expiresAt: now + 30 * 24 * 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      });
      conversation = (await ctx.db.get("aiConversations", conversationId))!;
    }

    const priorMessages = await ctx.db
      .query("aiMessages")
      .withIndex("by_conversation_created_at", (q) => q.eq("conversationId", conversation._id))
      .order("desc")
      .take(12);
    const completedHistory = priorMessages
      .reverse()
      .filter(
        (entry) => entry.status === "completed" && (entry.role === "user" || entry.role === "assistant"),
      );

    let agentThreadId = conversation.agentThreadId;
    if (!agentThreadId) {
      agentThreadId = await createThread(ctx, components.agent, {
        userId: ownerKey,
        title: conversation.title ?? message.slice(0, 100),
      });
      if (completedHistory.length > 0) {
        await saveMessages(ctx, components.agent, {
          threadId: agentThreadId,
          userId: ownerKey,
          messages: completedHistory.map((entry) => ({
            role: entry.role === "assistant" ? ("assistant" as const) : ("user" as const),
            content: entry.content.slice(0, 2000),
          })),
        });
      }
      await ctx.db.patch("aiConversations", conversation._id, { agentThreadId, updatedAt: now });
    }

    const savedPrompt = await saveMessage(ctx, components.agent, {
      threadId: agentThreadId,
      userId: ownerKey,
      prompt: message,
    });
    const userMessageId = await ctx.db.insert("aiMessages", {
      conversationId: conversation._id,
      role: "user",
      content: message,
      status: "completed",
      agentMessageId: savedPrompt.messageId,
      inputCharacters: message.length,
      createdAt: now,
      updatedAt: now,
    });
    const assistantMessageId = await ctx.db.insert("aiMessages", {
      conversationId: conversation._id,
      role: "assistant",
      content: "",
      status: "pending",
      createdAt: now + 1,
      updatedAt: now,
    });
    await ctx.db.patch("aiConversations", conversation._id, {
      lastMessageAt: now,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000,
      updatedAt: now,
    });
    return {
      conversationId: conversation._id,
      userMessageId,
      assistantMessageId,
      message,
      ownerKey,
      agentThreadId,
      agentPromptMessageId: savedPrompt.messageId,
      remaining: Math.min(remainingFingerprint, remainingSession),
    };
  },
});

export const complete = internalMutation({
  args: {
    assistantMessageId: v.id("aiMessages"),
    agentMessageId: v.optional(v.string()),
    answer: v.string(),
    model: v.string(),
    providerInteractionId: v.optional(v.string()),
    citations: v.array(citationValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get("aiMessages", args.assistantMessageId);
    if (!message) return null;
    const now = Date.now();
    await ctx.db.patch("aiMessages", message._id, {
      content: args.answer.slice(0, 12_000),
      status: "completed",
      model: args.model,
      providerInteractionId: args.providerInteractionId,
      agentMessageId: args.agentMessageId,
      citations: args.citations.slice(0, 8),
      outputCharacters: args.answer.length,
      error: undefined,
      updatedAt: now,
    });
    await ctx.db.patch("aiConversations", message.conversationId, {
      lastMessageAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const queueFailure = internalMutation({
  args: {
    conversationId: v.id("aiConversations"),
    userMessageId: v.id("aiMessages"),
    assistantMessageId: v.id("aiMessages"),
    error: v.string(),
  },
  returns: v.id("jobs"),
  handler: async (ctx, args) => {
    const [userMessage, assistantMessage] = await Promise.all([
      ctx.db.get("aiMessages", args.userMessageId),
      ctx.db.get("aiMessages", args.assistantMessageId),
    ]);
    if (
      !userMessage ||
      userMessage.role !== "user" ||
      userMessage.conversationId !== args.conversationId ||
      !assistantMessage ||
      assistantMessage.role !== "assistant" ||
      assistantMessage.conversationId !== args.conversationId
    ) {
      throw new ConvexError({
        code: "INVALID_AI_PAIR",
        message: "The queued assistant response does not match its user message.",
      });
    }
    await ctx.db.patch("aiMessages", assistantMessage._id, {
      status: "pending",
      error: args.error.slice(0, 1000),
      updatedAt: Date.now(),
    });
    return await enqueueJob(ctx, {
      type: "ai_response",
      idempotencyKey: `ai:${args.assistantMessageId}`,
      payload: {
        conversationId: args.conversationId,
        userMessageId: args.userMessageId,
        messageId: args.assistantMessageId,
      },
      maxAttempts: 4,
      runAt: Date.now() + 30_000,
    });
  },
});

export const loadQueued = internalQuery({
  args: { jobId: v.id("jobs") },
  returns: v.union(
    v.null(),
    v.object({
      conversationId: v.id("aiConversations"),
      assistantMessageId: v.id("aiMessages"),
      message: v.string(),
      ownerKey: v.string(),
      agentThreadId: v.string(),
      agentPromptMessageId: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db.get("jobs", args.jobId);
    if (
      job?.type !== "ai_response" ||
      !job.payload.conversationId ||
      !job.payload.userMessageId ||
      !job.payload.messageId
    ) {
      return null;
    }
    const [conversation, userMessage, assistantMessage] = await Promise.all([
      ctx.db.get("aiConversations", job.payload.conversationId),
      ctx.db.get("aiMessages", job.payload.userMessageId),
      ctx.db.get("aiMessages", job.payload.messageId),
    ]);
    if (
      !conversation ||
      !conversation.agentThreadId ||
      !userMessage ||
      userMessage.role !== "user" ||
      userMessage.status !== "completed" ||
      !userMessage.agentMessageId ||
      userMessage.conversationId !== conversation._id ||
      !assistantMessage ||
      assistantMessage.role !== "assistant" ||
      assistantMessage.conversationId !== conversation._id ||
      assistantMessage.status === "completed"
    ) {
      return null;
    }
    return {
      conversationId: conversation._id,
      assistantMessageId: assistantMessage._id,
      message: userMessage.content,
      ownerKey: conversation.ownerKey,
      agentThreadId: conversation.agentThreadId,
      agentPromptMessageId: userMessage.agentMessageId,
    };
  },
});
