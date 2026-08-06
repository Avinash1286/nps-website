"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  LoaderCircle,
  Mail,
  Pencil,
  Plus,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { ADMIN_ACCESS_ROLES } from "@/lib/admin/authorization";
import { AdminFeatureGate } from "./admin-gate";
import { adminApi, type AdminRecord } from "./convex-api";
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

type CampaignStatus = "draft" | "scheduled" | "queueing" | "sending" | "completed" | "failed" | "cancelled";

const campaignStatuses: CampaignStatus[] = [
  "draft",
  "scheduled",
  "queueing",
  "sending",
  "completed",
  "failed",
  "cancelled",
];
const subscriberStatuses = ["pending", "active", "unsubscribed", "bounced"] as const;

export function NewsletterManager() {
  return (
    <AdminFeatureGate requiredRoles={ADMIN_ACCESS_ROLES.adminOnly}>
      <NewsletterData />
    </AdminFeatureGate>
  );
}

function NewsletterData() {
  const metrics = useQuery(adminApi.getNewsletterMetrics, {});
  const [tab, setTab] = useState<"campaigns" | "subscribers">("campaigns");
  if (metrics === undefined) return <LoadingPanel label="Loading newsletter workspace" />;

  return (
    <section>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Users} label="Confirmed subscribers" value={metrics.subscribers.active} />
        <Metric icon={Mail} label="Pending confirmation" value={metrics.subscribers.pending} />
        <Metric
          icon={CalendarClock}
          label="Scheduled or sending"
          value={metrics.campaigns.scheduled + metrics.campaigns.queueing + metrics.campaigns.sending}
        />
        <Metric icon={CheckCircle2} label="Completed campaigns" value={metrics.campaigns.completed} />
      </div>
      <div
        className="mb-5 flex gap-2 border-b border-slate-200"
        role="tablist"
        aria-label="Newsletter workspace"
      >
        {(["campaigns", "subscribers"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`border-b-2 px-4 py-3 text-sm font-extrabold capitalize ${
              tab === value ? "border-sky-700 text-sky-800" : "border-transparent text-slate-500"
            }`}
          >
            {value}
          </button>
        ))}
      </div>
      {tab === "campaigns" ? <CampaignsPanel /> : <SubscribersPanel />}
    </section>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <Icon className="text-sky-700" size={20} />
      <p className="mt-4 text-3xl font-black text-slate-950">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </article>
  );
}

function CampaignsPanel() {
  const [filter, setFilter] = useState<"all" | CampaignStatus>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRecord | null>(null);
  const [scheduling, setScheduling] = useState<AdminRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const cancelCampaign = useMutation(adminApi.cancelNewsletterCampaign);
  const { results, status, loadMore } = usePaginatedQuery(
    adminApi.listNewsletterCampaigns,
    filter === "all" ? {} : { status: filter },
    { initialNumItems: 30 },
  );

  async function cancel(item: AdminRecord) {
    if (!window.confirm(`Cancel “${String(item.title ?? "this campaign")}”? Queued deliveries will stop.`))
      return;
    setBusyId(item._id);
    setFeedback(null);
    try {
      await cancelCampaign({ campaignId: item._id });
      setFeedback({
        kind: "success",
        text: "Campaign cancelled. Any unstarted delivery jobs will be suppressed.",
      });
    } catch (error) {
      setFeedback({ kind: "error", text: message(error) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section role="tabpanel">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="w-full text-sm font-bold sm:w-auto">
          <span className="sr-only">Filter campaigns by status</span>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as typeof filter)}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 sm:w-auto"
          >
            <option value="all">All campaign statuses</option>
            {campaignStatuses.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
          className={`${primaryButtonClass} w-full sm:w-auto`}
        >
          <Plus size={17} /> New campaign
        </button>
      </div>
      {feedback && <Feedback kind={feedback.kind}>{feedback.text}</Feedback>}
      {status === "LoadingFirstPage" ? (
        <LoadingPanel label="Loading campaigns" />
      ) : results.length === 0 ? (
        <EmptyState
          title="No newsletter campaigns"
          description="Create a reviewed draft, then send immediately or schedule delivery to confirmed subscribers."
        />
      ) : (
        <div className="mt-5 space-y-4">
          {results.map((item) => {
            const itemStatus = String(item.status ?? "draft") as CampaignStatus;
            const editable = itemStatus === "draft" || itemStatus === "scheduled";
            const cancellable = !["completed", "cancelled"].includes(itemStatus);
            return (
              <article key={item._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={itemStatus} />
                      {item.scheduledAt ? (
                        <span className="text-xs text-slate-500">{formatDate(Number(item.scheduledAt))}</span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-xl font-black [overflow-wrap:anywhere] break-words text-slate-950">
                      {String(item.title)}
                    </h3>
                    <p className="mt-1 text-sm font-semibold [overflow-wrap:anywhere] break-words text-slate-600">
                      {String(item.subject)}
                    </p>
                    <p className="mt-3 text-xs text-slate-500">
                      Target {Number(item.targetCount ?? 0).toLocaleString()} · Accepted{" "}
                      {Number(item.deliveredCount ?? 0).toLocaleString()} · Failed{" "}
                      {Number(item.failedCount ?? 0).toLocaleString()} · Suppressed{" "}
                      {Number(item.suppressedCount ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
                    {editable && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(item);
                          setEditorOpen(true);
                        }}
                        className={secondaryButtonClass}
                      >
                        <Pencil size={15} /> Edit
                      </button>
                    )}
                    {editable && (
                      <button
                        type="button"
                        onClick={() => setScheduling(item)}
                        className={primaryButtonClass}
                      >
                        <Send size={15} /> Schedule
                      </button>
                    )}
                    {cancellable && (
                      <button
                        type="button"
                        disabled={busyId === item._id}
                        onClick={() => void cancel(item)}
                        className={secondaryButtonClass}
                      >
                        {busyId === item._id ? (
                          <LoaderCircle size={15} className="animate-spin" />
                        ) : (
                          <Ban size={15} />
                        )}
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {status === "CanLoadMore" && (
        <div className="mt-5 text-center">
          <button type="button" onClick={() => loadMore(30)} className={secondaryButtonClass}>
            Load more campaigns
          </button>
        </div>
      )}
      {status === "LoadingMore" && <p className="mt-5 text-center text-sm text-slate-500">Loading more…</p>}
      {editorOpen && (
        <CampaignEditor
          item={editing}
          onClose={() => setEditorOpen(false)}
          onSaved={() => {
            setEditorOpen(false);
            setFeedback({ kind: "success", text: "Campaign draft saved and audited." });
          }}
        />
      )}
      {scheduling && (
        <ScheduleCampaign item={scheduling} onClose={() => setScheduling(null)} onFeedback={setFeedback} />
      )}
    </section>
  );
}

function CampaignEditor({
  item,
  onClose,
  onSaved,
}: {
  item: AdminRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const detail = useQuery(adminApi.getNewsletterCampaign, item ? { campaignId: item._id } : "skip");

  if (item && detail === undefined) {
    return <CampaignEditorStatus title="Loading campaign" onClose={onClose} />;
  }
  if (item && detail === null) {
    return (
      <CampaignEditorStatus
        title="Campaign unavailable"
        description="This campaign was removed or is no longer available to edit."
        onClose={onClose}
      />
    );
  }

  return <CampaignEditorForm item={item ? detail! : null} onClose={onClose} onSaved={onSaved} />;
}

function CampaignEditorForm({
  item,
  onClose,
  onSaved,
}: {
  item: AdminRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(String(item?.title ?? ""));
  const [subject, setSubject] = useState(String(item?.subject ?? ""));
  const [preheader, setPreheader] = useState(String(item?.preheader ?? ""));
  const [body, setBody] = useState(String(item?.body ?? ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upsert = useMutation(adminApi.upsertNewsletterCampaign);
  const { dialogRef, onDialogKeyDown } = useModalAccessibility<HTMLFormElement>(true, onClose);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await upsert({
        ...(item ? { campaignId: item._id } : {}),
        campaign: { title, subject, ...(preheader.trim() ? { preheader } : {}), body },
      });
      onSaved();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[75] overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="grid min-h-full place-items-center">
        <form
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="campaign-editor-title"
          tabIndex={-1}
          onKeyDown={onDialogKeyDown}
          onSubmit={submit}
          className="my-4 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold tracking-[.17em] text-sky-700 uppercase">Newsletter</p>
              <h2 id="campaign-editor-title" className="mt-2 text-2xl font-black">
                {item ? "Edit campaign" : "Create campaign"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 hover:bg-slate-100"
              aria-label="Close campaign editor"
            >
              <X />
            </button>
          </div>
          {error && (
            <div className="mt-5">
              <Feedback>{error}</Feedback>
            </div>
          )}
          <div className="mt-6 grid gap-5">
            <Field
              label="Internal campaign title"
              value={title}
              onChange={setTitle}
              maxLength={180}
              required
            />
            <Field label="Email subject" value={subject} onChange={setSubject} maxLength={180} required />
            <Field label="Preheader (optional)" value={preheader} onChange={setPreheader} maxLength={300} />
            <label className="text-sm font-bold">
              Plain-text message
              <textarea
                required
                minLength={10}
                maxLength={50000}
                rows={14}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className={inputClass}
                placeholder="Write the reviewed school update. An unsubscribe link is added by the delivery template."
              />
            </label>
          </div>
          <div className="mt-7 flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <button type="button" onClick={onClose} className={`${secondaryButtonClass} w-full sm:w-auto`}>
              Cancel
            </button>
            <button disabled={busy} className={`${primaryButtonClass} w-full sm:w-auto`}>
              {busy ? <LoaderCircle className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Save
              draft
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CampaignEditorStatus({
  title,
  description,
  onClose,
}: {
  title: string;
  description?: string;
  onClose: () => void;
}) {
  const { dialogRef, onDialogKeyDown } = useModalAccessibility<HTMLDivElement>(true, onClose);
  return (
    <div className="fixed inset-0 z-[75] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-editor-status-title"
        tabIndex={-1}
        onKeyDown={onDialogKeyDown}
        className="my-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="campaign-editor-status-title" className="text-xl font-black">
              {title}
            </h2>
            {description ? <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 hover:bg-slate-100"
            aria-label="Close campaign dialog"
          >
            <X />
          </button>
        </div>
        {!description && (
          <div className="mt-6">
            <LoadingPanel label="Loading full campaign content" />
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleCampaign({
  item,
  onClose,
  onFeedback,
}: {
  item: AdminRecord;
  onClose: () => void;
  onFeedback: (feedback: { kind: "error" | "success"; text: string }) => void;
}) {
  const [sendAt, setSendAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const schedule = useMutation(adminApi.scheduleNewsletterCampaign);
  const { dialogRef, onDialogKeyDown } = useModalAccessibility<HTMLFormElement>(true, onClose);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const scheduledAt = sendAt ? new Date(sendAt).getTime() : undefined;
      if (sendAt && !Number.isFinite(scheduledAt)) throw new Error("Choose a valid send time.");
      const result = await schedule({ campaignId: item._id, ...(scheduledAt ? { scheduledAt } : {}) });
      onFeedback({
        kind: "success",
        text: `Campaign scheduled for ${new Intl.DateTimeFormat("en-NP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kathmandu" }).format(result.scheduledAt)}.`,
      });
      onClose();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center">
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-campaign-title"
        tabIndex={-1}
        onKeyDown={onDialogKeyDown}
        onSubmit={submit}
        className="my-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      >
        <CalendarClock className="text-sky-700" />
        <h2 id="schedule-campaign-title" className="mt-4 text-xl font-black">
          Schedule newsletter
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Leave the field empty to queue “{String(item.title)}” immediately. Only subscribers confirmed before
          queueing begins are included.
        </p>
        {error && (
          <div className="mt-4">
            <Feedback>{error}</Feedback>
          </div>
        )}
        <label className="mt-5 block text-sm font-bold">
          Send time (optional)
          <input
            type="datetime-local"
            value={sendAt}
            onChange={(event) => setSendAt(event.target.value)}
            className={inputClass}
          />
        </label>
        <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <button type="button" onClick={onClose} className={`${secondaryButtonClass} w-full sm:w-auto`}>
            Cancel
          </button>
          <button disabled={busy} className={`${primaryButtonClass} w-full sm:w-auto`}>
            {busy ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />} Confirm schedule
          </button>
        </div>
      </form>
    </div>
  );
}

function SubscribersPanel() {
  const [filter, setFilter] = useState<"all" | (typeof subscriberStatuses)[number]>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const update = useMutation(adminApi.updateSubscriber);
  const { results, status, loadMore } = usePaginatedQuery(
    adminApi.listSubscribers,
    filter === "all" ? {} : { status: filter },
    { initialNumItems: 50 },
  );
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? results.filter((item) => JSON.stringify(item).toLowerCase().includes(term)) : results;
  }, [results, search]);

  async function suppress(subscriberId: string, nextStatus: "unsubscribed" | "bounced") {
    const verb = nextStatus === "bounced" ? "mark this address as bounced" : "unsubscribe this address";
    if (
      !window.confirm(`Are you sure you want to ${verb}? Reactivation requires a fresh public confirmation.`)
    )
      return;
    setBusyId(subscriberId);
    setFeedback(null);
    try {
      await update({ subscriberId, status: nextStatus });
      setFeedback({ kind: "success", text: "Subscriber suppression status updated and audited." });
    } catch (caught) {
      setFeedback({ kind: "error", text: message(caught) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section role="tabpanel">
      <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_230px]">
        <label className="relative">
          <span className="sr-only">Search loaded subscribers</span>
          <Search size={17} className="absolute top-3.5 left-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-slate-200 py-3 pr-3 pl-10 text-sm"
            placeholder="Search loaded subscribers…"
          />
        </label>
        <label>
          <span className="sr-only">Filter subscriber status</span>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as typeof filter)}
            className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"
          >
            <option value="all">All subscriber statuses</option>
            {subscriberStatuses.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {feedback && <Feedback kind={feedback.kind}>{feedback.text}</Feedback>}
      {status === "LoadingFirstPage" ? (
        <LoadingPanel label="Loading subscribers" />
      ) : visible.length === 0 ? (
        <EmptyState
          title="No subscribers found"
          description="Confirmed, pending, and suppressed newsletter addresses appear here."
        />
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {visible.map((item) => (
            <article
              key={item._id}
              className="flex flex-col gap-4 border-b border-slate-100 p-5 last:border-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-extrabold break-all text-slate-950">{String(item.email)}</p>
                <p className="mt-1 text-xs break-words text-slate-500">
                  {String(item.name ?? "Name not supplied")} · Updated{" "}
                  {formatDate(Number(item.updatedAt ?? item._creationTime ?? 0))}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={String(item.status ?? "pending")} />
                {item.status === "active" && (
                  <button
                    disabled={busyId === item._id}
                    onClick={() => void suppress(item._id, "bounced")}
                    className={secondaryButtonClass}
                  >
                    Mark bounced
                  </button>
                )}
                {!["unsubscribed"].includes(String(item.status)) && (
                  <button
                    disabled={busyId === item._id}
                    onClick={() => void suppress(item._id, "unsubscribed")}
                    className={secondaryButtonClass}
                  >
                    Unsubscribe
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {status === "CanLoadMore" && (
        <div className="mt-5 text-center">
          <button type="button" onClick={() => loadMore(50)} className={secondaryButtonClass}>
            Load more subscribers
          </button>
        </div>
      )}
      {status === "LoadingMore" && <p className="mt-5 text-center text-sm text-slate-500">Loading more…</p>}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  maxLength: number;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <input
        required={required}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </label>
  );
}

function StatusBadge({ value }: { value: string }) {
  const style = ["active", "completed"].includes(value)
    ? "bg-emerald-50 text-emerald-700"
    : ["failed", "bounced"].includes(value)
      ? "bg-rose-50 text-rose-700"
      : ["cancelled", "unsubscribed"].includes(value)
        ? "bg-slate-100 text-slate-600"
        : "bg-amber-50 text-amber-800";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${style}`}>{humanize(value)}</span>
  );
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "The newsletter action could not be completed.";
}
