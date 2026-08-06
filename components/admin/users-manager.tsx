"use client";

import { useMutation, usePaginatedQuery } from "convex/react";
import { LoaderCircle, Pencil, Shield, UserCheck, UserX, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ADMIN_ACCESS_ROLES } from "@/lib/admin/authorization";
import { AdminFeatureGate } from "./admin-gate";
import { adminApi, type AdminRecord } from "./convex-api";
import { formatDate } from "./content-manager";
import {
  EmptyState,
  Feedback,
  LoadingPanel,
  PaginationControls,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./ui";
import { useModalAccessibility } from "./use-modal-accessibility";

const roles = ["admin", "publisher", "editor", "admissions"] as const;
const statuses = ["active", "pending", "suspended"] as const;

export function UsersManager() {
  return (
    <AdminFeatureGate requiredRoles={ADMIN_ACCESS_ROLES.adminOnly}>
      <UsersData />
    </AdminFeatureGate>
  );
}

function UsersData() {
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<AdminRecord | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const {
    results,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    adminApi.listUsers,
    { ...(filter === "all" ? {} : { status: filter }) },
    { initialNumItems: 50 },
  );
  if (paginationStatus === "LoadingFirstPage") return <LoadingPanel label="Loading staff accounts" />;
  return (
    <section>
      {feedback && (
        <div className="mb-5">
          <Feedback kind={feedback.kind}>{feedback.text}</Feedback>
        </div>
      )}
      <div className="mb-5 flex justify-end">
        <label className="flex w-full flex-col gap-2 text-xs font-bold text-slate-600 sm:w-auto sm:flex-row sm:items-center">
          Account status
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none sm:w-auto"
          >
            <option value="all">All accounts</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {capitalize(value)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {results.length === 0 ? (
        <EmptyState
          title="No staff accounts found"
          description="Staff appear after signing in through Clerk and synchronizing with Convex. Roles must then be granted by an administrator."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_130px_170px_48px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-extrabold tracking-[.14em] text-slate-500 uppercase xl:grid">
            <span>Staff member</span>
            <span>Roles</span>
            <span>Status</span>
            <span>Last sign in</span>
            <span />
          </div>
          {results.map((user) => (
            <article
              key={user._id}
              className="grid gap-3 border-b border-slate-100 p-4 last:border-0 sm:p-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_130px_170px_48px] xl:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">
                  {String(user.name ?? "Unnamed staff member")}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">{String(user.email ?? "No email")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[10px] font-extrabold tracking-[.14em] text-slate-400 uppercase xl:hidden">
                  Roles
                </span>
                {Array.isArray(user.roles) && user.roles.length ? (
                  user.roles.map((role) => (
                    <span
                      key={String(role)}
                      className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-extrabold tracking-wide text-sky-800 uppercase"
                    >
                      {String(role)}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-amber-700">No roles</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 xl:block">
                <span className="text-[10px] font-extrabold tracking-[.14em] text-slate-400 uppercase xl:hidden">
                  Status
                </span>
                <AccountStatus value={String(user.status ?? "pending")} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-extrabold tracking-[.14em] text-slate-400 uppercase xl:hidden">
                  Last sign in
                </span>
                <time className="text-right text-xs text-slate-500 xl:text-left">
                  {typeof user.lastLoginAt === "number" ? formatDate(user.lastLoginAt) : "Never"}
                </time>
              </div>
              <button
                onClick={() => setEditing(user)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-sky-800 hover:bg-sky-50 xl:min-w-11 xl:border-0 xl:p-2.5"
                aria-label={`Edit ${String(user.name)}`}
              >
                <Pencil size={17} />
                <span className="xl:sr-only">Edit account</span>
              </button>
            </article>
          ))}
        </div>
      )}
      <PaginationControls
        status={paginationStatus}
        loadedCount={results.length}
        noun="staff accounts"
        onLoadMore={() => loadMore(50)}
      />
      {editing && <UserEditor user={editing} onClose={() => setEditing(null)} onFeedback={setFeedback} />}
    </section>
  );
}

function UserEditor({
  user,
  onClose,
  onFeedback,
}: {
  user: AdminRecord;
  onClose: () => void;
  onFeedback: (feedback: { kind: "error" | "success"; text: string }) => void;
}) {
  const initialRoles = Array.isArray(user.roles)
    ? user.roles
        .map(String)
        .filter((role): role is (typeof roles)[number] => roles.includes(role as (typeof roles)[number]))
    : [];
  const [selectedRoles, setSelectedRoles] = useState<string[]>(initialRoles);
  const [status, setStatus] = useState(String(user.status ?? "pending"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = useMutation(adminApi.updateUser);
  const { dialogRef, onDialogKeyDown } = useModalAccessibility<HTMLFormElement>(true, onClose);
  function toggle(role: string) {
    setSelectedRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    );
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (selectedRoles.length === 0 && status === "active") {
      setError("Active staff must have at least one role.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await update({ userId: user._id, roles: selectedRoles, status });
      onFeedback({
        kind: "success",
        text: `${String(user.name ?? "Staff account")} access updated and audited.`,
      });
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Access could not be updated. No success was recorded.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center">
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="access-editor-title"
        tabIndex={-1}
        onKeyDown={onDialogKeyDown}
        onSubmit={save}
        className="my-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="flex justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold tracking-[.17em] text-sky-700 uppercase">
              Access control
            </p>
            <h2 id="access-editor-title" className="mt-2 text-2xl font-black">
              Edit staff access
            </h2>
            <p className="mt-1 text-sm break-all text-slate-500">{String(user.email ?? "")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 hover:bg-slate-100"
            aria-label="Close access editor"
          >
            <X />
          </button>
        </div>
        {error && (
          <div className="mt-5">
            <Feedback>{error}</Feedback>
          </div>
        )}
        <fieldset className="mt-6">
          <legend className="text-sm font-extrabold">Roles</legend>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Grant the minimum access needed for this staff member’s duties.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {roles.map((role) => (
              <label
                key={role}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold capitalize"
              >
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role)}
                  onChange={() => toggle(role)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-700"
                />
                <Shield size={15} className="text-slate-400" />
                {role}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="mt-5 block text-sm font-bold">
          Account status
          <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {capitalize(value)}
              </option>
            ))}
          </select>
        </label>
        {status === "suspended" && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            <UserX className="mt-0.5 shrink-0" size={15} />
            Suspension blocks this account at the Convex authorization layer. Manage the Clerk account
            separately if sign-in must also be revoked.
          </p>
        )}
        <div className="mt-7 flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <button type="button" onClick={onClose} className={`${secondaryButtonClass} w-full sm:w-auto`}>
            Cancel
          </button>
          <button disabled={busy} className={`${primaryButtonClass} w-full sm:w-auto`}>
            {busy ? <LoaderCircle className="animate-spin" size={16} /> : <UserCheck size={16} />}
            {busy ? "Saving…" : "Save access"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AccountStatus({ value }: { value: string }) {
  const style =
    value === "active"
      ? "bg-emerald-50 text-emerald-700"
      : value === "suspended"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-800";
  return (
    <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-extrabold capitalize ${style}`}>
      {value}
    </span>
  );
}
function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
