import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { aiRetryDelay, classifyAiFailure } from "./lib/aiRetry";
import schema from "./schema";
import { modules } from "./test.setup";

const overload =
  "Uncaught AI_RetryError: Failed after 2 attempts. Last error: This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.";
type TestInstance = ReturnType<typeof convexTest>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-27T12:00:00Z"));
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

async function insertJob(t: TestInstance, options: Partial<Doc<"jobs">> = {}) {
  return t.run(async (ctx) => {
    const now = Date.now();
    const conversationId = await ctx.db.insert("aiConversations", {
      ownerKey: "test-owner",
      title: "Question",
      status: "active",
      lastMessageAt: now,
      expiresAt: now + 86_400_000,
      createdAt: now,
      updatedAt: now,
    });
    const messageId = await ctx.db.insert("aiMessages", {
      conversationId,
      role: "assistant",
      content: "",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    const jobId = await ctx.db.insert("jobs", {
      type: "ai_response",
      status: "running",
      idempotencyKey: "ai:test",
      payload: { conversationId, messageId },
      attempts: 4,
      maxAttempts: 4,
      runAt: now,
      createdAt: now,
      updatedAt: now,
      ...options,
    });
    return { jobId, messageId, conversationId };
  });
}

describe("AI overload recovery", () => {
  it("recognizes the actual wrapped provider error without classifying arbitrary failures as overload", () => {
    expect(classifyAiFailure(overload)).toBe("temporary");
    expect(classifyAiFailure("HTTP 503 UNAVAILABLE")).toBe("temporary");
    expect(classifyAiFailure("HTTP 429 too many requests")).toBe("temporary");
    expect(classifyAiFailure("Unknown data validation failure")).toBe("unknown");
    expect(classifyAiFailure("HTTP 403: rate limit permission denied")).toBe("permanent");
    expect(classifyAiFailure("RESOURCE_EXHAUSTED: daily quota exceeded")).toBe("permanent");
  });

  it("spreads retries while keeping increasing waits bounded", () => {
    const delays = [0, 1, 2, 3, 4, 5].map((attempt) => aiRetryDelay(attempt, "job-one"));
    expect(delays[0]).toBeGreaterThanOrEqual(60_000);
    expect(delays[0]).toBeLessThan(75_000);
    expect(delays.slice(2).every((delay, index) => delay > delays[index + 1])).toBe(true);
    expect(delays.reduce((sum, delay) => sum + delay, 0)).toBeGreaterThanOrEqual(32 * 60_000);
    expect(aiRetryDelay(100, "job-one")).toBeLessThanOrEqual(30 * 60_000);
    expect(aiRetryDelay(2, "job-one")).not.toBe(aiRetryDelay(2, "job-two"));
    expect(aiRetryDelay(2, "job-one")).toBe(aiRetryDelay(2, "job-one"));
  });

  it("extends a legacy AI job after an overload and schedules the durable wait", async () => {
    const t = convexTest(schema, modules);
    const { jobId, messageId } = await insertJob(t);
    await t.mutation(internal.jobs.fail, { jobId, error: overload });
    const state = await t.run(async (ctx) => ({
      job: await ctx.db.get("jobs", jobId),
      message: await ctx.db.get("aiMessages", messageId),
      scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
    }));
    expect(state.job).toMatchObject({ status: "retry", attempts: 4, maxAttempts: 6, lastError: overload });
    expect(state.job!.runAt - Date.now()).toBeGreaterThanOrEqual(8 * 60_000);
    expect(state.job!.runAt - Date.now()).toBeLessThan(10 * 60_000);
    expect(state.scheduled).toHaveLength(1);
    expect(state.scheduled[0].scheduledTime).toBe(state.job!.runAt);
    expect(state.message?.status).toBe("pending");
  });

  it("stops at six attempts, preserves the real error and marks the unanswered message failed", async () => {
    const t = convexTest(schema, modules);
    const { jobId, messageId } = await insertJob(t, { attempts: 6, maxAttempts: 6 });
    await t.mutation(internal.jobs.fail, { jobId, error: overload });
    const state = await t.run(async (ctx) => ({
      job: await ctx.db.get("jobs", jobId),
      message: await ctx.db.get("aiMessages", messageId),
      scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
    }));
    expect(state.job).toMatchObject({
      status: "dead",
      maxAttempts: 6,
      lastError: overload,
      completedAt: Date.now(),
    });
    expect(state.message).toMatchObject({ status: "failed", error: overload });
    expect(state.scheduled).toHaveLength(0);
  });

  it.each(["succeeded", "cancelled", "dead"] as const)(
    "does not revive a %s job from a late failure",
    async (status) => {
      const t = convexTest(schema, modules);
      const { jobId } = await insertJob(t, { status });
      await t.mutation(internal.jobs.fail, { jobId, error: overload });
      expect(await t.run((ctx) => ctx.db.get("jobs", jobId))).toMatchObject({ status, maxAttempts: 4 });
      expect(await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect())).toHaveLength(0);
    },
  );

  it.each(["HTTP 401: Invalid API key", "PERMISSION_DENIED", "HTTP 402: payment required"])(
    "does not spend retries on %s",
    async (error) => {
      const t = convexTest(schema, modules);
      const { jobId } = await insertJob(t, { attempts: 1 });
      await t.mutation(internal.jobs.fail, { jobId, error });
      expect(await t.run((ctx) => ctx.db.get("jobs", jobId))).toMatchObject({
        status: "dead",
        maxAttempts: 4,
      });
    },
  );

  it("honors an explicit non-retryable failure even when the text mentions demand", async () => {
    const t = convexTest(schema, modules);
    const { jobId } = await insertJob(t, { attempts: 1 });
    await t.mutation(internal.jobs.fail, { jobId, error: overload, retryable: false });
    expect(await t.run((ctx) => ctx.db.get("jobs", jobId))).toMatchObject({ status: "dead", maxAttempts: 4 });
  });

  it("preserves the existing notification retry policy", async () => {
    const t = convexTest(schema, modules);
    const { jobId } = await insertJob(t, { type: "contact_receipt", attempts: 1 });
    await t.mutation(internal.jobs.fail, { jobId, error: overload });
    expect(await t.run((ctx) => ctx.db.get("jobs", jobId))).toMatchObject({
      status: "retry",
      maxAttempts: 4,
      runAt: Date.now() + 30_000,
    });
  });

  it("queues an overloaded response once with six attempts and a staggered first wait", async () => {
    const t = convexTest(schema, modules);
    const { conversationId, messageId } = await insertJob(t);
    const userMessageId = await t.run((ctx) =>
      ctx.db.insert("aiMessages", {
        conversationId,
        role: "user",
        content: "Where is the school?",
        status: "completed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    const args = { conversationId, userMessageId, assistantMessageId: messageId, error: overload };
    const id = await t.mutation(internal.assistantData.queueFailure, args);
    expect(await t.mutation(internal.assistantData.queueFailure, args)).toBe(id);
    const job = await t.run((ctx) => ctx.db.get("jobs", id));
    expect(job).toMatchObject({ maxAttempts: 6, attempts: 0, payload: { userMessageId, messageId } });
    expect(job!.runAt - Date.now()).toBeGreaterThanOrEqual(60_000);
    expect(job!.runAt - Date.now()).toBeLessThan(75_000);
    expect(await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect())).toHaveLength(1);
  });
});
