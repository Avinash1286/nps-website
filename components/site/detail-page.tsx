import Image from "@/components/site/public-image";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarDays, Download, MapPin, UsersRound } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import {
  formatEventDateTimeRange,
  formatPublicDate,
  type PublicEvent,
  type PublicPost,
} from "@/lib/data/public";

export function DetailPage({
  item,
  type,
  children,
}: {
  item: PublicPost | PublicEvent;
  type: "News" | "Notice" | "Event";
  children?: React.ReactNode;
}) {
  const event = type === "Event" ? (item as PublicEvent) : undefined;
  const root = type === "News" ? "/news" : type === "Notice" ? "/notices" : "/events";
  return (
    <>
      <PageHero
        eyebrow={item.category ?? type}
        title={item.title}
        description={item.summary}
        image={item.imageUrl}
        crumbs={[{ label: type, href: root }, { label: item.title }]}
      />
      <article className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-4 border-b border-slate-200 pb-6 text-sm font-semibold text-slate-600">
              <span className="inline-flex max-w-full min-w-0 items-center gap-2">
                <CalendarDays size={17} className="shrink-0 text-[#0a65a8]" />
                {event
                  ? formatEventDateTimeRange(event.startsAt, event.endsAt, event.timezone)
                  : formatPublicDate(item.publishedAt)}
              </span>
              {event?.venue && (
                <span className="inline-flex max-w-full min-w-0 items-center gap-2">
                  <MapPin size={17} className="shrink-0 text-[#0a65a8]" />
                  {event.venue}
                </span>
              )}
              {type === "Notice" && item.priority && (
                <span
                  className={`inline-flex max-w-full min-w-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold uppercase ${
                    item.priority === "urgent"
                      ? "bg-red-100 text-red-800"
                      : item.priority === "important"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <AlertTriangle size={15} className="shrink-0" /> {item.priority} priority
                </span>
              )}
              {type === "Notice" && item.audiences.length > 0 && (
                <span className="inline-flex max-w-full min-w-0 items-center gap-2">
                  <UsersRound size={17} className="shrink-0 text-[#0a65a8]" />
                  For {item.audiences.join(", ")}
                </span>
              )}
            </div>
            {item.imageUrl && (
              <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-slate-100">
                <Image
                  src={item.imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 800px"
                />
              </div>
            )}
            <div className="mt-8 min-w-0 space-y-5 text-base leading-8 text-slate-700">
              {(item.body ?? item.summary).split(/\n{2,}/).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            {children}
          </div>
          <aside className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-extrabold tracking-[.15em] text-slate-500 uppercase">
                Official information
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                If a downloaded document conflicts with later school communication, contact the office for
                confirmation.
              </p>
              {item.attachmentUrl && (
                <a
                  href={item.attachmentUrl}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a65a8] px-4 py-3 text-sm font-bold text-white"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download size={16} className="shrink-0" />
                  Download attachment
                </a>
              )}
            </div>
            <Link href={root} className="inline-flex items-center gap-2 text-sm font-bold text-[#0a65a8]">
              <ArrowLeft size={15} className="shrink-0" />
              Back to all {type.toLowerCase()}
            </Link>
          </aside>
        </div>
      </article>
    </>
  );
}
