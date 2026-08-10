"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import {
  Archive,
  BookOpenText,
  Check,
  Clock3,
  LoaderCircle,
  Search,
  ShieldAlert,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ADMIN_ACCESS_ROLES } from "@/lib/admin/authorization";
import { AdminFeatureGate } from "./admin-gate";
import {
  articleAdminApi,
  type AdminStudentArticle,
  type ModeratedStudentArticleStatus,
  type StudentArticleStatus,
} from "./convex-api";
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

const statuses: ModeratedStudentArticleStatus[] = ["submitted", "published", "rejected", "archived"];

export function ArticleReviewManager() {
  return (
    <AdminFeatureGate requiredRoles={ADMIN_ACCESS_ROLES.adminOnly}>
      <ArticleReviewData />
    </AdminFeatureGate>
  );
}

function ArticleReviewData() {
  const [filter, setFilter] = useState<ModeratedStudentArticleStatus>("submitted");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const {
    results,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    articleAdminApi.listArticles,
    { status: filter },
    {
      initialNumItems: 40,
    },
  );
  const selectedArticle = useQuery(articleAdminApi.getArticle, selectedId ? { id: selectedId } : "skip");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return results;
    return results.filter((article) =>
      `${article.title} ${article.excerpt} ${article.category} ${article.author.name} ${article.author.email}`
        .toLowerCase()
        .includes(needle),
    );
  }, [query, results]);

  if (paginationStatus === "LoadingFirstPage") return <LoadingPanel label="Loading student articles" />;

  return (
    <section>
      {feedback ? (
        <div className="mb-5">
          <Feedback kind={feedback.kind}>{feedback.text}</Feedback>
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_220px]">
        <label className="relative block text-xs font-bold text-slate-600">
          Search loaded articles
          <Search
            size={17}
            className="pointer-events-none absolute bottom-3.5 left-3.5 text-slate-400"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={`${inputClass} pl-10`}
            placeholder="Title, student, email, or category"
          />
        </label>
        <label className="block text-xs font-bold text-slate-600">
          Workflow status
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as ModeratedStudentArticleStatus)}
            className={inputClass}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status === "submitted" ? "Awaiting review" : humanize(status)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={
            query
              ? "No matching student articles"
              : filter === "submitted"
                ? "Review queue is clear"
                : "No articles found"
          }
          description={
            query
              ? "Try a different title, student, email, or category."
              : filter === "submitted"
                ? "New student submissions will appear here for an administrator to review."
                : "There are no student articles in this workflow state."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,.9fr)_135px_155px_110px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-extrabold tracking-[.14em] text-slate-500 uppercase xl:grid">
            <span>Article</span>
            <span>Student</span>
            <span>Status</span>
            <span>Activity</span>
            <span className="text-right">Review</span>
          </div>
          {filtered.map((article) => (
            <article
              key={article._id}
              className="grid min-w-0 gap-4 border-b border-slate-100 p-4 last:border-0 sm:p-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,.9fr)_135px_155px_110px] xl:items-center"
            >
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-extrabold text-slate-900">{article.title}</p>
                <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                  {article.category} · {article.excerpt}
                </p>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-700">{article.author.name}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{article.author.email}</p>
              </div>
              <div className="flex items-center justify-between gap-3 xl:block">
                <span className="text-[10px] font-extrabold tracking-[.14em] text-slate-400 uppercase xl:hidden">
                  Status
                </span>
                <ArticleStatus value={article.status} />
              </div>
              <div className="flex items-center justify-between gap-3 xl:block">
                <span className="text-[10px] font-extrabold tracking-[.14em] text-slate-400 uppercase xl:hidden">
                  Activity
                </span>
                <time className="text-right text-xs text-slate-500 xl:text-left">
                  {formatDate(article.submittedAt ?? article.updatedAt)}
                </time>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(article._id)}
                className={`${secondaryButtonClass} w-full xl:w-auto`}
                aria-label={`Review ${article.title}`}
              >
                <BookOpenText size={16} aria-hidden="true" />
                Review
              </button>
            </article>
          ))}
        </div>
      )}
      <PaginationControls
        status={paginationStatus}
        loadedCount={results.length}
        noun="student articles"
        onLoadMore={() => loadMore(40)}
      />
      {selectedId && selectedArticle === undefined ? (
        <ArticleReviewLoading onClose={() => setSelectedId(null)} />
      ) : null}
      {selectedId && selectedArticle === null ? (
        <ArticleReviewUnavailable onClose={() => setSelectedId(null)} />
      ) : null}
      {selectedArticle ? (
        <ArticleReviewDialog
          article={selectedArticle}
          onClose={() => setSelectedId(null)}
          onFeedback={setFeedback}
        />
      ) : null}
    </section>
  );
}

function ArticleReviewLoading({ onClose }: { onClose: () => void }) {
  const { dialogRef, onDialogKeyDown } = useModalAccessibility<HTMLDivElement>(true, onClose);
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Loading article review"
        tabIndex={-1}
        onKeyDown={onDialogKeyDown}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4">
          <p className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <LoaderCircle className="animate-spin text-sky-700" size={20} aria-hidden="true" />
            Loading the complete article…
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-slate-100"
            aria-label="Close article review"
          >
            <X aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ArticleReviewUnavailable({ onClose }: { onClose: () => void }) {
  const { dialogRef, onDialogKeyDown } = useModalAccessibility<HTMLDivElement>(true, onClose);
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-unavailable-title"
        tabIndex={-1}
        onKeyDown={onDialogKeyDown}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 id="article-unavailable-title" className="text-xl font-black text-slate-950">
          This article is no longer available
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          It may have been removed after the review list loaded. Close this message and refresh the queue.
        </p>
        <button type="button" onClick={onClose} className={`${primaryButtonClass} mt-5 w-full`}>
          Close
        </button>
      </div>
    </div>
  );
}

type ReviewDecision = "approve" | "reject" | "archive";

function ArticleReviewDialog({
  article,
  onClose,
  onFeedback,
}: {
  article: AdminStudentArticle;
  onClose: () => void;
  onFeedback: (feedback: { kind: "error" | "success"; text: string }) => void;
}) {
  const [note, setNote] = useState(article.status === "published" ? "" : (article.reviewNote ?? ""));
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const approve = useMutation(articleAdminApi.approve);
  const reject = useMutation(articleAdminApi.reject);
  const archive = useMutation(articleAdminApi.archive);
  const { dialogRef, onDialogKeyDown } = useModalAccessibility<HTMLDivElement>(true, onClose);

  function prepare(nextDecision: ReviewDecision) {
    if (nextDecision === "reject" && note.trim().length < 10) {
      setError("Add a reason of at least 10 characters so the student understands the decision.");
      return;
    }
    setError(null);
    setDecision(nextDecision);
  }

  async function confirmDecision() {
    if (!decision) return;
    setBusy(true);
    setError(null);
    try {
      if (decision === "approve") await approve({ id: article._id });
      if (decision === "reject") await reject({ id: article._id, note: note.trim() });
      if (decision === "archive") {
        await archive({ id: article._id, ...(note.trim() ? { note: note.trim() } : {}) });
      }
      onFeedback({
        kind: "success",
        text:
          decision === "approve"
            ? `“${article.title}” is published in Student articles.`
            : decision === "reject"
              ? `“${article.title}” was rejected and the student can see the review note.`
              : `“${article.title}” was removed from the public article collection.`,
      });
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
      setDecision(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-review-title"
        tabIndex={-1}
        onKeyDown={onDialogKeyDown}
        className="mx-auto my-4 w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-8"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold tracking-[.17em] text-sky-700 uppercase">
              Student publishing review
            </p>
            <h2
              id="article-review-title"
              className="mt-2 text-2xl leading-tight font-black break-words text-slate-950"
            >
              {article.title}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              By {article.author.name} · {article.category}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl hover:bg-slate-100"
            aria-label="Close article review"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="grid min-w-0 gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-[10px] font-extrabold tracking-[.14em] text-slate-500 uppercase">Summary</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{article.excerpt}</p>
            </div>
            <div className="mt-7 space-y-5 text-base leading-8 text-slate-700">
              {article.body.split(/\n{2,}/).map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 40)}`} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>
            {article.tags.length ? (
              <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-200 pt-5">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start gap-3">
                <UserRound size={19} className="mt-0.5 shrink-0 text-[#2e3192]" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-extrabold text-slate-900">{article.author.name}</p>
                  <p className="mt-1 text-xs break-all text-slate-500">{article.author.email}</p>
                </div>
              </div>
              {article.author.status !== "active" ? (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  <ShieldAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                  This student account is {humanize(article.author.status)}. The backend will enforce the
                  final decision.
                </p>
              ) : null}
              <dl className="mt-5 space-y-3 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="font-bold text-slate-500">Status</dt>
                  <dd>
                    <ArticleStatus value={article.status} />
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-bold text-slate-500">Submitted</dt>
                  <dd className="text-right text-slate-700">
                    {article.submittedAt ? formatDate(article.submittedAt) : "Not submitted"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-bold text-slate-500">Updated</dt>
                  <dd className="text-right text-slate-700">{formatDate(article.updatedAt)}</dd>
                </div>
              </dl>
            </div>

            {article.status === "submitted" || article.status === "published" ? (
              <div className="rounded-2xl border border-slate-200 p-5">
                <label className="block text-sm font-extrabold text-slate-800">
                  {article.status === "submitted" ? "Review note" : "Archive note (optional)"}
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={1000}
                    className={`${inputClass} min-h-28 resize-y`}
                    placeholder={
                      article.status === "submitted"
                        ? "Required when rejecting this article"
                        : "Why is this article being archived?"
                    }
                  />
                </label>
                <div className="mt-2 flex items-start justify-between gap-4 text-xs leading-5 text-slate-500">
                  <p>
                    Approval publishes the article immediately. A rejection note is visible to the student
                    author.
                  </p>
                  <span className="shrink-0 tabular-nums">{note.length}/1000</span>
                </div>
              </div>
            ) : article.reviewNote ? (
              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-extrabold tracking-[.12em] text-slate-500 uppercase">
                  Review note
                </p>
                <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-slate-700">
                  {article.reviewNote}
                </p>
              </div>
            ) : null}

            {error ? <Feedback>{error}</Feedback> : null}

            {decision ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4" role="alert">
                <p className="text-sm font-extrabold text-amber-950">{decisionPrompt(decision)}</p>
                <p className="mt-1 text-xs leading-5 text-amber-900">
                  No success is recorded until you confirm.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <button
                    type="button"
                    onClick={() => void confirmDecision()}
                    disabled={busy}
                    className={primaryButtonClass}
                  >
                    {busy ? <LoaderCircle className="animate-spin" size={16} /> : <Check size={16} />}
                    {busy ? "Saving…" : "Confirm decision"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision(null)}
                    disabled={busy}
                    className={secondaryButtonClass}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : article.status === "submitted" ? (
              <div className="grid gap-2">
                <button type="button" onClick={() => prepare("approve")} className={primaryButtonClass}>
                  <Check size={16} aria-hidden="true" /> Approve and publish
                </button>
                <button
                  type="button"
                  onClick={() => prepare("reject")}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 focus:ring-4 focus:ring-red-100 focus:outline-none"
                >
                  <XCircle size={16} aria-hidden="true" /> Reject with note
                </button>
              </div>
            ) : article.status === "published" ? (
              <button
                type="button"
                onClick={() => prepare("archive")}
                className={`${secondaryButtonClass} w-full`}
              >
                <Archive size={16} aria-hidden="true" /> Archive article
              </button>
            ) : (
              <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
                <Clock3 size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                No moderation action is available while this article is {humanize(article.status)}.
              </p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function ArticleStatus({ value }: { value: StudentArticleStatus }) {
  const styles =
    value === "published"
      ? "bg-emerald-50 text-emerald-700"
      : value === "submitted"
        ? "bg-sky-50 text-sky-800"
        : value === "rejected"
          ? "bg-red-50 text-red-700"
          : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-extrabold ${styles}`}>
      {value === "submitted" ? "Awaiting review" : humanize(value)}
    </span>
  );
}

function decisionPrompt(decision: ReviewDecision) {
  if (decision === "approve") return "Publish this student article now?";
  if (decision === "reject") return "Reject this article and send the review note?";
  return "Archive this article and remove it from the public website?";
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The review decision could not be saved. No success was recorded.";
}
