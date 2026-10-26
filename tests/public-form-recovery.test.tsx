import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePublicForm } from "@/components/forms/use-public-form";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("public form recovery", () => {
  it("uses a new submission ID when the visitor changes details after a failed attempt", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("Connection lost after submission"))
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => usePublicForm("/api/forms/contact", "Received."));
    await act(async () => {
      await result.current.submit({ message: "Original enquiry" });
    });
    await act(async () => {
      await result.current.submit({ message: "Updated enquiry with new details" });
    });
    const original = JSON.parse(fetchMock.mock.calls[0][1].body);
    const updated = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(updated.submissionId).not.toBe(original.submissionId);
    expect(updated.message).toBe("Updated enquiry with new details");
  });

  it("refreshes verification after failure and retains the submission ID for a safe retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Please retry." }) })
      .mockResolvedValue({ ok: true, json: async () => ({ message: "Received." }) });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => usePublicForm("/api/forms/contact", "Thank you."));
    act(() => result.current.captcha.setToken("single-use-token"));
    await act(async () => {
      expect(await result.current.submit({ name: "Visitor" })).toBe(false);
    });
    expect(result.current.captcha.key).toBe(1);
    expect(result.current.status.state).toBe("error");
    act(() => result.current.captcha.setToken("fresh-token"));
    await act(async () => {
      expect(await result.current.submit({ name: "Visitor" })).toBe(true);
    });
    const first = JSON.parse(fetchMock.mock.calls[0][1].body);
    const retry = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(first.captchaToken).toBe("single-use-token");
    expect(retry.captchaToken).toBe("fresh-token");
    expect(retry.submissionId).toBe(first.submissionId);
    expect(result.current.captcha.key).toBe(2);
    await act(async () => {
      await result.current.submit({ name: "Another enquiry" });
    });
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).submissionId).not.toBe(first.submissionId);
  });

  it("sends only once when two submissions happen before React updates the screen", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => usePublicForm("/api/forms/contact", "Received."));
    await act(async () => {
      const first = result.current.submit({ name: "Visitor" });
      const duplicate = result.current.submit({ name: "Visitor" });
      expect(await duplicate).toBe(false);
      expect(await first).toBe(true);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("releases a stalled submission and renews verification when the request times out", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
          }),
      ),
    );
    const { result } = renderHook(() => usePublicForm("/api/forms/contact", "Received."));
    let pending: Promise<boolean>;
    act(() => {
      pending = result.current.submit({ name: "Visitor" });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
      await pending;
    });
    expect(result.current.status.state).toBe("error");
    expect(result.current.status.message).toContain("took too long");
    expect(result.current.captcha.key).toBe(1);
  });
});
