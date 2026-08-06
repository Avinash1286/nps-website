"use client";

import { useMutation, usePaginatedQuery } from "convex/react";
import { Eye, EyeOff, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ADMIN_ACCESS_ROLES } from "@/lib/admin/authorization";
import { AdminFeatureGate } from "./admin-gate";
import { adminApi, mediaApi, type AdminRecord } from "./convex-api";
import { itemLabel } from "./content-manager";
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

type GalleryForm = {
  mediaAssetId: string;
  url: string;
  thumbnailUrl: string;
  mediaType: "image" | "video";
  alt: string;
  caption: string;
  credit: string;
  order: string;
  visible: boolean;
};

const empty: GalleryForm = {
  mediaAssetId: "",
  url: "",
  thumbnailUrl: "",
  mediaType: "image",
  alt: "",
  caption: "",
  credit: "",
  order: "0",
  visible: true,
};

export function GalleryItemsManager() {
  return (
    <AdminFeatureGate requiredRoles={ADMIN_ACCESS_ROLES.content}>
      <GalleryItemsData />
    </AdminFeatureGate>
  );
}

function GalleryItemsData() {
  const {
    results: albums,
    status: albumsStatus,
    loadMore: loadMoreAlbums,
  } = usePaginatedQuery(adminApi.listContent, { type: "galleryAlbums" }, { initialNumItems: 50 });
  const {
    results: media,
    status: mediaStatus,
    loadMore: loadMoreMedia,
  } = usePaginatedQuery(mediaApi.listMedia, {}, { initialNumItems: 50 });
  const [albumId, setAlbumId] = useState("");
  const {
    results: items,
    status: itemsStatus,
    loadMore: loadMoreItems,
  } = usePaginatedQuery(mediaApi.listGalleryItemsAdmin, albumId ? { albumId } : "skip", {
    initialNumItems: 60,
  });
  const upsert = useMutation(mediaApi.upsertGalleryItem);
  const remove = useMutation(mediaApi.deleteGalleryItem);
  const [editing, setEditing] = useState<AdminRecord | null>(null);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const { dialogRef, onDialogKeyDown } = useModalAccessibility<HTMLFormElement>(open, () => setOpen(false));

  if (albumsStatus === "LoadingFirstPage" || mediaStatus === "LoadingFirstPage")
    return <LoadingPanel label="Loading gallery media" />;

  function openNew() {
    setEditing(null);
    setForm({ ...empty, order: String(items.length) });
    setFeedback(null);
    setOpen(true);
  }

  function openEdit(item: AdminRecord) {
    setEditing(item);
    setForm({
      mediaAssetId: "",
      url: String(item.url ?? ""),
      thumbnailUrl: String(item.thumbnailUrl ?? ""),
      mediaType: item.mediaType === "video" ? "video" : "image",
      alt: String(item.alt ?? ""),
      caption: String(item.caption ?? ""),
      credit: String(item.credit ?? ""),
      order: String(item.order ?? 0),
      visible: Boolean(item.visible),
    });
    setFeedback(null);
    setOpen(true);
  }

  function chooseMedia(id: string) {
    const asset = media.find((item) => item._id === id);
    setForm((current) => ({
      ...current,
      mediaAssetId: id,
      url: String(asset?.url ?? current.url),
      mediaType: String(asset?.mimeType ?? "").startsWith("video/") ? "video" : "image",
      alt: String(asset?.alt ?? current.alt),
    }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      if (!albumId) throw new Error("Choose a gallery album first.");
      const asset = media.find((item) => item._id === form.mediaAssetId);
      const storageId = typeof asset?.storageId === "string" ? asset.storageId : undefined;
      const url = form.url.trim();
      if (!storageId && !url && typeof editing?.storageId !== "string") {
        throw new Error("Choose a stored media file or provide an HTTPS media URL.");
      }
      if (!form.alt.trim()) throw new Error("Alternative text is required for accessible gallery media.");
      await upsert({
        ...(editing ? { id: editing._id } : {}),
        item: {
          albumId,
          ...(storageId
            ? { storageId }
            : typeof editing?.storageId === "string"
              ? { storageId: editing.storageId }
              : {}),
          ...(url ? { url } : {}),
          ...(form.thumbnailUrl.trim() ? { thumbnailUrl: form.thumbnailUrl.trim() } : {}),
          mediaType: form.mediaType,
          alt: form.alt.trim(),
          ...(form.caption.trim() ? { caption: form.caption.trim() } : {}),
          ...(form.credit.trim() ? { credit: form.credit.trim() } : {}),
          order: Number(form.order),
          visible: form.visible,
        },
      });
      setOpen(false);
      setFeedback({ kind: "success", text: "Gallery media saved and audited." });
    } catch (caught) {
      setFeedback({
        kind: "error",
        text: caught instanceof Error ? caught.message : "Gallery media could not be saved.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(item: AdminRecord) {
    if (!window.confirm("Remove this item from the album? The original media asset will remain available."))
      return;
    setFeedback(null);
    try {
      await remove({ id: item._id });
      setFeedback({ kind: "success", text: "Item removed from the gallery album." });
    } catch (caught) {
      setFeedback({
        kind: "error",
        text: caught instanceof Error ? caught.message : "Gallery media could not be removed.",
      });
    }
  }

  return (
    <section className="mt-10 border-t border-slate-200 pt-9">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-extrabold tracking-[.17em] text-sky-700 uppercase">Album contents</p>
          <h2 className="mt-2 text-2xl font-black">Gallery media</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Attach uploaded media to an album, write accessible descriptions, and control its public order.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <label className="text-xs font-bold text-slate-600">
            Selected album
            <select
              value={albumId}
              onChange={(event) => setAlbumId(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 sm:w-56"
            >
              <option value="">Choose an album</option>
              {albums.map((album) => (
                <option key={album._id} value={album._id}>
                  {itemLabel(album)}
                </option>
              ))}
            </select>
          </label>
          <button onClick={openNew} disabled={!albumId} className={`${primaryButtonClass} w-full sm:w-auto`}>
            <Plus size={16} /> Add media
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-2">
        <PaginationControls
          status={albumsStatus}
          loadedCount={albums.length}
          noun="gallery albums"
          onLoadMore={() => loadMoreAlbums(50)}
        />
        <PaginationControls
          status={mediaStatus}
          loadedCount={media.length}
          noun="media files for selection"
          onLoadMore={() => loadMoreMedia(50)}
        />
      </div>

      {albumId && (
        <PaginationControls
          status={itemsStatus}
          loadedCount={items.length}
          noun="gallery items"
          onLoadMore={() => loadMoreItems(60)}
        />
      )}

      {feedback && (
        <div className="mb-5">
          <Feedback kind={feedback.kind}>{feedback.text}</Feedback>
        </div>
      )}

      {!albumId ? (
        <EmptyState
          title="Choose an album"
          description="Select an album to review and manage its individual media."
        />
      ) : itemsStatus === "LoadingFirstPage" ? (
        <LoadingPanel label="Loading album media" />
      ) : items.length === 0 ? (
        <EmptyState
          title="This album is empty"
          description="Attach an uploaded media file or an approved external media URL."
          action={
            <button onClick={openNew} className={primaryButtonClass}>
              <Plus size={16} /> Add first item
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...items]
            .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
            .map((item) => (
              <article key={item._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm leading-6 font-extrabold">{String(item.alt)}</p>
                    <p className="mt-1 text-xs text-slate-500 capitalize">
                      {String(item.mediaType)} · Order {String(item.order ?? 0)}
                    </p>
                  </div>
                  {item.visible ? (
                    <Eye className="shrink-0 text-emerald-600" size={16} />
                  ) : (
                    <EyeOff className="shrink-0 text-slate-400" size={16} />
                  )}
                </div>
                {Boolean(item.caption) && (
                  <p className="mt-4 line-clamp-3 text-xs leading-5 text-slate-600">{String(item.caption)}</p>
                )}
                <div className="mt-5 flex justify-end gap-1">
                  <button
                    onClick={() => openEdit(item)}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-sky-800 hover:bg-sky-50"
                    aria-label="Edit gallery item"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => void deleteItem(item)}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-red-700 hover:bg-red-50"
                    aria-label="Delete gallery item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center">
          <form
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gallery-editor-title"
            tabIndex={-1}
            onKeyDown={onDialogKeyDown}
            onSubmit={save}
            className="my-4 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold tracking-[.17em] text-sky-700 uppercase">
                  Album media
                </p>
                <h2 id="gallery-editor-title" className="mt-2 text-2xl font-black">
                  {editing ? "Edit gallery item" : "Add gallery item"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 hover:bg-slate-100"
                aria-label="Close gallery editor"
              >
                <X />
              </button>
            </div>
            {feedback?.kind === "error" && (
              <div className="mt-5">
                <Feedback>{feedback.text}</Feedback>
              </div>
            )}
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-bold sm:col-span-2">
                Stored media
                <select
                  value={form.mediaAssetId}
                  onChange={(event) => chooseMedia(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Use an external URL or keep current file</option>
                  {media.map((asset) => (
                    <option key={asset._id} value={asset._id}>
                      {String(asset.fileName ?? "Media file")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-bold sm:col-span-2">
                Media URL
                <input
                  type="url"
                  value={form.url}
                  onChange={(event) => setForm({ ...form, url: event.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm font-bold">
                Media type
                <select
                  value={form.mediaType}
                  onChange={(event) =>
                    setForm({ ...form, mediaType: event.target.value as GalleryForm["mediaType"] })
                  }
                  className={inputClass}
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </label>
              <label className="block text-sm font-bold">
                Display order
                <input
                  type="number"
                  min="0"
                  value={form.order}
                  onChange={(event) => setForm({ ...form, order: event.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm font-bold sm:col-span-2">
                Alternative text <span className="text-red-600">*</span>
                <textarea
                  required
                  value={form.alt}
                  onChange={(event) => setForm({ ...form, alt: event.target.value })}
                  rows={3}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm font-bold sm:col-span-2">
                Caption
                <textarea
                  value={form.caption}
                  onChange={(event) => setForm({ ...form, caption: event.target.value })}
                  rows={3}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm font-bold">
                Credit
                <input
                  value={form.credit}
                  onChange={(event) => setForm({ ...form, credit: event.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={form.visible}
                  onChange={(event) => setForm({ ...form, visible: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-sky-700"
                />{" "}
                Visible publicly
              </label>
            </div>
            <div className="mt-7 flex flex-col-reverse justify-end gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`${secondaryButtonClass} w-full sm:w-auto`}
              >
                Cancel
              </button>
              <button disabled={busy} className={`${primaryButtonClass} w-full sm:w-auto`}>
                {busy && <LoaderCircle className="animate-spin" size={16} />}
                {busy ? "Saving…" : "Save gallery item"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
