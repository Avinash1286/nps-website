import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
export const metadata: Metadata = { title: "Enquiry submitted", robots: { index: false, follow: false } };
export default function SubmittedPage() {
  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_20px_60px_rgba(15,47,78,.08)] sm:p-12">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={30} />
        </span>
        <h1 className="mt-6 text-3xl font-extrabold tracking-[-.03em] text-[#1e1f5c]">
          Your enquiry has been submitted
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Keep any reference shown in your confirmation. Submitting an enquiry does not confirm admission; the
          school will provide next steps separately.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/admissions" className="rounded-xl bg-[#2e3192] px-5 py-3 text-sm font-bold text-white">
            Back to admissions
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-[#2f3169]"
          >
            Return home
          </Link>
        </div>
      </div>
    </section>
  );
}
