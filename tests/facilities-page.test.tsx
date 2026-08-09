import { cleanup, render, screen, within } from "@testing-library/react";
import { createElement, type ImgHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    unoptimized: _unoptimized,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
    unoptimized?: boolean;
  }) => createElement("img", props),
}));

import { FacilitiesPage } from "@/components/site/facilities-page";
import type { PublicCmsPage, PublicFacility } from "@/lib/data/public";

const page: PublicCmsPage = {
  id: "facilities-page",
  slug: "facilities",
  title: "Our facilities",
  summary: "School spaces published by authorised staff.",
  body: "Facilities support teaching and student wellbeing.",
  heroImageUrl: "/media/nps-campus-building.png",
  template: "landing",
};

const facilities: PublicFacility[] = [
  {
    id: "library",
    slug: "library",
    name: "Library",
    summary: "Reading and independent-learning resources.",
    iconKey: "library",
    verificationStatus: "confirmed",
    sourceLabel: "School publication",
    sourceUrl: "https://example.test/publication",
    imageUrl: "https://example.test/library.webp",
    imageAlt: "Bookshelves and reading tables",
    featured: true,
    order: 10,
  },
  {
    id: "auditorium",
    slug: "auditorium",
    name: "Auditorium",
    summary: "The school is reviewing this facility record.",
    iconKey: "auditorium",
    verificationStatus: "school_confirmation_required",
    featured: false,
    order: 20,
  },
];

describe("FacilitiesPage", () => {
  afterEach(cleanup);

  it("renders database records with transparent evidence and verification states", () => {
    const { container } = render(<FacilitiesPage page={page} facilities={facilities} />);

    expect(screen.getByRole("heading", { level: 1, name: "Our facilities" })).toBeVisible();
    expect(screen.getByText("2 facilities published")).toBeVisible();
    expect(screen.getAllByText("School-confirmed").length).toBeGreaterThan(0);
    expect(screen.getByText("Confirmation pending")).toBeVisible();
    expect(screen.getByRole("link", { name: /School publication/i })).toHaveAttribute(
      "href",
      "https://example.test/publication",
    );
    expect(screen.getByRole("img", { name: "Bookshelves and reading tables" })).toBeVisible();
    expect(container.querySelector("main")).not.toBeInTheDocument();

    const pendingCard = container.querySelector("#auditorium");
    expect(pendingCard).not.toBeNull();
    expect(within(pendingCard as HTMLElement).getByText("Confirmation pending")).toBeVisible();
  });

  it("shows a safe empty state when no facility records are published", () => {
    render(<FacilitiesPage page={page} facilities={[]} />);

    expect(screen.getByRole("heading", { name: "Facility information is being reviewed" })).toBeVisible();
    expect(
      screen.getByText(/publish verified facility records from the administration panel/i),
    ).toBeVisible();
  });
});
