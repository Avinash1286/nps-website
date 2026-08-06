"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Administration route error", error);
  }, [error]);
  return (
    <section className="rounded-2xl border border-red-200 bg-white p-7 shadow-sm">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-700">
        <AlertTriangle size={21} />
      </span>
      <h1 className="mt-5 text-2xl font-black text-slate-900">This administration view could not load</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        No success was recorded. Check your access, Convex deployment status, and network connection, then try
        again.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs break-all text-slate-400">Reference {error.digest}</p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0758aa] px-4 py-2.5 text-sm font-bold text-white"
        >
          <RefreshCcw size={16} /> Try again
        </button>
        <Link
          href="/admin"
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700"
        >
          Return to dashboard
        </Link>
      </div>
    </section>
  );
}
