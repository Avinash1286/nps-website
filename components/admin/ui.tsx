import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

export const inputClass =
  "mt-2 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";
export const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2e3192] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#2e3192] focus:outline-none focus:ring-4 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800 focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-50";

export function Feedback({
  kind = "error",
  children,
}: {
  kind?: "error" | "success" | "info";
  children: ReactNode;
}) {
  const styles =
    kind === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : kind === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-sky-200 bg-sky-50 text-sky-900";
  const Icon = kind === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${styles}`}
    >
      <Icon className="mt-0.5 shrink-0" size={17} />
      <span className="min-w-0 [overflow-wrap:anywhere] break-words">{children}</span>
    </div>
  );
}

export function LoadingPanel({ label = "Loading data" }: { label?: string }) {
  return (
    <div className="grid min-h-52 place-items-center rounded-2xl border border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3 text-center text-sm font-semibold text-slate-500">
        <LoaderCircle className="animate-spin text-sky-700" size={20} />
        {label}
      </div>
    </div>
  );
}

export type PaginationStatus = "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";

export function PaginationControls({
  status,
  loadedCount,
  noun = "records",
  onLoadMore,
}: {
  status: PaginationStatus;
  loadedCount: number;
  noun?: string;
  onLoadMore: () => void;
}) {
  if (status === "LoadingFirstPage") return null;
  const loading = status === "LoadingMore";
  const exhausted = status === "Exhausted";
  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row">
      <p className="text-center text-xs text-slate-500 sm:text-left" role="status" aria-live="polite">
        {loading
          ? `Loading more ${noun}; ${loadedCount} currently loaded.`
          : exhausted
            ? `All ${loadedCount} ${noun} loaded.`
            : `${loadedCount} ${noun} loaded. More are available.`}
      </p>
      {!exhausted && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loading}
          className={`${secondaryButtonClass} w-full sm:w-auto`}
          aria-label={`Load more ${noun}`}
        >
          {loading && <LoaderCircle className="animate-spin" size={15} aria-hidden="true" />}
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center sm:px-6 sm:py-14">
      <h2 className="font-extrabold text-slate-800">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
