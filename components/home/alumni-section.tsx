import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AlumniCarousel } from "@/components/home/alumni-carousel";
import { Reveal } from "@/components/site/reveal";
import type { HomeSection, PublicTestimonial } from "@/lib/data/public";

export function AlumniSection({
  testimonials,
  section,
}: {
  testimonials: readonly PublicTestimonial[];
  section?: HomeSection;
}) {
  if (!section || !testimonials.length) return null;
  const voices = testimonials.slice(0, 8);

  return (
    <section
      aria-labelledby="alumni-heading"
      className="relative isolate overflow-hidden bg-[#12123a] px-4 py-20 text-white sm:px-6 sm:py-28 lg:px-8"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(55% 60% at 80% 10%, rgba(74,81,189,.45) 0%, rgba(18,18,58,0) 70%)",
        }}
      />
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
        <Reveal variant="left">
          <p className="flex items-center gap-3 text-[11px] font-extrabold tracking-[.24em] text-[#f0bd3a] uppercase">
            <span aria-hidden="true" className="rule-sweep h-px w-9 bg-[#f0bd3a]" />
            {section.eyebrow}
          </p>
          <h2
            id="alumni-heading"
            className="mt-4 text-3xl leading-[1.12] font-extrabold tracking-[-.035em] sm:text-[2.6rem]"
          >
            {section.heading}
          </h2>
          {section.body && <p className="mt-6 text-base leading-8 text-slate-300">{section.body}</p>}
          {section.ctaLabel && section.ctaHref && (
            <Link
              href={section.ctaHref}
              className="group mt-8 inline-flex items-center gap-2 text-sm font-extrabold text-[#f0bd3a] transition hover:text-white"
            >
              {section.ctaLabel}
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          )}
        </Reveal>

        <Reveal variant="right" delay={120}>
          <AlumniCarousel items={voices} />
        </Reveal>
      </div>
    </section>
  );
}
