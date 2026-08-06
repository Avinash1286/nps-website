import { BookOpenCheck, Info, Sparkles } from "lucide-react";
import { pageParagraphs } from "@/lib/content/cms-page";
import type { PublicCmsPage } from "@/lib/data/public";
import { PageHero } from "@/components/site/page-hero";

export function CmsPageTemplate({ page }: { page: PublicCmsPage }) {
  const paragraphs = pageParagraphs(page);
  const description = page.summary ?? paragraphs[0] ?? "Published school information.";
  const eyebrow =
    page.template === "landing"
      ? "Featured information"
      : page.template === "information"
        ? "Information guide"
        : "School information";

  return (
    <article data-page-template={page.template}>
      <PageHero
        eyebrow={eyebrow}
        title={page.title}
        description={description}
        image={page.heroImageUrl}
        crumbs={[{ label: page.title }]}
      />
      {page.template === "landing" ? (
        <LandingBody paragraphs={paragraphs} />
      ) : page.template === "information" ? (
        <InformationBody summary={page.summary} paragraphs={paragraphs} />
      ) : (
        <StandardBody paragraphs={paragraphs} />
      )}
    </article>
  );
}

function StandardBody({ paragraphs }: { paragraphs: string[] }) {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-3xl min-w-0 space-y-6 text-base leading-8 [overflow-wrap:anywhere] text-slate-700">
        {paragraphs.map((paragraph, index) => (
          <p
            key={`${index}-${paragraph.slice(0, 40)}`}
            className={index === 0 ? "text-xl leading-9 font-semibold text-[#173f61]" : undefined}
          >
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}

function LandingBody({ paragraphs }: { paragraphs: string[] }) {
  const [intro, ...details] = paragraphs;
  return (
    <section className="bg-[linear-gradient(180deg,#f2f8fc_0%,#fff_45%)] px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-4xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1.5 text-xs font-extrabold tracking-[.12em] text-[#08639f] uppercase">
            <Sparkles size={14} /> Published feature
          </span>
          {intro && (
            <p className="mt-7 text-2xl leading-10 font-semibold tracking-[-.02em] text-[#123b60] sm:text-3xl sm:leading-[1.45]">
              {intro}
            </p>
          )}
        </div>
        {details.length > 0 && (
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {details.map((paragraph, index) => (
              <section
                key={`${index}-${paragraph.slice(0, 40)}`}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_36px_rgba(14,49,80,.06)] sm:p-7"
              >
                <p className="text-[11px] font-extrabold tracking-[.15em] text-[#0a65a8] uppercase">
                  Detail {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-4 text-base leading-8 text-slate-700">{paragraph}</p>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function InformationBody({ summary, paragraphs }: { summary?: string; paragraphs: string[] }) {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-8">
          {paragraphs.map((paragraph, index) => (
            <section
              key={`${index}-${paragraph.slice(0, 40)}`}
              className="border-t border-slate-200 pt-7 first:border-0 first:pt-0"
            >
              <p className="text-[11px] font-extrabold tracking-[.14em] text-[#0a65a8] uppercase">
                Information {String(index + 1).padStart(2, "0")}
              </p>
              <p className="mt-3 max-w-3xl text-base leading-8 text-slate-700">{paragraph}</p>
            </section>
          ))}
        </div>
        <aside className="h-fit rounded-2xl border border-sky-100 bg-sky-50 p-6 lg:sticky lg:top-28">
          <Info className="text-[#0a65a8]" size={22} />
          <h2 className="mt-4 text-lg font-extrabold text-[#092f59]">At a glance</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {summary ?? "This guidance is maintained by authorised school staff."}
          </p>
          <p className="mt-5 flex items-start gap-2 border-t border-sky-100 pt-5 text-xs leading-6 text-slate-500">
            <BookOpenCheck className="mt-0.5 shrink-0 text-[#0a65a8]" size={16} />
            Check current notices whenever dates, fees, eligibility, or schedules may have changed.
          </p>
        </aside>
      </div>
    </section>
  );
}
