import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/components/site/site-header";
import type { PublicNavigationItem } from "@/lib/data/public";

const testState = vi.hoisted(() => ({
  pathname: "/articles",
  replace: vi.fn(),
  refresh: vi.fn(),
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => testState.pathname,
  useRouter: () => ({ replace: testState.replace, refresh: testState.refresh }),
}));
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
vi.mock("@/lib/auth/student-client", () => ({
  authClient: { useSession: testState.useSession, signOut: testState.signOut },
}));
vi.mock("@/components/site/use-modal-focus", () => ({ useModalFocus: vi.fn() }));

const navigationItems: PublicNavigationItem[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "articles", label: "Articles", href: "/articles" },
];

const utilityNavigationItems: PublicNavigationItem[] = [
  { id: "student-login", label: "Student login", href: "/student/login" },
  { id: "contact", label: "Contact", href: "/contact" },
];

function renderHeader() {
  return render(
    <SiteHeader
      schoolName="Nepal Police School, Garuda"
      location="Garuda, Rautahat"
      phone="9855021659"
      email="mrpschool@nepalpolice.gov.np"
      admissionsOpen={false}
      navigationItems={navigationItems}
      utilityNavigationItems={utilityNavigationItems}
    />,
  );
}

describe("site header student account", () => {
  beforeEach(() => {
    testState.pathname = "/articles";
    testState.replace.mockReset();
    testState.refresh.mockReset();
    testState.signOut.mockReset();
    testState.useSession.mockReset();
    testState.useSession.mockReturnValue({ data: null, isPending: false });
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows one session-aware student login entry and keeps published Articles navigation visible", () => {
    renderHeader();

    expect(screen.getAllByRole("link", { name: "Student login" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Articles" })[0]).toHaveAttribute("href", "/articles");
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
  });

  it("reserves the desktop account space while the session is loading", () => {
    testState.useSession.mockReturnValue({ data: null, isPending: true });
    renderHeader();

    expect(screen.getByRole("status", { name: "Checking student session" })).toHaveClass("w-24");
    expect(screen.queryByRole("link", { name: "Student login" })).not.toBeInTheDocument();
  });

  it("keeps utility text on one line and progressively reveals contact details", () => {
    renderHeader();

    const tagline = screen.getByText(/Official school information/i);
    const phone = screen.getByRole("link", { name: "9855021659" });
    const email = screen.getByRole("link", { name: "mrpschool@nepalpolice.gov.np" });
    const contact = screen.getByRole("link", { name: "Contact" });

    expect(tagline).toHaveClass("min-w-0", "flex-1", "truncate", "whitespace-nowrap");
    expect(phone).toHaveClass("hidden", "shrink-0", "whitespace-nowrap", "lg:inline-flex");
    expect(email).toHaveClass("hidden", "shrink-0", "whitespace-nowrap", "2xl:inline-flex");
    expect(contact).toHaveClass("shrink-0", "whitespace-nowrap");
    expect(contact.parentElement).toHaveClass("shrink-0", "whitespace-nowrap");
  });

  it("replaces Student login with the student's name and exposes profile and article actions", () => {
    testState.useSession.mockReturnValue({
      isPending: false,
      data: { user: { name: "Anita Rai", email: "anita@example.com" } },
    });
    renderHeader();

    expect(screen.queryByRole("link", { name: "Student login" })).not.toBeInTheDocument();
    const accountButton = screen.getByRole("button", { name: /Anita Rai/ });
    expect(accountButton).toHaveAttribute("aria-expanded", "false");
    expect(accountButton.parentElement).toHaveClass("w-32", "shrink-0");

    fireEvent.click(accountButton);

    expect(accountButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/student/profile");
    expect(screen.getByRole("link", { name: "My articles" })).toHaveAttribute("href", "/student/articles");
    expect(screen.getByRole("button", { name: "Logout" })).toBeVisible();
  });

  it("closes the account disclosure with Escape and restores focus to its trigger", async () => {
    testState.useSession.mockReturnValue({
      isPending: false,
      data: { user: { name: "Anita Rai", email: "anita@example.com" } },
    });
    renderHeader();

    const accountButton = screen.getByRole("button", { name: /Anita Rai/ });
    fireEvent.click(accountButton);
    screen.getByRole("link", { name: "Profile" }).focus();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
    await waitFor(() => expect(accountButton).toHaveFocus());
  });

  it("signs out once, redirects to student login, and refreshes the session shell", async () => {
    testState.useSession.mockReturnValue({
      isPending: false,
      data: { user: { name: "Anita Rai", email: "anita@example.com" } },
    });
    testState.signOut.mockResolvedValue({ error: null });
    renderHeader();

    fireEvent.click(screen.getByRole("button", { name: /Anita Rai/ }));
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));

    await waitFor(() => expect(testState.signOut).toHaveBeenCalledTimes(1));
    expect(testState.replace).toHaveBeenCalledWith("/student/login");
    expect(testState.refresh).toHaveBeenCalledTimes(1);
  });

  it("provides the same profile, articles, and logout controls in the mobile dialog", () => {
    testState.useSession.mockReturnValue({
      isPending: false,
      data: { user: { name: "Anita Rai", email: "anita@example.com" } },
    });
    renderHeader();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const dialog = screen.getByRole("dialog", { name: "Mobile navigation" });

    expect(within(dialog).getByText("Anita Rai")).toBeVisible();
    expect(within(dialog).getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/student/profile");
    expect(within(dialog).getByRole("link", { name: "My articles" })).toHaveAttribute(
      "href",
      "/student/articles",
    );
    expect(within(dialog).getByRole("button", { name: "Logout" })).toBeVisible();
  });
});
