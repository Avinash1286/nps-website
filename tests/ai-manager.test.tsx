import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const convex = vi.hoisted(() => ({
  user: {
    _id: "user_1",
    status: "active",
    roles: ["editor"],
  } as Record<string, unknown>,
  detail: null as {
    conversation: { _id: string } & Record<string, unknown>;
    messages: Array<{ _id: string } & Record<string, unknown>>;
  } | null,
  closeConversation: vi.fn(),
}));

const useQuery = vi.hoisted(() =>
  vi.fn((_reference: object, args?: unknown) => {
    if (args === "skip") return undefined;
    if (args && typeof args === "object" && "conversationId" in args) return convex.detail;
    return convex.user;
  }),
);
const useMutation = vi.hoisted(() => vi.fn(() => convex.closeConversation));
const usePaginatedQuery = vi.hoisted(() =>
  vi.fn(() => ({ results: [], status: "Exhausted", loadMore: vi.fn() })),
);

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
}));
vi.mock("convex/react", () => ({ useMutation, usePaginatedQuery, useQuery }));

describe("AI administration UI", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_configured");
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
    convex.user = { _id: "user_1", status: "active", roles: ["editor"] };
    convex.detail = {
      conversation: {
        _id: "conversation_1",
        status: "active",
        title: "Admissions question",
        ownerKey: "session_1",
        lastMessageAt: 1,
      },
      messages: [
        {
          _id: "message_1",
          role: "user",
          status: "completed",
          content: "How do I apply?",
        },
      ],
    };
    convex.closeConversation.mockReset().mockResolvedValue({ ok: true });
    useQuery.mockClear();
    useMutation.mockClear();
    usePaginatedQuery.mockClear();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("blocks non-admin staff before restricted AI queries mount", async () => {
    const { AiManager } = await import("@/components/admin/ai-manager");
    render(<AiManager />);

    expect(screen.getByRole("heading", { name: "Additional access required" })).toBeInTheDocument();
    expect(useQuery).toHaveBeenCalledTimes(1);
    expect(usePaginatedQuery).not.toHaveBeenCalled();
  });

  it("keeps a failed moderation action visible inside the open transcript dialog", async () => {
    convex.closeConversation.mockRejectedValueOnce(new Error("Moderation service unavailable"));
    const { ConversationReview } = await import("@/components/admin/ai-manager");
    render(
      <ConversationReview
        conversations={[convex.detail!.conversation]}
        paginationStatus="Exhausted"
        onLoadMore={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    const dialog = await screen.findByRole("dialog", { name: "Conversation review" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Close conversation" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Moderation service unavailable");
    expect(screen.getByRole("dialog", { name: "Conversation review" })).toBeInTheDocument();
  });

  it("closes the transcript dialog before showing successful moderation feedback", async () => {
    const { ConversationReview } = await import("@/components/admin/ai-manager");
    render(
      <ConversationReview
        conversations={[convex.detail!.conversation]}
        paginationStatus="Exhausted"
        onLoadMore={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Conversation review" })).getByRole("button", {
        name: "Close conversation",
      }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Conversation review" })).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/Transcript closed and the moderation action was audited/)).toBeVisible();
  });
});
