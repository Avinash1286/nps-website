import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, UserRound } from "lucide-react";
import type { StandardPageContent } from "@/lib/content/site-pages";
import { PageHero } from "@/components/site/page-hero";
import PublicImage from "@/components/site/public-image";

type FeaturedProfile = {
  eyebrow: string;
  name: string;
  designation: string;
  description?: string;
  subjects?: string[];
  photoUrl?: string;
  href: string;
};

export function StandardPage({
  content,
  parentLabel,
  parentHref,
  featuredProfile,
}: {
  content: StandardPageContent;
  parentLabel: string;
  parentHref: string;
  featuredProfile?: FeaturedProfile;
}) {
  return (
    <>
      <PageHero
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        image={content.image}
        crumbs={[{ label: parentLabel, href: parentHref }, { label: content.title }]}
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <p className="max-w-3xl text-xl leading-9 font-semibold tracking-[-.015em] text-[#153b5f] sm:text-2xl">
              {content.intro}
            </p>
            {featuredProfile && (
              <Link
                href={featuredProfile.href}
                className="group mt-10 grid min-w-0 overflow-hidden rounded-2xl border border-sky-100 bg-sky-50 transition hover:border-sky-200 hover:shadow-[0_16px_40px_rgba(16,53,84,.08)] sm:grid-cols-[180px_minmax(0,1fr)]"
              >
                <div className="relative min-h-52 bg-sky-100 sm:min-h-full">
                  {featuredProfile.photoUrl ? (
                    <PublicImage
                      src={featuredProfile.photoUrl}
                      alt={featuredProfile.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 180px"
                    />
                  ) : (
                    <span className="grid h-full min-h-52 place-items-center text-sky-300">
                      <UserRound size={42} />
                    </span>
                  )}
                </div>
                <div className="min-w-0 p-6 sm:p-7">
                  <p className="text-[11px] font-extrabold tracking-[.14em] text-[#0a65a8] uppercase">
                    {featuredProfile.eyebrow}
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold text-[#092f59]">{featuredProfile.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{featuredProfile.designation}</p>
                  {featuredProfile.description && (
                    <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-600">
                      {featuredProfile.description}
                    </p>
                  )}
                  {featuredProfile.subjects && featuredProfile.subjects.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {featuredProfile.subjects.slice(0, 5).map((subject) => (
                        <span
                          key={subject}
                          className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#17618f]"
                        >
                          {subject}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#0a65a8]">
                    View profile <ArrowRight size={15} />
                  </span>
                </div>
              </Link>
            )}
            <div className="mt-12 space-y-12">
              {content.sections.map((section) => (
                <section key={section.title} className="border-t border-slate-200 pt-8">
                  <h2 className="text-2xl font-extrabold tracking-[-.025em] text-[#092f59]">
                    {section.title}
                  </h2>
                  <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">{section.body}</p>
                  {section.points && (
                    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                      {section.points.map((point) => (
                        <li
                          key={point}
                          className="flex gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 font-semibold text-slate-700"
                        >
                          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky-100 text-[#0870b7]">
                            <Check size={12} strokeWidth={3} />
                          </span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </div>
          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <div className="overflow-hidden rounded-2xl bg-slate-100">
              <div className="relative aspect-[4/3]">
                <Image
                  src={content.image ?? "/media/nps-campus-building.png"}
                  alt="Nepal Police School campus"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 320px"
                />
              </div>
              <div className="p-5">
                <p className="text-xs leading-5 text-slate-600">
                  Information on this page is maintained for general guidance. Current official notices take
                  precedence where dates, eligibility, fees, or schedules are involved.
                </p>
              </div>
            </div>
            {content.related && (
              <nav aria-label="Related pages" className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-xs font-extrabold tracking-[.16em] text-slate-500 uppercase">
                  Related information
                </h2>
                <div className="mt-3">
                  {content.related.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex min-w-0 items-center justify-between gap-3 border-t border-slate-100 py-3 text-sm font-bold text-[#0a609d] first:border-t-0"
                    >
                      <span className="min-w-0">{item.label}</span>
                      <ArrowRight size={15} className="shrink-0" />
                    </Link>
                  ))}
                </div>
              </nav>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
