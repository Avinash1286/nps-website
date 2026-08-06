import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";

export type OverviewCard = { title: string; description: string; href: string; meta?: string };

export function OverviewPage({
  eyebrow,
  title,
  description,
  image,
  introEyebrow,
  introTitle,
  intro,
  additionalCopy = [],
  cards,
  cardHeading,
  featureImage = "/media/nps-campus-building.png",
  principles,
  cta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  image?: string;
  introEyebrow: string;
  introTitle: string;
  intro: string;
  additionalCopy?: string[];
  cards: OverviewCard[];
  cardHeading: string;
  featureImage?: string;
  principles: { title: string; description: string }[];
  cta: {
    title: string;
    description: string;
    label: string;
    href: string;
    secondaryLabel?: string;
    secondaryHref?: string;
  };
}) {
  return (
    <>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        description={description}
        image={image}
        crumbs={[{ label: title }]}
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-extrabold tracking-[.2em] text-[#0a65a8] uppercase">{introEyebrow}</p>
            <h2 className="mt-4 text-3xl leading-tight font-extrabold tracking-[-.035em] text-[#092f59] sm:text-4xl">
              {introTitle}
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">{intro}</p>
            {additionalCopy.map((paragraph) => (
              <p key={paragraph} className="mt-4 text-base leading-8 text-slate-600">
                {paragraph}
              </p>
            ))}
          </div>
          <div className="relative min-h-80 overflow-hidden rounded-3xl bg-slate-100 sm:min-h-[430px]">
            <Image
              src={featureImage}
              alt="Nepal Police School"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 52vw"
            />
          </div>
        </div>
      </section>
      <section className="bg-[#f0f6fa] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-4">
            <h2 className="max-w-2xl text-3xl font-extrabold tracking-[-.03em] text-[#092f59]">
              {cardHeading}
            </h2>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <Link
                href={card.href}
                key={card.href}
                className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_16px_38px_rgba(14,49,80,.08)]"
              >
                {card.meta && (
                  <p className="text-[11px] font-extrabold tracking-[.15em] text-[#0a65a8] uppercase">
                    {card.meta}
                  </p>
                )}
                <h3 className="mt-3 text-xl font-extrabold tracking-[-.02em] text-[#092f59]">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[#0a65a8]">
                  Explore <ArrowRight size={15} className="shrink-0" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.75fr_1.25fr]">
          <div>
            <p className="text-xs font-extrabold tracking-[.2em] text-[#0a65a8] uppercase">Our approach</p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-.03em] text-[#092f59]">
              Clear information, thoughtful support.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {principles.map((principle) => (
              <article key={principle.title} className="rounded-2xl border border-slate-200 p-5">
                <CheckCircle2 size={19} className="text-[#0a65a8]" />
                <h3 className="mt-4 font-extrabold text-[#173f61]">{principle.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{principle.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl bg-[#082946] p-8 text-white sm:p-10">
          <h2 className="text-3xl font-extrabold tracking-[-.03em]">{cta.title}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">{cta.description}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={cta.href}
              className="inline-flex max-w-full items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-extrabold"
            >
              {cta.label}
              <ArrowRight size={15} className="shrink-0" />
            </Link>
            {cta.secondaryHref && cta.secondaryLabel && (
              <Link
                href={cta.secondaryHref}
                className="max-w-full rounded-xl border border-white/20 px-5 py-3 text-sm font-extrabold"
              >
                {cta.secondaryLabel}
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
