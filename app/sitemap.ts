import type { MetadataRoute } from "next";
import {
  getDepartments,
  getCmsPages,
  getEvents,
  getGalleryAlbums,
  getLeadership,
  getNews,
  getNotices,
  getPrograms,
  getSiteProfile,
  getTeachers,
} from "@/lib/data/public";

export const dynamic = "force-dynamic";

const routes = [
  "",
  "/about",
  "/about/history",
  "/about/mission-vision",
  "/about/leadership",
  "/about/testimonials",
  "/academics",
  "/academics/primary",
  "/academics/secondary",
  "/academics/plus-2",
  "/academics/curriculum",
  "/academics/departments",
  "/academics/library",
  "/academics/sports",
  "/teachers",
  "/campus-life",
  "/campus-life/facilities",
  "/campus-life/activities",
  "/campus-life/gallery",
  "/campus-life/virtual-tour",
  "/campus-life/transport",
  "/admissions",
  "/admissions/process",
  "/admissions/eligibility",
  "/admissions/fees-scholarships",
  "/admissions/faq",
  "/admissions/apply",
  "/news",
  "/notices",
  "/events",
  "/downloads",
  "/assistant",
  "/contact",
  "/privacy",
  "/terms",
  "/accessibility",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const site = await getSiteProfile();
  if (site.noIndex) return [];
  const now = new Date();
  const [pages, programs, departments, teachers, leadership, news, notices, events, galleries] =
    await Promise.all([
      getCmsPages(),
      getPrograms(),
      getDepartments(),
      getTeachers(),
      getLeadership(),
      getNews(200),
      getNotices(200),
      getEvents("all", 200),
      getGalleryAlbums(),
    ]);
  const noIndexPages = new Set(pages.filter((page) => page.seo?.noIndex).map((page) => `/${page.slug}`));
  const staticEntries: MetadataRoute.Sitemap = routes
    .filter((route) => !noIndexPages.has(route))
    .map((route) => ({
      url: new URL(route || "/", siteUrl).toString(),
      lastModified: now,
      changeFrequency: route === "" || route === "/notices" || route === "/news" ? "daily" : "monthly",
      priority: route === "" ? 1 : route.startsWith("/admissions") ? 0.8 : 0.7,
    }));
  const dynamicRoutes = [
    ...new Set([
      ...pages.filter((item) => !item.seo?.noIndex).map((item) => `/${item.slug}`),
      ...programs.filter((item) => !item.seo?.noIndex).map((item) => `/academics/${item.slug}`),
      ...departments
        .filter((item) => !item.seo?.noIndex)
        .map((item) => `/academics/departments/${item.slug}`),
      ...teachers.filter((item) => !item.seo?.noIndex).map((item) => `/teachers/${item.slug}`),
      ...leadership.map((item) => `/about/leadership/${item.slug}`),
      ...news.filter((item) => !item.seo?.noIndex).map((item) => `/news/${item.slug}`),
      ...notices.filter((item) => !item.seo?.noIndex).map((item) => `/notices/${item.slug}`),
      ...events.filter((item) => !item.seo?.noIndex).map((item) => `/events/${item.slug}`),
      ...galleries.filter((item) => !item.seo?.noIndex).map((item) => `/campus-life/gallery/${item.slug}`),
    ]),
  ].filter((route) => !routes.includes(route));

  return [
    ...staticEntries,
    ...dynamicRoutes.map((route) => ({
      url: new URL(route, siteUrl).toString(),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.65,
    })),
  ];
}
