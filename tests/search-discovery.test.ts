import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const publicData = vi.hoisted(() => ({
  getSiteProfile: vi.fn(),
  getCmsPage: vi.fn(),
  getLeader: vi.fn(),
  getCmsPages: vi.fn(),
  getDepartments: vi.fn(),
  getTeachers: vi.fn(),
  getLeadership: vi.fn(),
  getNews: vi.fn(),
  getStudentArticles: vi.fn(),
  getNotices: vi.fn(),
  getEvents: vi.fn(),
  getGalleryAlbums: vi.fn(),
  getFaqs: vi.fn(),
}));

vi.mock("@/lib/data/public", () => publicData);
vi.mock("@/components/forms/admissions-form", () => ({ AdmissionsForm: () => null }));

import sitemap from "@/app/sitemap";
import { getSiteUrl } from "@/lib/server/site-url";
import { generateMetadata as admissionMetadata } from "@/app/(site)/admissions/[section]/page";
import { generateMetadata as schoolLifeMetadata } from "@/app/(site)/campus-life/[section]/page";
import { generateMetadata as aboutMetadata } from "@/app/(site)/about/[section]/page";
import { generateMetadata as leaderMetadata } from "@/app/(site)/about/leadership/[slug]/page";
import { metadata as faqMetadata } from "@/app/(site)/admissions/faq/page";
import { metadata as applyMetadata } from "@/app/(site)/admissions/apply/page";
import { metadata as privacyMetadata } from "@/app/(site)/privacy/page";
import { metadata as termsMetadata } from "@/app/(site)/terms/page";
import { metadata as accessibilityMetadata } from "@/app/(site)/accessibility/page";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://nepalpoliceschool.vercel.app");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
  vi.stubEnv("VERCEL_URL", "");
  publicData.getSiteProfile.mockResolvedValue({ noIndex: false });
  publicData.getCmsPage.mockResolvedValue(null);
  for (const name of [
    "getCmsPages",
    "getDepartments",
    "getTeachers",
    "getLeadership",
    "getNews",
    "getStudentArticles",
    "getNotices",
    "getEvents",
    "getGalleryAlbums",
  ] as const)
    publicData[name].mockResolvedValue([]);
});
afterEach(() => vi.unstubAllEnvs());

describe("canonical page metadata", () => {
  it.each([
    [faqMetadata, "/admissions/faq"],
    [applyMetadata, "/admissions/apply"],
    [privacyMetadata, "/privacy"],
    [termsMetadata, "/terms"],
    [accessibilityMetadata, "/accessibility"],
  ])("gives static public pages their own canonical", (metadata, path) => {
    expect(metadata.alternates?.canonical).toBe(path);
  });

  it.each([
    [admissionMetadata, "process", "/admissions/process"],
    [schoolLifeMetadata, "activities", "/campus-life/activities"],
    [aboutMetadata, "community", "/about/community"],
  ])("honors CMS SEO and noindex on section routes", async (generate, section, path) => {
    publicData.getCmsPage.mockResolvedValue({
      title: "School information",
      summary: "Verified school information.",
      body: "Information",
      seo: { title: "Custom title", description: "Custom description", noIndex: true },
    });
    const metadata = await generate({
      params: Promise.resolve({ section }),
      searchParams: Promise.resolve({}),
    });
    expect(metadata.alternates?.canonical).toBe(path);
    expect(metadata.title).toBe("Custom title");
    expect(metadata.description).toBe("Custom description");
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("keeps fallback admission information canonical when CMS content is absent", async () => {
    const metadata = await admissionMetadata({ params: Promise.resolve({ section: "process" }) });
    expect(metadata.alternates?.canonical).toBe("/admissions/process");
  });

  it("gives each leadership profile its own canonical", async () => {
    publicData.getLeader.mockResolvedValue({ name: "School Principal", designation: "Principal" });
    const metadata = await leaderMetadata({ params: Promise.resolve({ slug: "principal" }) });
    expect(metadata.alternates?.canonical).toBe("/about/leadership/principal");
  });
});

describe("sitemap discoverability", () => {
  it("excludes private, redirected and noindex CMS routes without dropping public articles", async () => {
    publicData.getCmsPages.mockResolvedValue([
      { slug: "community", seo: {} },
      { slug: "private-information", seo: { noIndex: true } },
      ...[
        "about/history",
        "student/login",
        "admin/settings",
        "search",
        "newsletter/confirm",
        "admissions/submitted",
        "events/cancel",
        "api/health",
        "sitemap.xml",
        "sign-in",
      ].map((slug) => ({ slug, seo: {} })),
    ]);
    publicData.getStudentArticles.mockResolvedValue([
      { slug: "school-project", publishedAt: "2026-09-01", seo: {} },
      { slug: "hidden-project", seo: { noIndex: true } },
    ]);
    const paths = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    expect(paths).toContain("/community");
    expect(paths).toContain("/articles/school-project");
    for (const path of [
      "/private-information",
      "/about/history",
      "/student/login",
      "/admin/settings",
      "/search",
      "/newsletter/confirm",
      "/admissions/submitted",
      "/events/cancel",
      "/api/health",
      "/sitemap.xml",
      "/sign-in",
      "/articles/hidden-project",
    ])
      expect(paths).not.toContain(path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("preserves an administrator's site-wide indexing opt-out", async () => {
    publicData.getSiteProfile.mockResolvedValue({ noIndex: true });
    expect(await sitemap()).toEqual([]);
    expect(publicData.getCmsPages).not.toHaveBeenCalled();
  });
});

describe("canonical production origin", () => {
  it.each([
    "invalid-url",
    "javascript:alert(1)",
    "ftp://school.example",
    "https://user:password@school.example",
  ])("falls back to the production host for an invalid override: %s", (configured) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", configured);
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "nepalpoliceschool.vercel.app");
    vi.stubEnv("VERCEL_URL", "preview.vercel.app");
    expect(getSiteUrl()).toBe("https://nepalpoliceschool.vercel.app");
  });

  it("uses an explicitly configured canonical domain", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", " https://school.example/path?query=1 ");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "nepalpoliceschool.vercel.app");
    expect(getSiteUrl()).toBe("https://school.example");
  });

  it("retains localhost for unconfigured local development", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});
