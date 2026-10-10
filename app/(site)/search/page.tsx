import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import {
  getCmsPages,
  getDepartments,
  getEvents,
  getFacilities,
  getFaqs,
  getNavigation,
  getNews,
  getNotices,
  getPrograms,
  getStudentArticles,
  getTeachers,
} from "@/lib/data/public";

const legacyPublicPaths: Record<string, string> = {
  "/about/overview": "/about",
  "/about/history": "/about#history",
  "/about/mission-vision": "/about#mission",
  "/academics/overview": "/academics",
  "/academics/primary": "/academics#primary",
  "/academics/secondary": "/academics#secondary",
  "/academics/plus-2": "/academics#plus-2",
  "/academics/curriculum": "/academics#curriculum",
  "/academics/departments": "/departments",
  "/academics/library": "/facilities#library",
  "/academics/sports": "/campus-life/activities",
  "/teachers": "/departments",
  "/campus-life/facilities": "/facilities",
  "/campus-life/virtual-tour": "/facilities",
  "/campus-life/transport": "/facilities#transportation",
};

function canonicalPublicHref(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;

  const suffixIndex = [href.indexOf("?"), href.indexOf("#")]
    .filter((index) => index >= 0)
    .reduce((lowest, index) => Math.min(lowest, index), href.length);
  const rawPathname = href.slice(0, suffixIndex);
  const suffix = href.slice(suffixIndex);
  const pathname = rawPathname.length > 1 ? rawPathname.replace(/\/$/, "") : rawPathname;
  const legacyDepartment = pathname.match(/^\/academics\/departments\/([^/]+)$/);
  if (legacyDepartment) return `/departments/${legacyDepartment[1]}`;

  const replacement = legacyPublicPaths[pathname];
  if (replacement) return replacement;
  return `${pathname}${suffix}`;
}

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = q?.trim().toLowerCase() ?? "";
  const [
    news,
    notices,
    events,
    articles,
    teachers,
    pages,
    programs,
    departments,
    facilities,
    faqs,
    headerNavigation,
    footerNavigation,
    utilityNavigation,
  ] = query
    ? await Promise.all([
        getNews(100),
        getNotices(100),
        getEvents("all", 100),
        getStudentArticles(100),
        getTeachers(),
        getCmsPages(),
        getPrograms(),
        getDepartments(),
        getFacilities(),
        getFaqs(undefined, 120),
        getNavigation("header"),
        getNavigation("footer"),
        getNavigation("utility"),
      ])
    : [[], [], [], [], [], [], [], [], [], [], [], [], []];
  const navigationPages = [...headerNavigation, ...footerNavigation, ...utilityNavigation].filter(
    (item) => !item.external && item.href.startsWith("/") && !item.href.startsWith("//"),
  );
  const candidates = query
    ? [
        ...navigationPages.map((item) => ({
          title: item.label,
          description: item.description ?? item.label,
          href: canonicalPublicHref(item.href),
          type: "Page",
        })),
        ...pages.map((item) => ({
          title: item.title,
          description: item.summary ?? item.body.slice(0, 220),
          href: canonicalPublicHref(`/${item.slug}`),
          type: "Page",
        })),
        ...programs.map((item) => ({
          title: item.name,
          description: item.shortDescription,
          href: `/academics#${item.slug}`,
          type: "Programme",
        })),
        ...departments.map((item) => ({
          title: item.name,
          description: item.description,
          href: `/departments/${item.slug}`,
          type: "Department",
        })),
        ...facilities.map((item) => ({
          title: item.name,
          description: [item.summary, item.details].filter(Boolean).join(" "),
          href: `/facilities#${item.slug}`,
          type: "Facility",
        })),
        ...news.map((item) => ({
          title: item.title,
          description: item.summary,
          href: `/news/${item.slug}`,
          type: "News",
        })),
        ...notices.map((item) => ({
          title: item.title,
          description: item.summary,
          href: `/notices/${item.slug}`,
          type: "Notice",
        })),
        ...events.map((item) => ({
          title: item.title,
          description: item.summary,
          href: `/events/${item.slug}`,
          type: "Event",
        })),
        ...articles.map((item) => ({
          title: item.title,
          description: item.excerpt,
          href: `/articles/${item.slug}`,
          type: "Student article",
        })),
        ...teachers.map((item) => ({
          title: item.name,
          description: `${item.designation} · ${item.department}`,
          href: `/teachers/${item.slug}`,
          type: "Teacher",
        })),
        ...faqs.map((item) => ({
          title: item.question,
          description: item.answer,
          href: `/admissions/faq?q=${encodeURIComponent(item.question)}`,
          type: "FAQ",
        })),
      ].filter((item) => `${item.title} ${item.description} ${item.type}`.toLowerCase().includes(query))
    : [];
  const results = Array.from(new Map(candidates.map((item) => [item.href, item])).values());
  return (
    <>
      <PageHero
        eyebrow="Website search"
        title="Find school information"
        description="Search pages, facilities, faculty profiles, news, student articles, notices, and events."
        crumbs={[{ label: "Search" }]}
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <form className="relative">
            <label className="sr-only" htmlFor="site-search">
              Search this website
            </label>
            <Search size={21} className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" />
            <input
              id="site-search"
              name="q"
              defaultValue={q}
              required
              autoFocus
              placeholder="What are you looking for?"
              className="h-14 w-full min-w-0 rounded-2xl border border-slate-300 bg-white pr-28 pl-12 text-base outline-none focus:border-[#2e3192] focus:ring-4 focus:ring-sky-100"
            />
            <button className="absolute top-2 right-2 h-10 rounded-xl bg-[#2e3192] px-4 text-sm font-bold text-white">
              Search
            </button>
          </form>
          {query ? (
            <div className="mt-10">
              <p className="text-sm font-semibold text-slate-600">
                {results.length} {results.length === 1 ? "result" : "results"} for{" "}
                <strong className="text-[#1e1f5c]">“{q}”</strong>
              </p>
              {results.length ? (
                <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
                  {results.map((item) => (
                    <Link
                      href={item.href}
                      key={`${item.type}-${item.href}`}
                      className="group grid min-w-0 gap-3 py-6 sm:grid-cols-[90px_minmax(0,1fr)_auto] sm:items-start"
                    >
                      <span className="text-[11px] font-extrabold tracking-[.13em] text-[#2e3192] uppercase">
                        {item.type}
                      </span>
                      <span className="min-w-0">
                        <strong className="block text-lg text-[#1e1f5c]">{item.title}</strong>
                        <span className="mt-2 block text-sm leading-6 text-slate-600">
                          {item.description}
                        </span>
                      </span>
                      <ArrowRight size={17} className="mt-1 shrink-0 text-[#2e3192]" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center">
                  <h2 className="font-extrabold text-[#1e1f5c]">No results found</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Check the spelling, use fewer words, or browse the main navigation.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-10 rounded-2xl bg-slate-50 p-6">
              <h2 className="font-extrabold text-[#1e1f5c]">Search tips</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Try a facility, programme, teacher name, notice title, event, department, or service such as
                transport.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
