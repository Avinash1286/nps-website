import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({
  updateDisplayName: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/components/student/convex-api", () => ({
  studentProfileApi: {
    getCurrent: "getCurrent",
    updateDisplayName: "updateDisplayName",
  },
}));

vi.mock("convex/react", () => ({
  useMutation: () => mocks.updateDisplayName,
  useQuery: vi.fn(),
}));

vi.mock("@/lib/auth/student-client", () => ({
  authClient: {
    updateUser: mocks.updateUser,
    signOut: mocks.signOut,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { StudentProfile } from "@/components/student/student-profile";
import { StudentWorkspaceShell } from "@/components/student/student-workspace-shell";

const student = { id: "student-1", name: "Student Writer", email: "student@example.com" };

describe("student profile and workspace", () => {
  beforeEach(() => {
    mocks.updateDisplayName.mockReset();
    mocks.updateUser.mockReset();
    mocks.signOut.mockReset();
    mocks.replace.mockReset();
    mocks.refresh.mockReset();
    mocks.updateUser.mockResolvedValue({ data: { status: true }, error: null });
    mocks.signOut.mockResolvedValue({ data: { status: true }, error: null });
  });

  afterEach(() => cleanup());

  it("shows editable profile details and keeps the sign-in email read-only", () => {
    render(<StudentProfile student={student} />);

    expect(screen.getByRole("heading", { name: "My profile" })).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toHaveValue("Student Writer");
    expect(screen.getByLabelText(/sign-in email address/i)).toHaveValue("student@example.com");
    expect(screen.getByLabelText(/sign-in email address/i)).toHaveAttribute("readonly");
    expect(screen.getByText(/cannot be changed from this page/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save profile" })).toBeDisabled();
  });

  it("updates the canonical account name and stored student profile", async () => {
    mocks.updateDisplayName.mockResolvedValue({ ...student, name: "Aarav Shah" });
    render(<StudentProfile student={student} />);

    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: "  Aarav   Shah  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() => {
      expect(mocks.updateUser).toHaveBeenCalledWith({ name: "Aarav Shah" });
      expect(mocks.updateDisplayName).toHaveBeenCalledWith({ name: "Aarav Shah" });
    });
    expect(mocks.updateUser.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.updateDisplayName.mock.invocationCallOrder[0],
    );
    expect(await screen.findByRole("status")).toHaveTextContent("display name has been updated");
    expect(screen.getAllByText("Aarav Shah").length).toBeGreaterThan(0);
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("does not change the app profile when the canonical account update fails", async () => {
    mocks.updateUser.mockResolvedValue({ data: null, error: { message: "Unavailable" } });
    render(<StudentProfile student={student} />);

    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "Aarav Shah" } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("could not update your profile");
    expect(mocks.updateDisplayName).not.toHaveBeenCalled();
  });

  it("restores the canonical name when storing the profile change fails", async () => {
    mocks.updateDisplayName.mockRejectedValue(new Error("Database unavailable"));
    render(<StudentProfile student={student} />);

    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "Aarav Shah" } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("could not update your profile");
    expect(mocks.updateUser).toHaveBeenNthCalledWith(1, { name: "Aarav Shah" });
    expect(mocks.updateUser).toHaveBeenNthCalledWith(2, { name: "Student Writer" });
  });

  it("provides profile, article, writing, and sign-out controls throughout the workspace", async () => {
    render(
      <StudentWorkspaceShell
        student={student}
        eyebrow="Your writing"
        title="My articles"
        description="Manage your student articles."
      >
        <p>Workspace content</p>
      </StudentWorkspaceShell>,
    );

    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/student/profile");
    expect(screen.getByRole("link", { name: "My articles" })).toHaveAttribute("href", "/student/articles");
    expect(screen.getByRole("link", { name: /write an article/i })).toHaveAttribute(
      "href",
      "/student/articles/new",
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalled());
    expect(mocks.replace).toHaveBeenCalledWith("/student/login");
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
