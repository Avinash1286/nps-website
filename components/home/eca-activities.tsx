import PublicImage from "@/components/site/public-image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/home/section-heading";
import { highlightIcon } from "@/components/home/highlight-icon";
import type { HomeHighlight, HomeSection } from "@/lib/data/public";

export function EcaActivities({
  section,
  cards = [],
}: {
  section?: HomeSection;
  cards?: readonly HomeHighlight[];
}) {
  if (!section || !cards.length) return null;
  const activities = cards;

  return (
    <section aria-labelledby="eca-heading" className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow={section.eyebrow}
          title={section.heading}
          headingId="eca-heading"
          description={section.body}
          action={
            section.ctaLabel && section.ctaHref
              ? { label: section.ctaLabel, href: section.ctaHref }
              : undefined
          }
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity, index) => {
            const Icon = highlightIcon(activity.icon);
            const alt = activity.imageAlt ?? "";
            const cardClass =
              "hover-lift media-zoom group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white hover:border-sky-200 hover:shadow-[0_22px_55px_rgba(30,31,92,.12)]";
            const card = (
              <>
                <span className="relative block aspect-[16/10] overflow-hidden bg-slate-100">
                  {activity.imageUrl ? (
                    <PublicImage
                      src={activity.imageUrl}
                      alt={alt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <span className="grid h-full place-items-center bg-[radial-gradient(circle_at_top,#eef2ff,#dbeafe_58%,#c7d2fe)] text-[#2e3192]">
                      <Icon size={42} aria-hidden="true" />
                    </span>
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-[#12123a]/70 via-transparent to-transparent" />
                  <span className="absolute bottom-4 left-4 grid h-11 w-11 place-items-center rounded-xl bg-white/95 text-[#2e3192] shadow-sm backdrop-blur transition duration-500 group-hover:bg-[#2e3192] group-hover:text-white">
                    <Icon size={20} />
                  </span>
                </span>
                <span className="flex flex-1 flex-col p-6">
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-lg leading-6 font-extrabold text-[#1e1f5c] transition group-hover:text-[#2e3192]">
                      {activity.title}
                    </span>
                    {activity.href && (
                      <ArrowUpRight
                        size={18}
                        className="mt-0.5 shrink-0 text-slate-300 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#2e3192]"
                      />
                    )}
                  </span>
                  {activity.summary && (
                    <span className="mt-3 block text-sm leading-7 text-slate-600">{activity.summary}</span>
                  )}
                </span>
              </>
            );
            return (
              <Reveal key={activity.id} delay={(index % 3) * 110} variant="scale">
                {activity.href ? (
                  <Link href={activity.href} className={cardClass}>
                    {card}
                  </Link>
                ) : (
                  <article className={cardClass}>{card}</article>
                )}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
