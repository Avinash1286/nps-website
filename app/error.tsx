"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main-content" className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div className="max-w-lg rounded-3xl border border-sky-100 bg-white p-8 shadow-lg">
        <p className="text-sm font-extrabold tracking-[0.18em] text-red-700 uppercase">
          Something went wrong
        </p>
        <h1 className="mt-3 text-3xl font-extrabold text-[#061f4e]">We could not load this page.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Try again. If the problem continues, contact the school office through the contact page.
        </p>
        <button
          className="mt-7 rounded-xl bg-[#0b5fc4] px-5 py-3 text-sm font-bold text-white"
          onClick={reset}
        >
          Try again
        </button>
      </div>
    </main>
  );
}
