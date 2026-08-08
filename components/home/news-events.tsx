import PublicImage from "@/components/site/public-image";
import Link from "next/link";
import { ArrowRight, Bell, CalendarDays, MapPin, Newspaper } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/home/section-heading";
import { formatEventDateTimeRange, formatPublicDate } from "@/lib/data/public";
import type { HomeSection, PublicEvent, PublicPost } from "@/lib/data/public";

function eventDay(event: PublicEvent) {
  if (!event.startsAt) return { day: "--", month: "TBC" };
  const date = new Date(event.startsAt);
  if (Number.isNaN(date.getTime())) return { day: "--", month: "TBC" };
  const formatter = new Intl.DateTimeFormat("en-NP", {
    timeZone: event.timezone ?? "Asia/Kathmandu",
    day: "2-digit",
    month: "short",
  });
  const parts = formatter.formatToParts(date);
  return {
    day: parts.find((part) => part.type === "day")?.value ?? "--",
    month: (parts.find((part) => part.type === "month")?.value ?? "TBC").toUpperCase(),
  };
}

export function NewsEvents({
  news,
  events,
  notices,
  section,
}: {
  news: readonly PublicPost[];
  events: readonly PublicEvent[];
  notices: readonly PublicPost[];
  section?: HomeSection;
}) {
  if (!section) return null;
  const [lead, ...rest] = news;

  return (
    <section
      aria-labelledby="news-events-heading"
      className="bg-[#f4f5fd] px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow={section.eyebrow}
          title={section.heading}
          headingId="news-events-heading"
          description={section.body}
          action={
            section.ctaLabel && section.ctaHref
              ? { label: section.ctaLabel, href: section.ctaHref }
              : undefined
          }
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
          <div className="min-w-0">
            {lead ? (
              <>
                <Reveal>
                  <Link
                    href={`/news/${lead.slug}`}
                    className="hover-lift media-zoom group block overflow-hidden rounded-3xl bg-white shadow-[0_18px_50px_rgba(30,31,92,.08)]"
                  >
                    <span className="relative block aspect-[16/9] overflow-hidden bg-slate-100">
                      {lead.imageUrl ? (
                        <PublicImage
                          src={lead.imageUrl}
                          alt=""
                          fill
                          sizes="(max-width: 1024px) 100vw, 55vw"
                          className="object-cover"
                        />
                      ) : (
                        <span className="grid h-full place-items-center bg-[radial-gradient(circle_at_top,#eef2ff,#dbeafe_58%,#c7d2fe)] text-[#2e3192]">
                          <Newspaper size={48} aria-hidden="true" />
                        </span>
                      )}
                      <span className="absolute top-4 left-4 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-extrabold tracking-wide text-[#2e3192] uppercase backdrop-blur">
                        {lead.category ?? "School news"}
                      </span>
                    </span>
                    <span className="block p-6 sm:p-8">
                      <span className="text-xs font-bold tracking-wide text-slate-500">
                        {formatPublicDate(lead.publishedAt)}
                      </span>
                      <span className="mt-3 block text-2xl leading-8 font-extrabold tracking-[-.02em] text-[#1e1f5c] transition group-hover:text-[#2e3192]">
                        {lead.title}
                      </span>
                      <span className="mt-3 line-clamp-2 block text-sm leading-7 text-slate-600">
                        {lead.summary}
                      </span>
                    </span>
                  </Link>
                </Reveal>

                {rest.length > 0 && (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {rest.slice(0, 2).map((item, index) => (
                      <Reveal key={item.id} delay={index * 110}>
                        <Link
                          href={`/news/${item.slug}`}
                          className="hover-lift group flex h-full gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 hover:border-sky-200"
                        >
                          <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                            {item.imageUrl ? (
                              <PublicImage
                                src={item.imageUrl}
                                alt=""
                                fill
                                sizes="80px"
                                className="object-cover"
                              />
                            ) : (
                              <span className="grid h-full place-items-center bg-sky-50 text-[#2e3192]">
                                <Newspaper size={24} aria-hidden="true" />
                              </span>
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-500">
                              {formatPublicDate(item.publishedAt)}
                            </span>
                            <span className="mt-1.5 line-clamp-3 block text-sm leading-6 font-extrabold text-[#1e1f5c] transition group-hover:text-[#2e3192]">
                              {item.title}
                            </span>
                          </span>
                        </Link>
                      </Reveal>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Reveal className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <h3 className="text-lg font-extrabold text-[#1e1f5c]">No published news yet</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">
                  Verified stories appear here as soon as authorised school staff publish them.
                </p>
                <Link
                  href="/notices"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[#2e3192]"
                >
                  View official notices <ArrowRight size={15} />
                </Link>
              </Reveal>
            )}
          </div>

          <div className="min-w-0 space-y-8">
            <Reveal
              variant="right"
              className="rounded-3xl bg-white p-6 shadow-[0_18px_50px_rgba(30,31,92,.07)]"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-50 text-[#2e3192]">
                  <CalendarDays size={20} />
                </span>
                <h3 className="text-lg font-extrabold text-[#1e1f5c]">Upcoming events</h3>
              </div>
              <div className="mt-5 space-y-2">
                {events.length ? (
                  events.slice(0, 3).map((event) => {
                    const { day, month } = eventDay(event);
                    return (
                      <Link
                        key={event.id}
                        href={`/events/${event.slug}`}
                        className="group flex gap-4 rounded-2xl p-3 transition hover:bg-sky-50"
                      >
                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[#1e1f5c] text-white transition group-hover:bg-[#2e3192]">
                          <span className="text-lg leading-5 font-extrabold">{day}</span>
                          <span className="text-[10px] font-bold tracking-widest text-[#f0bd3a]">
                            {month}
                          </span>
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm leading-6 font-extrabold text-[#1e1f5c]">
                            {event.title}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            {formatEventDateTimeRange(event.startsAt, event.endsAt, event.timezone)}
                          </span>
                          {event.venue && (
                            <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                              <MapPin size={12} className="shrink-0" />
                              {event.venue}
                            </span>
                          )}
                        </span>
                      </Link>
                    );
                  })
                ) : (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    No upcoming events are published at the moment.
                  </p>
                )}
              </div>
              <Link
                href="/events"
                className="group mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#2e3192]"
              >
                Full event calendar
                <ArrowRight
                  size={15}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
            </Reveal>

            {notices.length > 0 && (
              <Reveal variant="right" delay={120} className="rounded-3xl bg-[#1e1f5c] p-6 text-white">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-[#f0bd3a]">
                    <Bell size={19} />
                  </span>
                  <h3 className="text-lg font-extrabold">Official notices</h3>
                </div>
                <ul className="mt-5 divide-y divide-white/10">
                  {notices.slice(0, 3).map((notice) => (
                    <li key={notice.id}>
                      <Link href={`/notices/${notice.slug}`} className="group block py-3.5">
                        <span className="text-[11px] font-semibold text-slate-400">
                          {formatPublicDate(notice.publishedAt)}
                        </span>
                        <span className="mt-1 block text-sm leading-6 font-bold text-white transition group-hover:text-[#f0bd3a]">
                          {notice.title}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/notices"
                  className="group mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-[#f0bd3a]"
                >
                  All notices
                  <ArrowRight
                    size={15}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </Link>
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
