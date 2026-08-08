import type { Metadata } from "next";
import Image from "@/components/site/public-image";
import Link from "next/link";
import { ArrowRight, UserRound } from "lucide-react";
import { EmptyState } from "@/components/site/empty-state";
import { PageHero } from "@/components/site/page-hero";
import { getLeadership } from "@/lib/data/public";
export const metadata: Metadata = {
  title: "School leadership",
  description: "Verified leadership profiles and office messages from Nepal Police School, Garuda.",
};
export default async function LeadershipPage() {
  const leaders = await getLeadership();
  return (
    <>
      <PageHero
        eyebrow="Our people"
        title="School leadership"
        description="Meet the offices responsible for institutional direction, academic coordination, student support, and day-to-day school operations."
        image="/media/nps-staff-group.jpg"
        crumbs={[{ label: "About", href: "/about" }, { label: "Leadership" }]}
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xl leading-9 font-semibold text-[#2f3169]">
              Profiles, messages, and office details are published and maintained by authorised school staff.
            </p>
          </div>
          {leaders.length ? (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {leaders.map((leader) => (
                <Link
                  key={leader.id}
                  href={`/about/leadership/${leader.slug}`}
                  className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(30,31,92,.1)]"
                >
                  <div className="relative aspect-[4/5] bg-slate-100">
                    {leader.photoUrl ? (
                      <Image
                        src={leader.photoUrl}
                        alt={leader.name}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-[1.02]"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <span className="grid h-full place-items-center bg-sky-50 text-[#2e3192]">
                        <UserRound size={48} aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  <div className="p-6">
                    <p className="text-xs font-extrabold tracking-[.14em] text-[#2e3192] uppercase">
                      {leader.designation}
                    </p>
                    <h2 className="mt-2 text-xl font-extrabold text-[#1e1f5c]">{leader.name}</h2>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#2e3192]">
                      View profile <ArrowRight size={15} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-12">
              <EmptyState
                title="Leadership profiles are being prepared"
                description="Profiles will appear here after authorised staff publish verified details."
                actionLabel="Contact the school"
                actionHref="/contact"
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
