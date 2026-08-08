import type { Metadata } from "next";
import { TokenAction } from "@/components/forms/token-action";

export const metadata: Metadata = { title: "Confirm subscription", robots: { index: false, follow: false } };

export default async function ConfirmSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <LifecyclePage
      title="Confirm your school updates subscription"
      description="Confirm that you want to receive published school news and notices by email."
    >
      <TokenAction
        endpoint="/api/subscriptions/confirm"
        token={token}
        buttonLabel="Confirm subscription"
        successMessage="Your subscription is confirmed."
      />
    </LifecyclePage>
  );
}

function LifecyclePage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-slate-50 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <p className="text-xs font-extrabold tracking-[.18em] text-sky-700 uppercase">Email preferences</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-[#1e1f5c]">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-7">{children}</div>
      </div>
    </section>
  );
}
