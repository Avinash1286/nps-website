import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AssistantContextManager,
  parseAssistantKeywords,
} from "@/components/admin/assistant-context-manager";

const convexMocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  remove: vi.fn(),
  contexts: [] as Array<Record<string, unknown>>,
}));

function functionName(reference: object) {
  const symbol = Object.getOwnPropertySymbols(reference)[0];
  return symbol ? String((reference as Record<symbol, unknown>)[symbol]) : "";
}

vi.mock("convex/react", () => ({
  useQuery: () => convexMocks.contexts,
  useMutation: (reference: object) =>
    functionName(reference).endsWith("upsertContext") ? convexMocks.upsert : convexMocks.remove,
}));

describe("assistant context manager", () => {
  beforeEach(() => {
    convexMocks.upsert.mockReset().mockResolvedValue("context_1");
    convexMocks.remove.mockReset().mockResolvedValue({ ok: true });
    convexMocks.contexts = [];
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("normalizes unique context keywords", () => {
    expect(parseAssistantKeywords("fees, Scholarship\nFEES, admissions")).toEqual([
      "fees",
      "scholarship",
      "admissions",
    ]);
  });

  it("creates and publishes a validated context", async () => {
    render(<AssistantContextManager />);
    fireEvent.click(screen.getByRole("button", { name: "Add context" }));

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Admission fee support" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Admissions" } });
    const verifiedContext = screen.getByLabelText("Verified context");
    expect(verifiedContext).toHaveAccessibleDescription("0 / 12,000");
    fireEvent.change(verifiedContext, {
      target: {
        value: "Families should follow the published fee notice and contact the office for support.",
      },
    });
    const keywords = screen.getByLabelText("Keywords");
    expect(keywords).toHaveAccessibleDescription("Separate up to 20 keywords with commas or new lines.");
    fireEvent.change(keywords, {
      target: { value: "fees, scholarship, Fees" },
    });
    fireEvent.change(screen.getByLabelText(/Public source path/), {
      target: { value: "/admissions/fees-scholarships" },
    });
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "80" } });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "published" } });
    fireEvent.click(screen.getByRole("button", { name: "Save & publish" }));

    await waitFor(() =>
      expect(convexMocks.upsert).toHaveBeenCalledWith({
        context: {
          title: "Admission fee support",
          category: "Admissions",
          content: "Families should follow the published fee notice and contact the office for support.",
          keywords: ["fees", "scholarship"],
          publicPath: "/admissions/fees-scholarships",
          priority: 80,
          status: "published",
        },
      }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("saved and published");
  });

  it("restores visible focus to the editor trigger when the mobile editor closes", async () => {
    render(<AssistantContextManager />);
    const addContext = screen.getByRole("button", { name: "Add context" });

    fireEvent.click(addContext);
    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(addContext).toHaveFocus());
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
  });

  it("shows progress on the exact row action and announces its new-tab source", async () => {
    convexMocks.contexts = [
      {
        _id: "context_1",
        _creationTime: 1,
        title: "Admissions support",
        category: "Admissions",
        content: "Families can contact the office for admissions support.",
        keywords: ["admissions"],
        publicPath: "/admissions/support",
        priority: 80,
        status: "draft",
        createdBy: "user_1",
        updatedBy: "user_1",
        createdAt: 1,
        updatedAt: 1,
      },
    ];
    let resolveArchive!: (value: string) => void;
    convexMocks.upsert.mockReturnValueOnce(
      new Promise<string>((resolve) => {
        resolveArchive = resolve;
      }),
    );
    render(<AssistantContextManager />);

    expect(screen.getByRole("link", { name: "/admissions/support (opens in a new tab)" })).toHaveAttribute(
      "target",
      "_blank",
    );
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));

    expect(screen.getByRole("button", { name: "Archiving..." })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Archiving..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Publishing..." })).not.toBeInTheDocument();

    await act(async () => {
      resolveArchive("context_1");
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "Archive" })).toBeEnabled());

    vi.spyOn(window, "confirm").mockReturnValue(true);
    let resolveDelete!: (value: { ok: boolean }) => void;
    convexMocks.remove.mockReturnValueOnce(
      new Promise<{ ok: boolean }>((resolve) => {
        resolveDelete = resolve;
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByRole("button", { name: "Deleting..." })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Deleting..." })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Archiving..." })).not.toBeInTheDocument();

    await act(async () => {
      resolveDelete({ ok: true });
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled());
  });
});
