import { ManagementCarousel } from "@/components/home/management-carousel";
import { Reveal } from "@/components/site/reveal";
import type { HomeSection, PublicLeader } from "@/lib/data/public";

export function ManagementMessage({
  leaders,
  section,
}: {
  leaders: readonly PublicLeader[];
  section?: HomeSection;
}) {
  if (!section || !leaders.length) return null;

  return (
    <section
      aria-labelledby="management-heading"
      className="relative isolate overflow-hidden bg-[#1e1f5c] px-4 py-20 text-white sm:px-6 sm:py-28 lg:px-8"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(70% 60% at 15% 0%, rgba(74,81,189,.5) 0%, rgba(30,31,92,0) 65%)",
        }}
      />
      <div className="mx-auto max-w-7xl">
        <Reveal className="max-w-2xl">
          <p className="flex items-center gap-3 text-[11px] font-extrabold tracking-[.24em] text-[#f0bd3a] uppercase">
            <span aria-hidden="true" className="rule-sweep h-px w-9 bg-[#f0bd3a]" />
            {section.eyebrow}
          </p>
          <h2
            id="management-heading"
            className="mt-4 text-3xl leading-[1.12] font-extrabold tracking-[-.035em] sm:text-[2.6rem]"
          >
            {section.heading}
          </h2>
          {section.body && <p className="mt-5 text-base leading-8 text-slate-300">{section.body}</p>}
        </Reveal>

        <div className="mt-14">
          <ManagementCarousel leaders={leaders} />
        </div>
      </div>
    </section>
  );
}
