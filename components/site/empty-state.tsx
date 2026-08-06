import Link from "next/link";
import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sky-50 text-[#0a65a8]">
        <Inbox size={22} />
      </span>
      <h2 className="mt-4 text-xl font-extrabold text-[#092f59]">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-6 inline-flex rounded-xl bg-[#0a65a8] px-4 py-2.5 text-sm font-bold text-white"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
