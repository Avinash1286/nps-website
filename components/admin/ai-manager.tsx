"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import {
  Bot,
  CheckCircle2,
  Clock3,
  Eye,
  FlaskConical,
  LoaderCircle,
  LockKeyhole,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { ADMIN_ACCESS_ROLES } from "@/lib/admin/authorization";
import { AssistantContextManager } from "./assistant-context-manager";
import { AdminFeatureGate } from "./admin-gate";
import { adminApi, assistantAdminApi } from "./convex-api";
import { formatDate } from "./content-manager";
import {
  Feedback,
  LoadingPanel,
  PaginationControls,
  primaryButtonClass,
  secondaryButtonClass,
  type PaginationStatus,
} from "./ui";
import { useModalAccessibility } from "./use-modal-accessibility";

export function AiManager() {
  return (
    <AdminFeatureGate requiredRoles={ADMIN_ACCESS_ROLES.adminOnly}>
      <AiData />
    </AdminFeatureGate>
  );
}

function AiData() {
  const configuration = useQuery(assistantAdminApi.getConfiguration, {});
  const {
    results: jobs,
    status: jobsStatus,
    loadMore: loadMoreJobs,
  } = usePaginatedQuery(adminApi.listJobs, { type: "ai_response" }, { initialNumItems: 12 });
  const {
    results: conversations,
    status: conversationsStatus,
    loadMore: loadMoreConversations,
  } = usePaginatedQuery(adminApi.listAiConversations, {}, { initialNumItems: 30 });
  const setEnabled = useMutation(assistantAdminApi.setEnabled);
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  if (
    configuration === undefined ||
    jobsStatus === "LoadingFirstPage" ||
    conversationsStatus === "LoadingFirstPage"
  )
    return <LoadingPanel label="Loading AI assistant operations" />;
  const enabled = configuration.assistantEnabled;
  const providerReady =
    configuration.geminiConfigured && configuration.serviceSigningConfigured && configuration.agentMounted;
  async function toggle() {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await setEnabled({ enabled: !enabled });
      if (!result.ok) {
        setFeedback({ kind: "error", text: result.message });
        return;
      }
      setFeedback({
        kind: "success",
        text: `AI assistant ${result.enabled ? "enabled" : "disabled"}. The change was recorded in the audit log.`,
      });
    } catch {
      setFeedback({
        kind: "error",
        text: "The assistant setting could not be changed. Refresh the page and try again.",
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-6">
      {feedback && <Feedback kind={feedback.kind}>{feedback.text}</Feedback>}
      <div className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700">
              <Sparkles size={19} aria-hidden="true" />
            </span>
            <Status ok={providerReady} />
          </div>
          <h2 className="mt-5 font-black">Gemini provider</h2>
          <dl className="mt-3 space-y-2 text-xs text-slate-600">
            <Diagnostic label="API credential" ok={configuration.geminiConfigured} />
            <Diagnostic label="Signed gateway" ok={configuration.serviceSigningConfigured} />
            <Diagnostic label="Agent runtime" ok={configuration.agentMounted} />
          </dl>
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs break-all text-slate-600">
            {configuration.provider} / {configuration.model}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700">
              <Bot size={19} aria-hidden="true" />
            </span>
            <Status ok={enabled} />
          </div>
          <h2 className="mt-5 font-black">Public assistant</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {enabled
              ? `Public questions can use ${configuration.publishedContextCount} curated context${configuration.publishedContextCount === 1 ? "" : "s"}.`
              : "The assistant is disabled in site settings."}
          </p>
          <button
            type="button"
            onClick={() => void toggle()}
            disabled={busy || (!enabled && !providerReady)}
            className={`${primaryButtonClass} mt-4 w-full`}
          >
            {busy && <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />}
            {busy ? "Saving…" : enabled ? "Disable assistant" : "Enable assistant"}
          </button>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <Clock3 size={19} aria-hidden="true" />
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-600">
              {jobs.length} loaded
            </span>
          </div>
          <h2 className="mt-5 font-black">Response queue</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Normal answers run immediately. Convex queues only transient failures for a durable retry without
            losing the conversation.
          </p>
        </article>
      </div>
      {!providerReady && (
        <Feedback kind="info">
          <span className="flex min-w-0 items-start gap-2">
            <ShieldAlert className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
            <span>
              Complete the missing server-only provider and signed-gateway configuration before enabling the
              public assistant. Secrets are never returned to this screen and must not use a NEXT_PUBLIC_
              prefix.
            </span>
          </span>
        </Feedback>
      )}

      <AssistantContextManager contextLimit={configuration.contextLimit} />

      <section
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        aria-labelledby="assistant-preview-heading"
      >
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sky-800">
              <FlaskConical size={17} aria-hidden="true" />
              <p className="text-xs font-extrabold tracking-[.14em] uppercase">Live test</p>
            </div>
            <h2 id="assistant-preview-heading" className="mt-1 font-black">
              Public assistant preview
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Uses the same panel, API route, rate limits, and published grounding as the public website.
            </p>
          </div>
          <button
            type="button"
            className={previewOpen ? secondaryButtonClass : primaryButtonClass}
            onClick={() => setPreviewOpen((current) => !current)}
            aria-expanded={previewOpen}
            aria-controls="assistant-admin-preview"
          >
            {previewOpen ? <X size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            {previewOpen ? "Close preview" : "Open test preview"}
          </button>
        </div>
        <div id="assistant-admin-preview" hidden={!previewOpen} className="bg-slate-50 p-4 sm:p-6">
          {!enabled && (
            <div className="mb-4">
              <Feedback kind="info">
                Enable the public assistant before sending a test question; the preview intentionally follows
                the public availability setting.
              </Feedback>
            </div>
          )}
          <div className="mx-auto max-w-2xl">
            <AssistantPanel embedded sourceLinksNewTab />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-black">Recent AI jobs</h2>
          <p className="mt-1 text-xs text-slate-500">
            Operational metadata only; conversation content is not shown here.
          </p>
        </div>
        {jobs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">No assistant jobs have been queued.</p>
        ) : (
          jobs.map((job) => (
            <article
              key={job._id}
              className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-0 sm:grid-cols-[140px_1fr_160px] sm:items-center"
            >
              <div className="flex items-center justify-between gap-3 sm:block">
                <span className="text-[10px] font-extrabold tracking-[.14em] text-slate-400 uppercase sm:hidden">
                  Status
                </span>
                <span
                  className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-extrabold ${job.status === "succeeded" ? "bg-emerald-50 text-emerald-700" : job.status === "dead" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}
                >
                  {String(job.status ?? "queued")}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold tracking-[.14em] text-slate-400 uppercase sm:hidden">
                  Result
                </span>
                <p className="mt-1 text-xs [overflow-wrap:anywhere] break-words text-slate-600 sm:mt-0 sm:truncate">
                  {String(job.lastError ?? job.resultSummary ?? job.idempotencyKey ?? job._id)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:block">
                <span className="text-[10px] font-extrabold tracking-[.14em] text-slate-400 uppercase sm:hidden">
                  Created
                </span>
                <time className="text-right text-xs text-slate-500 sm:text-left">
                  {typeof job.createdAt === "number" ? formatDate(job.createdAt) : "—"}
                </time>
              </div>
            </article>
          ))
        )}
        <div className="p-4 pt-0">
          <PaginationControls
            status={jobsStatus}
            loadedCount={jobs.length}
            noun="AI jobs"
            onLoadMore={() => loadMoreJobs(12)}
          />
        </div>
      </section>
      <ConversationReview
        conversations={conversations}
        paginationStatus={conversationsStatus}
        onLoadMore={() => loadMoreConversations(30)}
      />
    </section>
  );
}

export function ConversationReview({
  conversations,
  paginationStatus,
  onLoadMore,
}: {
  conversations: import("./convex-api").AdminRecord[];
  paginationStatus: PaginationStatus;
  onLoadMore: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const detail = useQuery(adminApi.getAiConversation, selected ? { conversationId: selected } : "skip");
  const closeConversation = useMutation(adminApi.closeAiConversation);
  const { dialogRef, onDialogKeyDown } = useModalAccessibility<HTMLDivElement>(
    Boolean(selected),
    dismissReview,
  );

  function dismissReview() {
    setSelected(null);
    setFeedback((current) => (current?.kind === "error" ? null : current));
  }

  async function close(id: string) {
    if (
      !window.confirm(
        "Close this transcript? It will be marked closed for review, but this does not block the visitor or session from starting another conversation.",
      )
    )
      return;
    setBusy(true);
    setFeedback(null);
    try {
      await closeConversation({ conversationId: id });
      setSelected(null);
      setFeedback({
        kind: "success",
        text: "Transcript closed and the moderation action was audited. The visitor or session was not blocked.",
      });
    } catch (caught) {
      setFeedback({
        kind: "error",
        text: caught instanceof Error ? caught.message : "The conversation could not be closed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 shrink-0 text-sky-700" size={18} />
          <div>
            <h2 className="font-black">Conversation moderation</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Restricted to administrators. Open a transcript only when needed for safety, support, or
              incident review.
            </p>
          </div>
        </div>
      </div>
      {feedback && !selected && (
        <div className="p-4 pb-0">
          <Feedback kind={feedback.kind}>{feedback.text}</Feedback>
        </div>
      )}
      {conversations.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">
          No assistant conversations were found.
        </p>
      ) : (
        conversations.map((conversation) => (
          <article
            key={conversation._id}
            className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-0 sm:grid-cols-[1fr_110px_170px_92px] sm:items-center"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">
                {String(conversation.title ?? "Assistant conversation")}
              </p>
              <p className="mt-1 truncate font-mono text-[10px] text-slate-400">
                {String(conversation.ownerKey ?? conversation._id)}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 sm:block">
              <span className="text-[10px] font-extrabold tracking-[.14em] text-slate-400 uppercase sm:hidden">
                Status
              </span>
              <span
                className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-extrabold ${conversation.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
              >
                {String(conversation.status ?? "active")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 sm:block">
              <span className="text-[10px] font-extrabold tracking-[.14em] text-slate-400 uppercase sm:hidden">
                Last message
              </span>
              <time className="text-right text-xs text-slate-500 sm:text-left">
                {typeof conversation.lastMessageAt === "number"
                  ? formatDate(conversation.lastMessageAt)
                  : "—"}
              </time>
            </div>
            <button
              onClick={() => {
                setFeedback(null);
                setSelected(conversation._id);
              }}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold text-sky-800 hover:bg-sky-50"
            >
              <Eye size={14} /> Review
            </button>
          </article>
        ))
      )}
      <div className="p-4 pt-0">
        <PaginationControls
          status={paginationStatus}
          loadedCount={conversations.length}
          noun="AI conversations"
          onLoadMore={onLoadMore}
        />
      </div>
      {selected && (
        <div className="fixed inset-0 z-[75] overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-sm">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="conversation-review-title"
            tabIndex={-1}
            onKeyDown={onDialogKeyDown}
            className="mx-auto my-6 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold tracking-[.17em] text-sky-700 uppercase">
                  Restricted transcript
                </p>
                <h2 id="conversation-review-title" className="mt-2 text-2xl font-black">
                  Conversation review
                </h2>
              </div>
              <button
                onClick={dismissReview}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 hover:bg-slate-100"
                aria-label="Close transcript"
              >
                <X />
              </button>
            </div>
            {feedback?.kind === "error" && (
              <div className="mt-6">
                <Feedback kind="error">{feedback.text}</Feedback>
              </div>
            )}
            {detail === undefined ? (
              <div className="mt-7">
                <LoadingPanel label="Loading transcript" />
              </div>
            ) : !detail ? (
              <div className="mt-7">
                <Feedback>The conversation no longer exists or is unavailable.</Feedback>
              </div>
            ) : (
              <>
                <div className="mt-7 space-y-3">
                  {detail.messages.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                      No messages.
                    </p>
                  ) : (
                    detail.messages.map((message) => (
                      <article
                        key={message._id}
                        className={`rounded-xl border p-4 ${message.role === "user" ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-slate-50"}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-extrabold tracking-[.14em] text-slate-500 uppercase">
                            {String(message.role ?? "message")}
                          </p>
                          <span className="text-[10px] text-slate-400">{String(message.status ?? "")}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-slate-800">
                          {String(message.content ?? "")}
                        </p>
                      </article>
                    ))
                  )}
                </div>
                <div className="mt-7 flex flex-col-reverse justify-end gap-3 sm:flex-row">
                  <button
                    onClick={dismissReview}
                    className="min-h-11 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 sm:w-auto"
                  >
                    Close review
                  </button>
                  {detail.conversation.status === "active" && (
                    <button
                      onClick={() => void close(detail.conversation._id)}
                      disabled={busy}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 sm:w-auto"
                    >
                      {busy && <LoaderCircle className="animate-spin" size={15} aria-hidden="true" />} Close
                      conversation
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Status({ ok }: { ok: boolean | null }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}
    >
      {ok ? <CheckCircle2 size={12} /> : <ShieldAlert size={12} />}
      {ok ? "Ready" : "Verify"}
    </span>
  );
}

function Diagnostic({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt>{label}</dt>
      <dd className={`font-extrabold ${ok ? "text-emerald-700" : "text-amber-800"}`}>
        {ok ? "Configured" : "Missing"}
      </dd>
    </div>
  );
}
