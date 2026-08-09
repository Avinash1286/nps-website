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

import {
  AdminShell,
  adminNavigation,
  isAdminNavigationItemActive,
  primaryAdminNavigation,
} from "@/components/admin/admin-shell";

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

  it("orders editors around the same sections as the public website", () => {
    expect(adminNavigation.map((group) => group.label)).toEqual([
      "Overview",
      "Home & site",
      "About",
      "Academics",
      "School life",
      "Admissions",
      "Updates",
      "Communications",
      "AI & automation",
      "Administration",
    ]);

    const hrefs = adminNavigation.flatMap((group) => group.items.map((item) => item.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/admin/website",
        "/admin/home-sections",
        "/admin/leadership",
        "/admin/programs",
        "/admin/facilities",
        "/admin/gallery",
        "/admin/admissions",
        "/admin/news",
        "/admin/contacts",
        "/admin/ai",
        "/admin/settings",
      ]),
    );
  });

  it("keeps the default sidebar focused on common staff tasks", () => {
    expect(primaryAdminNavigation.map((group) => group.label)).toEqual([
      "Start",
      "Publish",
      "Requests",
      "Tools",
      "Administration",
    ]);
    expect(primaryAdminNavigation[0].items.map((item) => item.label)).toEqual([
      "Dashboard",
      "Edit website",
      "Facilities",
    ]);
    expect(primaryAdminNavigation.flatMap((group) => group.items).map((item) => item.href)).toEqual(
      expect.arrayContaining(["/admin/news", "/admin/admissions", "/admin/media", "/admin/settings"]),
    );
  });

  it("does not mark prefix-collision routes as active", () => {
    expect(isAdminNavigationItemActive("/admin/newsletter", "/admin/news")).toBe(false);
    expect(isAdminNavigationItemActive("/admin/newsletter", "/admin/newsletter")).toBe(true);
    expect(isAdminNavigationItemActive("/admin/admissions/record-id", "/admin/admissions")).toBe(true);
  });
});
