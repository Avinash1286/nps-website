import type { Metadata } from "next";
import { TokenAction } from "@/components/forms/token-action";

export const metadata: Metadata = {
  title: "Cancel event registration",
  robots: { index: false, follow: false },
};

export default async function CancelEventPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <section className="bg-slate-50 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <p className="text-xs font-extrabold tracking-[.18em] text-sky-700 uppercase">Event registration</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-[#092f59]">
          Cancel this event registration
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Confirm the cancellation so the school can update attendance and release any reserved capacity.
        </p>
        <div className="mt-7">
          <TokenAction
            endpoint="/api/events/cancel"
            token={token}
            buttonLabel="Cancel registration"
            successMessage="The event registration has been cancelled."
          />
        </div>
      </div>
    </section>
  );
}
