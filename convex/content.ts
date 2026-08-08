import { v } from "convex/values";
import { internalQuery, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const contentStatusValidator = v.union(
  v.literal("draft"),
  v.literal("scheduled"),
  v.literal("published"),
  v.literal("archived"),
);

const seoOutputValidator = v.object({
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  noIndex: v.optional(v.boolean()),
});

const publicationOutputFields = {
  status: contentStatusValidator,
  publishAt: v.optional(v.number()),
  expireAt: v.optional(v.number()),
  publishedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
};

const publicSiteSettingsValidator = v.object({
  _id: v.id("siteSettings"),
  _creationTime: v.number(),
  singletonKey: v.literal("main"),
  schoolName: v.string(),
  shortName: v.string(),
  tagline: v.string(),
  description: v.string(),
  logoId: v.optional(v.id("_storage")),
  logoUrl: v.optional(v.string()),
  faviconId: v.optional(v.id("_storage")),
  faviconUrl: v.optional(v.string()),
  contact: v.object({
    address: v.string(),
    city: v.string(),
    country: v.string(),
    phone: v.string(),
    secondaryPhone: v.optional(v.string()),
    email: v.string(),
    mapUrl: v.optional(v.string()),
    officeHours: v.optional(v.string()),
  }),
  social: v.object({
    facebook: v.optional(v.string()),
    instagram: v.optional(v.string()),
    youtube: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    x: v.optional(v.string()),
  }),
  seo: seoOutputValidator,
  academicYear: v.string(),
  timezone: v.string(),
  admissionsOpen: v.boolean(),
  assistantEnabled: v.boolean(),
  maintenanceMode: v.boolean(),
  updatedAt: v.number(),
});

const publicNavigationValidator = v.object({
  _id: v.id("navigationItems"),
  _creationTime: v.number(),
  label: v.string(),
  href: v.string(),
  location: v.union(v.literal("header"), v.literal("footer"), v.literal("utility")),
  parentId: v.optional(v.id("navigationItems")),
  order: v.number(),
  external: v.boolean(),
  visible: v.boolean(),
  description: v.optional(v.string()),
  requiredRole: v.optional(
    v.union(v.literal("admin"), v.literal("publisher"), v.literal("editor"), v.literal("admissions")),
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const publicPageValidator = v.object({
  _id: v.id("pages"),
  _creationTime: v.number(),
  slug: v.string(),
  title: v.string(),
  summary: v.optional(v.string()),
  body: v.string(),
  template: v.optional(v.string()),
  heroImageId: v.optional(v.id("_storage")),
  heroImageUrl: v.optional(v.string()),
  featured: v.boolean(),
  order: v.number(),
  seo: seoOutputValidator,
  ...publicationOutputFields,
});

const publicProgramValidator = v.object({
  _id: v.id("programs"),
  _creationTime: v.number(),
  slug: v.string(),
  name: v.string(),
  shortDescription: v.string(),
  description: v.string(),
  gradeRange: v.optional(v.string()),
  curriculum: v.optional(v.string()),
  outcomes: v.array(v.string()),
  heroImageId: v.optional(v.id("_storage")),
  heroImageUrl: v.optional(v.string()),
  featured: v.boolean(),
  order: v.number(),
  seo: seoOutputValidator,
  ...publicationOutputFields,
});

const publicDepartmentValidator = v.object({
  _id: v.id("departments"),
  _creationTime: v.number(),
  slug: v.string(),
  name: v.string(),
  description: v.string(),
  responsibilities: v.array(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  headTeacherId: v.optional(v.id("teachers")),
  featured: v.boolean(),
  order: v.number(),
  seo: seoOutputValidator,
  ...publicationOutputFields,
});

const publicTeacherValidator = v.object({
  _id: v.id("teachers"),
  _creationTime: v.number(),
  slug: v.string(),
  name: v.string(),
  title: v.string(),
  departmentId: v.optional(v.id("departments")),
  bio: v.string(),
  qualifications: v.array(v.string()),
  subjects: v.array(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  showContact: v.boolean(),
  photoId: v.optional(v.id("_storage")),
  photoUrl: v.optional(v.string()),
  order: v.number(),
  seo: seoOutputValidator,
  ...publicationOutputFields,
});

const publicTeacherWithDepartmentValidator = publicTeacherValidator.extend({
  department: v.optional(publicDepartmentValidator),
});

const publicLeadershipValidator = v.object({
  _id: v.id("leadership"),
  _creationTime: v.number(),
  slug: v.optional(v.string()),
  name: v.string(),
  role: v.string(),
  bio: v.string(),
  quote: v.optional(v.string()),
  photoId: v.optional(v.id("_storage")),
  photoUrl: v.optional(v.string()),
  email: v.optional(v.string()),
  order: v.number(),
  ...publicationOutputFields,
});

const publicNewsValidator = v.object({
  _id: v.id("news"),
  _creationTime: v.number(),
  slug: v.string(),
  title: v.string(),
  excerpt: v.string(),
  body: v.string(),
  category: v.string(),
  tags: v.array(v.string()),
  authorName: v.optional(v.string()),
  featuredImageId: v.optional(v.id("_storage")),
  featuredImageUrl: v.optional(v.string()),
  featured: v.boolean(),
  seo: seoOutputValidator,
  ...publicationOutputFields,
});

const publicNoticeValidator = v.object({
  _id: v.id("notices"),
  _creationTime: v.number(),
  slug: v.string(),
  title: v.string(),
  summary: v.optional(v.string()),
  body: v.string(),
  priority: v.union(v.literal("normal"), v.literal("important"), v.literal("urgent")),
  audiences: v.array(v.string()),
  attachmentId: v.optional(v.id("_storage")),
  attachmentUrl: v.optional(v.string()),
  startAt: v.optional(v.number()),
  seo: seoOutputValidator,
  ...publicationOutputFields,
});

const publicEventValidator = v.object({
  _id: v.id("events"),
  _creationTime: v.number(),
  slug: v.string(),
  title: v.string(),
  summary: v.optional(v.string()),
  description: v.string(),
  startAt: v.number(),
  endAt: v.number(),
  timezone: v.string(),
  venue: v.optional(v.string()),
  isOnline: v.boolean(),
  capacity: v.optional(v.number()),
  registeredAttendeeCount: v.optional(v.number()),
  registrationEnabled: v.boolean(),
  featuredImageId: v.optional(v.id("_storage")),
  featuredImageUrl: v.optional(v.string()),
  featured: v.boolean(),
  seo: seoOutputValidator,
  ...publicationOutputFields,
});

const publicDocumentValidator = v.object({
  _id: v.id("documents"),
  _creationTime: v.number(),
  slug: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  category: v.string(),
  storageId: v.optional(v.id("_storage")),
  externalUrl: v.optional(v.string()),
  fileName: v.optional(v.string()),
  mimeType: v.optional(v.string()),
  size: v.optional(v.number()),
  schoolYear: v.optional(v.string()),
  featured: v.boolean(),
  order: v.number(),
  seo: seoOutputValidator,
  downloadUrl: v.optional(v.string()),
  ...publicationOutputFields,
});

const publicGalleryAlbumValidator = v.object({
  _id: v.id("galleryAlbums"),
  _creationTime: v.number(),
  slug: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  coverImageId: v.optional(v.id("_storage")),
  coverImageUrl: v.optional(v.string()),
  eventDate: v.optional(v.number()),
  featured: v.boolean(),
  order: v.number(),
  seo: seoOutputValidator,
  ...publicationOutputFields,
});

const publicGalleryItemValidator = v.object({
  _id: v.id("galleryItems"),
  _creationTime: v.number(),
  albumId: v.id("galleryAlbums"),
  url: v.optional(v.string()),
  thumbnailUrl: v.optional(v.string()),
  mediaType: v.union(v.literal("image"), v.literal("video")),
  alt: v.string(),
  caption: v.optional(v.string()),
  credit: v.optional(v.string()),
  order: v.number(),
  visible: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const publicTestimonialValidator = v.object({
  _id: v.id("testimonials"),
  _creationTime: v.number(),
  name: v.string(),
  role: v.optional(v.string()),
  organization: v.optional(v.string()),
  quote: v.string(),
  photoId: v.optional(v.id("_storage")),
  photoUrl: v.optional(v.string()),
  order: v.number(),
  ...publicationOutputFields,
});

const publicHomeSectionValidator = v.object({
  _id: v.id("homeSections"),
  _creationTime: v.number(),
  slug: v.string(),
  eyebrow: v.optional(v.string()),
  heading: v.string(),
  body: v.optional(v.string()),
  secondaryBody: v.optional(v.string()),
  imageId: v.optional(v.id("_storage")),
  imageUrl: v.optional(v.string()),
  imageAlt: v.optional(v.string()),
  secondaryImageId: v.optional(v.id("_storage")),
  secondaryImageUrl: v.optional(v.string()),
  ctaLabel: v.optional(v.string()),
  ctaHref: v.optional(v.string()),
  ...publicationOutputFields,
});

const publicHomeHighlightValidator = v.object({
  _id: v.id("homeHighlights"),
  _creationTime: v.number(),
  section: v.union(v.literal("hero"), v.literal("about"), v.literal("eca")),
  title: v.string(),
  summary: v.optional(v.string()),
  icon: v.optional(v.string()),
  imageId: v.optional(v.id("_storage")),
  imageUrl: v.optional(v.string()),
  imageAlt: v.optional(v.string()),
  href: v.optional(v.string()),
  order: v.number(),
  ...publicationOutputFields,
});

const publicFaqValidator = v.object({
  _id: v.id("faqs"),
  _creationTime: v.number(),
  question: v.string(),
  answer: v.string(),
  category: v.optional(v.string()),
  order: v.number(),
  ...publicationOutputFields,
});

const groundingSnapshotValidator = v.object({
  pages: v.array(
    v.object({
      slug: v.string(),
      title: v.string(),
      summary: v.optional(v.string()),
      body: v.string(),
    }),
  ),
  programs: v.array(v.object({ slug: v.string(), name: v.string(), description: v.string() })),
  departments: v.array(v.object({ slug: v.string(), name: v.string(), description: v.string() })),
  leadership: v.array(
    v.object({
      slug: v.optional(v.string()),
      name: v.string(),
      role: v.string(),
      bio: v.string(),
    }),
  ),
  teachers: v.array(
    v.object({
      slug: v.string(),
      name: v.string(),
      title: v.string(),
      bio: v.string(),
      subjects: v.array(v.string()),
    }),
  ),
  news: v.array(v.object({ slug: v.string(), title: v.string(), excerpt: v.string(), body: v.string() })),
  notices: v.array(
    v.object({
      slug: v.string(),
      title: v.string(),
      summary: v.optional(v.string()),
      body: v.string(),
    }),
  ),
  events: v.array(
    v.object({
      slug: v.string(),
      title: v.string(),
      description: v.string(),
      startAt: v.number(),
      endAt: v.number(),
      venue: v.optional(v.string()),
    }),
  ),
  documents: v.array(
    v.object({
      slug: v.string(),
      title: v.string(),
      description: v.optional(v.string()),
      category: v.string(),
    }),
  ),
  faqs: v.array(v.object({ question: v.string(), answer: v.string(), category: v.optional(v.string()) })),
});

type PublishedRecord = {
  status: "draft" | "scheduled" | "published" | "archived";
  publishAt?: number;
  expireAt?: number;
};

function isPublished(record: PublishedRecord): boolean {
  // Publication and expiry are materialized into status by scheduled jobs and
  // the publication sweep. This keeps visibility authoritative instead of
  // trusting a caller-provided timestamp.
  return record.status === "published";
}

function isPublishedAt(record: PublishedRecord, now: number): boolean {
  return (
    isPublished(record) &&
    (record.publishAt === undefined || record.publishAt <= now) &&
    (record.expireAt === undefined || record.expireAt > now)
  );
}

function uniquePublished<T extends PublishedRecord & { _id: string }>(
  groups: readonly T[][],
  now: number,
  limit: number,
): T[] {
  const seen = new Set<string>();
  const rows: T[] = [];
  for (const group of groups) {
    for (const row of group) {
      if (seen.has(row._id) || !isPublishedAt(row, now)) continue;
      seen.add(row._id);
      rows.push(row);
      if (rows.length >= limit) return rows;
    }
  }
  return rows;
}

async function publicationNow(ctx: QueryCtx): Promise<number | undefined> {
  const clock = await ctx.db
    .query("publicationClock")
    .withIndex("by_singleton_key", (q) => q.eq("singletonKey", "main"))
    .unique();
  return clock?.currentTime;
}

function limitOf(value?: number, maximum = 50): number {
  if (!value || !Number.isFinite(value)) return Math.min(20, maximum);
  return Math.max(1, Math.min(Math.floor(value), maximum));
}

function seoDto(seo: Doc<"pages">["seo"]) {
  return {
    title: seo.title,
    description: seo.description,
    imageUrl: seo.imageUrl,
    noIndex: seo.noIndex,
  };
}

function publicationDto(
  document: Pick<
    Doc<"pages">,
    "status" | "publishAt" | "expireAt" | "publishedAt" | "createdAt" | "updatedAt"
  >,
) {
  return {
    status: document.status,
    publishAt: document.publishAt,
    expireAt: document.expireAt,
    publishedAt: document.publishedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function publicPage(page: Doc<"pages">, heroImageUrl: string | undefined) {
  return {
    _id: page._id,
    _creationTime: page._creationTime,
    slug: page.slug,
    title: page.title,
    summary: page.summary,
    body: page.body,
    template: page.template,
    heroImageId: page.heroImageId,
    heroImageUrl,
    featured: page.featured,
    order: page.order,
    seo: seoDto(page.seo),
    ...publicationDto(page),
  };
}

function publicProgram(program: Doc<"programs">, heroImageUrl: string | undefined) {
  return {
    _id: program._id,
    _creationTime: program._creationTime,
    slug: program.slug,
    name: program.name,
    shortDescription: program.shortDescription,
    description: program.description,
    gradeRange: program.gradeRange,
    curriculum: program.curriculum,
    outcomes: program.outcomes,
    heroImageId: program.heroImageId,
    heroImageUrl,
    featured: program.featured,
    order: program.order,
    seo: seoDto(program.seo),
    ...publicationDto(program),
  };
}

function publicDepartment(department: Doc<"departments">) {
  return {
    _id: department._id,
    _creationTime: department._creationTime,
    slug: department.slug,
    name: department.name,
    description: department.description,
    responsibilities: department.responsibilities,
    email: department.email,
    phone: department.phone,
    headTeacherId: department.headTeacherId,
    featured: department.featured,
    order: department.order,
    seo: seoDto(department.seo),
    ...publicationDto(department),
  };
}

function publicLeadership(member: Doc<"leadership">, photoUrl: string | undefined) {
  return {
    _id: member._id,
    _creationTime: member._creationTime,
    slug: member.slug,
    name: member.name,
    role: member.role,
    bio: member.bio,
    quote: member.quote,
    photoId: member.photoId,
    photoUrl,
    email: member.email,
    order: member.order,
    ...publicationDto(member),
  };
}

function publicNews(news: Doc<"news">, featuredImageUrl: string | undefined) {
  return {
    _id: news._id,
    _creationTime: news._creationTime,
    slug: news.slug,
    title: news.title,
    excerpt: news.excerpt,
    body: news.body,
    category: news.category,
    tags: news.tags,
    authorName: news.authorName,
    featuredImageId: news.featuredImageId,
    featuredImageUrl,
    featured: news.featured,
    seo: seoDto(news.seo),
    ...publicationDto(news),
  };
}

function publicNotice(notice: Doc<"notices">, attachmentUrl: string | undefined) {
  return {
    _id: notice._id,
    _creationTime: notice._creationTime,
    slug: notice.slug,
    title: notice.title,
    summary: notice.summary,
    body: notice.body,
    priority: notice.priority,
    audiences: notice.audiences,
    attachmentId: notice.attachmentId,
    attachmentUrl,
    startAt: notice.startAt,
    seo: seoDto(notice.seo),
    ...publicationDto(notice),
  };
}

function publicEvent(event: Doc<"events">, featuredImageUrl: string | undefined) {
  return {
    _id: event._id,
    _creationTime: event._creationTime,
    slug: event.slug,
    title: event.title,
    summary: event.summary,
    description: event.description,
    startAt: event.startAt,
    endAt: event.endAt,
    timezone: event.timezone,
    venue: event.venue,
    isOnline: event.isOnline,
    capacity: event.capacity,
    registeredAttendeeCount: event.registeredAttendeeCount,
    registrationEnabled: event.registrationEnabled,
    featuredImageId: event.featuredImageId,
    featuredImageUrl,
    featured: event.featured,
    seo: seoDto(event.seo),
    ...publicationDto(event),
  };
}

function publicDownload(document: Doc<"documents">, downloadUrl: string | undefined | null) {
  return {
    _id: document._id,
    _creationTime: document._creationTime,
    slug: document.slug,
    title: document.title,
    description: document.description,
    category: document.category,
    storageId: document.storageId,
    externalUrl: document.externalUrl,
    fileName: document.fileName,
    mimeType: document.mimeType,
    size: document.size,
    schoolYear: document.schoolYear,
    featured: document.featured,
    order: document.order,
    seo: seoDto(document.seo),
    downloadUrl: downloadUrl ?? undefined,
    ...publicationDto(document),
  };
}

function publicGalleryAlbum(album: Doc<"galleryAlbums">, coverImageUrl: string | undefined) {
  return {
    _id: album._id,
    _creationTime: album._creationTime,
    slug: album.slug,
    title: album.title,
    description: album.description,
    coverImageId: album.coverImageId,
    coverImageUrl,
    eventDate: album.eventDate,
    featured: album.featured,
    order: album.order,
    seo: seoDto(album.seo),
    ...publicationDto(album),
  };
}

function publicTestimonial(testimonial: Doc<"testimonials">, photoUrl: string | undefined) {
  return {
    _id: testimonial._id,
    _creationTime: testimonial._creationTime,
    name: testimonial.name,
    role: testimonial.role,
    organization: testimonial.organization,
    quote: testimonial.quote,
    photoId: testimonial.photoId,
    photoUrl,
    order: testimonial.order,
    ...publicationDto(testimonial),
  };
}

function publicFaq(faq: Doc<"faqs">) {
  return {
    _id: faq._id,
    _creationTime: faq._creationTime,
    question: faq.question,
    answer: faq.answer,
    category: faq.category,
    order: faq.order,
    ...publicationDto(faq),
  };
}

async function storageUrl(
  ctx: QueryCtx,
  storageId: Parameters<QueryCtx["storage"]["getUrl"]>[0] | undefined,
  fallback?: string,
): Promise<string | undefined> {
  if (!storageId) return fallback;
  return (await ctx.storage.getUrl(storageId)) ?? fallback;
}

async function publishedByStatus(
  ctx: QueryCtx,
  table: Parameters<QueryCtx["db"]["query"]>[0],
  limit?: number,
  maximum = 50,
) {
  const take = limitOf(limit, maximum);
  const rows = await (ctx.db.query(table) as any)
    .withIndex("by_status", (q: any) => q.eq("status", "published"))
    .order("desc")
    .take(take);
  return rows.filter((row: PublishedRecord) => isPublished(row)).slice(0, take);
}

export const getSiteSettings = query({
  args: {},
  returns: v.union(v.null(), publicSiteSettingsValidator),
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("siteSettings")
      .withIndex("by_singleton_key", (q) => q.eq("singletonKey", "main"))
      .unique();
    if (!settings) return null;
    return {
      _id: settings._id,
      _creationTime: settings._creationTime,
      singletonKey: settings.singletonKey,
      schoolName: settings.schoolName,
      shortName: settings.shortName,
      tagline: settings.tagline,
      description: settings.description,
      logoId: settings.logoId,
      logoUrl: await storageUrl(ctx, settings.logoId, settings.logoUrl),
      faviconId: settings.faviconId,
      faviconUrl: await storageUrl(ctx, settings.faviconId, settings.faviconUrl),
      contact: {
        address: settings.contact.address,
        city: settings.contact.city,
        country: settings.contact.country,
        phone: settings.contact.phone,
        secondaryPhone: settings.contact.secondaryPhone,
        email: settings.contact.email,
        mapUrl: settings.contact.mapUrl,
        officeHours: settings.contact.officeHours,
      },
      social: {
        facebook: settings.social.facebook,
        instagram: settings.social.instagram,
        youtube: settings.social.youtube,
        linkedin: settings.social.linkedin,
        x: settings.social.x,
      },
      seo: seoDto(settings.seo),
      academicYear: settings.academicYear,
      timezone: settings.timezone,
      admissionsOpen: settings.admissionsOpen,
      assistantEnabled: settings.assistantEnabled,
      maintenanceMode: settings.maintenanceMode,
      updatedAt: settings.updatedAt,
    };
  },
});

export const listNavigation = query({
  args: {
    location: v.optional(v.union(v.literal("header"), v.literal("footer"), v.literal("utility"))),
  },
  returns: v.array(publicNavigationValidator),
  handler: async (ctx, args) => {
    const locations = args.location ? [args.location] : (["header", "footer", "utility"] as const);
    const groups = await Promise.all(
      locations.map((location) =>
        ctx.db
          .query("navigationItems")
          .withIndex("by_location_order", (q) => q.eq("location", location))
          .take(250),
      ),
    );
    return groups
      .flat()
      .filter((item) => item.visible && item.requiredRole === undefined)
      .map((item) => ({
        _id: item._id,
        _creationTime: item._creationTime,
        label: item.label,
        href: item.href,
        location: item.location,
        parentId: item.parentId,
        order: item.order,
        external: item.external,
        visible: item.visible,
        description: item.description,
        requiredRole: item.requiredRole,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
  },
});

export const listPages = query({
  args: { featured: v.optional(v.boolean()), limit: v.optional(v.number()), now: v.optional(v.number()) },
  returns: v.array(publicPageValidator),
  handler: async (ctx, args) => {
    const take = limitOf(args.limit, 200);
    const rows = await (
      args.featured === undefined
        ? ctx.db.query("pages").withIndex("by_status_order", (q) => q.eq("status", "published"))
        : ctx.db
            .query("pages")
            .withIndex("by_status_featured_order", (q) =>
              q.eq("status", "published").eq("featured", args.featured!),
            )
    ).take(take);
    return await Promise.all(
      rows
        .filter((row) => isPublished(row))
        .slice(0, take)
        .map(async (row: Doc<"pages">) =>
          publicPage(row, await storageUrl(ctx, row.heroImageId, row.heroImageUrl)),
        ),
    );
  },
});

export const getPage = query({
  args: { slug: v.string(), now: v.optional(v.number()) },
  returns: v.union(v.null(), publicPageValidator),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!page || !isPublished(page)) return null;
    return publicPage(page, await storageUrl(ctx, page.heroImageId, page.heroImageUrl));
  },
});

export const listPrograms = query({
  args: { featured: v.optional(v.boolean()), limit: v.optional(v.number()), now: v.optional(v.number()) },
  returns: v.array(publicProgramValidator),
  handler: async (ctx, args) => {
    const take = limitOf(args.limit, 100);
    const rows = await (
      args.featured === undefined
        ? ctx.db.query("programs").withIndex("by_status_order", (q) => q.eq("status", "published"))
        : ctx.db
            .query("programs")
            .withIndex("by_status_featured_order", (q) =>
              q.eq("status", "published").eq("featured", args.featured!),
            )
    ).take(take);
    return await Promise.all(
      rows
        .filter((row) => isPublished(row))
        .slice(0, take)
        .map(async (row: Doc<"programs">) =>
          publicProgram(row, await storageUrl(ctx, row.heroImageId, row.heroImageUrl)),
        ),
    );
  },
});

export const getProgram = query({
  args: { slug: v.string(), now: v.optional(v.number()) },
  returns: v.union(v.null(), publicProgramValidator),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("programs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!row || !isPublished(row)) return null;
    return publicProgram(row, await storageUrl(ctx, row.heroImageId, row.heroImageUrl));
  },
});

export const listDepartments = query({
  args: { featured: v.optional(v.boolean()), limit: v.optional(v.number()), now: v.optional(v.number()) },
  returns: v.array(publicDepartmentValidator),
  handler: async (ctx, args) => {
    const take = limitOf(args.limit, 100);
    const rows = await (
      args.featured === undefined
        ? ctx.db.query("departments").withIndex("by_status_order", (q) => q.eq("status", "published"))
        : ctx.db
            .query("departments")
            .withIndex("by_status_featured_order", (q) =>
              q.eq("status", "published").eq("featured", args.featured!),
            )
    ).take(take);
    return rows
      .filter((row) => isPublished(row))
      .slice(0, take)
      .map((row: Doc<"departments">) => publicDepartment(row));
  },
});

export const getDepartment = query({
  args: { slug: v.string(), now: v.optional(v.number()) },
  returns: v.union(v.null(), publicDepartmentValidator.extend({ teachers: v.array(publicTeacherValidator) })),
  handler: async (ctx, args) => {
    const department = await ctx.db
      .query("departments")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!department || !isPublished(department)) return null;
    const teachers = await ctx.db
      .query("teachers")
      .withIndex("by_department_status", (q) =>
        q.eq("departmentId", department._id).eq("status", "published"),
      )
      .take(250);
    return {
      ...publicDepartment(department),
      teachers: await Promise.all(
        teachers.filter((teacher) => isPublished(teacher)).map((teacher) => publicTeacher(ctx, teacher)),
      ),
    };
  },
});

async function publicTeacher(ctx: QueryCtx, teacher: Doc<"teachers">) {
  return {
    _id: teacher._id,
    _creationTime: teacher._creationTime,
    slug: teacher.slug,
    name: teacher.name,
    title: teacher.title,
    departmentId: teacher.departmentId,
    bio: teacher.bio,
    qualifications: teacher.qualifications,
    subjects: teacher.subjects,
    email: teacher.showContact ? teacher.email : undefined,
    phone: teacher.showContact ? teacher.phone : undefined,
    showContact: teacher.showContact,
    photoId: teacher.photoId,
    photoUrl: await storageUrl(ctx, teacher.photoId, teacher.photoUrl),
    order: teacher.order,
    seo: seoDto(teacher.seo),
    ...publicationDto(teacher),
  };
}

export const listTeachers = query({
  args: {
    departmentSlug: v.optional(v.string()),
    limit: v.optional(v.number()),
    now: v.optional(v.number()),
  },
  returns: v.array(publicTeacherWithDepartmentValidator),
  handler: async (ctx, args) => {
    let department = null;
    if (args.departmentSlug) {
      department = await ctx.db
        .query("departments")
        .withIndex("by_slug", (q) => q.eq("slug", args.departmentSlug!))
        .unique();
      if (!department || !isPublished(department)) return [];
    }
    const rows = department
      ? await ctx.db
          .query("teachers")
          .withIndex("by_department_status", (q) =>
            q.eq("departmentId", department!._id).eq("status", "published"),
          )
          .take(limitOf(args.limit, 250))
      : await publishedByStatus(ctx, "teachers", args.limit, 250);
    const filtered = rows.filter((row: any) => isPublished(row)).sort((a: any, b: any) => a.order - b.order);
    return await Promise.all(
      filtered.map(async (teacher: Doc<"teachers">) => {
        const department = teacher.departmentId
          ? await ctx.db.get("departments", teacher.departmentId)
          : null;
        return {
          ...(await publicTeacher(ctx, teacher)),
          department: department && isPublished(department) ? publicDepartment(department) : undefined,
        };
      }),
    );
  },
});

export const getTeacher = query({
  args: { slug: v.string(), now: v.optional(v.number()) },
  returns: v.union(
    v.null(),
    publicTeacherValidator.extend({ department: v.union(v.null(), publicDepartmentValidator) }),
  ),
  handler: async (ctx, args) => {
    const teacher = await ctx.db
      .query("teachers")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!teacher || !isPublished(teacher)) return null;
    const department = teacher.departmentId ? await ctx.db.get("departments", teacher.departmentId) : null;
    return {
      ...(await publicTeacher(ctx, teacher)),
      department: department && isPublished(department) ? publicDepartment(department) : null,
    };
  },
});

export const listLeadership = query({
  args: { limit: v.optional(v.number()), now: v.optional(v.number()) },
  returns: v.array(publicLeadershipValidator),
  handler: async (ctx, args) => {
    const take = limitOf(args.limit, 100);
    const rows = await ctx.db
      .query("leadership")
      .withIndex("by_status_order", (q) => q.eq("status", "published"))
      .take(take);
    return await Promise.all(
      rows
        .filter((row) => isPublished(row))
        .slice(0, take)
        .map(async (row: Doc<"leadership">) =>
          publicLeadership(row, await storageUrl(ctx, row.photoId, row.photoUrl)),
        ),
    );
  },
});

export const getLeadershipMember = query({
  args: { slug: v.string(), now: v.optional(v.number()) },
  returns: v.union(v.null(), publicLeadershipValidator),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("leadership")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!row || !isPublished(row)) return null;
    return publicLeadership(row, await storageUrl(ctx, row.photoId, row.photoUrl));
  },
});

export const listNews = query({
  args: { featured: v.optional(v.boolean()), limit: v.optional(v.number()), now: v.optional(v.number()) },
  returns: v.array(publicNewsValidator),
  handler: async (ctx, args) => {
    const take = limitOf(args.limit, 200);
    const rows = await (
      args.featured === undefined
        ? ctx.db
            .query("news")
            .withIndex("by_status", (q) => q.eq("status", "published"))
            .order("desc")
        : ctx.db
            .query("news")
            .withIndex("by_status_featured", (q) =>
              q.eq("status", "published").eq("featured", args.featured!),
            )
            .order("desc")
    ).take(take);
    const filtered = rows.filter((row) => isPublished(row)).slice(0, take);
    return await Promise.all(
      filtered.map(async (row: Doc<"news">) =>
        publicNews(row, await storageUrl(ctx, row.featuredImageId, row.featuredImageUrl)),
      ),
    );
  },
});

export const getNews = query({
  args: { slug: v.string(), now: v.optional(v.number()) },
  returns: v.union(v.null(), publicNewsValidator),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("news")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!row || !isPublished(row)) return null;
    return publicNews(row, await storageUrl(ctx, row.featuredImageId, row.featuredImageUrl));
  },
});

export const listNotices = query({
  args: {
    audience: v.optional(v.string()),
    limit: v.optional(v.number()),
    now: v.optional(v.number()),
  },
  returns: v.array(publicNoticeValidator),
  handler: async (ctx, args) => {
    const now = await publicationNow(ctx);
    const take = limitOf(args.limit, 200);
    const rows = await publishedByStatus(ctx, "notices", Math.min(take * 4, 800), 800);
    const filtered = rows
      .filter((row: any) => !row.startAt || (now !== undefined && row.startAt <= now))
      .filter((row: any) => !args.audience || row.audiences.includes(args.audience))
      .slice(0, take);
    return await Promise.all(
      filtered.map(async (row: Doc<"notices">) =>
        publicNotice(row, await storageUrl(ctx, row.attachmentId, row.attachmentUrl)),
      ),
    );
  },
});

export const getNotice = query({
  args: { slug: v.string(), now: v.optional(v.number()) },
  returns: v.union(v.null(), publicNoticeValidator),
  handler: async (ctx, args) => {
    const now = await publicationNow(ctx);
    const row = await ctx.db
      .query("notices")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!row || !isPublished(row) || (row.startAt !== undefined && (now === undefined || row.startAt > now)))
      return null;
    return publicNotice(row, await storageUrl(ctx, row.attachmentId, row.attachmentUrl));
  },
});

export const listEvents = query({
  args: {
    scope: v.optional(v.union(v.literal("upcoming"), v.literal("past"), v.literal("all"))),
    limit: v.optional(v.number()),
    now: v.number(),
  },
  returns: v.array(publicEventValidator),
  handler: async (ctx, args) => {
    const scope = args.scope ?? "upcoming";
    const now = await publicationNow(ctx);
    if (scope !== "all" && now === undefined) return [];
    const take = limitOf(args.limit, 200);
    const candidateLimit = Math.min(600, take * 3);
    let rows: Doc<"events">[];
    if (scope === "upcoming") {
      rows = await ctx.db
        .query("events")
        .withIndex("by_status_end_at", (q) => q.eq("status", "published").gte("endAt", now!))
        .order("asc")
        .take(candidateLimit);
    } else if (scope === "past") {
      rows = await ctx.db
        .query("events")
        .withIndex("by_status_end_at", (q) => q.eq("status", "published").lt("endAt", now!))
        .order("desc")
        .take(candidateLimit);
    } else {
      rows = await ctx.db
        .query("events")
        .withIndex("by_status_start_at", (q) => q.eq("status", "published"))
        .order("desc")
        .take(candidateLimit);
    }
    const filtered = rows
      .filter((row) => isPublished(row))
      .sort((a, b) => (scope === "past" ? b.startAt - a.startAt : a.startAt - b.startAt))
      .slice(0, take);
    return await Promise.all(
      filtered.map(async (row) =>
        publicEvent(row, await storageUrl(ctx, row.featuredImageId, row.featuredImageUrl)),
      ),
    );
  },
});

export const getEvent = query({
  args: { slug: v.string(), now: v.optional(v.number()) },
  returns: v.union(v.null(), publicEventValidator),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!row || !isPublished(row)) return null;
    return publicEvent(row, await storageUrl(ctx, row.featuredImageId, row.featuredImageUrl));
  },
});

export const listDocuments = query({
  args: {
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
    now: v.optional(v.number()),
  },
  returns: v.array(publicDocumentValidator),
  handler: async (ctx, args) => {
    const rows = await publishedByStatus(
      ctx,
      "documents",
      args.limit ? Math.min(args.limit * 3, 600) : 60,
      600,
    );
    const filtered = rows
      .filter((row: any) => !args.category || row.category === args.category)
      .sort((a: any, b: any) => a.order - b.order)
      .slice(0, limitOf(args.limit, 200));
    return await Promise.all(
      filtered.map(async (row: Doc<"documents">) =>
        publicDownload(row, row.storageId ? await ctx.storage.getUrl(row.storageId) : row.externalUrl),
      ),
    );
  },
});

export const listGalleryAlbums = query({
  args: { featured: v.optional(v.boolean()), limit: v.optional(v.number()), now: v.optional(v.number()) },
  returns: v.array(publicGalleryAlbumValidator),
  handler: async (ctx, args) => {
    const rows = await publishedByStatus(
      ctx,
      "galleryAlbums",
      args.limit ? Math.min(args.limit * 2, 200) : 40,
      200,
    );
    const filtered = rows
      .filter((row: any) => args.featured === undefined || row.featured === args.featured)
      .sort((a: any, b: any) => a.order - b.order)
      .slice(0, limitOf(args.limit, 100));
    return await Promise.all(
      filtered.map(async (row: Doc<"galleryAlbums">) =>
        publicGalleryAlbum(row, await storageUrl(ctx, row.coverImageId, row.coverImageUrl)),
      ),
    );
  },
});

export const getGalleryAlbum = query({
  args: { slug: v.string(), now: v.optional(v.number()) },
  returns: v.union(
    v.null(),
    v.object({
      album: publicGalleryAlbumValidator,
      items: v.array(publicGalleryItemValidator),
    }),
  ),
  handler: async (ctx, args) => {
    const album = await ctx.db
      .query("galleryAlbums")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!album || !isPublished(album)) return null;
    const items = await ctx.db
      .query("galleryItems")
      .withIndex("by_album_order", (q) => q.eq("albumId", album._id))
      .take(500);
    return {
      album: {
        ...publicGalleryAlbum(album, await storageUrl(ctx, album.coverImageId, album.coverImageUrl)),
      },
      items: await Promise.all(
        items
          .filter((item) => item.visible)
          .map(async (item) => ({
            _id: item._id,
            _creationTime: item._creationTime,
            albumId: item.albumId,
            url: await storageUrl(ctx, item.storageId, item.url),
            thumbnailUrl: item.thumbnailUrl,
            mediaType: item.mediaType,
            alt: item.alt,
            caption: item.caption,
            credit: item.credit,
            order: item.order,
            visible: item.visible,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          })),
      ),
    };
  },
});

export const listTestimonials = query({
  args: { limit: v.optional(v.number()), now: v.optional(v.number()) },
  returns: v.array(publicTestimonialValidator),
  handler: async (ctx, args) => {
    const take = limitOf(args.limit, 200);
    const rows = await ctx.db
      .query("testimonials")
      .withIndex("by_status_order", (q) => q.eq("status", "published"))
      .take(take);
    return await Promise.all(
      rows
        .filter((row) => isPublished(row))
        .slice(0, take)
        .map(async (row: Doc<"testimonials">) =>
          publicTestimonial(row, await storageUrl(ctx, row.photoId, row.photoUrl)),
        ),
    );
  },
});

export const listFaqs = query({
  args: {
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
    now: v.optional(v.number()),
  },
  returns: v.array(publicFaqValidator),
  handler: async (ctx, args) => {
    const take = limitOf(args.limit, 200);
    const rows = await (
      args.category
        ? ctx.db
            .query("faqs")
            .withIndex("by_status_category_order", (q) =>
              q.eq("status", "published").eq("category", args.category),
            )
        : ctx.db.query("faqs").withIndex("by_status_order", (q) => q.eq("status", "published"))
    ).take(take);
    return rows
      .filter((row) => isPublished(row))
      .slice(0, take)
      .map((row: Doc<"faqs">) => publicFaq(row));
  },
});

export const listHomeSections = query({
  args: { now: v.optional(v.number()) },
  returns: v.array(publicHomeSectionValidator),
  handler: async (ctx) => {
    const rows = await publishedByStatus(ctx, "homeSections", 20, 20);
    return await Promise.all(
      rows.map(async (row: Doc<"homeSections">) => ({
        _id: row._id,
        _creationTime: row._creationTime,
        slug: row.slug,
        eyebrow: row.eyebrow,
        heading: row.heading,
        body: row.body,
        secondaryBody: row.secondaryBody,
        imageId: row.imageId,
        imageUrl: await storageUrl(ctx, row.imageId, row.imageUrl),
        imageAlt: row.imageAlt,
        secondaryImageId: row.secondaryImageId,
        secondaryImageUrl: await storageUrl(ctx, row.secondaryImageId, row.secondaryImageUrl),
        ctaLabel: row.ctaLabel,
        ctaHref: row.ctaHref,
        ...publicationDto(row),
      })),
    );
  },
});

export const listHomeHighlights = query({
  args: {
    section: v.optional(v.union(v.literal("hero"), v.literal("about"), v.literal("eca"))),
    limit: v.optional(v.number()),
    now: v.optional(v.number()),
  },
  returns: v.array(publicHomeHighlightValidator),
  handler: async (ctx, args) => {
    const take = limitOf(args.limit, 60);
    const rows = await (
      args.section
        ? ctx.db
            .query("homeHighlights")
            .withIndex("by_section_status_order", (q) =>
              q.eq("section", args.section!).eq("status", "published"),
            )
        : ctx.db.query("homeHighlights").withIndex("by_status_order", (q) => q.eq("status", "published"))
    ).take(take);
    return await Promise.all(
      rows
        .filter((row) => isPublished(row))
        .slice(0, take)
        .map(async (row: Doc<"homeHighlights">) => ({
          _id: row._id,
          _creationTime: row._creationTime,
          section: row.section,
          title: row.title,
          summary: row.summary,
          icon: row.icon,
          imageId: row.imageId,
          imageUrl: await storageUrl(ctx, row.imageId, row.imageUrl),
          imageAlt: row.imageAlt,
          href: row.href,
          order: row.order,
          ...publicationDto(row),
        })),
    );
  },
});

/** Bounded, private, relevance-ranked content used to ground the assistant. */
export const groundingSnapshot = internalQuery({
  args: { now: v.number(), query: v.optional(v.string()) },
  returns: groundingSnapshotValidator,
  handler: async (ctx, args) => {
    const search = args.query?.trim().slice(0, 512);
    let pages: Doc<"pages">[];
    let programs: Doc<"programs">[];
    let departments: Doc<"departments">[];
    let leadership: Doc<"leadership">[];
    let teachers: Doc<"teachers">[];
    let news: Doc<"news">[];
    let notices: Doc<"notices">[];
    let events: Doc<"events">[];
    let documents: Doc<"documents">[];
    let faqs: Doc<"faqs">[];

    if (search) {
      const [
        pageBody,
        pageTitle,
        programDescription,
        programName,
        departmentDescription,
        departmentName,
        leadershipBio,
        leadershipRole,
        leadershipName,
        teacherBio,
        teacherTitle,
        teacherName,
        newsBody,
        newsTitle,
        noticeBody,
        noticeTitle,
        eventDescription,
        eventTitle,
        documentTitle,
        faqAnswer,
        faqQuestion,
      ] = await Promise.all([
        ctx.db
          .query("pages")
          .withSearchIndex("search_body", (q) => q.search("body", search).eq("status", "published"))
          .take(8),
        ctx.db
          .query("pages")
          .withSearchIndex("search_title", (q) => q.search("title", search).eq("status", "published"))
          .take(4),
        ctx.db
          .query("programs")
          .withSearchIndex("search_description", (q) =>
            q.search("description", search).eq("status", "published"),
          )
          .take(8),
        ctx.db
          .query("programs")
          .withSearchIndex("search_name", (q) => q.search("name", search).eq("status", "published"))
          .take(4),
        ctx.db
          .query("departments")
          .withSearchIndex("search_description", (q) =>
            q.search("description", search).eq("status", "published"),
          )
          .take(8),
        ctx.db
          .query("departments")
          .withSearchIndex("search_name", (q) => q.search("name", search).eq("status", "published"))
          .take(4),
        ctx.db
          .query("leadership")
          .withSearchIndex("search_bio", (q) => q.search("bio", search).eq("status", "published"))
          .take(6),
        ctx.db
          .query("leadership")
          .withSearchIndex("search_role", (q) => q.search("role", search).eq("status", "published"))
          .take(4),
        ctx.db
          .query("leadership")
          .withSearchIndex("search_name", (q) => q.search("name", search).eq("status", "published"))
          .take(4),
        ctx.db
          .query("teachers")
          .withSearchIndex("search_bio", (q) => q.search("bio", search).eq("status", "published"))
          .take(8),
        ctx.db
          .query("teachers")
          .withSearchIndex("search_title", (q) => q.search("title", search).eq("status", "published"))
          .take(6),
        ctx.db
          .query("teachers")
          .withSearchIndex("search_name", (q) => q.search("name", search).eq("status", "published"))
          .take(6),
        ctx.db
          .query("news")
          .withSearchIndex("search_body", (q) => q.search("body", search).eq("status", "published"))
          .take(8),
        ctx.db
          .query("news")
          .withSearchIndex("search_title", (q) => q.search("title", search).eq("status", "published"))
          .take(4),
        ctx.db
          .query("notices")
          .withSearchIndex("search_body", (q) => q.search("body", search).eq("status", "published"))
          .take(8),
        ctx.db
          .query("notices")
          .withSearchIndex("search_title", (q) => q.search("title", search).eq("status", "published"))
          .take(4),
        ctx.db
          .query("events")
          .withSearchIndex("search_description", (q) =>
            q.search("description", search).eq("status", "published"),
          )
          .take(8),
        ctx.db
          .query("events")
          .withSearchIndex("search_title", (q) => q.search("title", search).eq("status", "published"))
          .take(4),
        ctx.db
          .query("documents")
          .withSearchIndex("search_title", (q) => q.search("title", search).eq("status", "published"))
          .take(10),
        ctx.db
          .query("faqs")
          .withSearchIndex("search_answer", (q) => q.search("answer", search).eq("status", "published"))
          .take(10),
        ctx.db
          .query("faqs")
          .withSearchIndex("search_question", (q) => q.search("question", search).eq("status", "published"))
          .take(8),
      ]);
      pages = uniquePublished([pageBody, pageTitle], args.now, 12);
      programs = uniquePublished([programDescription, programName], args.now, 12);
      departments = uniquePublished([departmentDescription, departmentName], args.now, 12);
      leadership = uniquePublished([leadershipBio, leadershipRole, leadershipName], args.now, 12);
      teachers = uniquePublished([teacherBio, teacherTitle, teacherName], args.now, 18);
      news = uniquePublished([newsBody, newsTitle], args.now, 12);
      notices = uniquePublished([noticeBody, noticeTitle], args.now, 12);
      events = uniquePublished([eventDescription, eventTitle], args.now, 12);
      documents = uniquePublished([documentTitle], args.now, 10);
      faqs = uniquePublished([faqAnswer, faqQuestion], args.now, 18);
    } else {
      const fallback = await Promise.all([
        ctx.db
          .query("pages")
          .withIndex("by_status", (q) => q.eq("status", "published"))
          .take(12),
        ctx.db
          .query("programs")
          .withIndex("by_status", (q) => q.eq("status", "published"))
          .take(12),
        ctx.db
          .query("departments")
          .withIndex("by_status", (q) => q.eq("status", "published"))
          .take(12),
        ctx.db
          .query("leadership")
          .withIndex("by_status", (q) => q.eq("status", "published"))
          .take(12),
        ctx.db
          .query("teachers")
          .withIndex("by_status", (q) => q.eq("status", "published"))
          .take(18),
        ctx.db
          .query("news")
          .withIndex("by_status", (q) => q.eq("status", "published"))
          .take(12),
        ctx.db
          .query("notices")
          .withIndex("by_status", (q) => q.eq("status", "published"))
          .take(12),
        ctx.db
          .query("events")
          .withIndex("by_status", (q) => q.eq("status", "published"))
          .take(12),
        ctx.db
          .query("documents")
          .withIndex("by_status", (q) => q.eq("status", "published"))
          .take(10),
        ctx.db
          .query("faqs")
          .withIndex("by_status", (q) => q.eq("status", "published"))
          .take(18),
      ]);
      pages = uniquePublished([fallback[0]], args.now, 12);
      programs = uniquePublished([fallback[1]], args.now, 12);
      departments = uniquePublished([fallback[2]], args.now, 12);
      leadership = uniquePublished([fallback[3]], args.now, 12);
      teachers = uniquePublished([fallback[4]], args.now, 18);
      news = uniquePublished([fallback[5]], args.now, 12);
      notices = uniquePublished([fallback[6]], args.now, 12);
      events = uniquePublished([fallback[7]], args.now, 12);
      documents = uniquePublished([fallback[8]], args.now, 10);
      faqs = uniquePublished([fallback[9]], args.now, 18);
    }

    return {
      pages: pages.map((row) => ({
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        body: row.body.slice(0, 4000),
      })),
      programs: programs.map((row) => ({
        slug: row.slug,
        name: row.name,
        description: row.description.slice(0, 2500),
      })),
      departments: departments.map((row) => ({
        slug: row.slug,
        name: row.name,
        description: row.description.slice(0, 2000),
      })),
      leadership: leadership.map((row) => ({
        slug: row.slug,
        name: row.name,
        role: row.role,
        bio: row.bio.slice(0, 2000),
      })),
      teachers: teachers.map((row) => ({
        slug: row.slug,
        name: row.name,
        title: row.title,
        bio: row.bio.slice(0, 1600),
        subjects: row.subjects.slice(0, 20),
      })),
      news: news.map((row) => ({
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt,
        body: row.body.slice(0, 2000),
      })),
      notices: notices.map((row) => ({
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        body: row.body.slice(0, 1500),
      })),
      events: events.map((row) => ({
        slug: row.slug,
        title: row.title,
        description: row.description.slice(0, 1500),
        startAt: row.startAt,
        endAt: row.endAt,
        venue: row.venue,
      })),
      documents: documents.map((row) => ({
        slug: row.slug,
        title: row.title,
        description: row.description,
        category: row.category,
      })),
      faqs: faqs.map((row) => ({
        question: row.question,
        answer: row.answer.slice(0, 1200),
        category: row.category,
      })),
    };
  },
});
