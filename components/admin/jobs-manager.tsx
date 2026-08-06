"use client";

import { useMutation, usePaginatedQuery } from "convex/react";
import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { ADMIN_ACCESS_ROLES } from "@/lib/admin/authorization";
import { AdminFeatureGate } from "./admin-gate";
import { adminApi, type AdminRecord } from "./convex-api";
import { formatDate } from "./content-manager";
import { EmptyState, Feedback, LoadingPanel, PaginationControls, primaryButtonClass } from "./ui";

const statuses = ["queued", "running", "retry", "succeeded", "dead", "cancelled"];
const jobTypes = [
  "contact_receipt",
  "contact_staff_alert",
  "admission_receipt",
  "admission_staff_alert",
  "newsletter_confirmation",
  "newsletter_campaign_batch",
  "newsletter_campaign_delivery",
  "event_confirmation",
  "content_publish",
  "content_expire",
  "ai_response",
  "retention_cleanup",
];

export function JobsManager() {
  return (
    <AdminFeatureGate requiredRoles={ADMIN_ACCESS_ROLES.adminOnly}>
      <JobsData />
    </AdminFeatureGate>
  );
}

function JobsData() {
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const {
    results,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    adminApi.listJobs,
    {
      ...(status === "all" ? {} : { status }),
      ...(type === "all" ? {} : { type }),
    },
    { initialNumItems: 50 },
  );
  const retry = useMutation(adminApi.retryJob);
  if (paginationStatus === "LoadingFirstPage") return <LoadingPanel label="Loading background jobs" />;
  async function retryJob(item: AdminRecord) {
    setBusy(item._id);
    setFeedback(null);
    try {
      await retry({ jobId: item._id });
      setFeedback({
        kind: "success",
        text: "The job was re-queued. Its next attempt will run through the Convex scheduler.",
      });
    } catch (caught) {
      setFeedback({ kind: "error", text: errorMessage(caught) });
    } finally {
      setBusy(null);
    }
  }
  return (
    <section>
      {feedback && (
        <div className="mb-5">
          <Feedback kind={feedback.kind}>{feedback.text}</Feedback>
        </div>
      )}
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
        <label className="flex-1 text-xs font-bold text-slate-600">
          Job type
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none"
          >
            <option value="all">All job types</option>
            {jobTypes.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 text-xs font-bold text-slate-600">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none"
          >
            <option value="all">All statuses</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {results.length === 0 ? (
        <EmptyState
          title="No background jobs found"
          description="There are no delivery or automation jobs matching the selected filters."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(0,1.2fr)_120px_100px_150px_118px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-extrabold tracking-[.14em] text-slate-500 uppercase xl:grid">
            <span>Job</span>
            <span>Status</span>
            <span>Attempts</span>
            <span>Scheduled</span>
            <span className="text-right">Action</span>
          </div>
          {results.map((item) => (
            <JobRow key={item._id} item={item} busy={busy === item._id} retry={() => void retryJob(item)} />
          ))}
        </div>
      )}
      <PaginationControls
        status={paginationStatus}
        loadedCount={results.length}
        noun="background jobs"
        onLoadMore={() => loadMore(50)}
      />
    </section>
  );
}

function JobRow({ item, busy, retry }: { item: AdminRecord; busy: boolean; retry: () => void }) {
  const status = String(item.status ?? "queued");
  const retryable = status === "dead";
  return (
    <article className="grid gap-3 border-b border-slate-100 p-4 last:border-0 sm:p-5 xl:grid-cols-[minmax(0,1.2fr)_120px_100px_150px_118px] xl:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold">{humanize(String(item.type ?? "background job"))}</p>
        <p
          className={`mt-1 text-xs [overflow-wrap:anywhere] break-words xl:truncate ${item.lastError ? "text-red-700" : "text-slate-500"}`}
        >
          {String(item.lastError ?? item.resultSummary ?? item.idempotencyKey ?? item._id)}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 xl:block">
        <span className="text-[10px] font-extrabold tracking-[.14em] text-slate-400 uppercase xl:hidden">
          Status
        </span>
        <JobStatus status={status} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-extrabold tracking-[.14em] text-slate-400 uppercase xl:hidden">
          Attempts
        </span>
        <p className="text-xs font-bold text-slate-600">
          {String(item.attempts ?? 0)} / {String(item.maxAttempts ?? "—")}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-extrabold tracking-[.14em] text-slate-400 uppercase xl:hidden">
          Scheduled
        </span>
        <time className="text-right text-xs text-slate-500 xl:text-left">
          {typeof item.runAt === "number" ? formatDate(item.runAt) : "—"}
        </time>
      </div>
      <div className="flex justify-stretch xl:justify-end">
        {retryable ? (
          <button onClick={retry} disabled={busy} className={`${primaryButtonClass} w-full xl:w-auto`}>
            {busy ? <LoaderCircle className="animate-spin" size={15} /> : <RefreshCcw size={15} />} Retry
          </button>
        ) : (
          <span className="text-xs font-semibold text-slate-400">No action</span>
        )}
      </div>
    </article>
  );
}
function JobStatus({ status }: { status: string }) {
  const Icon = status === "succeeded" ? CheckCircle2 : status === "dead" ? AlertTriangle : Clock3;
  const style =
    status === "succeeded"
      ? "bg-emerald-50 text-emerald-700"
      : status === "dead"
        ? "bg-red-50 text-red-700"
        : status === "running"
          ? "bg-sky-50 text-sky-700"
          : "bg-amber-50 text-amber-800";
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${style}`}
    >
      <Icon size={12} />
      {humanize(status)}
    </span>
  );
}
function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The job could not be retried. No success was recorded.";
}
