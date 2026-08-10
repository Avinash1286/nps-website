import Image from "@/components/site/public-image";
import Link from "next/link";
import { ArrowRight, CalendarDays, PenLine } from "lucide-react";
import { formatPublicDate, type PublicStudentArticle } from "@/lib/data/public";

export function StudentArticleCard({ article }: { article: PublicStudentArticle }) {
  return (
    <article className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(30,31,92,.1)]">
      {article.featuredImageUrl ? (
        <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
          <Image
            src={article.featuredImageUrl}
            alt={article.featuredImageAlt ?? ""}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
      ) : (
        <div className="flex aspect-[16/9] items-end bg-[linear-gradient(135deg,#eef5ff_0%,#e7e9fb_55%,#f8fafc_100%)] p-6">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#2e3192] shadow-sm">
            <PenLine size={22} aria-hidden="true" />
          </span>
        </div>
      )}
      <div className="min-w-0 p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-extrabold tracking-[.11em] text-slate-500 uppercase">
          <span className="text-[#2e3192]">{article.category}</span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} aria-hidden="true" />
            {formatPublicDate(article.publishedAt)}
          </span>
        </div>
        <h2 className="mt-3 text-xl leading-7 font-extrabold tracking-[-.02em] text-[#1e1f5c]">
          <Link href={`/articles/${article.slug}`} className="after:absolute after:inset-0">
            {article.title}
          </Link>
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{article.excerpt}</p>
        <p className="mt-4 text-xs font-bold text-slate-500">By {article.authorName}</p>
        <Link
          href={`/articles/${article.slug}`}
          className="relative mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#2e3192]"
        >
          Read article <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
