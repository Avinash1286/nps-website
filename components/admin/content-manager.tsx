"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import {
  Archive,
  CalendarClock,
  File,
  ImageIcon,
  LockKeyhole,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  editorDateValue,
  editorRecordValue,
  isSeoEditorField,
  seoInputFromEditor,
} from "@/lib/content/admin-editor";
import { ADMIN_ACCESS_ROLES } from "@/lib/admin/authorization";
import { AdminFeatureGate } from "./admin-gate";
import {
  adminApi,
  mediaApi,
  usersApi,
  type AdminRecord,
  type ContentType,
  type PublicationStatus,
} from "./convex-api";
import { PageHeading } from "./page-heading";
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

export type EditorField = {
  key: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "url"
    | "number"
    | "datetime"
    | "boolean"
    | "list"
    | "select"
    | "media"
    | "reference";
  mediaKind?: "image" | "document";
  referenceType?: ContentType;
  referenceStatus?: PublicationStatus;
  referenceMatchCurrentIdBy?: string;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: readonly { label: string; value: string }[];
  defaultValue?: string | boolean;
};

const seoFields = [
  {
    key: "seo.title",
    label: "Search title",
    help: "Optional title used by search engines and link previews (up to 120 characters).",
  },
  {
    key: "seo.description",
    label: "Search description",
    type: "textarea",
    help: "A concise description for search results and social previews (up to 320 characters).",
  },
  {
    key: "seo.imageUrl",
    label: "Social sharing image URL",
    type: "url",
    help: "Use a final public image URL from the media library or another approved source.",
  },
  {
    key: "seo.noIndex",
    label: "Hide this item from search engines",
    type: "boolean",
    help: "The page remains accessible by direct link but is excluded from the sitemap and indexing.",
  },
] as const satisfies readonly EditorField[];

const expiryField = {
  key: "expireAt",
  label: "Automatic expiry",
  type: "datetime",
  help: "Optional. At this time Convex archives the item and removes it from public pages.",
} as const satisfies EditorField;

const seoContentTypes = new Set<ContentType>([
  "pages",
  "programs",
  "departments",
  "teachers",
  "news",
  "notices",
  "events",
  "documents",
  "galleryAlbums",
]);

export type CollectionDefinition = {
  type: ContentType;
  singular: string;
  title: string;
  eyebrow: string;
  description: string;
  fields: readonly EditorField[];
};

const collections: Record<
  | "pages"
  | "programs"
  | "departments"
  | "leadership"
  | "teachers"
  | "news"
  | "notices"
  | "events"
  | "gallery"
  | "documents"
  | "testimonials"
  | "faqs",
  CollectionDefinition
> = {
  pages: {
    type: "pages",
    singular: "page",
    title: "Website pages",
    eyebrow: "Website structure",
    description:
      "Create and maintain routed website pages, reusable page copy, hero media, and search metadata.",
    fields: [
      { key: "title", label: "Page title", required: true },
      {
        key: "slug",
        label: "Route slug",
        required: true,
        placeholder: "about/our-school",
        help: "Use lowercase words separated by hyphens. Do not include a leading slash.",
      },
      { key: "summary", label: "Summary", type: "textarea" },
      { key: "body", label: "Page content", type: "textarea", required: true },
      {
        key: "template",
        label: "Page template",
        type: "select",
        defaultValue: "standard",
        help: "Controls the public layout for custom routed pages. Core sections such as About, Academics, Admissions, and Contact keep their purpose-built layouts.",
        options: [
          { label: "Standard", value: "standard" },
          { label: "Landing", value: "landing" },
          { label: "Information", value: "information" },
        ],
      },
      { key: "heroImageId", label: "Hero image from media library", type: "media", mediaKind: "image" },
      { key: "heroImageUrl", label: "Hero image URL", type: "url" },
      { key: "featured", label: "Feature this page", type: "boolean" },
    ],
  },
  programs: {
    type: "programs",
    singular: "programme",
    title: "Academic programmes",
    eyebrow: "Teaching and learning",
    description:
      "Maintain published pathways, grade ranges, curriculum summaries, outcomes, and programme media.",
    fields: [
      { key: "name", label: "Programme name", required: true },
      { key: "slug", label: "Route slug", required: true, placeholder: "primary" },
      { key: "shortDescription", label: "Card summary", type: "textarea", required: true },
      { key: "description", label: "Programme overview", type: "textarea", required: true },
      { key: "gradeRange", label: "Grade range" },
      { key: "curriculum", label: "Curriculum", type: "textarea" },
      { key: "outcomes", label: "Learning outcomes", type: "list", help: "Separate outcomes with commas." },
      { key: "heroImageId", label: "Hero image from media library", type: "media", mediaKind: "image" },
      { key: "heroImageUrl", label: "Hero image URL", type: "url" },
      { key: "featured", label: "Feature this programme", type: "boolean" },
      { key: "order", label: "Display order", type: "number", defaultValue: "0" },
    ],
  },
  departments: {
    type: "departments",
    singular: "department",
    title: "Academic departments",
    eyebrow: "Teaching and learning",
    description:
      "Maintain subject-area descriptions, responsibilities, ordering, and optional public contact channels.",
    fields: [
      { key: "name", label: "Department name", required: true },
      { key: "slug", label: "Route slug", required: true, placeholder: "science" },
      { key: "description", label: "Department overview", type: "textarea", required: true },
      {
        key: "responsibilities",
        label: "Responsibilities",
        type: "list",
        help: "Separate responsibilities with commas.",
      },
      { key: "email", label: "Public email" },
      { key: "phone", label: "Public phone" },
      {
        key: "headTeacherId",
        label: "Department head",
        type: "reference",
        referenceType: "teachers",
        referenceStatus: "published",
        referenceMatchCurrentIdBy: "departmentId",
        help: "Choose a published teacher profile. The profile is highlighted on the public department page.",
      },
      { key: "featured", label: "Feature this department", type: "boolean" },
      { key: "order", label: "Display order", type: "number", defaultValue: "0" },
    ],
  },
  leadership: {
    type: "leadership",
    singular: "profile",
    title: "Leadership",
    eyebrow: "People",
    description:
      "Publish verified school leadership profiles, welcome messages, portraits, and contact details.",
    fields: [
      { key: "name", label: "Full name", required: true },
      { key: "role", label: "Role", required: true },
      { key: "bio", label: "Biography", type: "textarea", required: true },
      { key: "quote", label: "Welcome message", type: "textarea" },
      { key: "photoId", label: "Portrait from media library", type: "media", mediaKind: "image" },
      { key: "photoUrl", label: "Portrait URL", type: "url" },
      { key: "email", label: "Public email", type: "text" },
      { key: "order", label: "Display order", type: "number", defaultValue: "0" },
    ],
  },
  teachers: {
    type: "teachers",
    singular: "teacher",
    title: "Teachers",
    eyebrow: "People",
    description:
      "Maintain the public faculty directory, qualifications, subjects, department links, and contact visibility.",
    fields: [
      { key: "name", label: "Full name", required: true },
      { key: "slug", label: "Profile slug", required: true },
      { key: "title", label: "Designation", required: true },
      {
        key: "departmentId",
        label: "Department",
        type: "reference",
        referenceType: "departments",
        help: "Connect this profile to an academic department instead of pasting an internal ID.",
      },
      { key: "bio", label: "Biography", type: "textarea", required: true },
      { key: "qualifications", label: "Qualifications", type: "list", help: "Separate entries with commas." },
      { key: "subjects", label: "Subjects", type: "list", help: "Separate entries with commas." },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "showContact", label: "Show contact details", type: "boolean" },
      { key: "photoId", label: "Portrait from media library", type: "media", mediaKind: "image" },
      { key: "photoUrl", label: "Portrait URL", type: "url" },
      { key: "order", label: "Display order", type: "number", defaultValue: "0" },
    ],
  },
  news: {
    type: "news",
    singular: "story",
    title: "News",
    eyebrow: "Publishing",
    description:
      "Draft, review, schedule, and publish official school stories with accessible media and useful categorization.",
    fields: [
      { key: "title", label: "Headline", required: true },
      { key: "slug", label: "Story slug", required: true },
      { key: "excerpt", label: "Short summary", type: "textarea", required: true },
      { key: "body", label: "Story content", type: "textarea", required: true },
      { key: "category", label: "Category", required: true },
      { key: "tags", label: "Tags", type: "list" },
      { key: "authorName", label: "Author" },
      {
        key: "featuredImageId",
        label: "Featured image from media library",
        type: "media",
        mediaKind: "image",
      },
      { key: "featuredImageUrl", label: "Featured image URL", type: "url" },
      { key: "featured", label: "Featured story", type: "boolean" },
    ],
  },
  notices: {
    type: "notices",
    singular: "notice",
    title: "Notices",
    eyebrow: "Publishing",
    description:
      "Issue time-sensitive notices for defined audiences, with priority, attachments, and publication windows.",
    fields: [
      { key: "title", label: "Notice title", required: true },
      { key: "slug", label: "Notice slug", required: true },
      { key: "summary", label: "Summary", type: "textarea" },
      { key: "body", label: "Notice details", type: "textarea", required: true },
      {
        key: "priority",
        label: "Priority",
        type: "select",
        required: true,
        defaultValue: "normal",
        options: [
          { label: "Normal", value: "normal" },
          { label: "Important", value: "important" },
          { label: "Urgent", value: "urgent" },
        ],
      },
      {
        key: "audiences",
        label: "Audiences",
        type: "list",
        required: true,
        placeholder: "students, parents",
      },
      { key: "attachmentId", label: "Attachment from media library", type: "media", mediaKind: "document" },
      { key: "attachmentUrl", label: "Attachment URL", type: "url" },
      { key: "startAt", label: "Visible from", type: "datetime" },
    ],
  },
  events: {
    type: "events",
    singular: "event",
    title: "Events",
    eyebrow: "Publishing",
    description:
      "Manage the official calendar, venues, online access, capacity, and registration availability.",
    fields: [
      { key: "title", label: "Event title", required: true },
      { key: "slug", label: "Event slug", required: true },
      { key: "summary", label: "Summary", type: "textarea" },
      { key: "description", label: "Description", type: "textarea", required: true },
      { key: "startAt", label: "Starts", type: "datetime", required: true },
      { key: "endAt", label: "Ends", type: "datetime", required: true },
      { key: "timezone", label: "Time zone", required: true, defaultValue: "Asia/Kathmandu" },
      { key: "venue", label: "Venue" },
      { key: "isOnline", label: "Online event", type: "boolean" },
      { key: "meetingUrl", label: "Meeting URL", type: "url" },
      { key: "capacity", label: "Capacity", type: "number" },
      { key: "registrationEnabled", label: "Enable registration", type: "boolean" },
      { key: "featuredImageId", label: "Cover image from media library", type: "media", mediaKind: "image" },
      { key: "featuredImageUrl", label: "Cover image URL", type: "url" },
      { key: "featured", label: "Feature this event", type: "boolean" },
    ],
  },
  gallery: {
    type: "galleryAlbums",
    singular: "album",
    title: "Gallery albums",
    eyebrow: "Publishing",
    description:
      "Organize campus media into accessible, routed albums. Upload individual files from the Media workspace.",
    fields: [
      { key: "title", label: "Album title", required: true },
      { key: "slug", label: "Album slug", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "coverImageId", label: "Cover image from media library", type: "media", mediaKind: "image" },
      { key: "coverImageUrl", label: "Cover image URL", type: "url" },
      { key: "eventDate", label: "Event date", type: "datetime" },
      { key: "featured", label: "Feature this album", type: "boolean" },
      { key: "order", label: "Display order", type: "number", defaultValue: "0" },
    ],
  },
  documents: {
    type: "documents",
    singular: "document",
    title: "Documents",
    eyebrow: "Publishing",
    description:
      "Publish verified forms, policies, prospectuses, and academic documents with clear file metadata.",
    fields: [
      { key: "title", label: "Document title", required: true },
      { key: "slug", label: "Document slug", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "category", label: "Category", required: true },
      { key: "storageId", label: "File from media library", type: "media", mediaKind: "document" },
      { key: "externalUrl", label: "External document URL", type: "url" },
      { key: "fileName", label: "File name" },
      { key: "mimeType", label: "MIME type" },
      { key: "size", label: "Size in bytes", type: "number" },
      { key: "schoolYear", label: "School year" },
      { key: "featured", label: "Feature this document", type: "boolean" },
      { key: "order", label: "Display order", type: "number", defaultValue: "0" },
    ],
  },
  testimonials: {
    type: "testimonials",
    singular: "testimonial",
    title: "Testimonials",
    eyebrow: "School community",
    description:
      "Review and publish approved reflections from students, families, alumni, staff, and community partners.",
    fields: [
      { key: "name", label: "Person's name", required: true },
      { key: "role", label: "Role or relationship" },
      { key: "organization", label: "Organization" },
      { key: "quote", label: "Testimonial", type: "textarea", required: true },
      { key: "photoId", label: "Portrait from media library", type: "media", mediaKind: "image" },
      { key: "photoUrl", label: "Portrait URL", type: "url" },
      { key: "order", label: "Display order", type: "number", defaultValue: "0" },
    ],
  },
  faqs: {
    type: "faqs",
    singular: "question",
    title: "Frequently asked questions",
    eyebrow: "Visitor support",
    description:
      "Publish concise, approved answers used by the admissions help page and the school information assistant.",
    fields: [
      { key: "question", label: "Question", type: "textarea", required: true },
      { key: "answer", label: "Approved answer", type: "textarea", required: true },
      { key: "category", label: "Category", placeholder: "Admissions" },
      { key: "order", label: "Display order", type: "number", defaultValue: "0" },
    ],
  },
};

export type CollectionKey = keyof typeof collections;

export function getCollectionDefinition(collection: CollectionKey): CollectionDefinition {
  const definition = collections[collection];
  return {
    ...definition,
    fields: [...definition.fields, ...(seoContentTypes.has(definition.type) ? seoFields : []), expiryField],
  };
}

export function AdminCollectionPage({ collection }: { collection: CollectionKey }) {
  const definition = getCollectionDefinition(collection);
  return (
    <>
      <PageHeading
        eyebrow={definition.eyebrow}
        title={definition.title}
        description={definition.description}
      />
      <AdminCollectionScreen definition={definition} />
    </>
  );
}

export function AdminCollectionScreen({ definition }: { definition: CollectionDefinition }) {
  return (
    <AdminFeatureGate requiredRoles={ADMIN_ACCESS_ROLES.content}>
      <CollectionManager definition={definition} />
    </AdminFeatureGate>
  );
}

function CollectionManager({ definition }: { definition: CollectionDefinition }) {
  const viewer = useQuery(usersApi.current, {});
  const [filter, setFilter] = useState<"all" | PublicationStatus>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AdminRecord | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<{ item: AdminRecord; value: string } | null>(null);
  const {
    results,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    adminApi.listContent,
    {
      type: definition.type,
      ...(filter === "all" ? {} : { status: filter }),
    },
    { initialNumItems: 50 },
  );
  const upsert = useMutation(adminApi.upsertContent);
  const remove = useMutation(adminApi.removeContent);
  const changeStatus = useMutation(adminApi.changeContentStatus);
  const viewerRoles = Array.isArray(viewer?.roles) ? viewer.roles.map(String) : [];
  const canPublish = viewerRoles.includes("admin") || viewerRoles.includes("publisher");

  const items = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return results;
    return results.filter((item) =>
      [item.title, item.name, item.question, item.category, item.slug].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [results, search]);

  function defaultValues() {
    return Object.fromEntries(
      definition.fields.map((field) => [
        field.key,
        field.defaultValue ?? (field.type === "boolean" ? false : ""),
      ]),
    ) as Record<string, string | boolean>;
  }

  function openNew() {
    setEditing(null);
    setValues(defaultValues());
    setError(null);
    setSuccess(null);
    setEditorOpen(true);
  }

  function openEdit(item: AdminRecord) {
    const next = defaultValues();
    for (const field of definition.fields) {
      const raw = editorRecordValue(item, field.key);
      if (field.type === "boolean") next[field.key] = Boolean(raw);
      else if (field.type === "list") next[field.key] = Array.isArray(raw) ? raw.join(", ") : "";
      else if (field.type === "datetime") next[field.key] = typeof raw === "number" ? toLocalInput(raw) : "";
      else next[field.key] = raw == null ? "" : String(raw);
    }
    setEditing(item);
    setValues(next);
    setError(null);
    setSuccess(null);
    setEditorOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const data: Record<string, unknown> = {
        status: (editing?.status as PublicationStatus | undefined) ?? "draft",
      };
      if (editing) {
        for (const key of [
          "heroImageId",
          "featuredImageId",
          "attachmentId",
          "photoId",
          "storageId",
          "coverImageId",
          "publishAt",
          "featured",
          "order",
        ]) {
          if (editing[key] !== undefined) data[key] = editing[key];
        }
      }
      if (definition.fields.some((field) => isSeoEditorField(field.key))) {
        data.seo = seoInputFromEditor(values);
      }
      for (const field of definition.fields) {
        if (isSeoEditorField(field.key)) continue;
        const value = values[field.key];
        if (field.type === "boolean") {
          data[field.key] = Boolean(value);
          continue;
        }
        const text = String(value ?? "").trim();
        if (field.type === "list") {
          data[field.key] = text
            ? text
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean)
            : [];
          continue;
        }
        if (field.type === "media") {
          if (text) data[field.key] = text;
          else delete data[field.key];
          continue;
        }
        if (!text && field.required) throw new Error(`${field.label} is required.`);
        if (!text) continue;
        if (field.type === "number") data[field.key] = Number(text);
        else if (field.type === "datetime") data[field.key] = editorDateValue(text, field.label);
        else data[field.key] = text;
      }
      if (definition.type === "documents" && !data.externalUrl && !data.storageId)
        throw new Error("Provide a document URL or attach a stored media file before saving.");
      await upsert({
        payload: { type: definition.type, ...(editing ? { id: editing._id } : {}), data },
      });
      setEditorOpen(false);
      setEditing(null);
      setSuccess(`${definition.singular[0].toUpperCase()}${definition.singular.slice(1)} saved.`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(item: AdminRecord) {
    const label = itemLabel(item);
    if (!window.confirm(`Permanently delete “${label}”? This action is recorded and cannot be undone.`))
      return;
    setError(null);
    setSuccess(null);
    try {
      await remove({ type: definition.type, id: item._id });
      setSuccess(`${label} deleted.`);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function setPublication(item: AdminRecord, status: PublicationStatus, publishAt?: number) {
    setError(null);
    setSuccess(null);
    try {
      await changeStatus({
        type: definition.type,
        id: item._id,
        status,
        ...(publishAt ? { publishAt } : {}),
      });
      setSuccess(
        status === "scheduled" ? `${itemLabel(item)} scheduled.` : `${itemLabel(item)} moved to ${status}.`,
      );
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  if (paginationStatus === "LoadingFirstPage")
    return <LoadingPanel label={`Loading ${definition.title.toLowerCase()}`} />;

  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search {definition.title}</span>
          <Search className="absolute top-3.5 left-3.5 text-slate-400" size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-slate-200 py-3 pr-3 pl-10 text-sm outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100"
            placeholder={`Search ${definition.title.toLowerCase()}…`}
          />
        </label>
        <label>
          <span className="sr-only">Filter publication status</span>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as typeof filter)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold outline-none focus:border-sky-600 sm:w-44"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <button onClick={openNew} className={`${primaryButtonClass} w-full sm:w-auto`}>
          <Plus size={17} /> Add {definition.singular}
        </button>
      </div>
      <div className="mb-5 space-y-3">
        {viewer !== undefined && !canPublish && (
          <Feedback kind="info">
            You can create and edit draft content. Publishing, scheduling, archiving, and deletion require a
            publisher or administrator.
          </Feedback>
        )}
        {error && <Feedback>{error}</Feedback>}
        {success && <Feedback kind="success">{success}</Feedback>}
      </div>
      {items.length === 0 ? (
        <EmptyState
          title={`No ${definition.title.toLowerCase()} found`}
          description={
            search || filter !== "all"
              ? "Try clearing the current search or status filter."
              : `Create the first ${definition.singular} when verified content is ready.`
          }
          action={
            !search && filter === "all" ? (
              <button onClick={openNew} className={primaryButtonClass}>
                <Plus size={17} /> Add {definition.singular}
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(0,1.5fr)_140px_170px_104px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-extrabold tracking-[.14em] text-slate-500 uppercase xl:grid">
            <span>Content</span>
            <span>Status</span>
            <span>Publication</span>
            <span className="text-right">Actions</span>
          </div>
          {items.map((item) => (
            <article
              key={item._id}
              className="grid gap-4 border-b border-slate-100 p-4 last:border-0 sm:p-5 xl:grid-cols-[minmax(0,1.5fr)_140px_170px_104px] xl:items-center"
            >
              <div className="min-w-0">
                <h2 className="truncate font-extrabold text-slate-900">{itemLabel(item)}</h2>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {item.slug
                    ? `/${String(item.slug)}`
                    : item._creationTime
                      ? `Created ${formatDate(item._creationTime)}`
                      : "No route assigned"}
                </p>
                {typeof item.expireAt === "number" && (
                  <p className="mt-1 text-xs font-semibold text-amber-700">
                    Expires {formatDate(item.expireAt)}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 xl:block">
                <span className="text-[10px] font-extrabold tracking-[.14em] text-slate-400 uppercase xl:hidden">
                  Status
                </span>
                <StatusBadge status={String(item.status ?? "draft")} />
              </div>
              {canPublish ? (
                <label className="flex items-center justify-between gap-3 xl:block">
                  <span className="text-[10px] font-extrabold tracking-[.14em] text-slate-400 uppercase xl:sr-only">
                    Publication
                  </span>
                  <select
                    aria-label={`Publication status for ${itemLabel(item)}`}
                    value={String(item.status ?? "draft")}
                    onChange={(event) => {
                      const next = event.target.value as PublicationStatus;
                      if (next === "scheduled") setSchedule({ item, value: "" });
                      else void setPublication(item, next);
                    }}
                    className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold outline-none focus:border-sky-600 xl:w-full"
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Schedule…</option>
                    <option value="published">Publish now</option>
                    <option value="archived">Archive</option>
                  </select>
                </label>
              ) : (
                <span
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-500"
                  title="Publisher or administrator access is required"
                >
                  <LockKeyhole size={14} /> Publisher approval
                </span>
              )}
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 xl:justify-end xl:border-0 xl:pt-0">
                <span className="text-[10px] font-extrabold tracking-[.14em] text-slate-400 uppercase xl:hidden">
                  Actions
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(item)}
                    disabled={!canPublish && (item.status === "published" || item.status === "scheduled")}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2.5 text-sky-800 hover:bg-sky-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                    aria-label={`Edit ${itemLabel(item)}`}
                    title={
                      !canPublish && (item.status === "published" || item.status === "scheduled")
                        ? "A publisher must return this item to draft before an editor can revise it"
                        : undefined
                    }
                  >
                    <Pencil size={17} />
                  </button>
                  {canPublish && (
                    <button
                      onClick={() => void deleteItem(item)}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2.5 text-red-700 hover:bg-red-50"
                      aria-label={`Delete ${itemLabel(item)}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <PaginationControls
        status={paginationStatus}
        loadedCount={results.length}
        noun="content records"
        onLoadMore={() => loadMore(50)}
      />

      {editorOpen && (
        <EditorModal
          definition={definition}
          editing={editing}
          values={values}
          setValues={setValues}
          busy={busy}
          error={error}
          onClose={() => {
            if (!busy) setEditorOpen(false);
          }}
          onSubmit={save}
        />
      )}
      {schedule && (
        <ScheduleDialog
          item={schedule.item}
          value={schedule.value}
          setValue={(value) => setSchedule({ ...schedule, value })}
          busy={busy}
          onClose={() => setSchedule(null)}
          onSubmit={async (event) => {
            event.preventDefault();
            const at = new Date(schedule.value).getTime();
            if (!Number.isFinite(at) || at <= Date.now()) {
              setError("Choose a future publication time.");
              return;
            }
            setBusy(true);
            await setPublication(schedule.item, "scheduled", at);
            setBusy(false);
            setSchedule(null);
          }}
        />
      )}
    </section>
  );
}

function EditorModal({
  definition,
  editing,
  values,
  setValues,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  definition: CollectionDefinition;
  editing: AdminRecord | null;
  values: Record<string, string | boolean>;
  setValues: (values: Record<string, string | boolean>) => void;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { dialogRef, onDialogKeyDown } = useModalAccessibility<HTMLFormElement>(true, onClose);
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="grid min-h-full place-items-center">
        <form
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="content-editor-title"
          tabIndex={-1}
          onKeyDown={onDialogKeyDown}
          onSubmit={onSubmit}
          className="my-4 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold tracking-[.18em] text-sky-700 uppercase">
                {definition.title}
              </p>
              <h2 id="content-editor-title" className="mt-2 text-2xl font-black">
                {editing ? `Edit ${definition.singular}` : `Add ${definition.singular}`}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                New content begins as a draft and is not public until explicitly published.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Close editor"
            >
              <X />
            </button>
          </div>
          {error && (
            <div className="mt-5">
              <Feedback>{error}</Feedback>
            </div>
          )}
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {definition.fields.map((field) =>
              field.type === "media" ? (
                <MediaEditorControl
                  key={field.key}
                  field={field}
                  value={String(values[field.key] ?? "")}
                  onSelect={(asset) => {
                    const next = { ...values, [field.key]: asset ? String(asset.storageId ?? "") : "" };
                    if (definition.type === "documents" && field.key === "storageId") {
                      next.fileName = asset ? String(asset.fileName ?? "") : "";
                      next.mimeType = asset ? String(asset.mimeType ?? "") : "";
                      next.size = asset && typeof asset.size === "number" ? String(asset.size) : "";
                      if (asset) next.externalUrl = "";
                    }
                    setValues(next);
                  }}
                />
              ) : field.type === "reference" ? (
                <ReferenceEditorControl
                  key={field.key}
                  field={field}
                  value={String(values[field.key] ?? "")}
                  currentRecordId={editing?._id}
                  onChange={(value) => setValues({ ...values, [field.key]: value })}
                />
              ) : (
                <EditorControl
                  key={field.key}
                  field={field}
                  value={values[field.key]}
                  onChange={(value) => setValues({ ...values, [field.key]: value })}
                />
              ),
            )}
          </div>
          <div className="mt-8 flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <button type="button" onClick={onClose} disabled={busy} className={secondaryButtonClass}>
              Cancel
            </button>
            <button disabled={busy} className={primaryButtonClass}>
              {busy && <LoaderCircle className="animate-spin" size={16} />}
              {busy ? "Saving…" : `Save ${definition.singular}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReferenceEditorControl({
  field,
  value,
  currentRecordId,
  onChange,
}: {
  field: EditorField;
  value: string;
  currentRecordId?: string;
  onChange: (value: string) => void;
}) {
  const referenceType = field.referenceType ?? "teachers";
  const { results, status, loadMore } = usePaginatedQuery(
    adminApi.listContent,
    { type: referenceType, ...(field.referenceStatus ? { status: field.referenceStatus } : {}) },
    { initialNumItems: 100 },
  );
  const eligibleResults = field.referenceMatchCurrentIdBy
    ? results.filter((item) => item[field.referenceMatchCurrentIdBy!] === currentRecordId)
    : results;
  const selected = eligibleResults.find((item) => item._id === value);
  const needsSavedRecord = Boolean(field.referenceMatchCurrentIdBy && !currentRecordId);
  return (
    <div className="sm:col-span-2">
      <label className="block text-sm font-bold text-slate-800">
        {field.label}
        <select
          value={value}
          disabled={status === "LoadingFirstPage" || needsSavedRecord}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        >
          <option value="">
            {status === "LoadingFirstPage" ? "Loading available records…" : "No record selected"}
          </option>
          {value && !selected && <option value={value}>Currently selected record</option>}
          {eligibleResults.map((item) => (
            <option key={item._id} value={item._id}>
              {itemLabel(item)} · {String(item.status ?? "draft")}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span>
          {needsSavedRecord
            ? "Save this record first, link a published teacher to it, then return to choose the department head."
            : (field.help ?? "Choose a related CMS record.")}
        </span>
        {status === "CanLoadMore" && (
          <button type="button" onClick={() => loadMore(100)} className="font-bold text-sky-800">
            Load more options
          </button>
        )}
      </div>
    </div>
  );
}

function MediaEditorControl({
  field,
  value,
  onSelect,
}: {
  field: EditorField;
  value: string;
  onSelect: (asset: AdminRecord | null) => void;
}) {
  const { results, status, loadMore } = usePaginatedQuery(mediaApi.listMedia, {}, { initialNumItems: 100 });
  const assets = results.filter((asset) => {
    const mimeType = String(asset.mimeType ?? "");
    return field.mediaKind === "image" ? mimeType.startsWith("image/") : !mimeType.startsWith("video/");
  });
  const selected = assets.find((asset) => asset.storageId === value);
  const Icon = field.mediaKind === "image" ? ImageIcon : File;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-800">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <label className="block text-sm font-bold text-slate-800">
            {field.label}
            <select
              value={value}
              disabled={status === "LoadingFirstPage"}
              onChange={(event) => {
                const storageId = event.target.value;
                onSelect(assets.find((asset) => asset.storageId === storageId) ?? null);
              }}
              className={inputClass}
            >
              <option value="">
                {status === "LoadingFirstPage" ? "Loading media library…" : "No stored media selected"}
              </option>
              {value && !selected && <option value={value}>Currently attached media</option>}
              {assets.map((asset) => (
                <option key={asset._id} value={String(asset.storageId)}>
                  {String(asset.fileName ?? "Media file")} · {String(asset.folder ?? "general")}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              {selected
                ? `${String(selected.mimeType ?? "File")} · ${formatBytes(Number(selected.size ?? 0))}`
                : "Choose a finalized upload from Convex storage."}
            </span>
            <span className="flex items-center gap-3">
              {status === "CanLoadMore" && (
                <button type="button" onClick={() => loadMore(100)} className="font-bold text-sky-800">
                  Load more media
                </button>
              )}
              <Link href="/admin/media" className="font-bold text-sky-800">
                Open media library
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditorControl({
  field,
  value,
  onChange,
}: {
  field: EditorField;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
}) {
  if (field.type === "boolean")
    return (
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-bold sm:col-span-2">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-500"
        />
        <span>
          {field.label}
          {field.help && <span className="mt-1 block text-xs font-normal text-slate-500">{field.help}</span>}
        </span>
      </label>
    );
  const common = {
    required: field.required,
    value: String(value ?? ""),
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange(event.target.value),
    className: inputClass,
  };
  return (
    <label
      className={`block text-sm font-bold text-slate-800 ${field.type === "textarea" ? "sm:col-span-2" : ""}`}
    >
      {field.label}
      {field.type === "textarea" ? (
        <textarea
          {...common}
          rows={field.key === "body" || field.key === "description" || field.key === "bio" ? 8 : 4}
          placeholder={field.placeholder}
        />
      ) : field.type === "select" ? (
        <select {...common}>
          {!field.required && <option value="">Select…</option>}
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...common}
          placeholder={field.placeholder}
          type={
            field.type === "url"
              ? "url"
              : field.type === "number"
                ? "number"
                : field.type === "datetime"
                  ? "datetime-local"
                  : "text"
          }
        />
      )}
      {field.help && (
        <span className="mt-1.5 block text-xs leading-5 font-normal text-slate-500">{field.help}</span>
      )}
    </label>
  );
}

function ScheduleDialog({
  item,
  value,
  setValue,
  busy,
  onClose,
  onSubmit,
}: {
  item: AdminRecord;
  value: string;
  setValue: (value: string) => void;
  busy: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { dialogRef, onDialogKeyDown } = useModalAccessibility<HTMLFormElement>(true, onClose);
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center">
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-publication-title"
        tabIndex={-1}
        onKeyDown={onDialogKeyDown}
        onSubmit={onSubmit}
        className="my-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <CalendarClock className="text-sky-700" />
        <h2 id="schedule-publication-title" className="mt-4 text-xl font-black">
          Schedule publication
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Choose when “{itemLabel(item)}” should become public. Convex will run the scheduled background job.
        </p>
        <label className="mt-5 block text-sm font-bold">
          Publication time
          <input
            required
            type="datetime-local"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className={inputClass}
          />
        </label>
        <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={`${secondaryButtonClass} w-full sm:w-auto`}
          >
            Cancel
          </button>
          <button disabled={busy} className={`${primaryButtonClass} w-full sm:w-auto`}>
            {busy ? <LoaderCircle className="animate-spin" size={16} /> : <CalendarClock size={16} />}{" "}
            Schedule
          </button>
        </div>
      </form>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "published"
      ? "bg-emerald-50 text-emerald-700"
      : status === "scheduled"
        ? "bg-violet-50 text-violet-700"
        : status === "archived"
          ? "bg-slate-100 text-slate-600"
          : "bg-amber-50 text-amber-800";
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold capitalize ${style}`}
    >
      {status === "archived" && <Archive size={12} />}
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function itemLabel(item: AdminRecord) {
  return String(item.title ?? item.name ?? item.question ?? item.slug ?? "Untitled record");
}
export function formatDate(value: number) {
  return new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kathmandu",
  }).format(value);
}
function formatBytes(size: number) {
  if (!size) return "0 B";
  const unit = Math.min(Math.floor(Math.log(size) / Math.log(1024)), 3);
  return `${(size / 1024 ** unit).toFixed(unit ? 1 : 0)} ${["B", "KB", "MB", "GB"][unit]}`;
}
function toLocalInput(value: number) {
  const date = new Date(value - new Date(value).getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}
function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The operation could not be completed. No success was recorded.";
}
