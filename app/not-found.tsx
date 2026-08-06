import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="grid min-h-screen place-items-center bg-[#f5faff] px-6 text-center">
      <div className="max-w-lg">
        <p className="text-sm font-extrabold tracking-[0.22em] text-sky-700 uppercase">404</p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#061f4e]">
          This page could not be found.
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          The address may have changed, or the content may no longer be published.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link className="rounded-xl bg-[#0b5fc4] px-5 py-3 text-sm font-bold text-white" href="/">
            Return home
          </Link>
          <Link
            className="rounded-xl border border-sky-200 bg-white px-5 py-3 text-sm font-bold text-sky-800"
            href="/search"
          >
            Search the site
          </Link>
        </div>
      </div>
    </main>
  );
}
