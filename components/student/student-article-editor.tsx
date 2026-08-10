"use client";

import { AlertCircle, ArrowLeft, LoaderCircle, Save, Send, Trash2, Undo2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArticleStatusBadge, articleStatusPresentation } from "./article-status-badge";
import { studentArticlesApi } from "./convex-api";
import { useStudentSession } from "./student-session-gate";
import { StudentWorkspaceShell } from "./student-workspace-shell";
import type { Student, StudentArticle, StudentArticleDraftInput } from "./types";

const fieldClass =
  "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2e3192] focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600";

const emptyDraft: StudentArticleDraftInput = {
  title: "",
  excerpt: "",
  body: "",
  category: "",
  tags: [],
};

type Feedback = { kind: "success" | "error" | "info"; message: string } | null;

export function StudentArticleEditor({
  articleId,
  student: studentOverride,
}: {
  articleId?: string;
  student?: Student;
}) {
  const student = useStudentSession(studentOverride);
  const router = useRouter();
  const queriedArticle = useQuery(studentArticlesApi.getMine, articleId ? { articleId } : "skip");
  const saveDraftMutation = useMutation(studentArticlesApi.saveDraft);
  const submitMutation = useMutation(studentArticlesApi.submitForReview);
  const withdrawMutation = useMutation(studentArticlesApi.withdrawSubmission);
  const deleteMutation = useMutation(studentArticlesApi.deleteDraft);
  const [savedArticle, setSavedArticle] = useState<StudentArticle | null>(null);
  const [draft, setDraft] = useState<StudentArticleDraftInput>(emptyDraft);
  const [tagsText, setTagsText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"save" | "submit" | "withdraw" | "delete" | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const loadedIdRef = useRef<string | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);

  const article =
    savedArticle && (!queriedArticle || savedArticle.updatedAt > queriedArticle.updatedAt)
      ? savedArticle
      : (queriedArticle ?? savedArticle ?? null);
  const loading = Boolean(articleId && queriedArticle === undefined && !savedArticle);
  const missing = Boolean(articleId && queriedArticle === null && !savedArticle);
  const editable = !article || article.status === "draft" || article.status === "rejected";

  useEffect(() => {
    if (!queriedArticle || loadedIdRef.current === queriedArticle._id) return;
    loadedIdRef.current = queriedArticle._id;
    setDraft({
      title: queriedArticle.title,
      excerpt: queriedArticle.excerpt,
      body: queriedArticle.body,
      category: queriedArticle.category,
      tags: queriedArticle.tags,
    });
    setTagsText(queriedArticle.tags.join(", "));
    setDirty(false);
  }, [queriedArticle]);

  useEffect(() => {
    if (!dirty) return;
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);

  const status = article ? articleStatusPresentation(article.status) : null;
  const wordCount = useMemo(() => draft.body.trim().split(/\s+/).filter(Boolean).length, [draft.body]);

  function updateDraft<Key extends keyof StudentArticleDraftInput>(
    key: Key,
    value: StudentArticleDraftInput[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setFeedback(null);
  }

  function parsedTags() {
    return tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .filter(
        (tag, index, values) =>
          values.findIndex((value) => value.toLowerCase() === tag.toLowerCase()) === index,
      );
  }

  function validateDraft(forSubmission = false) {
    if (!draft.title.trim() || !draft.excerpt.trim() || !draft.body.trim() || !draft.category.trim()) {
      setFeedback({ kind: "error", message: "Complete the title, summary, category, and article body." });
      requestAnimationFrame(() => feedbackRef.current?.focus());
      return false;
    }
    const tags = parsedTags();
    if (tags.length > 8 || tags.some((tag) => tag.length > 40)) {
      setFeedback({ kind: "error", message: "Use no more than 8 tags, with up to 40 characters per tag." });
      requestAnimationFrame(() => feedbackRef.current?.focus());
      return false;
    }
    if (
      forSubmission &&
      (draft.title.trim().length < 5 ||
        draft.excerpt.trim().length < 30 ||
        draft.body.trim().length < 100 ||
        draft.category.trim().length < 2)
    ) {
      setFeedback({
        kind: "error",
        message:
          "Before submitting, use a title of at least 5 characters, a 30-character summary, and an article body of at least 100 characters.",
      });
      requestAnimationFrame(() => feedbackRef.current?.focus());
      return false;
    }
    return true;
  }

  function normalizedDraft(): StudentArticleDraftInput {
    return {
      title: draft.title.trim(),
      excerpt: draft.excerpt.trim(),
      body: draft.body.trim(),
      category: draft.category.trim(),
      tags: parsedTags(),
    };
  }

  async function saveDraft(options?: { quiet?: boolean }) {
    if (!editable || !validateDraft()) return null;
    if (!options?.quiet) setBusy("save");
    setFeedback(null);
    try {
      const saved = await saveDraftMutation({
        ...(article?._id ? { articleId: article._id } : {}),
        article: normalizedDraft(),
      });
      setSavedArticle(saved);
      setDraft({
        title: saved.title,
        excerpt: saved.excerpt,
        body: saved.body,
        category: saved.category,
        tags: saved.tags,
      });
      setTagsText(saved.tags.join(", "));
      setDirty(false);
      if (!articleId) router.replace(`/student/articles/${encodeURIComponent(saved._id)}/edit`);
      if (!options?.quiet) setFeedback({ kind: "success", message: "Your private draft has been saved." });
      return saved;
    } catch (caught) {
      setFeedback({
        kind: "error",
        message: caught instanceof Error ? caught.message : "Your draft could not be saved.",
      });
      requestAnimationFrame(() => feedbackRef.current?.focus());
      return null;
    } finally {
      if (!options?.quiet) setBusy(null);
    }
  }

  async function submitForReview() {
    setConfirmSubmit(false);
    setBusy("submit");
    setFeedback(null);
    const saved = dirty || !article ? await saveDraft({ quiet: true }) : article;
    if (!saved) {
      setBusy(null);
      return;
    }
    try {
      const submitted = await submitMutation({ articleId: saved._id });
      setSavedArticle(submitted);
      setDirty(false);
      setFeedback({
        kind: "success",
        message: "Your article has been submitted for school review. It is not public yet.",
      });
    } catch (caught) {
      setFeedback({
        kind: "error",
        message: caught instanceof Error ? caught.message : "The article could not be submitted for review.",
      });
    } finally {
      setBusy(null);
      requestAnimationFrame(() => feedbackRef.current?.focus());
    }
  }

  async function withdrawSubmission() {
    if (!article || article.status !== "submitted") return;
    setBusy("withdraw");
    setFeedback(null);
    try {
      const withdrawn = await withdrawMutation({ articleId: article._id });
      setSavedArticle(withdrawn);
      setFeedback({ kind: "success", message: "The submission is a private draft again and can be edited." });
    } catch (caught) {
      setFeedback({
        kind: "error",
        message: caught instanceof Error ? caught.message : "The submission could not be withdrawn.",
      });
    } finally {
      setBusy(null);
      requestAnimationFrame(() => feedbackRef.current?.focus());
    }
  }

  async function deleteDraft() {
    if (!article || (article.status !== "draft" && article.status !== "rejected")) return;
    setConfirmDelete(false);
    setBusy("delete");
    try {
      await deleteMutation({ articleId: article._id });
      setDirty(false);
      router.replace("/student/articles");
      router.refresh();
    } catch (caught) {
      setFeedback({
        kind: "error",
        message: caught instanceof Error ? caught.message : "The draft could not be deleted.",
      });
      setBusy(null);
      requestAnimationFrame(() => feedbackRef.current?.focus());
    }
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveDraft();
  }

  function requestReview() {
    if (!validateDraft(true)) return;
    setConfirmSubmit(true);
    setConfirmDelete(false);
    requestAnimationFrame(() => confirmationRef.current?.focus());
  }

  return (
    <StudentWorkspaceShell
      student={student}
      eyebrow={articleId ? "Article workspace" : "New draft"}
      title={articleId ? article?.title || "Article details" : "Write a new article"}
      description="Save your work privately, then submit it when it is ready for authorised school staff to review."
    >
      <Link
        href="/student/articles"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#2e3192]"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Back to my articles
      </Link>

      {loading ? (
        <div
          className="mt-4 grid min-h-72 place-items-center rounded-2xl border border-slate-200 bg-white"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
            <LoaderCircle className="animate-spin text-[#2e3192]" size={20} aria-hidden="true" />
            Loading article…
          </div>
        </div>
      ) : missing ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-white p-6 sm:p-8">
          <AlertCircle className="text-red-600" size={27} aria-hidden="true" />
          <h2 className="mt-4 text-xl font-black text-[#12123a]">Article not found</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This article may have been removed, or it does not belong to your account.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <form
            onSubmit={handleSave}
            className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
          >
            {article && (
              <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-5">
                <ArticleStatusBadge status={article.status} />
                <p className="text-sm text-slate-600">{status?.description}</p>
              </div>
            )}

            {article?.reviewNote && (article.status === "rejected" || article.status === "archived") && (
              <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-950">
                <p className="font-extrabold">Reviewer feedback</p>
                <p className="mt-1 whitespace-pre-wrap">{article.reviewNote}</p>
              </div>
            )}

            {feedback && (
              <div
                ref={feedbackRef}
                role={feedback.kind === "error" ? "alert" : "status"}
                tabIndex={-1}
                className={`mb-6 rounded-xl border px-4 py-3 text-sm leading-6 outline-none focus:ring-4 ${
                  feedback.kind === "error"
                    ? "border-red-200 bg-red-50 text-red-800 focus:ring-red-100"
                    : feedback.kind === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 focus:ring-emerald-100"
                      : "border-sky-200 bg-sky-50 text-sky-900 focus:ring-sky-100"
                }`}
              >
                {feedback.message}
              </div>
            )}

            <fieldset disabled={!editable || busy !== null} className="space-y-5 disabled:opacity-90">
              <legend className="sr-only">Article content</legend>
              <label className="block text-sm font-bold text-slate-700">
                Article title <span className="text-red-600">*</span>
                <input
                  required
                  value={draft.title}
                  onChange={(event) => updateDraft("title", event.target.value)}
                  maxLength={160}
                  className={fieldClass}
                  placeholder="Give your article a clear title"
                />
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-bold text-slate-700">
                  Category <span className="text-red-600">*</span>
                  <input
                    required
                    value={draft.category}
                    onChange={(event) => updateDraft("category", event.target.value)}
                    maxLength={80}
                    className={fieldClass}
                    placeholder="For example: Student life"
                  />
                </label>
                <label className="block text-sm font-bold text-slate-700">
                  Tags
                  <input
                    value={tagsText}
                    onChange={(event) => {
                      setTagsText(event.target.value);
                      setDirty(true);
                      setFeedback(null);
                    }}
                    maxLength={300}
                    className={fieldClass}
                    placeholder="science, sports, creativity"
                    aria-describedby="article-tags-help"
                  />
                  <span
                    id="article-tags-help"
                    className="mt-2 block text-xs leading-5 font-medium text-slate-500"
                  >
                    Separate tags with commas.
                  </span>
                </label>
              </div>
              <label className="block text-sm font-bold text-slate-700">
                Short summary <span className="text-red-600">*</span>
                <textarea
                  required
                  value={draft.excerpt}
                  onChange={(event) => updateDraft("excerpt", event.target.value)}
                  maxLength={500}
                  rows={4}
                  className={fieldClass}
                  placeholder="Introduce the topic in two or three sentences."
                />
                <span className="mt-2 block text-right text-xs font-medium text-slate-500">
                  {draft.excerpt.length}/500 characters
                </span>
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Article body <span className="text-red-600">*</span>
                <textarea
                  required
                  value={draft.body}
                  onChange={(event) => updateDraft("body", event.target.value)}
                  maxLength={20_000}
                  rows={18}
                  className={`${fieldClass} leading-7`}
                  placeholder="Write your article here. Use blank lines to separate paragraphs."
                />
                <span className="mt-2 flex flex-wrap justify-between gap-2 text-xs font-medium text-slate-500">
                  <span>{wordCount} words</span>
                  <span>{draft.body.length}/20,000 characters</span>
                </span>
              </label>
            </fieldset>

            {editable && (
              <div className="mt-7 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:flex-wrap">
                <button
                  type="submit"
                  disabled={busy !== null}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:border-sky-300 hover:bg-sky-50 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
                >
                  {busy === "save" ? (
                    <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />
                  ) : (
                    <Save size={17} aria-hidden="true" />
                  )}
                  {busy === "save" ? "Saving…" : "Save private draft"}
                </button>
                <button
                  type="button"
                  onClick={requestReview}
                  disabled={busy !== null}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2e3192] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#262873] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
                >
                  <Send size={17} aria-hidden="true" /> Submit for review
                </button>
              </div>
            )}

            {article?.status === "submitted" && (
              <button
                type="button"
                onClick={() => void withdrawSubmission()}
                disabled={busy !== null}
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
              >
                {busy === "withdraw" ? (
                  <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />
                ) : (
                  <Undo2 size={17} aria-hidden="true" />
                )}
                {busy === "withdraw" ? "Withdrawing…" : "Withdraw and continue editing"}
              </button>
            )}
          </form>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm leading-6 text-sky-950">
              <h2 className="font-extrabold">Before you submit</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>Use your own words and check important facts.</li>
                <li>Do not include private student or family information.</li>
                <li>School staff may request changes before the article appears publicly.</li>
              </ul>
            </div>

            {confirmSubmit && (
              <div
                ref={confirmationRef}
                tabIndex={-1}
                className="rounded-2xl border border-amber-300 bg-amber-50 p-5 outline-none focus:ring-4 focus:ring-amber-100"
                aria-labelledby="submit-confirmation-title"
              >
                <h2 id="submit-confirmation-title" className="font-extrabold text-amber-950">
                  Send this article for review?
                </h2>
                <p className="mt-2 text-sm leading-6 text-amber-900">
                  It will become read-only while staff review it. This action does not make it public.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => void submitForReview()}
                    disabled={busy !== null}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2e3192] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {busy === "submit" ? "Submitting…" : "Yes, submit for review"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmSubmit(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-bold text-amber-950"
                  >
                    Keep editing
                  </button>
                </div>
              </div>
            )}

            {article && (article.status === "draft" || article.status === "rejected") && (
              <div className="rounded-2xl border border-red-200 bg-white p-5">
                <h2 className="font-extrabold text-[#12123a]">Remove this draft</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Deleting a draft cannot be undone.</p>
                {confirmDelete ? (
                  <div className="mt-4 rounded-xl bg-red-50 p-4">
                    <p className="text-sm font-bold text-red-900">Delete this draft permanently?</p>
                    <div className="mt-3 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => void deleteDraft()}
                        disabled={busy !== null}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                      >
                        {busy === "delete" ? "Deleting…" : "Yes, delete draft"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete(true);
                      setConfirmSubmit(false);
                    }}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={16} aria-hidden="true" /> Delete draft
                  </button>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </StudentWorkspaceShell>
  );
}
