import Image from "@/components/site/public-image";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { formatPublicDate, type PublicPost } from "@/lib/data/public";
import { FeaturedBadge } from "@/components/site/featured-badge";

export function ContentCard({ item, basePath }: { item: PublicPost; basePath: string }) {
  return (
    <article className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(30,31,92,.1)]">
      {item.imageUrl && (
        <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
          <Image
            src={item.imageUrl}
            alt=""
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
      )}
      <div className="min-w-0 p-6">
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold tracking-[.11em] text-slate-500 uppercase">
          {item.featured && <FeaturedBadge />}
          {item.category && <span className="text-[#2e3192]">{item.category}</span>}
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} className="shrink-0" />
            {formatPublicDate(item.publishedAt)}
          </span>
        </div>
        <h2 className="mt-3 text-xl leading-7 font-extrabold tracking-[-.02em] text-[#1e1f5c]">
          <Link href={`${basePath}/${item.slug}`} className="after:absolute after:inset-0">
            {item.title}
          </Link>
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{item.summary}</p>
        <Link
          href={`${basePath}/${item.slug}`}
          className="relative mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#2e3192]"
        >
          Read more <ArrowRight size={15} className="shrink-0" />
        </Link>
      </div>
    </article>
  );
}
