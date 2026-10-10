import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, ShieldCheck } from "lucide-react";
import { AdmissionsForm } from "@/components/forms/admissions-form";
import { PageHero } from "@/components/site/page-hero";
import { getSiteProfile } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Admission enquiry",
  description: "Send a secure preliminary admission enquiry to Nepal Police School, Garuda.",
  alternates: { canonical: "/admissions/apply" },
};

export default async function ApplyPage() {
  const site = await getSiteProfile();
  return (
    <>
      <PageHero
        eyebrow="Admissions"
        title="Start an admission enquiry"
        description="Share preliminary information securely so the school can respond with the relevant current guidance."
        image="/media/nps-hero-gate.png"
        crumbs={[{ label: "Admissions", href: "/admissions" }, { label: "Admission enquiry" }]}
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.65fr_1.35fr]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <ShieldCheck size={28} className="text-[#2e3192]" />
            <h2 className="mt-5 text-2xl font-extrabold text-[#1e1f5c]">Before you submit</h2>
            <ul className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
              <li>Check the current admissions notice for active dates and requirements.</li>
              <li>Use accurate student and guardian information.</li>
              <li>Do not include identity documents, passwords, card details, or one-time codes.</li>
              <li>Submission is an enquiry, not an admission decision or seat reservation.</li>
            </ul>
            <p className="mt-6 rounded-xl bg-sky-50 p-4 text-xs leading-5 text-[#262873]">
              Your information is used to process this enquiry and handled according to the website privacy
              notice.
            </p>
          </aside>
          {site.admissionsOpen ? (
            <AdmissionsForm academicYear={site.academicYear} />
          ) : (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-7 text-amber-950 sm:p-10">
              <Clock3 size={28} />
              <h2 className="mt-5 text-2xl font-extrabold">
                Online admission enquiries are currently closed
              </h2>
              <p className="mt-3 text-sm leading-7">
                Review the latest admissions notice for confirmed dates and requirements. The school will
                enable this form when the active enquiry window opens.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/notices"
                  className="rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-bold text-white"
                >
                  View notices
                </Link>
                <Link
                  href="/contact"
                  className="rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-bold"
                >
                  Contact the school
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
