import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_admin_gate";
  process.env.NEXT_PUBLIC_CONVEX_URL = "https://admin-gate-test.convex.cloud";
  return {
    user: null as null | { status: string; roles: string[] },
  };
});

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => mocks.user,
}));

import { AdminFeatureGate } from "@/components/admin/admin-gate";

describe("administration approval gate", () => {
  afterEach(() => cleanup());

  it.each([
    { status: "pending", roles: [] },
    { status: "active", roles: [] },
  ])("shows approval guidance without bootstrap access for $status accounts", (user) => {
    mocks.user = user;

    render(
      <AdminFeatureGate>
        <div>Restricted administration content</div>
      </AdminFeatureGate>,
    );

    expect(
      screen.getByRole("heading", { name: "Administration access is awaiting approval" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/wait for an administrator to review your account/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact the school" })).toHaveAttribute("href", "/contact");
    expect(screen.queryByRole("link", { name: /first-admin|activation/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Restricted administration content")).not.toBeInTheDocument();
  });
});
