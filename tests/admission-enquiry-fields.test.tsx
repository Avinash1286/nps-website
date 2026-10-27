import { cleanup, render, screen } from "@testing-library/react";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeAcademicYear } from "@/lib/content/academic-year";
import { AdmissionsForm } from "@/components/forms/admissions-form";

const backend = vi.hoisted(() => ({ fetchAction: vi.fn() }));
vi.mock("convex/nextjs", () => backend);
import { POST } from "@/app/api/forms/admissions/route";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://school-test.convex.cloud");
  vi.stubEnv("REQUEST_FINGERPRINT_SECRET", "fingerprint-secret-that-is-long-enough");
  vi.stubEnv("FORM_SERVICE_SECRET", "form-service-secret-that-is-long-enough");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "");
  backend.fetchAction.mockReset().mockResolvedValue({ ok: true, applicationNumber: "TEST-ENQUIRY" });
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function submit(overrides: Record<string, unknown> = {}) {
  return POST(
    new NextRequest("https://school.test/api/forms/admissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentName: "Test Student",
        dateOfBirth: "2015-01-01",
        guardianName: "Test Guardian",
        email: "guardian@example.com",
        phone: "9800000000",
        intendedLevel: "primary",
        consent: true,
        academicYear: "Current intake",
        ...overrides,
      }),
    }),
  );
}

describe("admission enquiry fields", () => {
  it.each([undefined, "", " Configure in admin ", "Current intake", "current"])(
    "does not present %s as a confirmed academic year",
    (value) => {
      expect(normalizeAcademicYear(value)).toBeUndefined();
      render(<AdmissionsForm academicYear={value} />);
      expect(screen.getByDisplayValue("Current intake")).toBeInTheDocument();
      expect(screen.queryByDisplayValue(/Configure in admin/i)).not.toBeInTheDocument();
    },
  );

  it("preserves a school-approved year without guessing from the calendar", () => {
    expect(normalizeAcademicYear(" 2083/2084 ")).toBe("2083/2084");
    render(<AdmissionsForm academicYear="2083/2084" />);
    expect(screen.getByDisplayValue("2083/2084")).toBeInTheDocument();
  });

  it.each(["Configure in admin", "Current intake", ""])(
    "normalizes the setup value %s before sending it to the backend",
    async (academicYear) => {
      expect((await submit({ academicYear })).status).toBe(201);
      expect(backend.fetchAction.mock.calls[0][1].academicYear).toBe("current");
    },
  );

  it("accepts the UI's maximum message length and rejects anything beyond it", async () => {
    render(<AdmissionsForm academicYear="2083/2084" />);
    const field = screen.getByRole("textbox", { name: "Additional information" }) as HTMLTextAreaElement;
    expect((await submit({ message: "a".repeat(field.maxLength) })).status).toBe(201);
    expect((await submit({ message: "a".repeat(field.maxLength + 1) })).status).toBe(400);
    expect(backend.fetchAction).toHaveBeenCalledTimes(1);
  });
});
