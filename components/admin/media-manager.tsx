"use client";

import { useMutation, usePaginatedQuery } from "convex/react";
import { ExternalLink, File, FileImage, FileText, LoaderCircle, Trash2, UploadCloud } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { ADMIN_ACCESS_ROLES } from "@/lib/admin/authorization";
import { AdminFeatureGate } from "./admin-gate";
import { mediaApi, type AdminRecord } from "./convex-api";
import { formatDate } from "./content-manager";
import { MediaThumbnail } from "./media-thumbnail";
import {
  EmptyState,
  Feedback,
  LoadingPanel,
  PaginationControls,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./ui";

const allowedTypes = [
  "image/*",
  "video/*",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const maxSize = 20 * 1024 * 1024;

export function MediaManager() {
  return (
    <AdminFeatureGate requiredRoles={ADMIN_ACCESS_ROLES.content}>
      <MediaData />
    </AdminFeatureGate>
  );
}

function MediaData() {
  const [folder, setFolder] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [targetFolder, setTargetFolder] = useState("general");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const {
    results,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    mediaApi.listMedia,
    { ...(folder.trim() ? { folder: folder.trim() } : {}) },
    { initialNumItems: 30 },
  );
  const generateUploadUrl = useMutation(mediaApi.generateUploadUrl);
  const finalizeUpload = useMutation(mediaApi.finalizeUpload);
  const deleteMedia = useMutation(mediaApi.deleteMedia);
  if (paginationStatus === "LoadingFirstPage") return <LoadingPanel label="Loading media library" />;
  function pick(next: File | null) {
    setFeedback(null);
    if (!next) {
      setFile(null);
      return;
    }
    const allowed =
      next.type.startsWith("image/") || next.type.startsWith("video/") || allowedTypes.includes(next.type);
    if (!allowed) {
      setFile(null);
      setFeedback({ kind: "error", text: "Use an image, video, PDF, Word, or Excel file." });
      return;
    }
    if (next.size > maxSize) {
      setFile(null);
      setFeedback({ kind: "error", text: "The selected file is larger than the 20 MB upload limit." });
      return;
    }
    setFile(next);
    if (next.type.startsWith("image/") && !alt)
      setAlt(next.name.replace(/[-_]/g, " ").replace(/\.[^.]+$/, ""));
  }
  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setFeedback({ kind: "error", text: "Choose a verified file before uploading." });
      return;
    }
    if (file.type.startsWith("image/") && !alt.trim()) {
      setFeedback({ kind: "error", text: "Accessible alternative text is required for images." });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const uploadUrl = await generateUploadUrl({});
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error(`Storage upload failed (${response.status}).`);
      const payload = (await response.json()) as { storageId?: string };
      if (!payload.storageId) throw new Error("Storage did not return a file identifier.");
      await finalizeUpload({
        storageId: payload.storageId,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        ...(alt.trim() ? { alt: alt.trim() } : {}),
        ...(targetFolder.trim() ? { folder: targetFolder.trim() } : {}),
      });
      setFile(null);
      setAlt("");
      if (input.current) input.current.value = "";
      setFeedback({ kind: "success", text: `${file.name} uploaded and registered in the media library.` });
    } catch (caught) {
      setFeedback({ kind: "error", text: errorMessage(caught) });
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: AdminRecord) {
    if (
      !window.confirm(
        `Delete “${String(item.fileName ?? "this media file")}” from storage? Published references may stop working.`,
      )
    )
      return;
    setFeedback(null);
    try {
      await deleteMedia({ mediaId: item._id });
      setFeedback({ kind: "success", text: "Media file deleted." });
    } catch (caught) {
      setFeedback({ kind: "error", text: errorMessage(caught) });
    }
  }
  return (
    <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <form
        onSubmit={upload}
        className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-28"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700">
            <UploadCloud size={20} />
          </span>
          <div>
            <h2 className="font-black">Upload media</h2>
            <p className="text-xs text-slate-500">Maximum 20 MB per file</p>
          </div>
        </div>
        {feedback && (
          <div className="mt-5">
            <Feedback kind={feedback.kind}>{feedback.text}</Feedback>
          </div>
        )}
        <label className="mt-5 grid min-h-36 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-sky-400 hover:bg-sky-50">
          <span>
            <UploadCloud className="mx-auto text-slate-400" />
            <b className="mt-3 block text-sm break-all text-slate-800">
              {file ? file.name : "Choose a file"}
            </b>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Images, video, PDF, Word, or Excel
            </span>
          </span>
          <input
            ref={input}
            type="file"
            accept={allowedTypes.join(",")}
            onChange={(event) => pick(event.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </label>
        {file && (
          <p className="mt-2 text-xs text-slate-500">
            {formatBytes(file.size)} · {file.type}
          </p>
        )}
        <label className="mt-5 block text-sm font-bold">
          Folder
          <input
            value={targetFolder}
            onChange={(event) => setTargetFolder(event.target.value)}
            className={inputClass}
            placeholder="general"
          />
        </label>
        <label className="mt-5 block text-sm font-bold">
          Alternative text{file?.type.startsWith("image/") && <span className="text-red-600"> *</span>}
          <textarea
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            className={inputClass}
            rows={3}
            placeholder="Describe the image for someone who cannot see it"
          />
        </label>
        <button disabled={busy || !file} className={`${primaryButtonClass} mt-5 w-full`}>
          {busy ? <LoaderCircle className="animate-spin" size={17} /> : <UploadCloud size={17} />}
          {busy ? "Uploading…" : "Upload and register"}
        </button>
      </form>
      <div>
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-black">Media library</h2>
            <p className="mt-1 text-xs text-slate-500">{results.length} files loaded in this view</p>
          </div>
          <label className="flex w-full flex-col items-start gap-2 text-sm font-bold sm:w-auto sm:flex-row sm:items-center">
            Folder filter
            <input
              value={folder}
              onChange={(event) => setFolder(event.target.value)}
              className="min-h-11 w-full min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-sky-600 sm:w-auto"
              placeholder="All folders"
            />
          </label>
        </div>
        {results.length === 0 ? (
          <EmptyState
            title="No media files found"
            description="Upload a verified file or clear the folder filter to see the complete media library."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {results.map((item) => (
              <MediaCard key={item._id} item={item} onDelete={() => void remove(item)} />
            ))}
          </div>
        )}
        <PaginationControls
          status={paginationStatus}
          loadedCount={results.length}
          noun="media files"
          onLoadMore={() => loadMore(30)}
        />
      </div>
    </section>
  );
}

export function MediaCard({ item, onDelete }: { item: AdminRecord; onDelete: () => void }) {
  const mime = String(item.mimeType ?? "");
  const Icon = mime.startsWith("image/") ? FileImage : mime === "application/pdf" ? FileText : File;
  const url = typeof item.url === "string" ? item.url : null;
  const fileName = String(item.fileName ?? "Media file");
  const previewAlt = typeof item.alt === "string" && item.alt.trim() ? item.alt : fileName;
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {mime.startsWith("image/") && url ? (
        <MediaThumbnail url={url} alt={previewAlt} />
      ) : (
        <div className="grid h-40 place-items-center bg-gradient-to-br from-slate-50 to-sky-50">
          <Icon className="text-sky-700" size={38} />
        </div>
      )}
      <div className="p-4">
        <p className="truncate text-sm font-extrabold" title={fileName}>
          {fileName}
        </p>
        <p className="mt-1 truncate text-xs text-slate-500">
          {String(item.folder ?? "general")} · {formatBytes(Number(item.size ?? 0))}
        </p>
        {item.alt ? (
          <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-600">{String(item.alt)}</p>
        ) : (
          <p className="mt-3 text-xs font-semibold text-amber-700">No alternative text</p>
        )}
        <p className="mt-3 text-[10px] text-slate-400">
          {typeof item.createdAt === "number" ? formatDate(item.createdAt) : "Upload date unavailable"}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className={secondaryButtonClass}
              aria-label={`Open ${String(item.fileName)}`}
            >
              <ExternalLink size={15} /> Open
            </a>
          )}
          <button
            onClick={onDelete}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-red-100 p-2.5 text-red-700 hover:bg-red-50"
            aria-label={`Delete ${String(item.fileName)}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
function formatBytes(size: number) {
  if (!size) return "0 B";
  const unit = Math.min(Math.floor(Math.log(size) / Math.log(1024)), 3);
  return `${(size / 1024 ** unit).toFixed(unit ? 1 : 0)} ${["B", "KB", "MB", "GB"][unit]}`;
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The media operation failed. No success was recorded.";
}
