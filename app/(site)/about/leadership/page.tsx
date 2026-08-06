import type { Metadata } from "next";
import Image from "@/components/site/public-image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
            <p className="text-xl leading-9 font-semibold text-[#173f61]">
              Profiles, messages, and office details are maintained by authorised school staff. Placeholder
              office profiles are shown only when the live content system has not yet been configured.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {leaders.map((leader) => (
              <Link
                key={leader.id}
                href={`/about/leadership/${leader.slug}`}
                className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(16,53,84,.1)]"
              >
                <div className="relative aspect-[4/5] bg-slate-100">
                  <Image
                    src={leader.photoUrl ?? "/media/principal-placeholder.png"}
                    alt={leader.name}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-[1.02]"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-6">
                  <p className="text-xs font-extrabold tracking-[.14em] text-[#0a65a8] uppercase">
                    {leader.designation}
                  </p>
                  <h2 className="mt-2 text-xl font-extrabold text-[#092f59]">{leader.name}</h2>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#0a65a8]">
                    View profile <ArrowRight size={15} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
