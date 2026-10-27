import Link from "next/link";
import { Clock3 } from "lucide-react";

export function FormUnavailable({
  title,
  description,
  phone,
  email,
}: {
  title: string;
  description: string;
  phone?: string;
  email?: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,47,78,.08)] sm:p-8">
      <Clock3 aria-hidden="true" size={28} className="text-[#2e3192]" />
      <h2 className="mt-5 text-2xl font-extrabold text-[#1e1f5c]">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {phone && (
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="rounded-xl bg-[#2e3192] px-4 py-3 text-sm font-bold text-white"
          >
            Call the school: {phone}
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-[#262873]"
          >
            Email the school
          </a>
        )}
        {!phone && !email && (
          <Link href="/contact" className="rounded-xl bg-[#2e3192] px-4 py-3 text-sm font-bold text-white">
            Contact the school
          </Link>
        )}
        <Link
          href="/notices"
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-[#262873]"
        >
          View notices
        </Link>
      </div>
    </section>
  );
}
