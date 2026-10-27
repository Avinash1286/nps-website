import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const data = vi.hoisted(() => ({ getSiteProfile: vi.fn(), getCmsPage: vi.fn(), getEvent: vi.fn() }));
vi.mock("@/lib/data/public", () => data);
vi.mock("@/components/site/page-hero", () => ({ PageHero: () => null }));
vi.mock("@/components/site/detail-page", () => ({
  DetailPage: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/site/reveal", () => ({
  Reveal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/forms/contact-form", () => ({ ContactForm: () => <form aria-label="Contact form" /> }));
vi.mock("@/components/forms/admissions-form", () => ({
  AdmissionsForm: () => <form aria-label="Admissions form" />,
}));
vi.mock("@/components/forms/event-registration-form", () => ({
  EventRegistrationForm: () => <form aria-label="Event form" />,
}));
vi.mock("@/components/forms/newsletter-form", () => ({
  NewsletterForm: () => <form aria-label="Newsletter form" />,
}));

import ContactPage from "@/app/(site)/contact/page";
import ApplyPage from "@/app/(site)/admissions/apply/page";
import EventDetail from "@/app/(site)/events/[slug]/page";
import { SiteFooter } from "@/components/site/site-footer";
import { hasPublicFormConfiguration } from "@/lib/server/form-configuration";
import { preparePublicFormRequest } from "@/lib/server/public-forms";

const site = {
  schoolName: "Nepal Police School, Garuda",
  shortName: "NPS Garuda",
  location: "Garuda",
  description: "School",
  timezone: "Asia/Kathmandu",
  phone: "9855021699",
  email: "mrpschool@nepalpolice.gov.np",
  admissionsOpen: true,
  assistantEnabled: true,
  maintenanceMode: false,
  noIndex: false,
  social: {},
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://school-test.convex.cloud");
  vi.stubEnv("REQUEST_FINGERPRINT_SECRET", "fingerprint-secret-that-is-long-enough");
  vi.stubEnv("FORM_SERVICE_SECRET", "");
  data.getSiteProfile.mockResolvedValue(site);
  data.getCmsPage.mockResolvedValue(null);
  data.getEvent.mockResolvedValue({ title: "School event", slug: "school-event", registrationOpen: true });
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("public forms during incomplete configuration", () => {
  it.each(["NEXT_PUBLIC_CONVEX_URL", "REQUEST_FINGERPRINT_SECRET", "FORM_SERVICE_SECRET"])(
    "keeps page availability consistent with the submission gateway when %s is missing",
    (key) => {
      vi.stubEnv("FORM_SERVICE_SECRET", "form-service-secret-that-is-long-enough");
      vi.stubEnv(key, "");
      expect(hasPublicFormConfiguration()).toBe(false);
      expect(preparePublicFormRequest(new NextRequest("https://school.test/api/forms/contact"))).toBeNull();
    },
  );

  it("offers verified phone and email instead of collecting an unsendable contact enquiry", async () => {
    const { container } = render(await ContactPage());
    expect(container.querySelector("form")).toBeNull();
    expect(screen.getByRole("heading", { name: "Contact the school directly" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Call the school/ })).toHaveAttribute("href", "tel:9855021699");
    expect(screen.getByRole("link", { name: "Email the school" })).toHaveAttribute(
      "href",
      `mailto:${site.email}`,
    );
  });

  it("explains unavailable admission submissions without claiming admissions are closed", async () => {
    const { container } = render(await ApplyPage());
    expect(container.querySelector("form")).toBeNull();
    expect(screen.getByRole("heading", { name: "Contact the school about admissions" })).toBeInTheDocument();
    expect(screen.queryByText("Online admission enquiries are currently closed")).not.toBeInTheDocument();
  });

  it("preserves the school's closed-admissions decision even when the gateway is configured", async () => {
    vi.stubEnv("FORM_SERVICE_SECRET", "form-service-secret-that-is-long-enough");
    data.getSiteProfile.mockResolvedValue({ ...site, admissionsOpen: false });
    render(await ApplyPage());
    expect(
      screen.getByRole("heading", { name: "Online admission enquiries are currently closed" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("directs event visitors to the school instead of showing an unavailable registration form", async () => {
    render(await EventDetail({ params: Promise.resolve({ slug: "school-event" }) }));
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact the school" })).toHaveAttribute("href", "/contact");
  });

  it("replaces unavailable email subscription fields with a notices link", () => {
    render(<SiteFooter site={site} />);
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View latest notices/ })).toHaveAttribute("href", "/notices");
    expect(screen.queryByText("Receive important news by email")).not.toBeInTheDocument();
  });

  it("restores all four forms when the required web configuration is present", async () => {
    const secret = "form-service-secret-that-is-long-enough";
    vi.stubEnv("FORM_SERVICE_SECRET", secret);
    const { container } = render(
      <>
        {await ContactPage()}
        {await ApplyPage()}
        {await EventDetail({ params: Promise.resolve({ slug: "school-event" }) })}
        <SiteFooter site={site} />
      </>,
    );
    expect(screen.getAllByRole("form")).toHaveLength(4);
    expect(container.innerHTML).not.toContain(secret);
    expect(container.innerHTML).not.toContain("fingerprint-secret-that-is-long-enough");
  });
});
