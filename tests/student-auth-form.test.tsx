import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/auth/student-client", () => ({
  authClient: {
    signIn: { email: mocks.signIn },
    signUp: { email: mocks.signUp },
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

import { StudentAuthForm } from "@/components/student/student-auth-form";

describe("student Better Auth forms", () => {
  beforeEach(() => {
    mocks.signIn.mockReset();
    mocks.signUp.mockReset();
    mocks.replace.mockReset();
    mocks.refresh.mockReset();
  });

  afterEach(() => cleanup());

  it("uses Better Auth email login and keeps authentication failures generic", async () => {
    mocks.signIn.mockResolvedValue({
      data: null,
      error: { status: 401, message: "No account exists for student@example.com" },
    });
    render(<StudentAuthForm mode="login" />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "student@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "not-the-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(mocks.signIn).toHaveBeenCalledWith({
        email: "student@example.com",
        password: "not-the-password",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("The email address or password is incorrect.");
    expect(screen.queryByText(/No account exists/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact the school" })).toHaveAttribute("href", "/contact");
  });

  it("requires acknowledgement and registers through Better Auth", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { id: "student-1" } }, error: null });
    render(<StudentAuthForm mode="register" />);

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Student Writer" } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "student@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: "a-secure-student-password" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "a-secure-student-password" },
    });

    const acknowledgement = screen.getByRole("checkbox", { name: /I agree to the terms of use/i });
    expect(acknowledgement).toBeRequired();
    expect(acknowledgement).not.toBeChecked();
    expect(screen.getByRole("link", { name: "terms of use" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "privacy notice" })).toHaveAttribute("href", "/privacy");
    fireEvent.click(acknowledgement);
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(mocks.signUp).toHaveBeenCalledWith({
        name: "Student Writer",
        email: "student@example.com",
        password: "a-secure-student-password",
        termsAccepted: true,
      }),
    );
    expect(mocks.replace).toHaveBeenCalledWith("/student/login?registered=1");
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("shows a safe registration-complete notice without exposing account details", () => {
    render(<StudentAuthForm mode="login" registrationComplete />);

    expect(screen.getByRole("status")).toHaveTextContent("Your account is ready");
    expect(screen.getByRole("status")).not.toHaveTextContent("student@example.com");
  });

  it("catches mismatched passwords before making an account request", async () => {
    render(<StudentAuthForm mode="register" />);

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Student Writer" } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "student@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: "a-secure-student-password" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "a-different-password" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /I agree to the terms of use/i }));
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The passwords do not match");
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
});
