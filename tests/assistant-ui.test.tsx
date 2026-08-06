import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    expect(screen.getByRole("dialog", { name: "NPS Information Assistant" })).toBeInTheDocument();

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

  it("resets an open floating assistant after navigating through the full assistant route", () => {
    const view = render(<AssistantLauncher />);
    fireEvent.click(screen.getByRole("button", { name: "Open NPS assistant" }));
    expect(screen.getByRole("dialog", { name: "NPS Information Assistant" })).toBeInTheDocument();

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
});
