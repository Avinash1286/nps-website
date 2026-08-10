import Image from "@/components/site/public-image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, PenLine, ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { formatPublicDate, type PublicStudentArticleDetail } from "@/lib/data/public";

export function StudentArticleDetail({ article }: { article: PublicStudentArticleDetail }) {
  const readMinutes = Math.max(1, Math.ceil(article.body.trim().split(/\s+/).length / 200));
  const paragraphs = article.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <>
      <PageHero
        eyebrow={article.category}
        title={article.title}
        description={article.excerpt}
        crumbs={[{ label: "Articles", href: "/articles" }, { label: article.title }]}
      />
      <article className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_290px] lg:gap-14">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-slate-200 pb-6 text-sm font-semibold text-slate-600">
              <span className="inline-flex items-center gap-2">
                <PenLine size={17} className="text-[#2e3192]" aria-hidden="true" />
                By {article.authorName}
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={17} className="text-[#2e3192]" aria-hidden="true" />
                {formatPublicDate(article.publishedAt)}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 size={17} className="text-[#2e3192]" aria-hidden="true" />
                {readMinutes} min read
              </span>
            </div>

            {article.featuredImageUrl ? (
              <figure className="mt-8">
                <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-slate-100">
                  <Image
                    src={article.featuredImageUrl}
                    alt={article.featuredImageAlt ?? ""}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 800px"
                  />
                </div>
              </figure>
            ) : null}

            <div className="mt-8 min-w-0 space-y-6 text-base leading-8 text-slate-700 sm:text-[1.0625rem]">
              {paragraphs.map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 40)}`} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>

            {article.tags.length ? (
              <div
                className="mt-10 flex flex-wrap gap-2 border-t border-slate-200 pt-6"
                aria-label="Article topics"
              >
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5 text-sky-950">
              <ShieldCheck size={22} aria-hidden="true" />
              <h2 className="mt-4 text-sm font-extrabold">
                Student contribution, reviewed before publication
              </h2>
              <p className="mt-2 text-sm leading-6 text-sky-900/80">
                This article represents the student author&apos;s work. Review helps keep submissions safe and
                suitable for the school website; it does not make the article an official school notice.
              </p>
              <Link
                href="/notices"
                className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-[#2e3192]"
              >
                View official notices
              </Link>
            </div>
            <Link
              href="/articles"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#2e3192]"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Back to all articles
            </Link>
          </aside>
        </div>
      </article>
    </>
  );
}
