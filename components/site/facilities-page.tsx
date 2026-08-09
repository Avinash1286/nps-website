import Link from "next/link";
import {
  BadgeCheck,
  BedDouble,
  BookOpen,
  Building2,
  BusFront,
  Clock3,
  Dumbbell,
  ExternalLink,
  FlaskConical,
  HeartPulse,
  Monitor,
  Presentation,
  School,
  Trees,
  Trophy,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import PublicImage from "@/components/site/public-image";
import type { FacilityIconKey, PublicCmsPage, PublicFacility } from "@/lib/data/public";

const facilityIcons: Record<FacilityIconKey, LucideIcon> = {
  classroom: School,
  science: FlaskConical,
  computer: Monitor,
  library: BookOpen,
  sports: Trophy,
  "indoor-sports": Dumbbell,
  hostel: BedDouble,
  dining: UtensilsCrossed,
  medical: HeartPulse,
  transport: BusFront,
  auditorium: Presentation,
  grounds: Trees,
};

function VerificationBadge({ status }: { status: PublicFacility["verificationStatus"] }) {
  const confirmed = status === "confirmed";
  const Icon = confirmed ? BadgeCheck : Clock3;
  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-[.08em] uppercase ${
        confirmed ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
      }`}
    >
      <Icon size={13} aria-hidden="true" />
      {confirmed ? "School-confirmed" : "Confirmation pending"}
    </span>
  );
}

function FacilitySource({ facility }: { facility: PublicFacility }) {
  if (!facility.sourceLabel && !facility.sourceUrl) return null;
  const label = facility.sourceLabel ?? "View verification source";
  if (!facility.sourceUrl) {
    return <p className="mt-5 text-xs leading-5 font-semibold text-slate-500">Source: {label}</p>;
  }
  return (
    <a
      href={facility.sourceUrl}
      target="_blank"
      rel="noreferrer"
      className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg text-xs leading-5 font-bold text-[#2e3192] underline decoration-sky-200 underline-offset-4 hover:text-sky-800 focus:ring-2 focus:ring-sky-400 focus:outline-none"
    >
      {label}
      <ExternalLink size={13} aria-hidden="true" />
    </a>
  );
}

export function FacilitiesPage({
  page,
  facilities,
}: {
  page: PublicCmsPage | null;
  facilities: PublicFacility[];
}) {
  const confirmedCount = facilities.filter((facility) => facility.verificationStatus === "confirmed").length;
  const pendingCount = facilities.length - confirmedCount;
  const imageFacilities = facilities.filter((facility) => Boolean(facility.imageUrl));
  const bodyParagraphs = page?.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const heroImage = page?.heroImageUrl ?? imageFacilities[0]?.imageUrl ?? "/media/nps-campus-building.png";

  return (
    <>
      <PageHero
        eyebrow="Our school"
        title={page?.title ?? "Our facilities"}
        description={
          page?.summary ??
          "Explore the learning, residential, wellbeing, and activity spaces published by Nepal Police School, Garuda."
        }
        image={heroImage}
        crumbs={[{ label: "Facilities" }]}
      />

      <div>
        <section className="px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
              <div className="max-w-4xl">
                <p className="text-xs font-extrabold tracking-[.18em] text-[#2e3192] uppercase">
                  Learning, wellbeing, and participation
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-[-.03em] text-[#12123a] sm:text-4xl">
                  Spaces that support the school day
                </h2>
                {bodyParagraphs?.length ? (
                  <div className="mt-5 space-y-4 text-base leading-8 text-slate-600">
                    {bodyParagraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                    Facility information is maintained by authorised school staff. Availability, access, and
                    schedules may vary, so families should confirm time-sensitive details with the school.
                  </p>
                )}
              </div>

              <aside className="rounded-2xl border border-sky-100 bg-sky-50 p-5 sm:p-6">
                <h2 className="font-black text-[#12123a]">How verification is shown</h2>
                <div className="mt-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 shrink-0 text-emerald-700" size={19} aria-hidden="true" />
                    <p className="text-sm leading-6 text-slate-600">
                      <strong className="text-slate-900">{confirmedCount} school-confirmed</strong> facilities
                      have supporting school or official records.
                    </p>
                  </div>
                  {pendingCount > 0 && (
                    <div className="flex items-start gap-3">
                      <Clock3 className="mt-0.5 shrink-0 text-amber-700" size={19} aria-hidden="true" />
                      <p className="text-sm leading-6 text-slate-600">
                        <strong className="text-slate-900">{pendingCount} awaiting confirmation</strong> are
                        listed transparently and should not be treated as currently available until verified.
                      </p>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-[#f6f8fc] px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-extrabold tracking-[.18em] text-[#2e3192] uppercase">
                  Facilities directory
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-.03em] text-[#12123a]">
                  Explore our facilities
                </h2>
              </div>
              <p className="text-sm font-semibold text-slate-500">
                {facilities.length} {facilities.length === 1 ? "facility" : "facilities"} published
              </p>
            </div>

            {facilities.length ? (
              <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {facilities.map((facility) => {
                  const Icon = facilityIcons[facility.iconKey] ?? Building2;
                  const pending = facility.verificationStatus === "school_confirmation_required";
                  return (
                    <article
                      id={facility.slug}
                      key={facility.id}
                      className={`scroll-mt-32 rounded-2xl border bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,.05)] sm:p-6 ${
                        pending ? "border-amber-200" : "border-slate-200"
                      } ${facility.featured ? "ring-2 ring-sky-100" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <span
                          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
                            pending ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-[#2e3192]"
                          }`}
                        >
                          <Icon size={24} strokeWidth={1.9} aria-hidden="true" />
                        </span>
                        <VerificationBadge status={facility.verificationStatus} />
                      </div>
                      <h3 className="mt-5 text-xl font-black tracking-[-.02em] text-[#12123a]">
                        {facility.name}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{facility.summary}</p>
                      {facility.details && (
                        <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-7 text-slate-500">
                          {facility.details}
                        </p>
                      )}
                      <FacilitySource facility={facility} />
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                <Building2 className="mx-auto text-sky-700" size={30} aria-hidden="true" />
                <h3 className="mt-4 text-lg font-black text-[#12123a]">
                  Facility information is being reviewed
                </h3>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  Authorised staff can publish verified facility records from the administration panel.
                </p>
              </div>
            )}
          </div>
        </section>

        {imageFacilities.length > 0 && (
          <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <div className="max-w-3xl">
                <p className="text-xs font-extrabold tracking-[.18em] text-[#2e3192] uppercase">
                  Documentary images
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-.03em] text-[#12123a]">
                  A closer look at the school
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  These images are attached to facility records by authorised staff. Verification badges refer
                  to the facility information, not a promise of unrestricted access or current availability.
                </p>
              </div>
              <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {imageFacilities.map((facility, index) => (
                  <figure
                    key={`image-${facility.id}`}
                    className={`group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${
                      index === 0 && imageFacilities.length > 2 ? "md:col-span-2" : ""
                    }`}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                      <PublicImage
                        src={facility.imageUrl!}
                        alt={facility.imageAlt ?? facility.name}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-[1.02]"
                        sizes={
                          index === 0 && imageFacilities.length > 2
                            ? "(max-width: 768px) 100vw, (max-width: 1280px) 66vw, 55vw"
                            : "(max-width: 768px) 100vw, 33vw"
                        }
                      />
                    </div>
                    <figcaption className="flex items-start justify-between gap-4 p-4 sm:p-5">
                      <div className="min-w-0">
                        <p className="font-black text-[#12123a]">{facility.name}</p>
                        {facility.sourceLabel && (
                          <p className="mt-1 text-xs leading-5 text-slate-500">{facility.sourceLabel}</p>
                        )}
                      </div>
                      <VerificationBadge status={facility.verificationStatus} />
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="bg-[#12123a] px-4 py-12 text-white sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">Need current access or availability details?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Contact the school for current schedules, residential arrangements, transport, or visitor
                access.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#12123a] transition hover:bg-sky-50 focus:ring-4 focus:ring-sky-300/40 focus:outline-none"
              >
                Contact the school
              </Link>
              <Link
                href="/campus-life"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/25 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-white/10 focus:ring-4 focus:ring-sky-300/40 focus:outline-none"
              >
                Explore school life
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
