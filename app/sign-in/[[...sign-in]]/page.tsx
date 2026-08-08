import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { KeyRound, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Staff sign in | NPS Digital School",
  description: "Secure staff access to the Nepal Police School administration workspace.",
};

export default function SignInPage() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("replace") &&
    process.env.CLERK_SECRET_KEY &&
    !process.env.CLERK_SECRET_KEY.includes("replace"),
  );

  return (
    <main
      id="main-content"
      className="relative grid min-h-screen grid-cols-[minmax(0,1fr)] place-items-center overflow-hidden bg-[#12123a] px-4 py-8 text-[#12123a] sm:py-12"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(14,165,233,.2),transparent_34%),radial-gradient(circle_at_86%_86%,rgba(245,158,11,.14),transparent_30%)]"
      />
      <section className="relative w-full max-w-md min-w-0 justify-self-center rounded-2xl border border-white/15 bg-white p-5 shadow-2xl shadow-black/30 sm:rounded-[2rem] sm:p-9">
        <Link
          href="/"
          className="inline-flex items-center gap-3 rounded-xl focus:ring-4 focus:ring-sky-100 focus:outline-none"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#2e3192] text-xs font-black text-white">
            NPS
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold">Nepal Police School</span>
            <span className="text-xs text-slate-500">Digital School</span>
          </span>
        </Link>

        <div className="mt-8">
          <p className="flex items-center gap-2 text-xs font-extrabold tracking-[.18em] text-sky-700 uppercase">
            <ShieldCheck size={15} /> Protected workspace
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Staff sign in</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use your approved school account. Access and administrative changes are audited.
          </p>
        </div>

        {configured ? (
          <div className="mt-7 flex justify-center [&_.cl-card]:w-full [&_.cl-card]:border-0 [&_.cl-card]:p-0 [&_.cl-card]:shadow-none [&_.cl-footer]:bg-transparent [&_.cl-rootBox]:w-full">
            <SignIn routing="path" path="/sign-in" forceRedirectUrl="/admin" signUpUrl={undefined} />
          </div>
        ) : (
          <div
            role="status"
            className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950"
          >
            <div className="flex min-w-0 gap-3">
              <KeyRound className="mt-0.5 shrink-0" size={20} />
              <div className="min-w-0">
                <h2 className="font-extrabold">Authentication setup required</h2>
                <p className="mt-2 text-sm leading-6">
                  Add <code className="font-bold break-all">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{" "}
                  <code className="font-bold break-all">CLERK_SECRET_KEY</code> to the deployment environment,
                  then restart the app.
                </p>
                <p className="mt-2 text-xs leading-5 text-amber-800">
                  The administrator area stays read-only and does not claim that a sign-in succeeded while
                  Clerk is unavailable.
                </p>
              </div>
            </div>
          </div>
        )}

        <Link href="/" className="mt-7 inline-flex text-sm font-bold text-sky-700 hover:text-sky-900">
          ← Return to the website
        </Link>
      </section>
    </main>
  );
}
