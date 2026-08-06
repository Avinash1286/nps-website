"use client";

import { useMutation, useQuery } from "convex/react";
import {
  Archive,
  BookOpenText,
  CheckCircle2,
  Edit3,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  assistantAdminApi,
  type AssistantContext,
  type AssistantContextInput,
  type AssistantContextStatus,
} from "./convex-api";
import {
  EmptyState,
  Feedback,
  LoadingPanel,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./ui";

type ContextDraft = Omit<AssistantContextInput, "keywords"> & {
  id?: string;
  keywordsText: string;
};

type ContextBusyAction = "publish" | "archive" | "delete";

const emptyDraft: ContextDraft = {
  title: "",
  category: "General",
  content: "",
  keywordsText: "",
  publicPath: "",
  priority: 50,
  status: "draft",
};

const statusStyles: Record<AssistantContextStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-amber-50 text-amber-800",
};

export function parseAssistantKeywords(value: string) {
  const seen = new Set<string>();
  return value
    .split(/[\n,]/)
    .map((keyword) => keyword.trim().toLocaleLowerCase("en-US"))
    .filter((keyword) => {
      const key = keyword;
      if (!keyword || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function validateAssistantContext(draft: ContextDraft): string | null {
  if (!draft.title.trim()) return "Enter a context title.";
  if (!draft.category.trim()) return "Enter a category.";
  if (draft.content.trim().length < 10) return "Context must contain at least 10 characters.";
  const keywords = parseAssistantKeywords(draft.keywordsText);
  if (keywords.length > 20) return "Use no more than 20 keywords.";
  if (keywords.some((keyword) => keyword.length > 60)) return "Each keyword must be 60 characters or fewer.";
  if (!Number.isInteger(draft.priority) || draft.priority < 0 || draft.priority > 100) {
    return "Priority must be a whole number from 0 to 100.";
  }
  const path = draft.publicPath?.trim();
  if (
    path &&
    (path.length > 500 ||
      !path.startsWith("/") ||
      path.startsWith("//") ||
      path.includes("\\") ||
      /[\u0000-\u001F\u007F\s]/.test(path))
  ) {
    return "Public path must be a same-site route beginning with a single /.";
  }
  return null;
}

function toDraft(context: AssistantContext): ContextDraft {
  return {
    id: context._id,
    title: context.title,
    category: context.category,
    content: context.content,
    keywordsText: context.keywords.join(", "),
    publicPath: context.publicPath ?? "",
    priority: context.priority,
    status: context.status,
  };
}

function contextInput(context: AssistantContext, status = context.status): AssistantContextInput {
  return {
    title: context.title,
    category: context.category,
    content: context.content,
    keywords: context.keywords,
    ...(context.publicPath ? { publicPath: context.publicPath } : {}),
    priority: context.priority,
    status,
  };
}

export function AssistantContextManager({ contextLimit = 200 }: { contextLimit?: number }) {
  const [filter, setFilter] = useState<"all" | AssistantContextStatus>("all");
  const contexts = useQuery(assistantAdminApi.listContexts, filter === "all" ? {} : { status: filter });
  const upsert = useMutation(assistantAdminApi.upsertContext);
  const remove = useMutation(assistantAdminApi.removeContext);
  const [draft, setDraft] = useState<ContextDraft | null>(null);
  const [busyAction, setBusyAction] = useState<{ id: string; action: ContextBusyAction } | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const addContextButtonRef = useRef<HTMLButtonElement>(null);
  const editorTriggerRef = useRef<HTMLElement | null>(null);
  const contentInputId = useId();
  const contentDescriptionId = useId();
  const keywordsInputId = useId();
  const keywordsDescriptionId = useId();
  const editorKey = draft ? (draft.id ?? "new") : null;

  const sortedContexts = useMemo(
    () =>
      [...(contexts ?? [])].sort(
        (left, right) => right.priority - left.priority || right.updatedAt - left.updatedAt,
      ),
    [contexts],
  );

  useEffect(() => {
    if (!editorKey) return;
    const frame = window.requestAnimationFrame(() => titleInputRef.current?.focus({ preventScroll: false }));
    return () => window.cancelAnimationFrame(frame);
  }, [editorKey]);

  function closeEditor() {
    const preferredTrigger = editorTriggerRef.current;
    setDraft(null);
    window.requestAnimationFrame(() => {
      const target = preferredTrigger?.isConnected ? preferredTrigger : addContextButtonRef.current;
      target?.scrollIntoView?.({ block: "nearest" });
      target?.focus({ preventScroll: false });
    });
  }

  function set<K extends keyof ContextDraft>(key: K, value: ContextDraft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save() {
    if (!draft) return;
    const validationError = validateAssistantContext(draft);
    if (validationError) {
      setFeedback({ kind: "error", text: validationError });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const publicPath = draft.publicPath?.trim();
      await upsert({
        ...(draft.id ? { id: draft.id } : {}),
        context: {
          title: draft.title.trim(),
          category: draft.category.trim(),
          content: draft.content.trim(),
          keywords: parseAssistantKeywords(draft.keywordsText),
          ...(publicPath ? { publicPath } : {}),
          priority: draft.priority,
          status: draft.status,
        },
      });
      setFeedback({
        kind: "success",
        text:
          draft.status === "published"
            ? "Context saved and published to assistant grounding."
            : `Context saved as ${draft.status}.`,
      });
      closeEditor();
    } catch (caught) {
      setFeedback({
        kind: "error",
        text: caught instanceof Error ? caught.message : "The assistant context could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(context: AssistantContext, status: AssistantContextStatus) {
    const action: ContextBusyAction = status === "published" ? "publish" : "archive";
    setBusyAction({ id: context._id, action });
    setFeedback(null);
    try {
      await upsert({ id: context._id, context: contextInput(context, status) });
      setFeedback({
        kind: "success",
        text:
          status === "published"
            ? `“${context.title}” is now available to the public assistant.`
            : `“${context.title}” was ${status}.`,
      });
    } catch (caught) {
      setFeedback({
        kind: "error",
        text: caught instanceof Error ? caught.message : "The context status could not be changed.",
      });
    } finally {
      setBusyAction((current) => (current?.id === context._id && current.action === action ? null : current));
    }
  }

  async function deleteContext(context: AssistantContext) {
    const consequence =
      context.status === "published"
        ? " It will disappear from assistant grounding immediately and cannot be undone."
        : " This cannot be undone.";
    if (!window.confirm(`Permanently delete “${context.title}”?${consequence}`)) return;

    setBusyAction({ id: context._id, action: "delete" });
    setFeedback(null);
    try {
      await remove({ id: context._id });
      if (draft?.id === context._id) {
        editorTriggerRef.current = addContextButtonRef.current;
        closeEditor();
      }
      setFeedback({ kind: "success", text: `“${context.title}” was permanently deleted.` });
    } catch (caught) {
      setFeedback({
        kind: "error",
        text: caught instanceof Error ? caught.message : "The assistant context could not be deleted.",
      });
    } finally {
      setBusyAction((current) =>
        current?.id === context._id && current.action === "delete" ? null : current,
      );
    }
  }

  return (
    <section aria-labelledby="assistant-contexts-heading" className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sky-800">
            <BookOpenText size={19} aria-hidden="true" />
            <p className="text-xs font-extrabold tracking-[.16em] uppercase">Grounding library</p>
          </div>
          <h2 id="assistant-contexts-heading" className="mt-2 text-xl font-black text-slate-900">
            Assistant contexts
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Curate verified facts that supplement published website content. Only published entries are sent
            to Gemini.
          </p>
        </div>
        <button
          ref={addContextButtonRef}
          type="button"
          className={`${primaryButtonClass} w-full shrink-0 sm:w-auto`}
          onClick={(event) => {
            editorTriggerRef.current = event.currentTarget;
            setFeedback(null);
            setDraft({ ...emptyDraft });
          }}
        >
          <Plus size={16} aria-hidden="true" /> Add context
        </button>
      </div>

      {feedback && <Feedback kind={feedback.kind}>{feedback.text}</Feedback>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,.72fr)]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-black text-slate-900">Knowledge entries</h3>
              <p className="mt-1 text-xs text-slate-500">
                Up to {contextLimit} contexts, ordered by priority.
              </p>
            </div>
            <label className="text-xs font-bold text-slate-600">
              <span className="sr-only">Filter contexts by status</span>
              <select
                className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100"
                value={filter}
                onChange={(event) => setFilter(event.target.value as "all" | AssistantContextStatus)}
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>

          {contexts === undefined ? (
            <div className="p-5">
              <LoadingPanel label="Loading assistant contexts" />
            </div>
          ) : sortedContexts.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title={filter === "all" ? "No assistant contexts yet" : `No ${filter} contexts`}
                description="Create a verified entry to give the assistant school-specific facts beyond standard published pages."
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sortedContexts.map((context) => {
                const rowAction = busyAction?.id === context._id ? busyAction.action : null;
                const controlsDisabled = busyAction !== null;
                return (
                  <article key={context._id} className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold capitalize ${statusStyles[context.status]}`}
                          >
                            {context.status}
                          </span>
                          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800">
                            {context.category}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            Priority {context.priority}
                          </span>
                        </div>
                        <h4 className="mt-3 font-extrabold text-slate-900">{context.title}</h4>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 whitespace-pre-wrap text-slate-600">
                          {context.content}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {context.keywords.map((keyword) => (
                            <span
                              key={keyword}
                              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                          {context.publicPath ? (
                            <a
                              href={context.publicPath}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold break-all text-sky-800 underline"
                            >
                              {context.publicPath}
                              <span className="sr-only"> (opens in a new tab)</span>
                            </a>
                          ) : (
                            "No public source route"
                          )}
                          <span aria-hidden="true"> · </span>Updated{" "}
                          {new Date(context.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={secondaryButtonClass}
                        disabled={controlsDisabled}
                        onClick={(event) => {
                          editorTriggerRef.current = event.currentTarget;
                          setDraft(toDraft(context));
                        }}
                      >
                        <Edit3 size={15} aria-hidden="true" /> Edit
                      </button>
                      {context.status !== "published" && (
                        <button
                          type="button"
                          className={secondaryButtonClass}
                          disabled={controlsDisabled}
                          aria-busy={rowAction === "publish"}
                          onClick={() => void changeStatus(context, "published")}
                        >
                          {rowAction === "publish" ? (
                            <LoaderCircle className="animate-spin" size={15} aria-hidden="true" />
                          ) : (
                            <CheckCircle2 size={15} aria-hidden="true" />
                          )}
                          {rowAction === "publish" ? "Publishing..." : "Publish"}
                        </button>
                      )}
                      {context.status !== "archived" && (
                        <button
                          type="button"
                          className={secondaryButtonClass}
                          disabled={controlsDisabled}
                          aria-busy={rowAction === "archive"}
                          onClick={() => void changeStatus(context, "archived")}
                        >
                          {rowAction === "archive" ? (
                            <LoaderCircle className="animate-spin" size={15} aria-hidden="true" />
                          ) : (
                            <Archive size={15} aria-hidden="true" />
                          )}
                          {rowAction === "archive" ? "Archiving..." : "Archive"}
                        </button>
                      )}
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 focus:ring-4 focus:ring-red-100 focus:outline-none disabled:opacity-50"
                        disabled={controlsDisabled}
                        aria-busy={rowAction === "delete"}
                        onClick={() => void deleteContext(context)}
                      >
                        {rowAction === "delete" ? (
                          <LoaderCircle className="animate-spin" size={15} aria-hidden="true" />
                        ) : (
                          <Trash2 size={15} aria-hidden="true" />
                        )}
                        {rowAction === "delete" ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="xl:sticky xl:top-24">
          {draft ? (
            <form
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-extrabold tracking-[.14em] text-sky-700 uppercase">
                    {draft.id ? "Edit context" : "New context"}
                  </p>
                  <h3 className="mt-1 font-black text-slate-900">
                    {draft.id ? draft.title || "Untitled context" : "Add verified information"}
                  </h3>
                </div>
                <button
                  type="button"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:ring-4 focus:ring-sky-100 focus:outline-none"
                  onClick={closeEditor}
                  aria-label="Close context editor"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <label className="block text-xs font-extrabold text-slate-700">
                  Title
                  <input
                    ref={titleInputRef}
                    className={inputClass}
                    value={draft.title}
                    maxLength={160}
                    onChange={(event) => set("title", event.target.value)}
                    required
                  />
                </label>
                <label className="block text-xs font-extrabold text-slate-700">
                  Category
                  <input
                    className={inputClass}
                    value={draft.category}
                    maxLength={80}
                    onChange={(event) => set("category", event.target.value)}
                    required
                    placeholder="Admissions, academics, transport…"
                  />
                </label>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700" htmlFor={contentInputId}>
                    Verified context
                  </label>
                  <textarea
                    id={contentInputId}
                    className={`${inputClass} min-h-48 resize-y leading-6`}
                    value={draft.content}
                    maxLength={12_000}
                    onChange={(event) => set("content", event.target.value)}
                    required
                    placeholder="Write the exact facts the assistant may use."
                    aria-describedby={contentDescriptionId}
                  />
                  <span
                    id={contentDescriptionId}
                    className="mt-1 block text-right text-[10px] font-semibold text-slate-400"
                  >
                    {draft.content.length.toLocaleString()} / 12,000
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700" htmlFor={keywordsInputId}>
                    Keywords
                  </label>
                  <textarea
                    id={keywordsInputId}
                    className={`${inputClass} min-h-24 resize-y`}
                    value={draft.keywordsText}
                    onChange={(event) => set("keywordsText", event.target.value)}
                    placeholder="fees, scholarship, admission"
                    aria-describedby={keywordsDescriptionId}
                  />
                  <span
                    id={keywordsDescriptionId}
                    className="mt-1 block text-[10px] leading-4 font-semibold text-slate-400"
                  >
                    Separate up to 20 keywords with commas or new lines.
                  </span>
                </div>
                <label className="block text-xs font-extrabold text-slate-700">
                  Public source path <span className="font-semibold text-slate-400">(optional)</span>
                  <input
                    className={inputClass}
                    value={draft.publicPath ?? ""}
                    maxLength={500}
                    onChange={(event) => set("publicPath", event.target.value)}
                    placeholder="/admissions/fees-scholarships"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-extrabold text-slate-700">
                    Priority
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={draft.priority}
                      onChange={(event) => set("priority", Number(event.target.value))}
                      required
                    />
                  </label>
                  <label className="block text-xs font-extrabold text-slate-700">
                    Status
                    <select
                      className={inputClass}
                      value={draft.status}
                      onChange={(event) => set("status", event.target.value as AssistantContextStatus)}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={closeEditor}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className={primaryButtonClass} disabled={saving}>
                  {saving ? (
                    <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
                  ) : (
                    <Save size={16} aria-hidden="true" />
                  )}
                  {saving ? "Saving…" : draft.status === "published" ? "Save & publish" : "Save context"}
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <BookOpenText className="mx-auto text-sky-700" aria-hidden="true" />
              <h3 className="mt-4 font-extrabold text-slate-800">Select or add a context</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Draft, publish, or archive school-approved information without exposing private data.
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
