import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const convex = vi.hoisted(() => ({
  result: undefined as { assistantEnabled?: boolean } | null | undefined,
  error: null as Error | null,
}));
const useQuery = vi.hoisted(() =>
  vi.fn(() => {
    if (convex.error) throw convex.error;
    return convex.result;
  }),
);

vi.mock("convex/react", () => ({ useQuery }));
vi.mock("@/components/assistant/assistant-launcher", () => ({
  AssistantLauncher: () => <div data-testid="assistant-launcher">Assistant launcher</div>,
}));

describe("assistant availability", () => {
  beforeEach(() => {
    vi.resetModules();
    useQuery.mockClear();
    convex.result = undefined;
    convex.error = null;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("uses the server fallback without calling Convex when no provider is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");
    const { AssistantAvailability } = await import("@/components/assistant/assistant-availability");
    render(<AssistantAvailability initialEnabled />);

    expect(screen.getByTestId("assistant-launcher")).toBeInTheDocument();
    expect(useQuery).not.toHaveBeenCalled();
  });

  it("reacts to the public settings query when Convex is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
    convex.result = { assistantEnabled: true };
    const { AssistantAvailability } = await import("@/components/assistant/assistant-availability");
    render(<AssistantAvailability initialEnabled={false} />);

    expect(screen.getByTestId("assistant-launcher")).toBeInTheDocument();
    expect(useQuery).toHaveBeenCalledTimes(1);
  });

  it("contains a live query failure and keeps the server-rendered launcher fallback", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    convex.error = new Error("Convex connection failed");
    const { AssistantAvailability } = await import("@/components/assistant/assistant-availability");

    expect(() => render(<AssistantAvailability initialEnabled />)).not.toThrow();
    expect(screen.getByTestId("assistant-launcher")).toBeInTheDocument();
    expect(useQuery).toHaveBeenCalled();
  });
});
