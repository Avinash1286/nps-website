"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { LoaderCircle, Save, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ADMIN_ACCESS_ROLES } from "@/lib/admin/authorization";
import { AdminFeatureGate } from "./admin-gate";
import { adminApi, mediaApi } from "./convex-api";
import { Feedback, LoadingPanel, inputClass, primaryButtonClass } from "./ui";

type SettingsForm = {
  schoolName: string;
  shortName: string;
  tagline: string;
  description: string;
  logoId: string;
  logoUrl: string;
  faviconId: string;
  faviconUrl: string;
  academicYear: string;
  timezone: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  secondaryPhone: string;
  email: string;
  mapUrl: string;
  officeHours: string;
  facebook: string;
  instagram: string;
  youtube: string;
  linkedin: string;
  x: string;
  seoTitle: string;
  seoDescription: string;
  seoImageUrl: string;
  noIndex: boolean;
  admissionsOpen: boolean;
  assistantEnabled: boolean;
  maintenanceMode: boolean;
};

const empty: SettingsForm = {
  schoolName: "Nepal Police School",
  shortName: "NPS",
  tagline: "",
  description: "",
  logoId: "",
  logoUrl: "",
  faviconId: "",
  faviconUrl: "",
  academicYear: "",
  timezone: "Asia/Kathmandu",
  address: "",
  city: "Garuda",
  country: "Nepal",
  phone: "",
  secondaryPhone: "",
  email: "",
  mapUrl: "",
  officeHours: "",
  facebook: "",
  instagram: "",
  youtube: "",
  linkedin: "",
  x: "",
  seoTitle: "",
  seoDescription: "",
  seoImageUrl: "",
  noIndex: false,
  admissionsOpen: false,
  assistantEnabled: false,
  maintenanceMode: false,
};

export function SettingsManager() {
  return (
    <AdminFeatureGate requiredRoles={ADMIN_ACCESS_ROLES.adminOnly}>
      <SettingsData />
    </AdminFeatureGate>
  );
}

function SettingsData() {
  const settings = useQuery(adminApi.getSiteSettings, {});
  if (settings === undefined) return <LoadingPanel label="Loading site settings" />;
  return <SettingsEditor settings={settings} />;
}

function SettingsEditor({ settings }: { settings: Record<string, unknown> | null }) {
  const update = useMutation(adminApi.updateSiteSettings);
  const [form, setForm] = useState(() => fromSettings(settings));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const set = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      if (!form.schoolName.trim()) throw new Error("School name is required.");
      await update({ settings: toSettings(form) });
      setFeedback({
        kind: "success",
        text: "Site settings saved and the change was recorded in the audit log.",
      });
    } catch (caught) {
      setFeedback({ kind: "error", text: errorMessage(caught) });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="space-y-6">
      {feedback && <Feedback kind={feedback.kind}>{feedback.text}</Feedback>}
      <SettingsSection
        title="School identity"
        description="Core public identity and academic context used across routes and metadata."
      >
        <Field
          label="School name"
          value={form.schoolName}
          set={(value) => set("schoolName", value)}
          required
        />
        <Field label="Short name" value={form.shortName} set={(value) => set("shortName", value)} required />
        <Field label="Tagline" value={form.tagline} set={(value) => set("tagline", value)} required />
        <Field
          label="Academic year"
          value={form.academicYear}
          set={(value) => set("academicYear", value)}
          required
        />
        <Field label="Time zone" value={form.timezone} set={(value) => set("timezone", value)} required />
        <TextArea
          label="School description"
          value={form.description}
          set={(value) => set("description", value)}
          required
        />
        <BrandMediaFields form={form} set={set} />
      </SettingsSection>
      <SettingsSection
        title="Contact information"
        description="Verified details shown on contact pages and footers. Phone and email may be left blank until official public contacts are available."
      >
        <Field label="Street address" value={form.address} set={(value) => set("address", value)} required />
        <Field label="City" value={form.city} set={(value) => set("city", value)} required />
        <Field label="Country" value={form.country} set={(value) => set("country", value)} required />
        <Field label="Primary phone (optional)" value={form.phone} set={(value) => set("phone", value)} />
        <Field
          label="Secondary phone"
          value={form.secondaryPhone}
          set={(value) => set("secondaryPhone", value)}
        />
        <Field
          label="Public email (optional)"
          value={form.email}
          set={(value) => set("email", value)}
          type="email"
        />
        <Field label="Office hours" value={form.officeHours} set={(value) => set("officeHours", value)} />
        <Field label="Map URL" value={form.mapUrl} set={(value) => set("mapUrl", value)} type="url" />
      </SettingsSection>
      <SettingsSection
        title="Social channels"
        description="Only add official, actively monitored school profiles."
      >
        <Field label="Facebook" value={form.facebook} set={(value) => set("facebook", value)} type="url" />
        <Field label="Instagram" value={form.instagram} set={(value) => set("instagram", value)} type="url" />
        <Field label="YouTube" value={form.youtube} set={(value) => set("youtube", value)} type="url" />
        <Field label="LinkedIn" value={form.linkedin} set={(value) => set("linkedin", value)} type="url" />
        <Field label="X / Twitter" value={form.x} set={(value) => set("x", value)} type="url" />
      </SettingsSection>
      <SettingsSection
        title="Search and sharing"
        description="Default metadata for routes that do not provide page-specific search information."
      >
        <Field label="Default SEO title" value={form.seoTitle} set={(value) => set("seoTitle", value)} />
        <Field
          label="Social sharing image path or Convex storage URL"
          value={form.seoImageUrl}
          set={(value) => set("seoImageUrl", value)}
          inputMode="url"
        />
        <TextArea
          label="Default SEO description"
          value={form.seoDescription}
          set={(value) => set("seoDescription", value)}
        />
        <Toggle
          label="Ask search engines not to index the site"
          description="Useful only during private staging. Do not enable on the production website."
          checked={form.noIndex}
          set={(value) => set("noIndex", value)}
        />
      </SettingsSection>
      <SettingsSection
        title="Operational controls"
        description="High-impact public features. Review these values carefully before saving."
      >
        <Toggle
          label="Admissions are open"
          description="Shows application actions on public admissions routes."
          checked={form.admissionsOpen}
          set={(value) => set("admissionsOpen", value)}
        />
        <Toggle
          label="AI assistant enabled"
          description="Allows the public assistant to queue Gemini responses when server configuration is healthy."
          checked={form.assistantEnabled}
          set={(value) => set("assistantEnabled", value)}
        />
        <Toggle
          label="Maintenance mode"
          description="Use only during planned service windows."
          checked={form.maintenanceMode}
          set={(value) => set("maintenanceMode", value)}
        />
      </SettingsSection>
      {form.maintenanceMode && (
        <Feedback kind="info">
          <span className="flex gap-2">
            <ShieldAlert className="shrink-0" size={17} /> Maintenance mode is selected. Verify the public
            maintenance experience before saving.
          </span>
        </Feedback>
      )}
      <div className="sticky bottom-2 flex justify-end rounded-2xl border border-slate-200 bg-white/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] shadow-xl backdrop-blur sm:bottom-4 sm:p-4">
        <button disabled={busy} className={`${primaryButtonClass} w-full sm:w-auto`}>
          {busy ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
          {busy ? "Saving settings…" : "Save site settings"}
        </button>
      </div>
    </form>
  );
}

function BrandMediaFields({
  form,
  set,
}: {
  form: SettingsForm;
  set: <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => void;
}) {
  const { results, status, loadMore } = usePaginatedQuery(mediaApi.listMedia, {}, { initialNumItems: 100 });
  const images = results.filter((item) => String(item.mimeType ?? "").startsWith("image/"));
  return (
    <div className="grid gap-5 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2 sm:grid-cols-2">
      <MediaField
        label="Header logo"
        value={form.logoId}
        url={form.logoUrl}
        items={images}
        setValue={(value) => set("logoId", value)}
        setUrl={(value) => set("logoUrl", value)}
      />
      <MediaField
        label="Browser favicon"
        value={form.faviconId}
        url={form.faviconUrl}
        items={images}
        setValue={(value) => set("faviconId", value)}
        setUrl={(value) => set("faviconUrl", value)}
      />
      <div className="flex flex-wrap items-center gap-3 text-xs sm:col-span-2">
        <Link href="/admin/media" className="font-bold text-sky-800 underline underline-offset-4">
          Upload a new image in Media
        </Link>
        {status === "CanLoadMore" && (
          <button type="button" onClick={() => loadMore(100)} className="font-bold text-sky-800">
            Load more media
          </button>
        )}
      </div>
    </div>
  );
}

function MediaField({
  label,
  value,
  url,
  items,
  setValue,
  setUrl,
}: {
  label: string;
  value: string;
  url: string;
  items: Array<Record<string, unknown>>;
  setValue: (value: string) => void;
  setUrl: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-bold">
        {label} from Media
        <select value={value} onChange={(event) => setValue(event.target.value)} className={inputClass}>
          <option value="">No stored image selected</option>
          {value && !items.some((item) => item.storageId === value) && (
            <option value={value}>Current stored image</option>
          )}
          {items.map((item) => (
            <option key={String(item._id)} value={String(item.storageId)}>
              {String(item.fileName ?? "Uploaded image")}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-xs font-bold text-slate-600">
        Or site image path / Convex storage URL
        <input
          type="text"
          inputMode="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className={inputClass}
          placeholder="/media/image.png or https://….convex.cloud/…"
        />
      </label>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Use a site path starting with / or an HTTPS Convex storage URL. A stored image takes precedence.
      </p>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-black">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}
function Field({
  label,
  value,
  set,
  required,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  required?: boolean;
  type?: "text" | "email" | "url";
  inputMode?: "url";
}) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <input
        className={inputClass}
        value={value}
        onChange={(event) => set(event.target.value)}
        required={required}
        type={type}
        inputMode={inputMode}
      />
    </label>
  );
}
function TextArea({
  label,
  value,
  set,
  required,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-bold sm:col-span-2">
      {label}
      <textarea
        className={inputClass}
        value={value}
        onChange={(event) => set(event.target.value)}
        required={required}
        rows={4}
      />
    </label>
  );
}
function Toggle({
  label,
  description,
  checked,
  set,
}: {
  label: string;
  description: string;
  checked: boolean;
  set: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 sm:col-span-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => set(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-500"
      />
      <span className="min-w-0">
        <b className="block text-sm">{label}</b>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
    </label>
  );
}
function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function fromSettings(value: Record<string, unknown> | null): SettingsForm {
  const source = value ?? {};
  const contact = object(source.contact);
  const social = object(source.social);
  const seo = object(source.seo);
  const string = (item: unknown, fallback = "") => (typeof item === "string" ? item : fallback);
  return {
    schoolName: string(source.schoolName, empty.schoolName),
    shortName: string(source.shortName, empty.shortName),
    tagline: string(source.tagline),
    description: string(source.description),
    logoId: string(source.logoId),
    logoUrl: string(source.logoUrl),
    faviconId: string(source.faviconId),
    faviconUrl: string(source.faviconUrl),
    academicYear: string(source.academicYear),
    timezone: string(source.timezone, empty.timezone),
    address: string(contact.address),
    city: string(contact.city, empty.city),
    country: string(contact.country, empty.country),
    phone: string(contact.phone),
    secondaryPhone: string(contact.secondaryPhone),
    email: string(contact.email),
    mapUrl: string(contact.mapUrl),
    officeHours: string(contact.officeHours),
    facebook: string(social.facebook),
    instagram: string(social.instagram),
    youtube: string(social.youtube),
    linkedin: string(social.linkedin),
    x: string(social.x),
    seoTitle: string(seo.title),
    seoDescription: string(seo.description),
    seoImageUrl: string(seo.imageUrl),
    noIndex: Boolean(seo.noIndex),
    admissionsOpen: Boolean(source.admissionsOpen),
    assistantEnabled: Boolean(source.assistantEnabled),
    maintenanceMode: Boolean(source.maintenanceMode),
  };
}
function optional(value: string) {
  return value.trim() || undefined;
}
function toSettings(form: SettingsForm): Record<string, unknown> {
  return {
    schoolName: form.schoolName.trim(),
    shortName: form.shortName.trim(),
    tagline: form.tagline.trim(),
    description: form.description.trim(),
    logoId: optional(form.logoId),
    logoUrl: optional(form.logoUrl),
    faviconId: optional(form.faviconId),
    faviconUrl: optional(form.faviconUrl),
    contact: {
      address: form.address.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      phone: form.phone.trim(),
      secondaryPhone: optional(form.secondaryPhone),
      email: form.email.trim(),
      mapUrl: optional(form.mapUrl),
      officeHours: optional(form.officeHours),
    },
    social: {
      facebook: optional(form.facebook),
      instagram: optional(form.instagram),
      youtube: optional(form.youtube),
      linkedin: optional(form.linkedin),
      x: optional(form.x),
    },
    seo: {
      title: optional(form.seoTitle),
      description: optional(form.seoDescription),
      imageUrl: optional(form.seoImageUrl),
      noIndex: form.noIndex,
    },
    academicYear: form.academicYear.trim(),
    timezone: form.timezone.trim(),
    admissionsOpen: form.admissionsOpen,
    assistantEnabled: form.assistantEnabled,
    maintenanceMode: form.maintenanceMode,
  };
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Settings could not be saved. No success was recorded.";
}
