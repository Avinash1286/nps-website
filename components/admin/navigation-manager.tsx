"use client";

import { useMutation, useQuery } from "convex/react";
import { Eye, EyeOff, GripVertical, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ADMIN_ACCESS_ROLES } from "@/lib/admin/authorization";
import { AdminFeatureGate } from "./admin-gate";
import { adminApi, type AdminRecord } from "./convex-api";
import {
  EmptyState,
  Feedback,
  LoadingPanel,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./ui";
import { useModalAccessibility } from "./use-modal-accessibility";

type NavigationForm = {
  label: string;
  href: string;
  location: "header" | "footer" | "utility";
  parentId: string;
  order: string;
  external: boolean;
  visible: boolean;
  description: string;
  requiredRole: string;
};
const empty: NavigationForm = {
  label: "",
  href: "",
  location: "header",
  parentId: "",
  order: "0",
  external: false,
  visible: true,
  description: "",
  requiredRole: "",
};

export function NavigationManager() {
  return (
    <AdminFeatureGate requiredRoles={ADMIN_ACCESS_ROLES.navigation}>
      <NavigationData />
    </AdminFeatureGate>
  );
}

function NavigationData() {
  const items = useQuery(adminApi.listNavigation, {});
  const upsert = useMutation(adminApi.upsertNavigation);
  const remove = useMutation(adminApi.removeNavigation);
  const [editing, setEditing] = useState<AdminRecord | null>(null);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const { dialogRef, onDialogKeyDown } = useModalAccessibility<HTMLFormElement>(open, () => setOpen(false));
  if (items === undefined) return <LoadingPanel label="Loading navigation" />;
  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, order: String(items.length) });
    setFeedback(null);
    setOpen(true);
  };
  const openEdit = (item: AdminRecord) => {
    setEditing(item);
    setForm({
      label: String(item.label ?? ""),
      href: String(item.href ?? ""),
      location: (["header", "footer", "utility"].includes(String(item.location))
        ? item.location
        : "header") as NavigationForm["location"],
      parentId: String(item.parentId ?? ""),
      order: String(item.order ?? 0),
      external: Boolean(item.external),
      visible: Boolean(item.visible),
      description: String(item.description ?? ""),
      requiredRole: String(item.requiredRole ?? ""),
    });
    setFeedback(null);
    setOpen(true);
  };
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      if (!form.label.trim() || !form.href.trim()) throw new Error("Label and destination are required.");
      await upsert({
        ...(editing ? { id: editing._id } : {}),
        item: {
          label: form.label.trim(),
          href: form.href.trim(),
          location: form.location,
          order: Number(form.order),
          external: form.external,
          visible: form.visible,
          ...(form.parentId ? { parentId: form.parentId } : {}),
          ...(form.description.trim() ? { description: form.description.trim() } : {}),
          ...(form.requiredRole ? { requiredRole: form.requiredRole } : {}),
        },
      });
      setOpen(false);
      setFeedback({ kind: "success", text: "Navigation item saved." });
    } catch (caught) {
      setFeedback({ kind: "error", text: errorMessage(caught) });
    } finally {
      setBusy(false);
    }
  }
  async function deleteItem(item: AdminRecord) {
    if (
      !window.confirm(
        `Delete “${String(item.label ?? "navigation item")}”? Child links must be reassigned first.`,
      )
    )
      return;
    setFeedback(null);
    try {
      await remove({ id: item._id });
      setFeedback({ kind: "success", text: "Navigation item deleted." });
    } catch (caught) {
      setFeedback({ kind: "error", text: errorMessage(caught) });
    }
  }
  return (
    <section>
      {feedback && (
        <div className="mb-5">
          <Feedback kind={feedback.kind}>{feedback.text}</Feedback>
        </div>
      )}
      <div className="mb-5 flex justify-end">
        <button onClick={openNew} className={`${primaryButtonClass} w-full sm:w-auto`}>
          <Plus size={17} /> Add navigation item
        </button>
      </div>
      {items.length === 0 ? (
        <EmptyState
          title="No navigation items"
          description="Add the first verified destination to build the public header or footer navigation."
          action={
            <button onClick={openNew} className={primaryButtonClass}>
              <Plus size={17} /> Add item
            </button>
          }
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          {(["header", "footer", "utility"] as const).map((location) => (
            <section
              key={location}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h2 className="font-black capitalize">{location}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {items.filter((item) => item.location === location).length} links
                </p>
              </div>
              <div>
                {items
                  .filter((item) => item.location === location)
                  .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
                  .map((item) => (
                    <article
                      key={item._id}
                      className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 last:border-0"
                    >
                      <GripVertical className="shrink-0 text-slate-300" size={17} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-extrabold">{String(item.label)}</p>
                          {item.visible ? (
                            <Eye className="text-emerald-600" size={13} />
                          ) : (
                            <EyeOff className="text-slate-400" size={13} />
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-500">{String(item.href)}</p>
                      </div>
                      <button
                        onClick={() => openEdit(item)}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-sky-800 hover:bg-sky-50"
                        aria-label={`Edit ${String(item.label)}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => void deleteItem(item)}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-red-700 hover:bg-red-50"
                        aria-label={`Delete ${String(item.label)}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </article>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center">
          <form
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="navigation-editor-title"
            tabIndex={-1}
            onKeyDown={onDialogKeyDown}
            onSubmit={save}
            className="my-4 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-extrabold tracking-[.17em] text-sky-700 uppercase">
                  Public routes
                </p>
                <h2 id="navigation-editor-title" className="mt-2 text-2xl font-black">
                  {editing ? "Edit navigation item" : "Add navigation item"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 hover:bg-slate-100"
                aria-label="Close navigation editor"
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
              <Field
                label="Label"
                value={form.label}
                set={(value) => setForm({ ...form, label: value })}
                required
              />
              <Field
                label="Destination"
                value={form.href}
                set={(value) => setForm({ ...form, href: value })}
                placeholder="/about"
                required
              />
              <label className="block text-sm font-bold">
                Location
                <select
                  className={inputClass}
                  value={form.location}
                  onChange={(event) => {
                    const location = event.target.value as NavigationForm["location"];
                    const parentStillValid = items.some(
                      (item) => item._id === form.parentId && item.location === location,
                    );
                    setForm({ ...form, location, parentId: parentStillValid ? form.parentId : "" });
                  }}
                >
                  <option value="header">Header</option>
                  <option value="footer">Footer</option>
                  <option value="utility">Utility</option>
                </select>
              </label>
              <Field
                label="Display order"
                value={form.order}
                set={(value) => setForm({ ...form, order: value })}
                type="number"
                required
              />
              <label className="block text-sm font-bold">
                Parent item
                <select
                  className={inputClass}
                  value={form.parentId}
                  onChange={(event) => setForm({ ...form, parentId: event.target.value })}
                >
                  <option value="">No parent</option>
                  {items
                    .filter((item) => item._id !== editing?._id && item.location === form.location)
                    .map((item) => (
                      <option key={item._id} value={item._id}>
                        {String(item.label)}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block text-sm font-bold">
                Public visibility
                <select
                  className={inputClass}
                  value={form.requiredRole}
                  onChange={(event) => setForm({ ...form, requiredRole: event.target.value })}
                >
                  <option value="">Public</option>
                  <option value="admin">Reserved for admin (hidden publicly)</option>
                  <option value="publisher">Reserved for publisher (hidden publicly)</option>
                  <option value="editor">Reserved for editor (hidden publicly)</option>
                  <option value="admissions">Reserved for admissions (hidden publicly)</option>
                </select>
                <span className="mt-1.5 block text-xs leading-5 font-normal text-slate-500">
                  Reserved links are intentionally omitted from the public website. Staff navigation is
                  managed separately in the admin workspace.
                </span>
              </label>
              <label className="block text-sm font-bold sm:col-span-2">
                Description
                <textarea
                  className={inputClass}
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </label>
              <Toggle
                label="Visible"
                checked={form.visible}
                set={(value) => setForm({ ...form, visible: value })}
              />
              <Toggle
                label="Open in a new window"
                checked={form.external}
                set={(value) => setForm({ ...form, external: value })}
              />
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
                {busy ? "Saving…" : "Save item"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  set,
  required,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: "text" | "number";
}) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <input
        className={inputClass}
        value={value}
        onChange={(event) => set(event.target.value)}
        required={required}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}
function Toggle({ label, checked, set }: { label: string; checked: boolean; set: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-bold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => set(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-sky-700"
      />
      {label}
    </label>
  );
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Navigation could not be updated. No success was recorded.";
}
