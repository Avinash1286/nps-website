import { fetchQuery } from "convex/nextjs";
import { makeFunctionReference } from "convex/server";

export type SiteProfile = {
  schoolName: string;
  shortName: string;
  location: string;
  description: string;
  tagline?: string;
  logoUrl?: string;
  faviconUrl?: string;
  email?: string;
  phone?: string;
  secondaryPhone?: string;
  mapUrl?: string;
  officeHours?: string;
  academicYear?: string;
  timezone: string;
  admissionsOpen: boolean;
  assistantEnabled: boolean;
  maintenanceMode: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoImageUrl?: string;
  noIndex?: boolean;
  social: Record<string, string>;
};

export type PublicSeo = {
  title?: string;
  description?: string;
  imageUrl?: string;
  noIndex?: boolean;
};

export type PublicTeacher = {
  id: string;
  slug: string;
  name: string;
  designation: string;
  department: string;
  departmentSlug: string;
  qualification?: string;
  subjects: string[];
  bio?: string;
  photoUrl?: string;
  email?: string;
  phone?: string;
  seo?: PublicSeo;
};

export type PublicLeader = {
  id: string;
  slug: string;
  name: string;
  designation: string;
  bio?: string;
  message?: string;
  photoUrl?: string;
  officeHours?: string;
  email?: string;
};

export type PublicProgram = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  gradeRange?: string;
  curriculum?: string;
  outcomes: string[];
  heroImageUrl?: string;
  featured?: boolean;
  seo?: PublicSeo;
};

export type PublicDepartment = {
  id: string;
  slug: string;
  name: string;
  description: string;
  responsibilities: string[];
  email?: string;
  phone?: string;
  teachers: PublicTeacher[];
  headTeacher?: PublicTeacher;
  featured?: boolean;
  seo?: PublicSeo;
};

export type PublicCmsPage = {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  body: string;
  heroImageUrl?: string;
  template: "standard" | "landing" | "information";
  featured?: boolean;
  seo?: PublicSeo;
};

export type PublicPost = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body?: string;
  category?: string;
  publishedAt?: string;
  imageUrl?: string;
  attachmentUrl?: string;
  featured?: boolean;
  priority?: "normal" | "important" | "urgent";
  audiences: string[];
  seo?: PublicSeo;
};

export type PublicFaq = {
  id: string;
  question: string;
  answer: string;
  category?: string;
};

export type PublicTestimonial = {
  id: string;
  name: string;
  role?: string;
  organization?: string;
  quote: string;
  photoUrl?: string;
};

export type PublicEvent = PublicPost & {
  startsAt?: string;
  endsAt?: string;
  venue?: string;
  registrationOpen?: boolean;
  timezone?: string;
};

export type PublicDocument = {
  id: string;
  title: string;
  category: string;
  description?: string;
  fileType?: string;
  fileSize?: string;
  downloadUrl?: string;
  publishedAt?: string;
  featured?: boolean;
  seo?: PublicSeo;
};

export type GalleryAlbum = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  coverUrl?: string;
  itemCount?: number;
  featured?: boolean;
  seo?: PublicSeo;
};

export type GalleryItem = {
  id: string;
  mediaType: "image" | "video";
  url: string;
  thumbnailUrl?: string;
  alt: string;
  caption?: string;
  credit?: string;
};

export type GalleryAlbumDetail = { album: GalleryAlbum; items: GalleryItem[] };

export type PublicNavigationItem = {
  id: string;
  label: string;
  href: string;
  parentId?: string;
  external?: boolean;
  description?: string;
};

export const baselineSite: SiteProfile = {
  schoolName: "Nepal Police School, Garuda",
  shortName: "NPS Garuda",
  location: "Garuda, Rautahat, Nepal",
  description:
    "The official information portal for Nepal Police School, Garuda, serving students, families, staff, and the wider school community.",
  tagline: "Discipline, dignity, and decorum",
  logoUrl: "/media/nps-logo.png",
  faviconUrl: "/media/nps-logo.png",
  timezone: "Asia/Kathmandu",
  admissionsOpen: false,
  assistantEnabled: false,
  maintenanceMode: false,
  social: {},
};

const baselineLeaders: PublicLeader[] = [
  {
    id: "principal-office",
    slug: "principal",
    name: "Principal's Office",
    designation: "Academic leadership",
    message:
      "The principal's office coordinates academic direction, student support, and communication with families. A verified profile and message will be published by the school administration.",
    photoUrl: "/media/principal-placeholder.png",
  },
  {
    id: "vice-principal-office",
    slug: "vice-principal",
    name: "Vice Principal's Office",
    designation: "Academic coordination",
    message:
      "The vice principal's office supports teaching, learning, assessment, and the day-to-day academic programme. Verified office details will be maintained by the school administration.",
    photoUrl: "/media/vice-principal-placeholder.png",
  },
  {
    id: "commandant-office",
    slug: "commandant",
    name: "Commandant's Office",
    designation: "Institutional leadership",
    message:
      "The commandant's office supports institutional governance, student welfare, and the disciplined operation of the school. Verified profile details will be published by the administration.",
    photoUrl: "/media/commandant-placeholder.png",
  },
];

type UnknownRecord = Record<string, unknown>;

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function optionalText(value: unknown) {
  const result = text(value);
  return result || undefined;
}

function joinedText(value: unknown) {
  if (Array.isArray(value)) {
    const values = value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
    return values.length ? values.join(", ") : undefined;
  }
  return optionalText(value);
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
}

function identifier(value: unknown, fallback: string) {
  return text(value, fallback);
}

function dateValue(value: unknown) {
  if (typeof value === "number") return new Date(value).toISOString();
  return optionalText(value);
}

function normalizeSeo(value: unknown): PublicSeo | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as UnknownRecord;
  const seo = {
    title: optionalText(record.title),
    description: optionalText(record.description),
    imageUrl: optionalText(record.imageUrl),
    noIndex: typeof record.noIndex === "boolean" ? record.noIndex : undefined,
  };
  return Object.values(seo).some((entry) => entry !== undefined) ? seo : undefined;
}

function pageTemplate(value: unknown): PublicCmsPage["template"] {
  return value === "landing" || value === "information" ? value : "standard";
}

export function prioritizeFeatured<T extends { featured?: boolean }>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort(
      (left, right) =>
        Number(Boolean(right.item.featured)) - Number(Boolean(left.item.featured)) ||
        left.index - right.index,
    )
    .map(({ item }) => item);
}

async function queryConvex<T>(name: string, args: UnknownRecord = {}): Promise<T | undefined> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return undefined;

  try {
    const reference = makeFunctionReference<"query", UnknownRecord, T>(name);
    return await fetchQuery(reference, args, { url });
  } catch (error) {
    console.error(`[public-data] Convex query ${name} failed`, error);
    return undefined;
  }
}

function asRecords(value: unknown): UnknownRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is UnknownRecord => Boolean(item) && typeof item === "object")
    : [];
}

function normalizeTeacher(item: UnknownRecord, index: number): PublicTeacher {
  const departmentRecord =
    item.department && typeof item.department === "object" ? (item.department as UnknownRecord) : undefined;
  const name = text(item.name, "Faculty member");
  const slug = text(item.slug, `faculty-${index + 1}`);
  const department = text(
    item.departmentName,
    text(departmentRecord?.name, text(item.department, "Faculty")),
  );
  return {
    id: identifier(item._id ?? item.id, slug),
    slug,
    name,
    designation: text(item.designation ?? item.title, "Teacher"),
    department,
    departmentSlug: text(
      item.departmentSlug,
      text(departmentRecord?.slug, department.toLowerCase().replace(/[^a-z0-9]+/g, "-")),
    ),
    qualification: joinedText(item.qualification ?? item.qualifications),
    subjects: stringList(item.subjects),
    bio: optionalText(item.bio),
    photoUrl: optionalText(item.photoUrl ?? item.photo_url),
    email: optionalText(item.email),
    phone: optionalText(item.phone),
    seo: normalizeSeo(item.seo),
  };
}

function normalizeLeader(item: UnknownRecord, index: number): PublicLeader {
  const slug = text(item.slug, `leadership-${index + 1}`);
  return {
    id: identifier(item._id ?? item.id, slug),
    slug,
    name: text(item.name, "Leadership office"),
    designation: text(item.designation ?? item.role, "School leadership"),
    bio: optionalText(item.bio),
    message: optionalText(item.message ?? item.quote ?? item.bio),
    photoUrl: optionalText(item.photoUrl ?? item.photo_url),
    officeHours: optionalText(item.officeHours ?? item.office_hours),
    email: optionalText(item.email),
  };
}

function normalizeProgram(item: UnknownRecord, index: number): PublicProgram {
  const slug = text(item.slug, `program-${index + 1}`);
  const description = text(
    item.description,
    "Programme details will be published after administrative review.",
  );
  return {
    id: identifier(item._id ?? item.id, slug),
    slug,
    name: text(item.name ?? item.title, "Academic programme"),
    shortDescription: text(item.shortDescription ?? item.summary, description.slice(0, 220)),
    description,
    gradeRange: optionalText(item.gradeRange),
    curriculum: optionalText(item.curriculum),
    outcomes: stringList(item.outcomes),
    heroImageUrl: optionalText(item.heroImageUrl),
    featured: item.featured === true,
    seo: normalizeSeo(item.seo),
  };
}

function normalizeDepartment(item: UnknownRecord, index: number): PublicDepartment {
  const slug = text(item.slug, `department-${index + 1}`);
  const teachers = asRecords(item.teachers).map(normalizeTeacher);
  const explicitHead =
    item.headTeacher && typeof item.headTeacher === "object"
      ? normalizeTeacher(item.headTeacher as UnknownRecord, 0)
      : undefined;
  const headTeacherId = optionalText(item.headTeacherId);
  return {
    id: identifier(item._id ?? item.id, slug),
    slug,
    name: text(item.name ?? item.title, "Academic department"),
    description: text(
      item.description,
      "Department information will be published after administrative review.",
    ),
    responsibilities: stringList(item.responsibilities),
    email: optionalText(item.email),
    phone: optionalText(item.phone),
    teachers,
    headTeacher: explicitHead ?? teachers.find((teacher) => teacher.id === headTeacherId),
    featured: item.featured === true,
    seo: normalizeSeo(item.seo),
  };
}

function normalizeCmsPage(item: UnknownRecord, index: number): PublicCmsPage {
  const slug = text(item.slug, `page-${index + 1}`);
  return {
    id: identifier(item._id ?? item.id, slug),
    slug,
    title: text(item.title, "School information"),
    summary: optionalText(item.summary),
    body: text(item.body, "This page is awaiting verified content from the school administration."),
    heroImageUrl: optionalText(item.heroImageUrl),
    template: pageTemplate(item.template),
    featured: item.featured === true,
    seo: normalizeSeo(item.seo),
  };
}

function normalizePost(item: UnknownRecord, index: number): PublicPost {
  const slug = text(item.slug, `update-${index + 1}`);
  return {
    id: identifier(item._id ?? item.id, slug),
    slug,
    title: text(item.title, "School update"),
    summary: text(item.summary ?? item.excerpt, "Open this update for the complete information."),
    body: optionalText(item.body ?? item.content),
    category: optionalText(item.category ?? item.audience),
    publishedAt: dateValue(item.publishedAt ?? item.published_at ?? item.publishAt),
    imageUrl: optionalText(item.imageUrl ?? item.image_url ?? item.coverUrl ?? item.featuredImageUrl),
    attachmentUrl: optionalText(item.attachmentUrl ?? item.attachment_url),
    featured: item.featured === true,
    priority:
      item.priority === "urgent" || item.priority === "important" || item.priority === "normal"
        ? item.priority
        : undefined,
    audiences: stringList(item.audiences ?? (item.audience ? [item.audience] : [])),
    seo: normalizeSeo(item.seo),
  };
}

function normalizeEvent(item: UnknownRecord, index: number): PublicEvent {
  const endsAt = dateValue(item.endsAt ?? item.ends_at ?? item.endDate ?? item.endAt);
  return {
    ...normalizePost(item, index),
    body: optionalText(item.body ?? item.content ?? item.description),
    startsAt: dateValue(item.startsAt ?? item.starts_at ?? item.startDate ?? item.startAt),
    endsAt,
    venue: optionalText(item.venue ?? item.location),
    timezone: validTimeZone(optionalText(item.timezone)),
    registrationOpen:
      (item.registrationOpen === true || item.registrationEnabled === true) &&
      Boolean(endsAt && Date.parse(endsAt) > Date.now()),
  };
}

export async function getSiteProfile(): Promise<SiteProfile> {
  const settings = await queryConvex<UnknownRecord | null>("content:getSiteSettings");
  if (!settings) return baselineSite;
  const contact =
    settings.contact && typeof settings.contact === "object"
      ? (settings.contact as UnknownRecord)
      : undefined;
  const seo = settings.seo && typeof settings.seo === "object" ? (settings.seo as UnknownRecord) : undefined;
  const social =
    settings.social && typeof settings.social === "object" ? (settings.social as UnknownRecord) : undefined;
  const nestedLocation = [
    optionalText(contact?.address),
    optionalText(contact?.city),
    optionalText(contact?.country),
  ]
    .filter(Boolean)
    .join(", ");
  return {
    schoolName: text(settings.schoolName, baselineSite.schoolName),
    shortName: text(settings.shortName, baselineSite.shortName),
    location: text(settings.location ?? settings.address, nestedLocation || baselineSite.location),
    description: text(settings.description, baselineSite.description),
    tagline: optionalText(settings.tagline),
    logoUrl: optionalText(settings.logoUrl) ?? baselineSite.logoUrl,
    faviconUrl: optionalText(settings.faviconUrl) ?? baselineSite.faviconUrl,
    email: optionalText(settings.email ?? contact?.email),
    phone: optionalText(settings.phone ?? contact?.phone),
    secondaryPhone: optionalText(contact?.secondaryPhone),
    mapUrl: optionalText(contact?.mapUrl),
    officeHours: optionalText(settings.officeHours ?? contact?.officeHours),
    academicYear: optionalText(settings.academicYear),
    timezone: validTimeZone(optionalText(settings.timezone), baselineSite.timezone),
    admissionsOpen: settings.admissionsOpen === true,
    assistantEnabled: settings.assistantEnabled === true,
    maintenanceMode: settings.maintenanceMode === true,
    seoTitle: optionalText(seo?.title),
    seoDescription: optionalText(seo?.description),
    seoImageUrl: optionalText(seo?.imageUrl),
    noIndex: seo?.noIndex === true,
    social: Object.fromEntries(
      Object.entries(social ?? {}).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string" && Boolean(entry[1].trim()),
      ),
    ),
  };
}

export async function getNavigation(
  location: "header" | "footer" | "utility",
): Promise<PublicNavigationItem[]> {
  const result = await queryConvex<unknown>("content:listNavigation", { location });
  return asRecords(result).map((item, index) => ({
    id: identifier(item._id ?? item.id, `${location}-${index + 1}`),
    label: text(item.label, "Information"),
    href: text(item.href, "/"),
    parentId: optionalText(item.parentId),
    external: item.external === true,
    description: optionalText(item.description),
  }));
}

export async function getTeachers(departmentSlug?: string): Promise<PublicTeacher[]> {
  const now = Date.now();
  const result = await queryConvex<unknown>("content:listTeachers", {
    limit: 200,
    now,
    ...(departmentSlug ? { departmentSlug } : {}),
  });
  return asRecords(result).map(normalizeTeacher);
}

export async function getTeacher(slug: string): Promise<PublicTeacher | null> {
  const result = await queryConvex<UnknownRecord | null>("content:getTeacher", { slug, now: Date.now() });
  if (result) return normalizeTeacher(result, 0);
  return (await getTeachers()).find((teacher) => teacher.slug === slug) ?? null;
}

export async function getLeadership(): Promise<PublicLeader[]> {
  const result = await queryConvex<unknown>("content:listLeadership", { limit: 20, now: Date.now() });
  const records = asRecords(result);
  return records.length ? records.map(normalizeLeader) : baselineLeaders;
}

export async function getLeader(slug: string): Promise<PublicLeader | null> {
  const result = await queryConvex<UnknownRecord | null>("content:getLeadershipMember", {
    slug,
    now: Date.now(),
  });
  if (result) return normalizeLeader(result, 0);
  return (await getLeadership()).find((leader) => leader.slug === slug) ?? null;
}

export async function getPrograms(
  options: { featured?: boolean; limit?: number } = {},
): Promise<PublicProgram[]> {
  const data = await queryConvex<unknown>("content:listPrograms", {
    limit: options.limit ?? 100,
    now: Date.now(),
    ...(options.featured === undefined ? {} : { featured: options.featured }),
  });
  return prioritizeFeatured(asRecords(data).map(normalizeProgram));
}

export async function getProgram(slug: string): Promise<PublicProgram | null> {
  const data = await queryConvex<UnknownRecord | null>("content:getProgram", {
    slug,
    now: Date.now(),
  });
  return data ? normalizeProgram(data, 0) : null;
}

export async function getDepartments(
  options: { featured?: boolean; limit?: number } = {},
): Promise<PublicDepartment[]> {
  const data = await queryConvex<unknown>("content:listDepartments", {
    limit: options.limit ?? 100,
    now: Date.now(),
    ...(options.featured === undefined ? {} : { featured: options.featured }),
  });
  return prioritizeFeatured(asRecords(data).map(normalizeDepartment));
}

export async function getDepartment(slug: string): Promise<PublicDepartment | null> {
  const data = await queryConvex<UnknownRecord | null>("content:getDepartment", {
    slug,
    now: Date.now(),
  });
  if (!data) return null;
  const department = normalizeDepartment(data, 0);
  const headTeacherId = optionalText(data.headTeacherId);
  if (!department.headTeacher && headTeacherId) {
    department.headTeacher = (await getTeachers()).find((teacher) => teacher.id === headTeacherId);
  }
  return department;
}

export async function getCmsPages(
  options: { featured?: boolean; limit?: number } = {},
): Promise<PublicCmsPage[]> {
  const data = await queryConvex<unknown>("content:listPages", {
    limit: options.limit ?? 200,
    now: Date.now(),
    ...(options.featured === undefined ? {} : { featured: options.featured }),
  });
  return prioritizeFeatured(asRecords(data).map(normalizeCmsPage));
}

export async function getCmsPage(slug: string): Promise<PublicCmsPage | null> {
  const data = await queryConvex<UnknownRecord | null>("content:getPage", {
    slug,
    now: Date.now(),
  });
  return data ? normalizeCmsPage(data, 0) : null;
}

export async function getNews(limit = 20, featured?: boolean): Promise<PublicPost[]> {
  const result = await queryConvex<unknown>("content:listNews", {
    limit,
    now: Date.now(),
    ...(featured === undefined ? {} : { featured }),
  });
  return prioritizeFeatured(asRecords(result).map(normalizePost));
}

export async function getNewsItem(slug: string): Promise<PublicPost | null> {
  const result = await queryConvex<UnknownRecord | null>("content:getNews", {
    slug,
    now: Date.now(),
  });
  return result ? normalizePost(result, 0) : null;
}

export async function getNotices(limit = 50): Promise<PublicPost[]> {
  const result = await queryConvex<unknown>("content:listNotices", { limit, now: Date.now() });
  return asRecords(result).map(normalizePost);
}

export async function getNotice(slug: string): Promise<PublicPost | null> {
  const result = await queryConvex<UnknownRecord | null>("content:getNotice", {
    slug,
    now: Date.now(),
  });
  return result ? normalizePost(result, 0) : null;
}

export async function getFaqs(category?: string, limit = 100): Promise<PublicFaq[]> {
  const result = await queryConvex<unknown>("content:listFaqs", {
    limit,
    now: Date.now(),
    ...(category ? { category } : {}),
  });
  return asRecords(result).map((item, index) => ({
    id: identifier(item._id ?? item.id, `faq-${index + 1}`),
    question: text(item.question, "School information"),
    answer: text(item.answer, "Please contact the school office for current guidance."),
    category: optionalText(item.category),
  }));
}

export async function getTestimonials(limit = 100): Promise<PublicTestimonial[]> {
  const result = await queryConvex<unknown>("content:listTestimonials", {
    limit,
    now: Date.now(),
  });
  return asRecords(result).map((item, index) => ({
    id: identifier(item._id ?? item.id, `testimonial-${index + 1}`),
    name: text(item.name, "School community member"),
    role: optionalText(item.role),
    organization: optionalText(item.organization),
    quote: text(item.quote, "A verified testimonial will be published here."),
    photoUrl: optionalText(item.photoUrl),
  }));
}

export async function getEvents(
  scope: "upcoming" | "past" | "all" = "upcoming",
  limit = 30,
): Promise<PublicEvent[]> {
  const result = await queryConvex<unknown>("content:listEvents", {
    scope,
    limit,
    now: Date.now(),
  });
  const events = asRecords(result).map(normalizeEvent);
  return scope === "past" ? events : prioritizeFeatured(events);
}

export async function getEvent(slug: string): Promise<PublicEvent | null> {
  const result = await queryConvex<UnknownRecord | null>("content:getEvent", {
    slug,
    now: Date.now(),
  });
  return result ? normalizeEvent(result, 0) : null;
}

export async function getDocuments(): Promise<PublicDocument[]> {
  const result = await queryConvex<unknown>("content:listDocuments", {
    limit: 200,
    now: Date.now(),
  });
  return prioritizeFeatured(
    asRecords(result).map((item, index) => ({
      id: identifier(item._id ?? item.id, `document-${index + 1}`),
      title: text(item.title, "School document"),
      category: text(item.category, "General"),
      description: optionalText(item.description),
      fileType: optionalText(item.fileType ?? item.file_type ?? item.mimeType ?? item.fileName),
      fileSize:
        typeof item.size === "number"
          ? formatFileSize(item.size)
          : optionalText(item.fileSize ?? item.file_size),
      downloadUrl: optionalText(item.downloadUrl ?? item.fileUrl),
      publishedAt: dateValue(item.publishedAt ?? item.published_at ?? item.publishAt),
      featured: item.featured === true,
      seo: normalizeSeo(item.seo),
    })),
  );
}

export async function getGalleryAlbums(): Promise<GalleryAlbum[]> {
  const result = await queryConvex<unknown>("content:listGalleryAlbums", {
    limit: 100,
    now: Date.now(),
  });
  return prioritizeFeatured(
    asRecords(result).map((item, index) => {
      const slug = text(item.slug, `album-${index + 1}`);
      return {
        id: identifier(item._id ?? item.id, slug),
        slug,
        title: text(item.title, "School gallery"),
        description: optionalText(item.description),
        coverUrl: optionalText(item.coverUrl ?? item.coverImageUrl),
        itemCount: typeof item.itemCount === "number" ? item.itemCount : undefined,
        featured: item.featured === true,
        seo: normalizeSeo(item.seo),
      };
    }),
  );
}

export async function getGalleryAlbum(slug: string): Promise<GalleryAlbumDetail | null> {
  const result = await queryConvex<{ album?: UnknownRecord; items?: unknown } | null>(
    "content:getGalleryAlbum",
    { slug, now: Date.now() },
  );
  if (!result?.album) return null;
  const albumRecord = result.album;
  const album: GalleryAlbum = {
    id: identifier(albumRecord._id ?? albumRecord.id, slug),
    slug: text(albumRecord.slug, slug),
    title: text(albumRecord.title, "School gallery"),
    description: optionalText(albumRecord.description),
    coverUrl: optionalText(albumRecord.coverUrl ?? albumRecord.coverImageUrl),
    featured: albumRecord.featured === true,
    seo: normalizeSeo(albumRecord.seo),
  };
  const items = asRecords(result.items).flatMap((item, index): GalleryItem[] => {
    const url = optionalText(item.url);
    if (!url) return [];
    return [
      {
        id: identifier(item._id ?? item.id, `${slug}-${index + 1}`),
        mediaType: item.mediaType === "video" ? "video" : "image",
        url,
        thumbnailUrl: optionalText(item.thumbnailUrl),
        alt: text(item.alt, album.title),
        caption: optionalText(item.caption),
        credit: optionalText(item.credit),
      },
    ];
  });
  album.itemCount = items.length;
  return { album, items };
}

export function formatPublicDate(value?: string) {
  if (!value) return "Date to be confirmed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date to be confirmed";
  return new Intl.DateTimeFormat("en-NP", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kathmandu",
  }).format(date);
}

export function formatEventDateTimeRange(startsAt?: string, endsAt?: string, requestedTimeZone?: string) {
  if (!startsAt) return "Schedule to be confirmed";
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return "Schedule to be confirmed";
  const end = endsAt ? new Date(endsAt) : null;
  const validEnd = end && !Number.isNaN(end.getTime()) ? end : null;
  const timeZone = validTimeZone(requestedTimeZone);
  const timeZoneLabel = timeZone === "Asia/Kathmandu" ? "Nepal time" : timeZone;
  const dateFormatter = new Intl.DateTimeFormat("en-NP", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  });
  const timeFormatter = new Intl.DateTimeFormat("en-NP", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  });
  const dayKey = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    }).format(date);

  if (!validEnd) return `${dateFormatter.format(start)}, ${timeFormatter.format(start)} (${timeZoneLabel})`;
  if (dayKey(start) === dayKey(validEnd)) {
    return `${dateFormatter.format(start)}, ${timeFormatter.format(start)} to ${timeFormatter.format(validEnd)} (${timeZoneLabel})`;
  }
  return `${dateFormatter.format(start)}, ${timeFormatter.format(start)} to ${dateFormatter.format(validEnd)}, ${timeFormatter.format(validEnd)} (${timeZoneLabel})`;
}

function validTimeZone(value?: string, fallback = "Asia/Kathmandu") {
  if (!value) return fallback;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return value;
  } catch {
    return fallback;
  }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
