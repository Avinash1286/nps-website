import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { EmptyState } from "@/components/site/empty-state";
import { PageHero } from "@/components/site/page-hero";
import { FeaturedBadge } from "@/components/site/featured-badge";
import { formatEventDateTimeRange, getEvents } from "@/lib/data/public";
import type { PublicEvent } from "@/lib/data/public";
export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming and published school events at Nepal Police School, Garuda.",
};
export default async function EventsPage() {
  const [upcoming, past] = await Promise.all([getEvents("upcoming", 60), getEvents("past", 40)]);
  return (
    <>
      <PageHero
        eyebrow="School calendar"
        title="Events and programmes"
        description="Confirmed school events, dates, venues, and registration information published in one place."
        image="/media/sports-day.png"
        crumbs={[{ label: "Events" }]}
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {upcoming.length || past.length ? (
            <div className="space-y-14">
              <EventList title="Upcoming events" events={upcoming} />
              <EventList title="Past events" events={past} />
            </div>
          ) : (
            <EmptyState
              title="No events are published"
              description="Confirmed school events will appear here after authorised staff add them to the calendar."
              actionLabel="View notices"
              actionHref="/notices"
            />
          )}
          <div className="mt-8 flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            <CalendarDays size={18} className="mt-0.5 shrink-0 text-[#0a65a8]" />
            Event details can change. Recheck the event page or related notice before travelling.
          </div>
        </div>
      </section>
    </>
  );
}

function EventList({ title, events }: { title: string; events: PublicEvent[] }) {
  if (!events.length) return null;
  return (
    <section aria-labelledby={`${title.toLowerCase().replaceAll(" ", "-")}-heading`}>
      <h2
        id={`${title.toLowerCase().replaceAll(" ", "-")}-heading`}
        className="mb-5 text-2xl font-extrabold text-[#092f59]"
      >
        {title}
      </h2>
      <div className="space-y-4">
        {events.map((event) => (
          <Link
            href={`/events/${event.slug}`}
            key={event.id}
            className="group grid min-w-0 gap-5 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-sky-200 hover:shadow-[0_14px_36px_rgba(14,49,80,.07)] sm:grid-cols-[220px_minmax(0,1fr)_auto] sm:items-center sm:p-6"
          >
            <div className="min-w-0">
              <p className="text-xs leading-5 font-bold text-[#0a65a8]">
                {formatEventDateTimeRange(event.startsAt, event.endsAt, event.timezone)}
              </p>
              {event.venue && (
                <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-500">
                  <MapPin size={13} className="mt-0.5 shrink-0" />
                  {event.venue}
                </p>
              )}
            </div>
            <div className="min-w-0">
              {event.featured && <FeaturedBadge className="mb-2" />}
              <h3 className="text-xl font-extrabold text-[#092f59]">{event.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{event.summary}</p>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky-50 text-[#0a65a8] transition group-hover:bg-[#0a65a8] group-hover:text-white">
              <ArrowRight size={17} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
