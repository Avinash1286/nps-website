import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import {
  getCmsPages,
  getDepartments,
  getEvents,
  getFaqs,
  getNews,
  getNotices,
  getPrograms,
  getTeachers,
} from "@/lib/data/public";
export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };
const staticPages = [
  ["About the school", "History, purpose, leadership, and the school community.", "/about"],
  [
    "Academic pathways",
    "Primary, secondary, +2, curriculum, departments, library, and sports.",
    "/academics",
  ],
  ["Teachers", "Published faculty profiles and departments.", "/teachers"],
  ["Campus life", "Facilities, activities, gallery, virtual tour, and transport.", "/campus-life"],
  ["Admissions", "Process, eligibility, fees, scholarships, FAQ, and enquiries.", "/admissions"],
  ["Community voices", "Approved reflections from the school community.", "/about/testimonials"],
  ["Notices", "Official school announcements and documents.", "/notices"],
  ["Events", "Published school events and registration information.", "/events"],
  ["Downloads", "Approved forms, schedules, and resources.", "/downloads"],
  ["Contact", "Send a secure enquiry to the school.", "/contact"],
] as const;
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim().toLowerCase() ?? "";
  const [news, notices, events, teachers, pages, programs, departments, faqs] = query
    ? await Promise.all([
        getNews(100),
        getNotices(100),
        getEvents("all", 100),
        getTeachers(),
        getCmsPages(),
        getPrograms(),
        getDepartments(),
        getFaqs(undefined, 120),
      ])
    : [[], [], [], [], [], [], [], []];
  const candidates = query
    ? [
        ...staticPages.map(([title, description, href]) => ({ title, description, href, type: "Page" })),
        ...pages.map((item) => ({
          title: item.title,
          description: item.summary ?? item.body.slice(0, 220),
          href: `/${item.slug}`,
          type: "Page",
        })),
        ...programs.map((item) => ({
          title: item.name,
          description: item.shortDescription,
          href: `/academics/${item.slug}`,
          type: "Programme",
        })),
        ...departments.map((item) => ({
          title: item.name,
          description: item.description,
          href: `/academics/departments/${item.slug}`,
          type: "Department",
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
        description="Search pages, faculty profiles, news, notices, and events."
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
              className="h-14 w-full min-w-0 rounded-2xl border border-slate-300 bg-white pr-28 pl-12 text-base outline-none focus:border-[#0a65a8] focus:ring-4 focus:ring-sky-100"
            />
            <button className="absolute top-2 right-2 h-10 rounded-xl bg-[#0a65a8] px-4 text-sm font-bold text-white">
              Search
            </button>
          </form>
          {query ? (
            <div className="mt-10">
              <p className="text-sm font-semibold text-slate-600">
                {results.length} {results.length === 1 ? "result" : "results"} for{" "}
                <strong className="text-[#092f59]">“{q}”</strong>
              </p>
              {results.length ? (
                <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
                  {results.map((item) => (
                    <Link
                      href={item.href}
                      key={`${item.type}-${item.href}`}
                      className="group grid min-w-0 gap-3 py-6 sm:grid-cols-[90px_minmax(0,1fr)_auto] sm:items-start"
                    >
                      <span className="text-[11px] font-extrabold tracking-[.13em] text-[#0a65a8] uppercase">
                        {item.type}
                      </span>
                      <span className="min-w-0">
                        <strong className="block text-lg text-[#092f59]">{item.title}</strong>
                        <span className="mt-2 block text-sm leading-6 text-slate-600">
                          {item.description}
                        </span>
                      </span>
                      <ArrowRight size={17} className="mt-1 shrink-0 text-[#0a65a8]" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center">
                  <h2 className="font-extrabold text-[#092f59]">No results found</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Check the spelling, use fewer words, or browse the main navigation.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-10 rounded-2xl bg-slate-50 p-6">
              <h2 className="font-extrabold text-[#092f59]">Search tips</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Try a programme, teacher name, notice title, event, department, or service such as transport.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
