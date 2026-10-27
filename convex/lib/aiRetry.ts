import { shortHash } from "./input";

export const AI_TRANSIENT_MAX_ATTEMPTS = 6;

// Errors cross a Convex action boundary as text, including AI SDK retry wrappers.
// Prefer explicit permanent failures over transient words elsewhere in the wrapper.
export function classifyAiFailure(message: string): "temporary" | "permanent" | "unknown" {
  if (
    /NON_RETRYABLE|invalid api key|api key (?:is )?(?:invalid|expired|not valid)|API_KEY_INVALID|PERMISSION_DENIED|UNAUTHENTICATED|model.{0,60}not found|GEMINI_API_KEY is not configured|daily quota|billing|payment required|credit balance/i.test(
      message,
    ) ||
    /\b(?:status(?: code)?|HTTP|returned)\s*[:=]?\s*(?:400|401|402|403|404)\b/i.test(message)
  )
    return "permanent";
  if (
    /high demand|overloaded|service unavailable|RESOURCE_EXHAUSTED|rate.?limit|too many requests|timed? out|timeout|ECONNRESET|ETIMEDOUT|fetch failed/i.test(
      message,
    ) ||
    /\b(?:status(?: code)?|HTTP|returned)\s*[:=]?\s*(?:408|429|500|502|503|504)\b/i.test(message)
  )
    return "temporary";
  return "unknown";
}

/** Durable wait, not an action sleep. Stable per-job jitter prevents retry bursts. */
export function aiRetryDelay(attempts: number, seed: string): number {
  const base = Math.min(30 * 60_000, 60_000 * 2 ** Math.max(0, attempts - 1));
  const bucket = parseInt(shortHash(`${seed}:${attempts}`).slice(-6), 36) % 1000;
  return Math.min(30 * 60_000, base + Math.floor((base * bucket) / 4000));
}
