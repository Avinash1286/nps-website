"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import {
  ChevronRight,
  ClipboardCheck,
  Filter,
  LoaderCircle,
  Mail,
  Phone,
  Search,
  UserRoundCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { ADMIN_ACCESS_ROLES, submissionRequiredRoles } from "@/lib/admin/authorization";
import { AdminFeatureGate } from "./admin-gate";
import { adminApi, type AdminRecord, type SubmissionType } from "./convex-api";
import { formatDate } from "./content-manager";
import {
  EmptyState,
  Feedback,
  LoadingPanel,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./ui";
import { useModalAccessibility } from "./use-modal-accessibility";

const admissionStatuses = [
  "submitted",
  "screening",
  "documents_requested",
  "interview",
  "offered",
  "waitlisted",
  "enrolled",
  "declined",
  "withdrawn",
] as const;
const contactStatuses = ["new", "in_review", "waiting", "resolved", "closed", "spam"] as const;
const registrationStatuses = ["registered", "waitlisted", "cancelled", "attended", "no_show"] as const;

export function SubmissionManager({ type }: { type: SubmissionType }) {
  return (
    <AdminFeatureGate requiredRoles={submissionRequiredRoles(type)}>
      <SubmissionData type={type} />
    </AdminFeatureGate>
  );
}
export function AdmissionDetail({ id }: { id: string }) {
  return (
    <AdminFeatureGate requiredRoles={ADMIN_ACCESS_ROLES.admissions}>
      <AdmissionDetailData id={id} />
    </AdminFeatureGate>
  );
}

function SubmissionData({ type }: { type: SubmissionType }) {
  const statuses =
    type === "admissions"
      ? admissionStatuses
      : type === "eventRegistrations"
        ? registrationStatuses
        : contactStatuses;
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminRecord | null>(null);
  const {
    results,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    adminApi.listSubmissions,
    { type, ...(status === "all" ? {} : { status }) },
    { initialNumItems: 50 },
  );
  const records = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return results;
    return results.filter((item) => searchableText(item).includes(term));
  }, [results, search]);

  if (paginationStatus === "LoadingFirstPage") return <LoadingPanel label={`Loading ${type}`} />;
  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search {type}</span>
          <Search className="absolute top-3.5 left-3.5 text-slate-400" size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-slate-200 py-3 pr-3 pl-10 text-sm outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100"
            placeholder={submissionSearchPlaceholder(type)}
          />
        </label>
        <label className="relative">
          <span className="sr-only">Filter by status</span>
          <Filter className="pointer-events-none absolute top-3.5 left-3 text-slate-400" size={16} />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-8 pl-9 text-sm font-semibold outline-none sm:w-52"
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
      {records.length === 0 ? (
        <EmptyState
          title={`No ${type} found`}
          description="No records match this search and workflow status. New verified submissions will appear here automatically."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_140px_150px_42px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-extrabold tracking-[.14em] text-slate-500 uppercase xl:grid">
            <span>
              {type === "admissions" ? "Applicant" : type === "eventRegistrations" ? "Registrant" : "Sender"}
            </span>
            <span>
              {type === "admissions"
                ? "Application"
                : type === "eventRegistrations"
                  ? "Registration"
                  : "Enquiry"}
            </span>
            <span>Status</span>
            <span>Received</span>
            <span />
          </div>
          {records.map((item) => (
            <SubmissionRow key={item._id} item={item} type={type} onOpen={() => setSelected(item)} />
          ))}
        </div>
      )}
      {(paginationStatus === "CanLoadMore" || paginationStatus === "LoadingMore") && (
        <div className="mt-4 text-center">
          <button
            type="button"
            disabled={paginationStatus === "LoadingMore"}
            onClick={() => loadMore(50)}
            className={secondaryButtonClass}
          >
            {paginationStatus === "LoadingMore" ? "Loading more…" : "Load more records"}
          </button>
        </div>
      )}
      {type === "eventRegistrations" && records.length > 0 && paginationStatus === "Exhausted" && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => exportRegistrationCsv(records)}
            className={secondaryButtonClass}
          >
            Export filtered roster (CSV)
          </button>
        </div>
      )}
      {selected && (
        <SubmissionEditor type={type} item={selected} statuses={statuses} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}

function SubmissionRow({
  item,
  type,
  onOpen,
}: {
  item: AdminRecord;
  type: SubmissionType;
  onOpen: () => void;
}) {
  const student = objectValue(item.student);
  const guardian = objectValue(item.guardian);
  const event = objectValue(item.event);
  const title =
    type === "admissions"
      ? [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ") ||
        "Unnamed applicant"
      : String(item.name ?? (type === "eventRegistrations" ? "Unnamed registrant" : "Unnamed sender"));
  const reference =
    type === "admissions"
      ? String(item.applicationNumber ?? "No application number")
      : type === "eventRegistrations"
        ? String(item.registrationNumber ?? "No registration number")
        : String(item.ticketNumber ?? "No ticket number");
  const detail =
    type === "admissions"
      ? `${String(item.desiredGrade ?? "Grade not set")} · ${String(guardian.name ?? "Guardian not set")}`
      : type === "eventRegistrations"
        ? `${String(item.attendees ?? 1)} attendee${Number(item.attendees ?? 1) === 1 ? "" : "s"} · ${String(event.title ?? item.eventTitle ?? "Event")}`
        : String(item.subject ?? "No subject");
  const received = Number(item.submittedAt ?? item.createdAt ?? item._creationTime ?? 0);
  return (
    <article className="grid gap-3 border-b border-slate-100 p-4 last:border-0 sm:p-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_140px_150px_42px] xl:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold text-slate-900">{title}</p>
        <p className="mt-1 truncate text-xs text-slate-500">
          {type === "admissions"
            ? String(guardian.email ?? "No guardian email")
            : String(item.email ?? "No email")}
        </p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-sky-800">{reference}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
      </div>
      <div className="flex items-center justify-between gap-3 xl:block">
        <span className="text-[10px] font-extrabold tracking-[.14em] text-slate-400 uppercase xl:hidden">
          Status
        </span>
        <WorkflowBadge value={String(item.status ?? "new")} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-extrabold tracking-[.14em] text-slate-400 uppercase xl:hidden">
          Received
        </span>
        <time className="text-right text-xs text-slate-500 xl:text-left">
          {received ? formatDate(received) : "—"}
        </time>
      </div>
      {type === "admissions" ? (
        <Link
          href={`/admin/admissions/${item._id}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-sky-800 hover:bg-sky-50 xl:min-w-11 xl:border-0 xl:p-2"
          aria-label={`Open ${reference}`}
        >
          <span className="xl:sr-only">Open application</span>
          <ChevronRight size={18} />
        </Link>
      ) : (
        <button
          onClick={onOpen}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-sky-800 hover:bg-sky-50 xl:min-w-11 xl:border-0 xl:p-2"
          aria-label={`Manage ${reference}`}
        >
          <span className="xl:sr-only">Manage record</span>
          <ChevronRight size={18} />
        </button>
      )}
    </article>
  );
}

function SubmissionEditor({
  type,
  item,
  statuses,
  onClose,
}: {
  type: SubmissionType;
  item: AdminRecord;
  statuses: readonly string[];
  onClose: () => void;
}) {
  const event = objectValue(item.event);
  const [status, setStatus] = useState(String(item.status ?? statuses[0]));
  const [assignedTo, setAssignedTo] = useState(String(item.assignedTo ?? ""));
  const [notes, setNotes] = useState(String(item.internalNotes ?? ""));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const users = useQuery(adminApi.listActiveAssignees, type === "eventRegistrations" ? "skip" : {});
  const update = useMutation(adminApi.updateSubmission);
  const { dialogRef, onDialogKeyDown } = useModalAccessibility<HTMLFormElement>(true, onClose);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      await update({
        type,
        id: item._id,
        status,
        ...(assignedTo ? { assignedTo } : {}),
        ...(notes.trim() ? { internalNotes: notes.trim() } : {}),
      });
      setFeedback({ kind: "success", text: "Workflow changes saved and added to the audit history." });
    } catch (caught) {
      setFeedback({ kind: "error", text: errorMessage(caught) });
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
        aria-labelledby="workflow-editor-title"
        tabIndex={-1}
        onKeyDown={onDialogKeyDown}
        onSubmit={submit}
        className="my-4 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-extrabold tracking-[.17em] text-sky-700 uppercase">Workflow</p>
            <h2 id="workflow-editor-title" className="mt-2 text-2xl font-black">
              Manage{" "}
              {type === "admissions"
                ? "application"
                : type === "eventRegistrations"
                  ? "registration"
                  : "enquiry"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 hover:bg-slate-100"
            aria-label="Close workflow editor"
          >
            <X />
          </button>
        </div>
        {feedback && (
          <div className="mt-5">
            <Feedback kind={feedback.kind}>{feedback.text}</Feedback>
          </div>
        )}
        <div className="mt-6 space-y-5">
          {type === "eventRegistrations" && (
            <dl className="grid gap-4 rounded-xl bg-slate-50 p-5 sm:grid-cols-2">
              {[
                ["Registrant", item.name],
                ["Registration", item.registrationNumber],
                ["Event", event.title ?? item.eventTitle],
                ["Attendees", item.attendees],
                ["Email", item.email],
                ["Phone", item.phone],
                ["Registrant notes", item.notes],
              ].map(([label, value]) => (
                <div key={String(label)} className={label === "Registrant notes" ? "sm:col-span-2" : ""}>
                  <dt className="text-[10px] font-extrabold tracking-[.12em] text-slate-500 uppercase">
                    {String(label)}
                  </dt>
                  <dd className="mt-1 text-sm leading-6 font-semibold [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-slate-800">
                    {String(value ?? "—")}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <label className="block text-sm font-bold">
            Status
            <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </select>
          </label>
          {type !== "eventRegistrations" && (
            <>
              <label className="block text-sm font-bold">
                Assigned staff member
                <select
                  className={inputClass}
                  value={assignedTo}
                  onChange={(event) => setAssignedTo(event.target.value)}
                >
                  <option value="">Unassigned</option>
                  {users?.map((user) => (
                    <option key={user._id} value={user._id}>
                      {String(user.name ?? user.email ?? user._id)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-bold">
                Internal notes
                <textarea
                  className={inputClass}
                  rows={5}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Visible only to authorized staff"
                />
              </label>
            </>
          )}
        </div>
        <div className="mt-7 flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <button type="button" onClick={onClose} className={`${secondaryButtonClass} w-full sm:w-auto`}>
            Close
          </button>
          <button disabled={busy} className={`${primaryButtonClass} w-full sm:w-auto`}>
            {busy ? <LoaderCircle className="animate-spin" size={16} /> : <ClipboardCheck size={16} />} Save
            workflow
          </button>
        </div>
      </form>
    </div>
  );
}

function AdmissionDetailData({ id }: { id: string }) {
  const item = useQuery(adminApi.getSubmission, { type: "admissions", id });
  const [editing, setEditing] = useState(false);
  if (item === undefined) return <LoadingPanel label="Loading application" />;
  if (!item)
    return (
      <EmptyState
        title="Application not found"
        description="This application is outside the current queue, was removed, or you do not have permission to view it."
        action={
          <Link href="/admin/admissions" className={secondaryButtonClass}>
            Return to admissions
          </Link>
        }
      />
    );
  const student = objectValue(item.student);
  const guardian = objectValue(item.guardian);
  const fields = [
    ["Application number", item.applicationNumber],
    ["Academic year", item.academicYear],
    ["Desired grade", item.desiredGrade],
    ["Student", [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ")],
    [
      "Date of birth",
      typeof student.dateOfBirth === "number" ? formatDate(student.dateOfBirth).split(",")[0] : "—",
    ],
    ["Gender", student.gender],
    ["Guardian", guardian.name],
    ["Relationship", guardian.relationship],
    ["Guardian email", guardian.email],
    ["Guardian phone", guardian.phone],
    ["Address", guardian.address],
    ["Previous school", item.priorSchool],
  ];
  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/admissions" className={secondaryButtonClass}>
          ← All applications
        </Link>
        <button onClick={() => setEditing(true)} className={primaryButtonClass}>
          <UserRoundCheck size={17} /> Update workflow
        </button>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <p className="text-xs font-bold text-sky-700">
                {String(item.applicationNumber ?? "Application")}
              </p>
              <h2 className="mt-1 text-2xl font-black">
                {[student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ")}
              </h2>
            </div>
            <WorkflowBadge value={String(item.status ?? "submitted")} />
          </div>
          <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-[10px] font-extrabold tracking-[.14em] text-slate-400 uppercase">
                  {String(label)}
                </dt>
                <dd className="mt-1.5 text-sm leading-6 font-semibold [overflow-wrap:anywhere] break-words text-slate-800">
                  {String(value ?? "—")}
                </dd>
              </div>
            ))}
          </dl>
          {item.notes ? (
            <div className="mt-7 rounded-xl bg-slate-50 p-5">
              <p className="text-xs font-extrabold tracking-[.14em] text-slate-500 uppercase">
                Applicant notes
              </p>
              <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-slate-700">
                {String(item.notes)}
              </p>
            </div>
          ) : null}
        </article>
        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-extrabold">Guardian contact</h3>
            <div className="mt-4 space-y-3 text-sm">
              <a
                href={`mailto:${String(guardian.email ?? "")}`}
                className="flex min-w-0 items-center gap-3 break-all text-sky-800 hover:underline"
              >
                <Mail className="shrink-0" size={16} />
                {String(guardian.email ?? "No email")}
              </a>
              <a
                href={`tel:${String(guardian.phone ?? "")}`}
                className="flex min-w-0 items-center gap-3 break-all text-sky-800 hover:underline"
              >
                <Phone className="shrink-0" size={16} />
                {String(guardian.phone ?? "No phone")}
              </a>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-extrabold">Internal workflow notes</h3>
            <p className="mt-3 text-sm leading-6 [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-slate-600">
              {String(item.internalNotes ?? "No internal notes yet.")}
            </p>
          </div>
        </aside>
      </div>
      {editing && (
        <SubmissionEditor
          type="admissions"
          item={item}
          statuses={admissionStatuses}
          onClose={() => setEditing(false)}
        />
      )}
    </section>
  );
}

function WorkflowBadge({ value }: { value: string }) {
  const style = ["resolved", "enrolled", "offered", "attended", "registered"].includes(value)
    ? "bg-emerald-50 text-emerald-700"
    : ["declined", "withdrawn", "spam", "closed", "cancelled", "no_show"].includes(value)
      ? "bg-slate-100 text-slate-600"
      : value === "new" || value === "submitted"
        ? "bg-sky-50 text-sky-800"
        : "bg-amber-50 text-amber-800";
  return (
    <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-extrabold ${style}`}>
      {humanize(value)}
    </span>
  );
}
function objectValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function searchableText(item: AdminRecord) {
  return JSON.stringify(item).toLowerCase();
}
function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The workflow could not be updated. No success was recorded.";
}

function submissionSearchPlaceholder(type: SubmissionType) {
  if (type === "admissions") return "Search applicant, guardian, or application number…";
  if (type === "eventRegistrations") return "Search registrant, email, event, or registration number…";
  return "Search name, email, ticket, or subject…";
}

function exportRegistrationCsv(records: AdminRecord[]) {
  const header = ["Registration", "Event", "Name", "Email", "Phone", "Attendees", "Status", "Received"];
  const rows = records.map((record) => {
    const event = objectValue(record.event);
    return [
      record.registrationNumber,
      event.title ?? record.eventTitle,
      record.name,
      record.email,
      record.phone,
      record.attendees,
      record.status,
      record.createdAt ? new Date(Number(record.createdAt)).toISOString() : "",
    ];
  });
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `event-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
