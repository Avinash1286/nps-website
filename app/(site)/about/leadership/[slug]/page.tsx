import type { Metadata } from "next";
import Image from "@/components/site/public-image";
import Link from "next/link";
import { ArrowLeft, Clock3, Mail } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/site/page-hero";
import { getLeader } from "@/lib/data/public";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const leader = await getLeader(slug);
  return leader
    ? { title: leader.name, description: `${leader.designation} at Nepal Police School, Garuda.` }
    : {};
}
export default async function LeadershipProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const leader = await getLeader(slug);
  if (!leader) notFound();
  return (
    <>
      <PageHero
        eyebrow={leader.designation}
        title={leader.name}
        description="Leadership profile and office message"
        image="/media/campus-hero.png"
        crumbs={[
          { label: "About", href: "/about" },
          { label: "Leadership", href: "/about/leadership" },
          { label: leader.name },
        ]}
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[320px_1fr]">
          <aside>
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-slate-100">
              <Image
                src={leader.photoUrl ?? "/media/principal-placeholder.png"}
                alt={leader.name}
                fill
                className="object-cover"
                sizes="320px"
              />
            </div>
            {leader.officeHours && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                <Clock3 size={17} className="mt-1 shrink-0 text-[#0a65a8]" />
                {leader.officeHours}
              </p>
            )}
          </aside>
          <article className="min-w-0">
            <p className="text-xs font-extrabold tracking-[.18em] text-[#0a65a8] uppercase">Office message</p>
            <div className="mt-5 space-y-5 text-lg leading-9 text-slate-700">
              {(
                leader.message ??
                "A verified leadership message will be published here by the school administration."
              )
                .split(/\n{2,}/)
                .map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
            </div>
            {leader.bio && leader.bio !== leader.message && (
              <section
                className="mt-10 border-t border-slate-200 pt-8"
                aria-labelledby="leadership-biography"
              >
                <p
                  id="leadership-biography"
                  className="text-xs font-extrabold tracking-[.18em] text-[#0a65a8] uppercase"
                >
                  Biography
                </p>
                <div className="mt-5 space-y-5 text-base leading-8 text-slate-700">
                  {leader.bio.split(/\n{2,}/).map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            )}
            <div className="mt-10 border-t border-slate-200 pt-6">
              {leader.email && (
                <a
                  href={`mailto:${leader.email}`}
                  className="mb-5 inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-[#0a65a8]"
                >
                  <Mail size={16} className="shrink-0" />
                  <span className="min-w-0">{leader.email}</span>
                </a>
              )}
              <p className="text-sm leading-6 text-slate-600">
                For official decisions, appointments, or time-sensitive matters, use the school&apos;s
                published contact channels.
              </p>
              <div className="mt-5 flex flex-wrap gap-4">
                <Link
                  href="/contact"
                  className="rounded-xl bg-[#0a65a8] px-4 py-2.5 text-sm font-bold text-white"
                >
                  Contact the school
                </Link>
                <Link
                  href="/about/leadership"
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#0a65a8]"
                >
                  <ArrowLeft size={15} />
                  All leadership
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
