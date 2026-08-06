"use client";

import { useMutation, useQuery } from "convex/react";
import { LoaderCircle, ShieldCheck, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminApprovalPendingState, AdminFeatureGate } from "./admin-gate";
import { usersApi } from "./convex-api";
import { Feedback } from "./ui";

export function BootstrapAdmin() {
  return (
    <AdminFeatureGate allowPending>
      <BootstrapRoute />
    </AdminFeatureGate>
  );
}

function BootstrapRoute() {
  const router = useRouter();
  const eligibility = useQuery(usersApi.bootstrapEligibility, {});

  useEffect(() => {
    if (eligibility?.status === "approved") router.replace("/admin");
  }, [eligibility?.status, router]);

  if (eligibility === undefined || eligibility.status === "approved") {
    return (
      <div
        role="status"
        className="grid min-h-52 place-items-center rounded-2xl border border-slate-200 bg-white"
      >
        <div className="text-center">
          <LoaderCircle className="mx-auto animate-spin text-sky-700" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-slate-600">Checking administration access…</p>
        </div>
      </div>
    );
  }

  if (eligibility.status === "approval_required") return <AdminApprovalPendingState />;
  return <BootstrapForm />;
}

function BootstrapForm() {
  const router = useRouter();
  const syncCurrent = useMutation(usersApi.syncCurrent);
  const bootstrap = useMutation(usersApi.bootstrapFirstAdmin);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function activate() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await syncCurrent({});
      await bootstrap({});
      router.replace("/admin");
      router.refresh();
    } catch {
      setError(
        "Administrator activation could not be completed. Refresh this page or contact the deployment administrator.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-800">
        <ShieldCheck size={24} />
      </span>
      <p className="mt-6 text-xs font-extrabold tracking-[.18em] text-sky-700 uppercase">
        One-time deployment step
      </p>
      <h1 className="mt-3 text-[1.75rem] leading-tight font-black tracking-tight break-words text-slate-950 sm:text-3xl">
        Activate the first administrator
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Activation succeeds only when this signed-in account exactly matches the Clerk user ID designated for
        this Convex deployment. No bootstrap credential is entered in or sent by the browser.
      </p>
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
        <UserCheck className="mt-0.5 shrink-0" size={19} aria-hidden="true" />
        <p>
          An operator must set <code className="font-bold break-all">INITIAL_ADMIN_CLERK_USER_ID</code> to
          this account&apos;s immutable Clerk user ID before activation, then remove it after success.
        </p>
      </div>
      <div className="mt-7 space-y-5">
        {error && <Feedback kind="error">{error}</Feedback>}
        <button
          type="button"
          onClick={activate}
          disabled={busy}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0756a5] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {busy && <LoaderCircle size={16} className="animate-spin" />}
          {busy ? "Activating…" : "Activate administrator"}
        </button>
      </div>
    </section>
  );
}
