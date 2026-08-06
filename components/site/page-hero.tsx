import Image from "@/components/site/public-image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

export function PageHero({
  eyebrow,
  title,
  description,
  image = "/media/campus-hero.png",
  crumbs = [],
}: {
  eyebrow: string;
  title: string;
  description: string;
  image?: string;
  crumbs?: Crumb[];
}) {
  return (
    <section className="relative isolate overflow-hidden bg-[#082946] px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <Image src={image} alt="" fill priority className="-z-20 object-cover" sizes="100vw" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(4,26,48,.97)_0%,rgba(5,38,69,.9)_52%,rgba(5,41,72,.54)_100%)]" />
      <div className="absolute inset-y-0 right-[12%] -z-10 hidden w-px bg-white/15 lg:block" />
      <div className="mx-auto max-w-7xl">
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold text-sky-200"
        >
          <Link href="/" className="shrink-0 hover:text-white">
            Home
          </Link>
          {crumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex max-w-full min-w-0 items-center gap-2">
              <ChevronRight size={13} className="shrink-0" />
              {crumb.href ? (
                <Link href={crumb.href} className="min-w-0 hover:text-white">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="min-w-0 text-white">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
        <p className="mt-10 text-xs font-extrabold tracking-[.22em] text-sky-300 uppercase">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl text-4xl leading-[1.08] font-extrabold tracking-[-.035em] [overflow-wrap:anywhere] sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg sm:leading-8">
          {description}
        </p>
      </div>
    </section>
  );
}
