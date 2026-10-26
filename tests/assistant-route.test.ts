import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formJson, preparePublicFormRequest } from "@/lib/server/public-forms";

const backend = vi.hoisted(() => ({ fetchAction: vi.fn() }));
vi.mock("convex/nextjs", () => backend);
import { POST } from "@/app/api/assistant/route";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://school-test.convex.cloud");
  vi.stubEnv("ASSISTANT_SERVICE_SECRET", "assistant-service-secret-that-is-long-enough");
  vi.stubEnv("FORM_SERVICE_SECRET", "form-service-secret-that-is-long-enough");
  vi.stubEnv("REQUEST_FINGERPRINT_SECRET", "fingerprint-secret-that-is-long-enough");
  backend.fetchAction.mockReset().mockResolvedValue({ answer: "Published school information.", sources: [] });
});
afterEach(() => vi.unstubAllEnvs());

describe("session cookie recovery", () => {
  it("reports the backend unavailable fallback as retryable and still establishes the session", async () => {
    backend.fetchAction.mockResolvedValueOnce({
      answer:
        "I'm sorry, I can't reach the school knowledge service right now. Please try again shortly or contact the school office for time-sensitive help.",
      sources: [],
    });
    const response = await POST(
      new NextRequest("https://school.test/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Where are the notices?" }),
      }),
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(response.cookies.get("nps_ai_session")?.value).toMatch(/^[a-f0-9-]{36}$/);
    expect(await response.json()).toEqual({ error: expect.stringContaining("can't reach") });
  });

  it("replaces an invalid assistant cookie so follow-up questions use a stable conversation", async () => {
    const response = await POST(
      new NextRequest("https://school.test/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: "nps_ai_session=damaged" },
        body: JSON.stringify({ message: "Where is the school?" }),
      }),
    );
    expect(response.status).toBe(200);
    const sessionId = response.cookies.get("nps_ai_session")?.value;
    expect(sessionId).toMatch(/^[a-f0-9-]{36}$/);
    expect(backend.fetchAction.mock.calls[0][1].sessionId).toBe(sessionId);
  });

  it("preserves an existing valid assistant session", async () => {
    const sessionId = "e973ac30-fd45-4c33-9c3c-f24e350a4c61";
    const response = await POST(
      new NextRequest("https://school.test/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `nps_ai_session=${sessionId}` },
        body: JSON.stringify({ message: "Where is the school?" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.cookies.get("nps_ai_session")).toBeUndefined();
    expect(backend.fetchAction.mock.calls[0][1].sessionId).toBe(sessionId);
  });

  it("replaces a damaged public-form cookie in the next form response", () => {
    const session = preparePublicFormRequest(
      new NextRequest("https://school.test/api/forms/contact", {
        headers: { Cookie: "nps_form_session=damaged" },
      }),
    );
    expect(session).not.toBeNull();
    const response = formJson(session, { ok: true });
    expect(response.cookies.get("nps_form_session")?.value).toBe(session?.sessionId);
  });
});
