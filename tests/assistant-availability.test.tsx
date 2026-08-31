import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/assistant/assistant-launcher", () => ({
  AssistantLauncher: () => <div data-testid="assistant-launcher">Assistant launcher</div>,
}));

describe("assistant availability", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the launcher from the server-provided setting", async () => {
    const { AssistantAvailability } = await import("@/components/assistant/assistant-availability");
    render(<AssistantAvailability initialEnabled />);

    expect(screen.getByTestId("assistant-launcher")).toBeInTheDocument();
  });

  it("does not mount the launcher while the CMS setting is disabled", async () => {
    const { AssistantAvailability } = await import("@/components/assistant/assistant-availability");
    render(<AssistantAvailability initialEnabled={false} />);

    expect(screen.queryByTestId("assistant-launcher")).not.toBeInTheDocument();
  });
});
