import "@testing-library/jest-dom/vitest";
import { act, cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/components/site/site-header";
import type { PublicNavigationItem } from "@/lib/data/public";

const navigation = vi.hoisted(() => ({ pathname: "/facilities" }));

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

const navigationItems: PublicNavigationItem[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "about", label: "About", href: "/about" },
  { id: "about-overview", parentId: "about", label: "Overview", href: "/about" },
  { id: "about-history", parentId: "about", label: "History", href: "/about/history" },
  { id: "facilities", label: "Facilities", href: "/facilities" },
];

function renderHeader() {
  return render(
    <SiteHeader
      schoolName="Nepal Police School, Garuda"
      location="Garuda, Rautahat"
      admissionsOpen={false}
      navigationItems={navigationItems}
    />,
  );
}

function desktopAboutItem() {
  const link = screen.getAllByRole("link", { name: "About" })[0];
  const item = link.parentElement;
  if (!item) throw new Error("Desktop About navigation item was not rendered.");
  return item;
}

describe("site header desktop dropdowns", () => {
  beforeEach(() => {
    navigation.pathname = "/facilities";
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps the dropdown open while the pointer crosses into its hover bridge", () => {
    renderHeader();
    const item = desktopAboutItem();

    fireEvent.pointerEnter(item, { pointerType: "mouse" });
    const submenu = screen.getByRole("group", { name: "About submenu" });

    expect(submenu).toHaveClass("top-full", "pt-2");
    expect(submenu).not.toHaveClass("anim-fade-up", "mt-1");
    expect(submenu.firstElementChild).toHaveClass("anim-fade-up");

    fireEvent.pointerLeave(item, { pointerType: "mouse" });
    expect(screen.getByRole("group", { name: "About submenu" })).toBeVisible();

    fireEvent.pointerEnter(submenu, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(500));

    expect(screen.getByRole("group", { name: "About submenu" })).toBeVisible();
  });

  it("closes only after the pointer has genuinely left the navigation item", () => {
    renderHeader();
    const item = desktopAboutItem();

    fireEvent.pointerEnter(item, { pointerType: "mouse" });
    expect(screen.getByRole("group", { name: "About submenu" })).toBeVisible();

    fireEvent.pointerLeave(item, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(139));
    expect(screen.getByRole("group", { name: "About submenu" })).toBeVisible();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("group", { name: "About submenu" })).not.toBeInTheDocument();
  });

  it("does not treat touch input as hover and retains the disclosure button", () => {
    renderHeader();
    const item = desktopAboutItem();

    const touchEnter = createEvent.pointerEnter(item);
    Object.defineProperty(touchEnter, "pointerType", { value: "touch" });
    fireEvent(item, touchEnter);
    expect(screen.queryByRole("group", { name: "About submenu" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open About submenu" }));
    expect(screen.getByRole("group", { name: "About submenu" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Close About submenu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});
