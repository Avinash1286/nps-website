import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantLauncher } from "@/components/assistant/assistant-launcher";
import { AssistantPanel } from "@/components/assistant/assistant-panel";

const navigation = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));
vi.mock("@/components/site/use-modal-focus", () => ({ useModalFocus: vi.fn() }));

describe("public assistant UI", () => {
  beforeEach(() => {
    navigation.pathname = "/";
    Element.prototype.scrollIntoView = vi.fn();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps an answered conversation when the floating panel is closed and reopened", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          answer: "Admissions open after the official notice is published.",
          sources: [],
        }),
      }),
    );

    render(<AssistantLauncher />);
    const launcher = screen.getByRole("button", { name: "Open NPS assistant" });
    expect(launcher).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(launcher);
    expect(await screen.findByRole("dialog", { name: "NPS Information Assistant" })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Ask a question" }), {
      target: { value: "When do admissions open?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));
    expect(await screen.findByText("Admissions open after the official notice is published.")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Close assistant" }));
    expect(screen.queryByRole("dialog", { name: "NPS Information Assistant" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open NPS assistant" }));
    expect(screen.getByText("Admissions open after the official notice is published.")).toBeVisible();
  });

  it("closes the floating experience when a cited source is opened", async () => {
    const onClose = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          answer: "Read the current admissions process.",
          sources: [{ title: "Admissions process", href: "/admissions/process" }],
        }),
      }),
    );

    render(<AssistantPanel onClose={onClose} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Ask a question" }), {
      target: { value: "How do I apply?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));

    const source = await screen.findByRole("link", { name: /Admissions process/i });
    fireEvent.click(source);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("announces when an embedded preview source opens in a new tab", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          answer: "Read the current admissions process.",
          sources: [{ title: "Admissions process", href: "/admissions/process" }],
        }),
      }),
    );

    render(<AssistantPanel embedded sourceLinksNewTab />);
    fireEvent.change(screen.getByRole("textbox", { name: "Ask a question" }), {
      target: { value: "How do I apply?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));

    const source = await screen.findByRole("link", {
      name: "Admissions process (opens in a new tab)",
    });
    expect(source).toHaveAttribute("target", "_blank");
    expect(source).toHaveAttribute("rel", "noreferrer");
  });

  it("does not duplicate the floating launcher on the full assistant route", () => {
    navigation.pathname = "/assistant";
    render(<AssistantLauncher />);
    expect(screen.queryByRole("button", { name: /NPS assistant/i })).not.toBeInTheDocument();
  });

  it("resets an open floating assistant after navigating through the full assistant route", async () => {
    const view = render(<AssistantLauncher />);
    fireEvent.click(screen.getByRole("button", { name: "Open NPS assistant" }));
    expect(await screen.findByRole("dialog", { name: "NPS Information Assistant" })).toBeInTheDocument();

    navigation.pathname = "/assistant";
    view.rerender(<AssistantLauncher />);
    expect(screen.queryByRole("button", { name: /NPS assistant/i })).not.toBeInTheDocument();

    navigation.pathname = "/";
    view.rerender(<AssistantLauncher />);
    expect(screen.getByRole("button", { name: "Open NPS assistant" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("dialog", { name: "NPS Information Assistant" })).not.toBeInTheDocument();
  });

  it("does not steal focus when rendered as a full-page assistant", async () => {
    render(<AssistantPanel fullPage />);
    const input = screen.getByRole("textbox", { name: "Ask a question" });
    await waitFor(() => expect(input).not.toHaveFocus());
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("can follow up after a long answer without resending oversized history", async () => {
    const longAnswer = "Published school information. ".repeat(100);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ answer: longAnswer, sources: [] }) })
      .mockResolvedValue({ ok: true, json: async () => ({ answer: "Here is the follow-up.", sources: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<AssistantPanel />);
    fireEvent.change(screen.getByRole("textbox", { name: "Ask a question" }), {
      target: { value: "Tell me about the school." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));
    await screen.findByRole("button", { name: "Copy answer" });
    fireEvent.change(screen.getByRole("textbox", { name: "Ask a question" }), {
      target: { value: "Where can I read more?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));
    expect(await screen.findByText("Here is the follow-up.")).toBeVisible();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ message: "Where can I read more?" });
  });

  it("retries a failed question without adding it to the conversation twice", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Please try again." }) })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ answer: "The current notice has the details.", sources: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);
    render(<AssistantPanel />);
    fireEvent.change(screen.getByRole("textbox", { name: "Ask a question" }), {
      target: { value: "When do admissions open?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));
    fireEvent.click(await screen.findByRole("button", { name: "Retry question" }));
    expect(await screen.findByText("The current notice has the details.")).toBeVisible();
    expect(screen.getAllByText("When do admissions open?")).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].body).toBe(fetchMock.mock.calls[0][1].body);
  });

  it("lets the visitor stop waiting and retry instead of leaving the input locked", async () => {
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<AssistantPanel />);
    fireEvent.change(screen.getByRole("textbox", { name: "Ask a question" }), {
      target: { value: "Tell me about admissions." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));
    fireEvent.click(screen.getByRole("button", { name: "Stop response" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Response stopped");
    expect(screen.getByRole("textbox", { name: "Ask a question" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Retry question" })).toBeEnabled();
    expect(fetchMock.mock.calls[0][1].signal?.aborted).toBe(true);
  });

  it("recovers from an assistant request that never responds", async () => {
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
    render(<AssistantPanel />);
    fireEvent.change(screen.getByRole("textbox", { name: "Ask a question" }), {
      target: { value: "Tell me about admissions." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("took too long");
    expect(screen.getByRole("textbox", { name: "Ask a question" })).toBeEnabled();
  });

  it("copies an answer with its public source links", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          answer: "See the current school notices.",
          sources: [{ title: "Official notices", href: "/notices" }],
        }),
      }),
    );
    render(<AssistantPanel />);
    fireEvent.change(screen.getByRole("textbox", { name: "Ask a question" }), {
      target: { value: "Where are the notices?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));
    fireEvent.click(await screen.findByRole("button", { name: "Copy answer" }));
    expect(await screen.findByRole("button", { name: "Answer copied" })).toBeVisible();
    expect(writeText).toHaveBeenCalledWith(
      `See the current school notices.\n\nSources:\nOfficial notices: ${new URL("/notices", window.location.origin).href}`,
    );
  });
});
