import type { Metadata } from "next";
import { TokenAction } from "@/components/forms/token-action";

export const metadata: Metadata = {
  title: "Unsubscribe from updates",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <section className="bg-slate-50 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <p className="text-xs font-extrabold tracking-[.18em] text-sky-700 uppercase">Email preferences</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-[#1e1f5c]">Stop school update emails</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Confirm below to unsubscribe this address. Essential replies to enquiries you initiate are handled
          separately.
        </p>
        <div className="mt-7">
          <TokenAction
            endpoint="/api/subscriptions/unsubscribe"
            token={token}
            buttonLabel="Unsubscribe"
            successMessage="You have been unsubscribed from school update emails."
          />
        </div>
      </div>
    </section>
  );
}
