import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <span aria-label="User account" />,
  useAuth: () => ({ isLoaded: true, isSignedIn: false }),
}));

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  useQuery: () => null,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
}));

import { AdminShell } from "@/components/admin/admin-shell";

describe("administration sidebar", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("uses the school emblem and supports an accessible compact desktop state", () => {
    render(
      <AdminShell authConfigured={false}>
        <div>Administration content</div>
      </AdminShell>,
    );

    expect(screen.getByRole("img", { name: "Nepal Police School emblem" })).toHaveAttribute(
      "src",
      expect.stringContaining("nps-logo.png"),
    );

    const sidebar = document.querySelector("#admin-navigation-panel");
    const content = document.querySelector("[data-sidebar-collapsed]");
    expect(sidebar).toHaveAttribute("data-collapsed", "false");
    expect(content).toHaveAttribute("data-sidebar-collapsed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(sidebar).toHaveAttribute("data-collapsed", "true");
    expect(content).toHaveAttribute("data-sidebar-collapsed", "true");
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("title", "Dashboard");
    expect(screen.getByText("Administration content")).toBeInTheDocument();
  });
});
