import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, HelpCircle, Search } from "lucide-react";
import { EmptyState } from "@/components/site/empty-state";
import { PageHero } from "@/components/site/page-hero";
import { getFaqs } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description:
    "Verified answers to common admissions and school-information questions from Nepal Police School, Garuda.",
  alternates: { canonical: "/admissions/faq" },
};

export default async function FrequentlyAskedQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; category?: string | string[] }>;
}) {
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const category = Array.isArray(params.category) ? params.category[0] : params.category;
  const faqs = await getFaqs(undefined, 120);
  const categories = [
    ...new Set(faqs.map((item) => item.category).filter((value): value is string => Boolean(value))),
  ].sort((left, right) => left.localeCompare(right));
  const query = q?.trim().toLowerCase() ?? "";
  const selectedCategory = category?.trim() ?? "";
  const visible = faqs.filter(
    (item) =>
      (!selectedCategory || item.category === selectedCategory) &&
      (!query || `${item.question} ${item.answer} ${item.category ?? ""}`.toLowerCase().includes(query)),
  );

  return (
    <>
      <PageHero
        eyebrow="Admissions help"
        title="Frequently asked questions"
        description="Find concise, administration-approved answers. Current notices and direct school communication remain authoritative for dates, fees, and intake decisions."
        crumbs={[{ label: "Admissions", href: "/admissions" }, { label: "Frequently asked questions" }]}
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <form className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_220px_auto]">
            <label className="relative">
              <span className="sr-only">Search frequently asked questions</span>
              <Search className="pointer-events-none absolute top-3.5 left-3.5 text-slate-400" size={17} />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search questions and answers"
                className="h-12 w-full rounded-xl border border-slate-300 bg-white pr-4 pl-10 text-sm outline-none focus:border-[#2e3192] focus:ring-4 focus:ring-sky-100"
              />
            </label>
            <label>
              <span className="sr-only">Filter by category</span>
              <select
                name="category"
                defaultValue={selectedCategory}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-[#2e3192]"
              >
                <option value="">All categories</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <button className="h-12 rounded-xl bg-[#2e3192] px-5 text-sm font-bold text-white">
              Find answers
            </button>
          </form>

          {visible.length ? (
            <div className="mt-8 space-y-3">
              {visible.map((item, index) => (
                <details
                  key={item.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm open:border-sky-200 open:shadow-md"
                  open={visible.length <= 3 && index === 0}
                >
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-extrabold text-[#1e1f5c] marker:hidden sm:px-6 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">{item.question}</span>
                    <ChevronDown
                      size={19}
                      className="shrink-0 text-[#2e3192] transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="border-t border-slate-100 px-5 py-5 sm:px-6">
                    {item.category && (
                      <p className="mb-3 text-[10px] font-extrabold tracking-[.15em] text-[#2e3192] uppercase">
                        {item.category}
                      </p>
                    )}
                    <div className="space-y-4 text-sm leading-7 text-slate-700">
                      {item.answer.split(/\n{2,}/).map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="mt-8">
              <EmptyState
                title={faqs.length ? "No matching questions" : "No published questions yet"}
                description={
                  faqs.length
                    ? "Try a broader search or view all categories."
                    : "Approved answers will appear here after authorised staff publish them."
                }
                actionLabel={faqs.length ? "Clear filters" : "Contact the school"}
                actionHref={faqs.length ? "/admissions/faq" : "/contact"}
              />
            </div>
          )}

          <aside className="mt-10 flex flex-col gap-4 rounded-2xl bg-[#eef0fb] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <HelpCircle className="mt-0.5 shrink-0 text-[#2e3192]" size={21} />
              <div>
                <h2 className="font-extrabold text-[#1e1f5c]">Still need help?</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Send a focused enquiry and include the relevant grade or intake.
                </p>
              </div>
            </div>
            <Link
              href="/contact"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-[#2e3192] px-5 text-sm font-bold text-white"
            >
              Contact the school
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
