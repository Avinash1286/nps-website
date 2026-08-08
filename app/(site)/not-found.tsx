import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-extrabold tracking-[.22em] text-[#2e3192] uppercase">
          404 · Page not found
        </p>
        <h1 className="mt-5 text-4xl font-extrabold tracking-[-.04em] text-[#1e1f5c] sm:text-5xl">
          The page you requested is unavailable.
        </h1>
        <p className="mt-5 text-base leading-7 text-slate-600">
          It may have moved, expired, or not yet been published. Use website search or return to the main
          page.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[#2e3192] px-5 py-3 text-sm font-bold text-white"
          >
            <ArrowLeft size={16} />
            Return home
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-[#2f3169]"
          >
            <Search size={16} />
            Search website
          </Link>
        </div>
      </div>
    </section>
  );
}
