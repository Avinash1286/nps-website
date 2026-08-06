import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({
  eligibility: { status: "approval_required" } as {
    status: "eligible" | "approved" | "approval_required";
  },
  mutation: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: () => mocks.eligibility,
  useMutation: () => mocks.mutation,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

vi.mock("@/components/admin/admin-gate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/admin/admin-gate")>();
  return {
    ...actual,
    AdminFeatureGate: ({ children }: { children: ReactNode }) => children,
  };
});

import { BootstrapAdmin } from "@/components/admin/bootstrap-admin";

describe("first-administrator route guard", () => {
  beforeEach(() => {
    mocks.eligibility = { status: "approval_required" };
    mocks.mutation.mockReset();
    mocks.replace.mockReset();
    mocks.refresh.mockReset();
  });

  afterEach(() => cleanup());

  it("shows ordinary pending users approval guidance instead of activation controls", () => {
    render(<BootstrapAdmin />);

    expect(
      screen.getByRole("heading", { name: "Administration access is awaiting approval" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Activate administrator" })).not.toBeInTheDocument();
    expect(screen.queryByText("INITIAL_ADMIN_CLERK_USER_ID")).not.toBeInTheDocument();
    expect(mocks.mutation).not.toHaveBeenCalled();
  });

  it("returns an already-approved staff member to the dashboard", async () => {
    mocks.eligibility = { status: "approved" };
    render(<BootstrapAdmin />);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/admin"));
    expect(screen.queryByRole("button", { name: "Activate administrator" })).not.toBeInTheDocument();
  });

  it("shows activation only to the allowlisted eligible account", () => {
    mocks.eligibility = { status: "eligible" };
    render(<BootstrapAdmin />);

    expect(screen.getByRole("button", { name: "Activate administrator" })).toBeInTheDocument();
  });

  it("never renders a decorated Convex error when activation fails", async () => {
    mocks.eligibility = { status: "eligible" };
    mocks.mutation
      .mockResolvedValueOnce("user_id")
      .mockRejectedValueOnce(new Error("[CONVEX M(users:bootstrapFirstAdmin)] Server Error"));
    render(<BootstrapAdmin />);

    fireEvent.click(screen.getByRole("button", { name: "Activate administrator" }));

    expect(await screen.findByText(/Administrator activation could not be completed/i)).toBeInTheDocument();
    expect(screen.queryByText(/\[CONVEX/i)).not.toBeInTheDocument();
  });
});
