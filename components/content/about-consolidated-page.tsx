import Link from "next/link";
import { ArrowRight, Compass, Eye, Landmark, ShieldCheck } from "lucide-react";
import PublicImage from "@/components/site/public-image";
import { PageHero } from "@/components/site/page-hero";

type AboutSectionCopy = {
  overview: string[];
  history: string[];
  mission: string[];
  vision: string[];
};

const sectionLinks = [
  { label: "Overview", href: "#overview" },
  { label: "History", href: "#history" },
  { label: "Mission", href: "#mission" },
  { label: "Vision", href: "#vision" },
];

export function AboutConsolidatedPage({
  title,
  description,
  image,
  copy,
}: {
  title: string;
  description: string;
  image: string;
  copy: AboutSectionCopy;
}) {
  return (
    <>
      <PageHero
        eyebrow="About the school"
        title={title}
        description={description}
        image={image}
        crumbs={[{ label: "About" }]}
      />

      <nav
        aria-label="About page sections"
        className="sticky top-[68px] z-40 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8"
      >
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto pb-1">
          {sectionLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-[#2f3169] transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e3192]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <section id="overview" className="scroll-mt-28 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(360px,.9fr)] lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-extrabold tracking-[.2em] text-[#2e3192] uppercase">Who we are</p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-.035em] text-[#1e1f5c] sm:text-4xl">
              One clear introduction to our school.
            </h2>
            <div className="mt-6 space-y-4">
              {copy.overview.map((paragraph) => (
                <p key={paragraph} className="text-base leading-8 text-slate-600">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
          <div className="relative min-h-80 overflow-hidden rounded-3xl bg-slate-100 sm:min-h-[430px]">
            <PublicImage
              src={image}
              alt="Nepal Police School, Garuda"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 45vw"
            />
          </div>
        </div>
      </section>

      <section id="history" className="scroll-mt-28 bg-[#eef0fb] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#2e3192] shadow-sm">
              <Landmark size={22} aria-hidden="true" />
            </span>
            <p className="mt-6 text-xs font-extrabold tracking-[.2em] text-[#2e3192] uppercase">Our story</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-.03em] text-[#1e1f5c]">History</h2>
          </div>
          <div className="min-w-0 rounded-3xl bg-white p-7 shadow-[0_18px_50px_rgba(30,31,92,.07)] sm:p-9">
            {copy.history.map((paragraph) => (
              <p key={paragraph} className="mt-4 text-base leading-8 text-slate-600 first:mt-0">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold tracking-[.2em] text-[#2e3192] uppercase">Our direction</p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-.03em] text-[#1e1f5c] sm:text-4xl">
              Mission and vision
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              These sections bring the school&apos;s purpose and long-term educational direction together in
              one place.
            </p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <article id="mission" className="scroll-mt-28 rounded-3xl border border-slate-200 p-7 sm:p-9">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-[#2e3192]">
                <Compass size={21} aria-hidden="true" />
              </span>
              <h3 className="mt-6 text-2xl font-extrabold text-[#1e1f5c]">Mission</h3>
              {copy.mission.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-base leading-8 text-slate-600">
                  {paragraph}
                </p>
              ))}
            </article>
            <article id="vision" className="scroll-mt-28 rounded-3xl bg-[#1e1f5c] p-7 text-white sm:p-9">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-sky-300">
                <Eye size={21} aria-hidden="true" />
              </span>
              <h3 className="mt-6 text-2xl font-extrabold">Vision</h3>
              {copy.vision.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-base leading-8 text-slate-300">
                  {paragraph}
                </p>
              ))}
            </article>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          {[
            {
              title: "School leadership",
              description:
                "Meet the people responsible for the school's direction and day-to-day leadership.",
              href: "/about/leadership",
            },
            {
              title: "Academic programmes",
              description: "See every level and the curriculum on the consolidated Academics page.",
              href: "/academics",
            },
            {
              title: "Academic departments",
              description: "Explore subject departments and the verified teachers assigned to each one.",
              href: "/departments",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-slate-200 p-6 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_16px_38px_rgba(14,49,80,.08)]"
            >
              <ShieldCheck size={20} className="text-[#2e3192]" aria-hidden="true" />
              <h2 className="mt-5 text-xl font-extrabold text-[#1e1f5c]">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#2e3192]">
                Explore <ArrowRight size={15} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
