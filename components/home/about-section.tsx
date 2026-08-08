import PublicImage from "@/components/site/public-image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { highlightIcon } from "@/components/home/highlight-icon";
import type { HomeHighlight, HomeSection, SiteProfile } from "@/lib/data/public";

export function AboutSection({
  site,
  section,
  pillars: publishedPillars = [],
}: {
  site: SiteProfile;
  section?: HomeSection;
  pillars?: readonly HomeHighlight[];
}) {
  const eyebrow = section?.eyebrow ?? site.tagline ?? site.shortName;
  const heading = section?.heading ?? site.schoolName;
  const body = section?.body ?? site.description;
  const secondaryBody = section?.secondaryBody;
  const ctaLabel = section?.ctaLabel;
  const ctaHref = section?.ctaHref;
  const mainImage = section?.imageUrl;
  const insetImage = section?.secondaryImageUrl;
  const pillars = publishedPillars;

  return (
    <section id="about" aria-labelledby="about-heading" className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
        <Reveal variant="left" className="relative">
          <div className="media-zoom relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-slate-100 sm:aspect-[3/4]">
            {mainImage ? (
              <PublicImage
                src={mainImage}
                alt={section?.imageAlt ?? `${site.schoolName} grounds`}
                fill
                sizes="(max-width: 1024px) 100vw, 46vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#3f43a8,#1e1f5c_62%,#12123a)] p-10 text-center text-white">
                {site.logoUrl && (
                  <PublicImage
                    src={site.logoUrl}
                    alt=""
                    width={112}
                    height={112}
                    className="h-28 w-28 object-contain"
                    aria-hidden="true"
                  />
                )}
                <strong className="mt-6 text-2xl font-extrabold">{site.schoolName}</strong>
                <span className="mt-2 text-sm text-sky-200">{site.location}</span>
              </div>
            )}
          </div>
          {insetImage && (
            <div className="absolute -right-3 -bottom-8 hidden w-56 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-[0_24px_60px_rgba(30,31,92,.22)] sm:block lg:-right-10">
              <div className="relative aspect-[4/3]">
                <PublicImage
                  src={insetImage}
                  alt=""
                  fill
                  sizes="14rem"
                  className="object-cover"
                  aria-hidden="true"
                />
              </div>
            </div>
          )}
          <div className="absolute -top-6 -left-4 hidden rounded-2xl bg-[#1e1f5c] px-6 py-5 text-white shadow-[0_20px_50px_rgba(30,31,92,.28)] lg:block">
            <p className="text-[10px] font-extrabold tracking-[.22em] text-[#f0bd3a] uppercase">
              {site.shortName}
            </p>
            <p className="mt-2 max-w-[14rem] text-lg leading-6 font-extrabold">
              {site.tagline ?? site.location}
            </p>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <p className="flex items-center gap-3 text-[11px] font-extrabold tracking-[.24em] text-[#2e3192] uppercase">
              <span aria-hidden="true" className="rule-sweep h-px w-9 bg-[#2e3192]" />
              {eyebrow}
            </p>
            <h2
              id="about-heading"
              className="mt-4 text-3xl leading-[1.12] font-extrabold tracking-[-.035em] text-[#1e1f5c] sm:text-[2.7rem]"
            >
              {heading}
            </h2>
            {body && <p className="mt-6 text-base leading-8 text-slate-600">{body}</p>}
            {secondaryBody && <p className="mt-4 text-base leading-8 text-slate-600">{secondaryBody}</p>}
          </Reveal>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {pillars.map((pillar, index) => {
              const Icon = highlightIcon(pillar.icon);
              return (
                <Reveal key={pillar.id} delay={index * 90} className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-50 text-[#2e3192]">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-base text-[#1e1f5c]">{pillar.title}</strong>
                    {pillar.summary && (
                      <span className="mt-1.5 block text-sm leading-6 text-slate-600">{pillar.summary}</span>
                    )}
                  </span>
                </Reveal>
              );
            })}
          </div>

          {ctaLabel && ctaHref && (
            <Reveal delay={160}>
              <Link
                href={ctaHref}
                className="group mt-10 inline-flex items-center gap-2 rounded-xl bg-[#2e3192] px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-sky-900/10 transition hover:bg-[#262873]"
              >
                {ctaLabel}
                <ArrowRight
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
