"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { AlertTriangle, Clock3, Database, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { hasAdminAccess, type AdminRole } from "@/lib/admin/authorization";
import { usersApi } from "./convex-api";

export const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("replace"),
);
export const convexConfigured = Boolean(
  process.env.NEXT_PUBLIC_CONVEX_URL && !process.env.NEXT_PUBLIC_CONVEX_URL.includes("your-deployment"),
);

export function AdminFeatureGate({
  children,
  allowPending = false,
  requiredRoles = [],
}: {
  children: ReactNode;
  allowPending?: boolean;
  requiredRoles?: readonly AdminRole[];
}) {
  if (!clerkConfigured || !convexConfigured) return <AdminSetupState />;
  return (
    <AuthenticatedGate allowPending={allowPending} requiredRoles={requiredRoles}>
      {children}
    </AuthenticatedGate>
  );
}

function AuthenticatedGate({
  children,
  allowPending,
  requiredRoles,
}: {
  children: ReactNode;
  allowPending: boolean;
  requiredRoles: readonly AdminRole[];
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const user = useQuery(usersApi.current, isLoaded && isSignedIn ? {} : "skip");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncTimedOut, setSyncTimedOut] = useState(false);

  useEffect(() => {
    const handleSyncError = (event: Event) => {
      setSyncError((event as CustomEvent<string>).detail);
    };
    window.addEventListener("nps:admin-sync-error", handleSyncError);
    return () => window.removeEventListener("nps:admin-sync-error", handleSyncError);
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || user !== null) {
      const frame = window.requestAnimationFrame(() => setSyncTimedOut(false));
      return () => window.cancelAnimationFrame(frame);
    }
    const timer = window.setTimeout(() => setSyncTimedOut(true), 8_000);
    return () => window.clearTimeout(timer);
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded) {
    return (
      <div className="grid min-h-52 place-items-center rounded-2xl border border-slate-200 bg-white">
        <LoaderCircle className="animate-spin text-sky-700" aria-label="Checking administrator access" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <LockKeyhole />
        <h2 className="mt-4 text-lg font-extrabold">Sign in required</h2>
        <p className="mt-2 text-sm leading-6">
          Your session is missing or expired. No data has been changed.
        </p>
        <Link
          href="/sign-in"
          className="mt-5 inline-flex rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-bold text-white"
        >
          Go to staff sign in
        </Link>
      </div>
    );
  }

  if (user === null && (syncError || syncTimedOut)) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-950">
        <AlertTriangle />
        <h2 className="mt-4 text-lg font-extrabold">Staff profile synchronization failed</h2>
        <p className="mt-2 text-sm leading-6 [overflow-wrap:anywhere]">
          {syncError ??
            "The staff profile did not become available. Confirm that the Clerk JWT includes an email claim, then retry."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 inline-flex rounded-xl bg-red-900 px-4 py-2.5 text-sm font-bold text-white"
        >
          Retry synchronization
        </button>
      </div>
    );
  }

  if (user === undefined || user === null) {
    return (
      <div className="grid min-h-52 place-items-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <LoaderCircle className="mx-auto animate-spin text-sky-700" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-slate-600">Preparing your staff profile…</p>
        </div>
      </div>
    );
  }

  if (user.status === "suspended" || (!allowPending && user.status !== "active")) {
    const pending = user.status === "pending";
    return pending ? <AdminApprovalPendingState /> : <AdminAccessDisabledState />;
  }

  const userRoles = Array.isArray(user.roles) ? user.roles.map(String) : [];

  if (!allowPending && userRoles.length === 0) {
    return <AdminApprovalPendingState />;
  }

  if (requiredRoles.length > 0 && !hasAdminAccess(userRoles, requiredRoles)) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <LockKeyhole aria-hidden="true" />
        <h2 className="mt-4 text-lg font-extrabold">Additional access required</h2>
        <p className="mt-2 text-sm leading-6">
          Your staff account does not have permission to open this administration area.
        </p>
      </div>
    );
  }

  return children;
}

function AdminBootstrapAvailableState() {
  return (
    <section
      aria-labelledby="bootstrap-available-title"
      className="mx-auto max-w-2xl rounded-3xl border border-sky-200 bg-white p-6 shadow-sm sm:p-9"
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-800">
        <ShieldCheck size={24} aria-hidden="true" />
      </span>
      <p className="mt-6 text-xs font-extrabold tracking-[.18em] text-sky-700 uppercase">
        One-time deployment step
      </p>
      <h1
        id="bootstrap-available-title"
        className="mt-3 text-2xl leading-tight font-black tracking-tight text-slate-950 sm:text-3xl"
      >
        This account can activate the first administrator
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
        This deployment has no administrator yet, and your signed-in account matches the Clerk user ID it
        allowlists for the one-time activation. Continue to claim the administrator role.
      </p>
      <Link
        href="/admin/bootstrap"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2e3192] px-5 py-3 text-sm font-bold text-white"
      >
        Activate the first administrator
      </Link>
    </section>
  );
}

export function AdminApprovalPendingState() {
  // On a fresh deployment the designated first administrator lands here with no
  // admin available to approve them, so surface the one-time activation route
  // whenever this exact account is the one the deployment allowlists.
  const eligibility = useQuery(usersApi.bootstrapEligibility, {});
  if (eligibility?.status === "eligible") return <AdminBootstrapAvailableState />;
  return (
    <section
      role="status"
      aria-labelledby="approval-pending-title"
      className="mx-auto max-w-2xl rounded-3xl border border-sky-200 bg-white p-6 shadow-sm sm:p-9"
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-800">
        <Clock3 size={24} aria-hidden="true" />
      </span>
      <p className="mt-6 text-xs font-extrabold tracking-[.18em] text-sky-700 uppercase">Account received</p>
      <h1
        id="approval-pending-title"
        className="mt-3 text-2xl leading-tight font-black tracking-tight text-slate-950 sm:text-3xl"
      >
        Administration access is awaiting approval
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
        Your sign-in was successful, but this account has not yet been approved for an administration role.
        Please wait for an administrator to review your account, or contact the school administrator if you
        need access urgently.
      </p>
      <p className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-sm leading-6 font-semibold text-sky-950">
        You can leave this page safely. Approved access will be available the next time you open the
        administration console.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2e3192] px-5 py-3 text-sm font-bold text-white"
        >
          Return to website
        </Link>
        <Link
          href="/contact"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50"
        >
          Contact the school
        </Link>
      </div>
    </section>
  );
}

function AdminAccessDisabledState() {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
      <LockKeyhole aria-hidden="true" />
      <h2 className="mt-4 text-lg font-extrabold">Administration access is unavailable</h2>
      <p className="mt-2 text-sm leading-6">
        This staff account is not active. Contact the school administrator if you believe this is an error.
      </p>
      <Link
        href="/contact"
        className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-bold text-white"
      >
        Contact the school
      </Link>
    </section>
  );
}

export function AdminSetupState() {
  const missing = [
    !clerkConfigured && "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    !convexConfigured && "NEXT_PUBLIC_CONVEX_URL",
  ].filter(Boolean) as string[];

  return (
    <section
      role="status"
      className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100">
          <AlertTriangle size={22} />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold">Administration setup is incomplete</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6">
            This screen is intentionally read-only. Configure Clerk authentication and the Convex deployment
            before staff can view or change operational data.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {missing.map((key) => (
              <code
                key={key}
                className="max-w-full rounded-lg border border-amber-200 bg-white/70 px-2.5 py-1.5 text-xs font-bold break-all"
              >
                {key}
              </code>
            ))}
          </div>
          <p className="mt-4 flex min-w-0 items-start gap-2 text-xs leading-5 font-semibold text-amber-800">
            <Database className="mt-0.5 shrink-0" size={15} /> Server-side Clerk, Convex deployment, and
            Gemini variables are documented in the environment template.
          </p>
        </div>
      </div>
    </section>
  );
}
