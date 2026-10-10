import { act, cleanup, renderHook } from "@testing-library/react";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/forms/admissions/route";
import { usePublicForm } from "@/components/forms/use-public-form";

const mocks = vi.hoisted(() => ({ action: vi.fn() }));
vi.mock("convex/nextjs", () => ({ fetchAction: mocks.action }));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("admissions message limits", () => {
  beforeEach(() => {
    vi.stubEnv("REQUEST_FINGERPRINT_SECRET", "a".repeat(40));
    vi.stubEnv("FORM_SERVICE_SECRET", "b".repeat(40));
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://test.convex.cloud");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    mocks.action.mockResolvedValue({ ok: true, applicationNumber: "test-ref" });
  });

  const enquiry = {
    consent: true,
    studentName: "Test Student",
    dateOfBirth: "2015-01-01",
    guardianName: "Test Guardian",
    email: "test@example.test",
    phone: "9800000000",
    intendedLevel: "primary",
  };
  const application = {
    consent: true,
    desiredGrade: "primary",
    student: { firstName: "Test", lastName: "Student", dateOfBirth: "2015-01-01" },
    guardian: {
      name: "Test Guardian",
      relationship: "Parent",
      email: "test@example.test",
      phone: "9800000000",
      address: "Test address",
    },
  };

  it.each([
    { name: "enquiry", payload: enquiry, field: "message" },
    { name: "application", payload: application, field: "notes" },
  ])("accepts 2,000 characters and rejects 2,001 for $name", async ({ payload, field }) => {
    const request = (length: number) =>
      new NextRequest("https://school.example/api/forms/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, [field]: "a".repeat(length) }),
      });
    expect((await POST(request(2000))).status).toBe(201);
    expect(mocks.action.mock.calls[0][1].notes).toBe("a".repeat(2000));
    expect((await POST(request(2001))).status).toBe(400);
    expect(mocks.action).toHaveBeenCalledTimes(1);
  });
});

describe("public form CAPTCHA retries", () => {
  it.each(["backend", "network"])(
    "refreshes CAPTCHA after a %s failure and keeps the retry id",
    async (failure) => {
      const fetchMock = vi.fn();
      if (failure === "network") {
        fetchMock.mockRejectedValueOnce(new TypeError("Network failure"));
      } else {
        fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Temporary failure" }) });
      }
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
      vi.stubGlobal("fetch", fetchMock);
      const { result } = renderHook(() => usePublicForm("/api/forms/contact", "Sent"));
      act(() => result.current.captcha.setToken("consumed-token"));
      await act(async () => {
        expect(await result.current.submit({ name: "Test" })).toBe(false);
      });
      expect(result.current.status.state).toBe("error");
      expect(result.current.captcha.key).toBe(1);

      // Even a retry before the new widget completes must not reuse the old token.
      await act(async () => {
        await result.current.submit({ name: "Test" });
      });
      expect(JSON.parse(fetchMock.mock.calls[1][1].body).captchaToken).toBe("");
    },
  );

  it("retries with a fresh token and the same submission id, rotating the id only after success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Temporary failure" }) })
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => usePublicForm("/api/forms/contact", "Sent"));
    act(() => result.current.captcha.setToken("first-token"));
    await act(async () => {
      await result.current.submit({ name: "Test" });
    });
    act(() => result.current.captcha.setToken("fresh-token"));
    await act(async () => {
      expect(await result.current.submit({ name: "Test" })).toBe(true);
    });
    expect(result.current.status).toEqual({ state: "success", message: "Sent" });
    expect(result.current.captcha.key).toBe(2);
    await act(async () => {
      await result.current.submit({ name: "Another" });
    });
    const bodies = fetchMock.mock.calls.map((call) => JSON.parse(call[1].body));
    expect(bodies.map((body) => body.captchaToken)).toEqual(["first-token", "fresh-token", ""]);
    expect(bodies[0].submissionId).toBeTruthy();
    expect(bodies[1].submissionId).toBe(bodies[0].submissionId);
    expect(bodies[2].submissionId).not.toBe(bodies[0].submissionId);
  });
});
