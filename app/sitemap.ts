import type { MetadataRoute } from "next";
import {
  getDepartments,
  getCmsPages,
  getEvents,
  getGalleryAlbums,
  getLeadership,
  getNews,
  getNotices,
  getSiteProfile,
  getStudentArticles,
  getTeachers,
} from "@/lib/data/public";
import { getSiteUrl } from "@/lib/server/site-url";

export const revalidate = 3600;

const routes = [
  "",
  "/about",
  "/about/leadership",
  "/about/testimonials",
  "/academics",
  "/departments",
  "/facilities",
  "/campus-life",
  "/campus-life/activities",
  "/campus-life/gallery",
  "/admissions",
  "/admissions/process",
  "/admissions/eligibility",
  "/admissions/fees-scholarships",
  "/admissions/faq",
  "/admissions/apply",
  "/news",
  "/articles",
  "/notices",
  "/events",
  "/downloads",
  "/assistant",
  "/contact",
  "/privacy",
  "/terms",
  "/accessibility",
];

const redirectedPageSlugs = new Set([
  "about/overview",
  "about/history",
  "about/mission-vision",
  "academics/overview",
  "academics/primary",
  "academics/secondary",
  "academics/plus-2",
  "academics/curriculum",
  "academics/departments",
  "academics/library",
  "academics/sports",
  "teachers",
  "campus-life/facilities",
  "campus-life/virtual-tour",
  "campus-life/transport",
]);

// These routes have their own private, noindex, redirect, or metadata handlers.
// A CMS slug with the same name cannot create an indexable public page there.
function isDiscoverableCmsPage(slug: string) {
  return !(
    redirectedPageSlugs.has(slug) ||
    /^(admin|api|sign-in|student|search|newsletter)(\/|$)/.test(slug) ||
    ["admissions/submitted", "events/cancel", "robots.txt", "sitemap.xml"].includes(slug)
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const site = await getSiteProfile();
  if (site.noIndex) return [];
  const [pages, departments, teachers, leadership, news, articles, notices, events, galleries] =
    await Promise.all([
      getCmsPages(),
      getDepartments(),
      getTeachers(),
      getLeadership(),
      getNews(200),
      getStudentArticles(100),
      getNotices(200),
      getEvents("all", 200),
      getGalleryAlbums(),
    ]);
  const noIndexPages = new Set(pages.filter((page) => page.seo?.noIndex).map((page) => `/${page.slug}`));
  const staticEntries: MetadataRoute.Sitemap = routes
    .filter((route) => !noIndexPages.has(route))
    .map((route) => ({
      url: new URL(route || "/", siteUrl).toString(),
      changeFrequency:
        route === "" || route === "/notices" || route === "/news" || route === "/articles"
          ? "daily"
          : "monthly",
      priority: route === "" ? 1 : route.startsWith("/admissions") ? 0.8 : 0.7,
    }));
  const dynamicRouteCandidates: Array<{ route: string; lastModified?: string }> = [
    ...pages
      .filter((item) => !item.seo?.noIndex && isDiscoverableCmsPage(item.slug))
      .map((item) => ({ route: `/${item.slug}` })),
    ...departments
      .filter((item) => !item.seo?.noIndex)
      .map((item) => ({ route: `/departments/${item.slug}` })),
    ...teachers.filter((item) => !item.seo?.noIndex).map((item) => ({ route: `/teachers/${item.slug}` })),
    ...leadership.map((item) => ({ route: `/about/leadership/${item.slug}` })),
    ...news
      .filter((item) => !item.seo?.noIndex)
      .map((item) => ({ route: `/news/${item.slug}`, lastModified: item.publishedAt })),
    ...articles
      .filter((item) => !item.seo?.noIndex)
      .map((item) => ({
        route: `/articles/${item.slug}`,
        lastModified: item.updatedAt ?? item.publishedAt,
      })),
    ...notices
      .filter((item) => !item.seo?.noIndex)
      .map((item) => ({ route: `/notices/${item.slug}`, lastModified: item.publishedAt })),
    ...events
      .filter((item) => !item.seo?.noIndex)
      .map((item) => ({ route: `/events/${item.slug}`, lastModified: item.publishedAt })),
    ...galleries
      .filter((item) => !item.seo?.noIndex)
      .map((item) => ({ route: `/campus-life/gallery/${item.slug}` })),
  ];
  const dynamicRoutes = [
    ...new Map(
      dynamicRouteCandidates
        .filter(({ route }) => !routes.includes(route))
        .map((entry) => [entry.route, entry]),
    ).values(),
  ];

  return [
    ...staticEntries,
    ...dynamicRoutes.map(({ route, lastModified }) => ({
      url: new URL(route, siteUrl).toString(),
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "weekly" as const,
      priority: 0.65,
    })),
  ];
}
