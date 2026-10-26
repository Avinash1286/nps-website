import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const data = vi.hoisted(() => ({
  getCmsPages: vi.fn(),
  getDepartments: vi.fn(),
  getEvents: vi.fn(),
  getFacilities: vi.fn(),
  getFaqs: vi.fn(),
  getNavigation: vi.fn(),
  getNews: vi.fn(),
  getNotices: vi.fn(),
  getPrograms: vi.fn(),
  getStudentArticles: vi.fn(),
  getTeachers: vi.fn(),
  getDocuments: vi.fn(),
  formatPublicDate: vi.fn(() => "27 October 2026"),
}));
vi.mock("@/lib/data/public", () => data);
vi.mock("@/components/site/page-hero", () => ({
  PageHero: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("@/lib/content/public-metadata", () => ({ contentMetadata: () => ({}) }));

import SearchPage from "@/app/(site)/search/page";
import NoticesPage from "@/app/(site)/notices/page";
import FaqPage from "@/app/(site)/admissions/faq/page";
import DownloadsPage from "@/app/(site)/downloads/page";
import { firstSearchParam } from "@/lib/content/search-param";

beforeEach(() => {
  for (const name of Object.keys(data) as Array<keyof typeof data>) {
    if (name !== "formatPublicDate") data[name].mockResolvedValue([]);
  }
  data.getNotices.mockResolvedValue([
    {
      id: "notice",
      slug: "school-notice",
      title: "School notice",
      summary: "Published school information",
      audiences: [],
      publishedAt: "2026-10-27",
      priority: "normal",
    },
  ]);
  data.getFaqs.mockResolvedValue([
    {
      id: "faq",
      question: "When do admissions open?",
      answer: "Check the current notice.",
      category: "Admissions",
    },
  ]);
  data.getDocuments.mockResolvedValue([
    {
      id: "document",
      title: "School form",
      category: "Forms",
      publishedAt: "2026-10-27",
      downloadUrl: "/school-form.pdf",
    },
  ]);
});
afterEach(cleanup);

describe("repeated public URL filters", () => {
  it("uses the first value and handles missing or empty parameters", () => {
    expect(firstSearchParam(["school", "fees"])).toBe("school");
    expect(firstSearchParam("school")).toBe("school");
    expect(firstSearchParam([])).toBe("");
    expect(firstSearchParam(undefined)).toBe("");
  });

  it("renders search results instead of crashing for ?q=school&q=fees", async () => {
    render(await SearchPage({ searchParams: Promise.resolve({ q: ["school", "fees"] }) }));
    expect(screen.getByRole("textbox", { name: "Search this website" })).toHaveValue("school");
    expect(screen.getByRole("link", { name: /School notice/ })).toHaveAttribute(
      "href",
      "/notices/school-notice",
    );
  });

  it("filters notices when q occurs more than once", async () => {
    render(await NoticesPage({ searchParams: Promise.resolve({ q: ["school", "fees"] }) }));
    expect(screen.getByRole("textbox", { name: "Search notices" })).toHaveValue("school");
    expect(screen.getByRole("heading", { name: "School notice" })).toBeInTheDocument();
  });

  it("keeps FAQ search and category filters usable when either parameter is repeated", async () => {
    render(
      await FaqPage({
        searchParams: Promise.resolve({ q: ["admission", "fees"], category: ["Admissions", "Other"] }),
      }),
    );
    expect(screen.getByRole("textbox", { name: "Search frequently asked questions" })).toHaveValue(
      "admission",
    );
    expect(screen.getByRole("combobox", { name: "Filter by category" })).toHaveValue("Admissions");
    expect(screen.getByText("When do admissions open?")).toBeInTheDocument();
  });

  it("does not hide published documents when the category parameter is repeated", async () => {
    render(await DownloadsPage({ searchParams: Promise.resolve({ category: ["Forms", "Other"] }) }));
    expect(screen.getByRole("heading", { name: "School form" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download" })).toHaveAttribute("href", "/school-form.pdf");
  });

  it("lets visitors clear an empty category without claiming that all documents are unpublished", async () => {
    render(await DownloadsPage({ searchParams: Promise.resolve({ category: "Unknown category" }) }));
    expect(screen.getByRole("heading", { name: "No matching documents" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear category filter" })).toHaveAttribute("href", "/downloads");
    expect(screen.queryByText("No published documents")).not.toBeInTheDocument();
  });
});
