import { ConvexError, v, type Infer } from "convex/values";
import { paginationResultValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireRole } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { enqueueJob } from "./lib/jobs";
import { recordCreated, recordDeleted, recordStatusChanged } from "./lib/metrics";
import { adjustCampaignOutcome } from "./lib/newsletter";
import {
  normalizedEmail,
  normalizedPageSlug,
  normalizedSlug,
  optionalMediaUrl,
  optionalPhone,
  optionalUrl,
  plainText,
  richText,
  singleLineText,
} from "./lib/input";
import {
  admissionStatusValidator,
  boundedPaginationOpts,
  contentStatusValidator,
  contentTypeValidator,
  contentUpsertArgsValidator,
  departmentInputValidator,
  documentInputValidator,
  eventInputValidator,
  faqInputValidator,
  galleryAlbumInputValidator,
  homeHighlightInputValidator,
  homeSectionInputValidator,
  leadershipInputValidator,
  navigationInputValidator,
  newsInputValidator,
  newsletterCampaignStatusValidator,
  newsletterSubscriberStatusValidator,
  noticeInputValidator,
  pageInputValidator,
  paginationOptsValidator,
  programInputValidator,
  registrationStatusValidator,
  roleValidator,
  siteSettingsInputValidator,
  submissionTypeValidator,
  teacherInputValidator,
  testimonialInputValidator,
  userStatusValidator,
  workflowStatusValidator,
} from "./lib/validators";

const STAFF_ROLES = ["admin", "publisher", "editor", "admissions"] as const;
const CONTENT_ROLES = ["admin", "publisher", "editor"] as const;
const PUBLISH_ROLES = ["admin", "publisher"] as const;
const CAPACITY_RECONCILIATION_LIMIT = 1_000;

const seoOutputValidator = v.object({
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  noIndex: v.optional(v.boolean()),
});

const adminPublicationOutputFields = {
  status: contentStatusValidator,
  publishAt: v.optional(v.number()),
  expireAt: v.optional(v.number()),
  publishedAt: v.optional(v.number()),
  createdBy: v.id("users"),
  updatedBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
};

const pageDocumentValidator = pageInputValidator.extend({
  _id: v.id("pages"),
  _creationTime: v.number(),
  featured: v.boolean(),
  order: v.number(),
  seo: seoOutputValidator,
  ...adminPublicationOutputFields,
});

const programDocumentValidator = programInputValidator.extend({
  _id: v.id("programs"),
  _creationTime: v.number(),
  featured: v.boolean(),
  order: v.number(),
  seo: seoOutputValidator,
  ...adminPublicationOutputFields,
});

const departmentDocumentValidator = departmentInputValidator.extend({
  _id: v.id("departments"),
  _creationTime: v.number(),
  featured: v.boolean(),
  order: v.number(),
  seo: seoOutputValidator,
  ...adminPublicationOutputFields,
});

const leadershipDocumentValidator = leadershipInputValidator.extend({
  _id: v.id("leadership"),
  _creationTime: v.number(),
  order: v.number(),
  ...adminPublicationOutputFields,
});

const teacherDocumentValidator = teacherInputValidator.extend({
  _id: v.id("teachers"),
  _creationTime: v.number(),
  showContact: v.boolean(),
  order: v.number(),
  seo: seoOutputValidator,
  ...adminPublicationOutputFields,
});

const newsDocumentValidator = newsInputValidator.extend({
  _id: v.id("news"),
  _creationTime: v.number(),
  featured: v.boolean(),
  seo: seoOutputValidator,
  ...adminPublicationOutputFields,
});

const noticeDocumentValidator = noticeInputValidator.extend({
  _id: v.id("notices"),
  _creationTime: v.number(),
  seo: seoOutputValidator,
  ...adminPublicationOutputFields,
});

const eventDocumentValidator = eventInputValidator.extend({
  _id: v.id("events"),
  _creationTime: v.number(),
  registeredAttendeeCount: v.optional(v.number()),
  featured: v.boolean(),
  seo: seoOutputValidator,
  ...adminPublicationOutputFields,
});

const documentDocumentValidator = documentInputValidator.extend({
  _id: v.id("documents"),
  _creationTime: v.number(),
  featured: v.boolean(),
  order: v.number(),
  seo: seoOutputValidator,
  ...adminPublicationOutputFields,
});

const galleryAlbumDocumentValidator = galleryAlbumInputValidator.extend({
  _id: v.id("galleryAlbums"),
  _creationTime: v.number(),
  featured: v.boolean(),
  order: v.number(),
  seo: seoOutputValidator,
  ...adminPublicationOutputFields,
});

const testimonialDocumentValidator = testimonialInputValidator.extend({
  _id: v.id("testimonials"),
  _creationTime: v.number(),
  order: v.number(),
  ...adminPublicationOutputFields,
});

const faqDocumentValidator = faqInputValidator.extend({
  _id: v.id("faqs"),
  _creationTime: v.number(),
  order: v.number(),
  ...adminPublicationOutputFields,
});

const homeSectionDocumentValidator = homeSectionInputValidator.extend({
  _id: v.id("homeSections"),
  _creationTime: v.number(),
  slug: v.string(),
  ...adminPublicationOutputFields,
});

const homeHighlightDocumentValidator = homeHighlightInputValidator.extend({
  _id: v.id("homeHighlights"),
  _creationTime: v.number(),
  order: v.number(),
  ...adminPublicationOutputFields,
});

const contentDocumentValidator = v.union(
  pageDocumentValidator,
  programDocumentValidator,
  departmentDocumentValidator,
  leadershipDocumentValidator,
  teacherDocumentValidator,
  newsDocumentValidator,
  noticeDocumentValidator,
  eventDocumentValidator,
  documentDocumentValidator,
  galleryAlbumDocumentValidator,
  testimonialDocumentValidator,
  faqDocumentValidator,
  homeSectionDocumentValidator,
  homeHighlightDocumentValidator,
);

const contactSubmissionValidator = v.object({
  _id: v.id("contacts"),
  _creationTime: v.number(),
  ticketNumber: v.string(),
  name: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
  subject: v.string(),
  message: v.string(),
  consentToContact: v.boolean(),
  status: workflowStatusValidator,
  assignedTo: v.optional(v.id("users")),
  internalNotes: v.optional(v.string()),
  source: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const admissionSubmissionValidator = v.object({
  _id: v.id("admissions"),
  _creationTime: v.number(),
  applicationNumber: v.string(),
  academicYear: v.string(),
  desiredGrade: v.string(),
  student: v.object({
    firstName: v.string(),
    middleName: v.optional(v.string()),
    lastName: v.string(),
    dateOfBirth: v.number(),
    gender: v.optional(v.string()),
    citizenship: v.optional(v.string()),
  }),
  guardian: v.object({
    name: v.string(),
    relationship: v.string(),
    email: v.string(),
    phone: v.string(),
    address: v.string(),
  }),
  priorSchool: v.optional(v.string()),
  notes: v.optional(v.string()),
  consent: v.boolean(),
  status: admissionStatusValidator,
  assignedTo: v.optional(v.id("users")),
  internalNotes: v.optional(v.string()),
  submittedAt: v.number(),
  updatedAt: v.number(),
});

const eventSummaryValidator = v.object({
  _id: v.id("events"),
  title: v.string(),
  startsAt: v.number(),
});

const eventRegistrationSubmissionValidator = v.object({
  _id: v.id("eventRegistrations"),
  _creationTime: v.number(),
  eventId: v.id("events"),
  registrationNumber: v.string(),
  name: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
  attendees: v.number(),
  notes: v.optional(v.string()),
  consent: v.boolean(),
  status: registrationStatusValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
  event: v.union(v.null(), eventSummaryValidator),
});

const submissionOutputValidator = v.union(
  contactSubmissionValidator,
  admissionSubmissionValidator,
  eventRegistrationSubmissionValidator,
);

const newsletterSubscriberOutputValidator = v.object({
  _id: v.id("newsletterSubscribers"),
  _creationTime: v.number(),
  email: v.string(),
  name: v.optional(v.string()),
  status: newsletterSubscriberStatusValidator,
  source: v.optional(v.string()),
  consentAt: v.number(),
  confirmedAt: v.optional(v.number()),
  confirmationExpiresAt: v.optional(v.number()),
  unsubscribedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const newsletterCampaignFields = {
  _id: v.id("newsletterCampaigns"),
  _creationTime: v.number(),
  title: v.string(),
  subject: v.string(),
  preheader: v.optional(v.string()),
  status: newsletterCampaignStatusValidator,
  generation: v.number(),
  audienceCutoff: v.optional(v.number()),
  scheduledAt: v.optional(v.number()),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  paginationCursor: v.optional(v.string()),
  targetCount: v.number(),
  deliveredCount: v.number(),
  failedCount: v.number(),
  suppressedCount: v.number(),
  createdBy: v.id("users"),
  updatedBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
};

const newsletterCampaignPreviewValidator = v.object({
  ...newsletterCampaignFields,
  bodyPreview: v.string(),
});

const newsletterCampaignValidator = v.object({
  ...newsletterCampaignFields,
  body: v.string(),
});

const aiConversationValidator = v.object({
  _id: v.id("aiConversations"),
  _creationTime: v.number(),
  ownerKey: v.string(),
  userId: v.optional(v.id("users")),
  agentThreadId: v.optional(v.string()),
  title: v.optional(v.string()),
  status: v.union(v.literal("active"), v.literal("closed")),
  lastMessageAt: v.number(),
  expiresAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const aiMessageValidator = v.object({
  _id: v.id("aiMessages"),
  _creationTime: v.number(),
  conversationId: v.id("aiConversations"),
  role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
  content: v.string(),
  status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed"), v.literal("blocked")),
  model: v.optional(v.string()),
  providerInteractionId: v.optional(v.string()),
  agentMessageId: v.optional(v.string()),
  citations: v.optional(
    v.array(
      v.object({
        type: v.string(),
        title: v.string(),
        slug: v.optional(v.string()),
        url: v.optional(v.string()),
        excerpt: v.optional(v.string()),
      }),
    ),
  ),
  inputCharacters: v.optional(v.number()),
  outputCharacters: v.optional(v.number()),
  error: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const userDocumentValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  clerkUserId: v.string(),
  email: v.string(),
  name: v.string(),
  imageUrl: v.optional(v.string()),
  phone: v.optional(v.string()),
  roles: v.array(roleValidator),
  status: userStatusValidator,
  lastLoginAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const auditLogValidator = v.object({
  _id: v.id("auditLogs"),
  _creationTime: v.number(),
  actorId: v.optional(v.id("users")),
  actorClerkId: v.optional(v.string()),
  action: v.string(),
  entityType: v.string(),
  entityId: v.optional(v.string()),
  summary: v.string(),
  metadata: v.optional(v.record(v.string(), v.string())),
  createdAt: v.number(),
});

const jobTypeValidator = v.union(
  v.literal("contact_receipt"),
  v.literal("contact_staff_alert"),
  v.literal("admission_receipt"),
  v.literal("admission_staff_alert"),
  v.literal("newsletter_confirmation"),
  v.literal("newsletter_campaign_batch"),
  v.literal("newsletter_campaign_delivery"),
  v.literal("event_confirmation"),
  v.literal("content_publish"),
  v.literal("content_expire"),
  v.literal("ai_response"),
  v.literal("retention_cleanup"),
);

const jobDocumentValidator = v.object({
  _id: v.id("jobs"),
  _creationTime: v.number(),
  type: jobTypeValidator,
  status: v.union(
    v.literal("queued"),
    v.literal("running"),
    v.literal("retry"),
    v.literal("succeeded"),
    v.literal("dead"),
    v.literal("cancelled"),
  ),
  idempotencyKey: v.string(),
  payload: v.object({
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    recipient: v.optional(v.string()),
    template: v.optional(v.string()),
    conversationId: v.optional(v.id("aiConversations")),
    messageId: v.optional(v.id("aiMessages")),
    userMessageId: v.optional(v.id("aiMessages")),
    campaignId: v.optional(v.id("newsletterCampaigns")),
    campaignGeneration: v.optional(v.number()),
    subscriberId: v.optional(v.id("newsletterSubscribers")),
    metadata: v.optional(v.record(v.string(), v.string())),
  }),
  attempts: v.number(),
  maxAttempts: v.number(),
  runAt: v.number(),
  lockedAt: v.optional(v.number()),
  lastError: v.optional(v.string()),
  resultSummary: v.optional(v.string()),
  campaignOutcome: v.optional(v.union(v.literal("delivered"), v.literal("failed"), v.literal("suppressed"))),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const siteSettingsDocumentValidator = siteSettingsInputValidator.extend({
  _id: v.id("siteSettings"),
  _creationTime: v.number(),
  singletonKey: v.literal("main"),
  seo: seoOutputValidator,
  updatedBy: v.id("users"),
  updatedAt: v.number(),
});

const navigationDocumentValidator = v.object({
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
  requiredRole: v.optional(roleValidator),
  createdBy: v.id("users"),
  updatedBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const dashboardValidator = v.object({
  content: v.record(
    v.string(),
    v.object({
      total: v.number(),
      published: v.number(),
      draft: v.number(),
      scheduled: v.number(),
    }),
  ),
  workflows: v.object({
    contacts: v.object({ total: v.number(), open: v.number() }),
    admissions: v.object({ total: v.number(), active: v.number() }),
    eventRegistrations: v.object({ total: v.number(), registered: v.number() }),
    newsletter: v.object({ total: v.number(), active: v.number() }),
  }),
  jobs: v.object({ total: v.number(), queued: v.number(), failed: v.number() }),
  recent: v.object({
    contacts: v.array(contactSubmissionValidator),
    admissions: v.array(admissionSubmissionValidator),
    audit: v.array(auditLogValidator),
  }),
});
type ContentType =
  | "pages"
  | "programs"
  | "departments"
  | "leadership"
  | "teachers"
  | "news"
  | "notices"
  | "events"
  | "documents"
  | "galleryAlbums"
  | "testimonials"
  | "faqs"
  | "homeSections"
  | "homeHighlights";

const SLUGGED_TYPES = new Set<ContentType>([
  "pages",
  "programs",
  "departments",
  "leadership",
  "teachers",
  "news",
  "notices",
  "events",
  "documents",
  "galleryAlbums",
  "homeSections",
]);

function isPublisher(user: Doc<"users">): boolean {
  return user.roles.includes("admin") || user.roles.includes("publisher");
}

function normalizeId(ctx: QueryCtx | MutationCtx, table: string, id: string) {
  const normalized = (ctx.db as any).normalizeId(table, id);
  if (!normalized) throw new ConvexError({ code: "INVALID_ID", message: "Invalid record ID." });
  return normalized;
}

async function requireSubmissionRole(
  ctx: QueryCtx | MutationCtx,
  type: "contacts" | "admissions" | "eventRegistrations",
) {
  return type === "admissions"
    ? await requireRole(ctx, ["admin", "admissions"])
    : await requireRole(ctx, ["admin"]);
}

type ContactSubmissionOutput = Infer<typeof contactSubmissionValidator>;
type AdmissionSubmissionOutput = Infer<typeof admissionSubmissionValidator>;
type EventRegistrationOutput = Omit<Infer<typeof eventRegistrationSubmissionValidator>, "event">;

function safeSubmission(type: "contacts", submission: Doc<"contacts">): ContactSubmissionOutput;
function safeSubmission(type: "admissions", submission: Doc<"admissions">): AdmissionSubmissionOutput;
function safeSubmission(
  type: "eventRegistrations",
  submission: Doc<"eventRegistrations">,
): EventRegistrationOutput;
function safeSubmission(
  type: "contacts" | "admissions" | "eventRegistrations",
  submission: Doc<"contacts"> | Doc<"admissions"> | Doc<"eventRegistrations">,
): ContactSubmissionOutput | AdmissionSubmissionOutput | EventRegistrationOutput {
  if (type === "contacts") {
    return {
      _id: submission._id as Id<"contacts">,
      _creationTime: submission._creationTime,
      ticketNumber: (submission as Doc<"contacts">).ticketNumber,
      name: (submission as Doc<"contacts">).name,
      email: (submission as Doc<"contacts">).email,
      phone: (submission as Doc<"contacts">).phone,
      subject: (submission as Doc<"contacts">).subject,
      message: (submission as Doc<"contacts">).message,
      consentToContact: (submission as Doc<"contacts">).consentToContact,
      status: (submission as Doc<"contacts">).status,
      assignedTo: (submission as Doc<"contacts">).assignedTo,
      internalNotes: (submission as Doc<"contacts">).internalNotes,
      source: (submission as Doc<"contacts">).source,
      createdAt: (submission as Doc<"contacts">).createdAt,
      updatedAt: (submission as Doc<"contacts">).updatedAt,
    };
  }
  if (type === "eventRegistrations") {
    return {
      _id: submission._id as Id<"eventRegistrations">,
      _creationTime: submission._creationTime,
      eventId: (submission as Doc<"eventRegistrations">).eventId,
      registrationNumber: (submission as Doc<"eventRegistrations">).registrationNumber,
      name: (submission as Doc<"eventRegistrations">).name,
      email: (submission as Doc<"eventRegistrations">).email,
      phone: (submission as Doc<"eventRegistrations">).phone,
      attendees: (submission as Doc<"eventRegistrations">).attendees,
      notes: (submission as Doc<"eventRegistrations">).notes,
      consent: (submission as Doc<"eventRegistrations">).consent,
      status: (submission as Doc<"eventRegistrations">).status,
      createdAt: (submission as Doc<"eventRegistrations">).createdAt,
      updatedAt: (submission as Doc<"eventRegistrations">).updatedAt,
    };
  }
  return {
    _id: submission._id as Id<"admissions">,
    _creationTime: submission._creationTime,
    applicationNumber: (submission as Doc<"admissions">).applicationNumber,
    academicYear: (submission as Doc<"admissions">).academicYear,
    desiredGrade: (submission as Doc<"admissions">).desiredGrade,
    student: {
      firstName: (submission as Doc<"admissions">).student.firstName,
      middleName: (submission as Doc<"admissions">).student.middleName,
      lastName: (submission as Doc<"admissions">).student.lastName,
      dateOfBirth: (submission as Doc<"admissions">).student.dateOfBirth,
      gender: (submission as Doc<"admissions">).student.gender,
      citizenship: (submission as Doc<"admissions">).student.citizenship,
    },
    guardian: {
      name: (submission as Doc<"admissions">).guardian.name,
      relationship: (submission as Doc<"admissions">).guardian.relationship,
      email: (submission as Doc<"admissions">).guardian.email,
      phone: (submission as Doc<"admissions">).guardian.phone,
      address: (submission as Doc<"admissions">).guardian.address,
    },
    priorSchool: (submission as Doc<"admissions">).priorSchool,
    notes: (submission as Doc<"admissions">).notes,
    consent: (submission as Doc<"admissions">).consent,
    status: (submission as Doc<"admissions">).status,
    assignedTo: (submission as Doc<"admissions">).assignedTo,
    internalNotes: (submission as Doc<"admissions">).internalNotes,
    submittedAt: (submission as Doc<"admissions">).submittedAt,
    updatedAt: (submission as Doc<"admissions">).updatedAt,
  };
}

function cleanSeo(value: any) {
  return {
    title: value?.title ? plainText(value.title, "SEO title", 1, 120) : undefined,
    description: value?.description ? plainText(value.description, "SEO description", 1, 320) : undefined,
    imageUrl: optionalMediaUrl(value?.imageUrl),
    noIndex: value?.noIndex ?? false,
  };
}

function cleanStringArray(values: string[], field: string, maximum = 30) {
  if (values.length > maximum) {
    throw new ConvexError({ code: "INVALID_INPUT", message: `${field} has too many values.` });
  }
  return values.map((value) => plainText(value, field, 1, 240));
}

function optionalEventCapacity(value?: number): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || value < 1 || value > 5000) {
    throw new ConvexError({
      code: "INVALID_INPUT",
      message: "Event capacity must be an integer between 1 and 5000.",
    });
  }
  return value;
}

function cleanContent(type: ContentType, input: any): any {
  const display = {
    featured: input.featured ?? false,
    order: Math.max(0, Math.floor(input.order ?? 0)),
  };
  const publication = {
    status: input.status ?? "draft",
    publishAt: input.publishAt,
    expireAt: input.expireAt,
  };
  switch (type) {
    case "pages":
      return {
        slug: normalizedPageSlug(input.slug),
        title: plainText(input.title, "Title", 1, 180),
        summary: input.summary ? plainText(input.summary, "Summary", 1, 500) : undefined,
        body: richText(input.body, "Body"),
        template: input.template ? plainText(input.template, "Template", 1, 80) : undefined,
        heroImageId: input.heroImageId,
        heroImageUrl: optionalMediaUrl(input.heroImageUrl),
        seo: cleanSeo(input.seo),
        ...display,
        ...publication,
      };
    case "programs":
      return {
        slug: normalizedSlug(input.slug),
        name: plainText(input.name, "Name", 1, 180),
        shortDescription: plainText(input.shortDescription, "Short description", 1, 500),
        description: richText(input.description, "Description"),
        gradeRange: input.gradeRange ? plainText(input.gradeRange, "Grade range", 1, 80) : undefined,
        curriculum: input.curriculum ? plainText(input.curriculum, "Curriculum", 1, 160) : undefined,
        outcomes: cleanStringArray(input.outcomes, "Outcome"),
        heroImageId: input.heroImageId,
        heroImageUrl: optionalMediaUrl(input.heroImageUrl),
        seo: cleanSeo(input.seo),
        ...display,
        ...publication,
      };
    case "departments":
      return {
        slug: normalizedSlug(input.slug),
        name: plainText(input.name, "Name", 1, 180),
        description: richText(input.description, "Description"),
        responsibilities: cleanStringArray(input.responsibilities, "Responsibility"),
        email: input.email ? normalizedEmail(input.email) : undefined,
        phone: optionalPhone(input.phone),
        headTeacherId: input.headTeacherId,
        seo: cleanSeo(input.seo),
        ...display,
        ...publication,
      };
    case "leadership":
      return {
        slug: normalizedSlug(input.slug ?? input.name),
        name: plainText(input.name, "Name", 1, 180),
        role: plainText(input.role, "Role", 1, 180),
        bio: richText(input.bio, "Biography"),
        quote: input.quote ? plainText(input.quote, "Quote", 1, 1000) : undefined,
        photoId: input.photoId,
        photoUrl: optionalMediaUrl(input.photoUrl),
        email: input.email ? normalizedEmail(input.email) : undefined,
        order: display.order,
        ...publication,
      };
    case "teachers":
      return {
        slug: normalizedSlug(input.slug),
        name: plainText(input.name, "Name", 1, 180),
        title: plainText(input.title, "Title", 1, 180),
        departmentId: input.departmentId,
        bio: richText(input.bio, "Biography"),
        qualifications: cleanStringArray(input.qualifications, "Qualification"),
        subjects: cleanStringArray(input.subjects, "Subject"),
        email: input.email ? normalizedEmail(input.email) : undefined,
        phone: optionalPhone(input.phone),
        showContact: input.showContact ?? false,
        photoId: input.photoId,
        photoUrl: optionalMediaUrl(input.photoUrl),
        order: display.order,
        seo: cleanSeo(input.seo),
        ...publication,
      };
    case "news":
      return {
        slug: normalizedSlug(input.slug),
        title: plainText(input.title, "Title", 1, 220),
        excerpt: plainText(input.excerpt, "Excerpt", 1, 600),
        body: richText(input.body, "Body"),
        category: plainText(input.category, "Category", 1, 80),
        tags: cleanStringArray(input.tags, "Tag", 20),
        authorName: input.authorName ? plainText(input.authorName, "Author", 1, 120) : undefined,
        featuredImageId: input.featuredImageId,
        featuredImageUrl: optionalMediaUrl(input.featuredImageUrl),
        featured: display.featured,
        seo: cleanSeo(input.seo),
        ...publication,
      };
    case "notices":
      return {
        slug: normalizedSlug(input.slug),
        title: plainText(input.title, "Title", 1, 220),
        summary: input.summary ? plainText(input.summary, "Summary", 1, 600) : undefined,
        body: richText(input.body, "Body"),
        priority: input.priority,
        audiences: cleanStringArray(input.audiences, "Audience", 20),
        attachmentId: input.attachmentId,
        attachmentUrl: optionalUrl(input.attachmentUrl),
        startAt: input.startAt,
        seo: cleanSeo(input.seo),
        ...publication,
      };
    case "events": {
      if (input.endAt <= input.startAt) {
        throw new ConvexError({ code: "INVALID_DATES", message: "Event end must follow its start." });
      }
      return {
        slug: normalizedSlug(input.slug),
        title: plainText(input.title, "Title", 1, 220),
        summary: input.summary ? plainText(input.summary, "Summary", 1, 600) : undefined,
        description: richText(input.description, "Description"),
        startAt: input.startAt,
        endAt: input.endAt,
        timezone: plainText(input.timezone, "Timezone", 1, 80),
        venue: input.venue ? plainText(input.venue, "Venue", 1, 300) : undefined,
        isOnline: input.isOnline,
        meetingUrl: optionalUrl(input.meetingUrl),
        capacity: optionalEventCapacity(input.capacity),
        registrationEnabled: input.registrationEnabled,
        featuredImageId: input.featuredImageId,
        featuredImageUrl: optionalMediaUrl(input.featuredImageUrl),
        featured: display.featured,
        seo: cleanSeo(input.seo),
        ...publication,
      };
    }
    case "documents":
      if (!input.storageId && !input.externalUrl) {
        throw new ConvexError({ code: "DOCUMENT_REQUIRED", message: "Upload a document or provide a URL." });
      }
      return {
        slug: normalizedSlug(input.slug),
        title: plainText(input.title, "Title", 1, 220),
        description: input.description ? plainText(input.description, "Description", 1, 1000) : undefined,
        category: plainText(input.category, "Category", 1, 80),
        storageId: input.storageId,
        externalUrl: optionalUrl(input.externalUrl),
        fileName: input.fileName ? plainText(input.fileName, "File name", 1, 240) : undefined,
        mimeType: input.mimeType ? plainText(input.mimeType, "MIME type", 1, 160) : undefined,
        size: input.size,
        schoolYear: input.schoolYear ? plainText(input.schoolYear, "School year", 1, 30) : undefined,
        seo: cleanSeo(input.seo),
        ...display,
        ...publication,
      };
    case "galleryAlbums":
      return {
        slug: normalizedSlug(input.slug),
        title: plainText(input.title, "Title", 1, 220),
        description: input.description ? plainText(input.description, "Description", 1, 1200) : undefined,
        coverImageId: input.coverImageId,
        coverImageUrl: optionalMediaUrl(input.coverImageUrl),
        eventDate: input.eventDate,
        seo: cleanSeo(input.seo),
        ...display,
        ...publication,
      };
    case "testimonials":
      return {
        name: plainText(input.name, "Name", 1, 180),
        role: input.role ? plainText(input.role, "Role", 1, 120) : undefined,
        organization: input.organization ? plainText(input.organization, "Organization", 1, 160) : undefined,
        quote: plainText(input.quote, "Quote", 5, 2000),
        photoId: input.photoId,
        photoUrl: optionalMediaUrl(input.photoUrl),
        order: display.order,
        ...publication,
      };
    case "faqs":
      return {
        question: plainText(input.question, "Question", 3, 500),
        answer: richText(input.answer, "Answer", 5000),
        category: input.category ? plainText(input.category, "Category", 1, 80) : undefined,
        order: display.order,
        ...publication,
      };
    case "homeSections":
      return {
        slug: homeSectionKey(input.slug),
        eyebrow: input.eyebrow ? plainText(input.eyebrow, "Eyebrow", 1, 80) : undefined,
        heading: plainText(input.heading, "Heading", 1, 220),
        body: input.body ? richText(input.body, "Body", 2000) : undefined,
        secondaryBody: input.secondaryBody
          ? richText(input.secondaryBody, "Secondary body", 2000)
          : undefined,
        imageId: input.imageId,
        imageUrl: optionalMediaUrl(input.imageUrl),
        imageAlt: input.imageAlt ? plainText(input.imageAlt, "Image description", 1, 220) : undefined,
        secondaryImageId: input.secondaryImageId,
        secondaryImageUrl: optionalMediaUrl(input.secondaryImageUrl),
        ctaLabel: input.ctaLabel ? plainText(input.ctaLabel, "Link label", 1, 80) : undefined,
        ctaHref: input.ctaHref ? internalPath(input.ctaHref, "Link target") : undefined,
        ...publication,
      };
    case "homeHighlights":
      return {
        section: input.section,
        title: plainText(input.title, "Title", 1, 180),
        summary: input.summary ? plainText(input.summary, "Summary", 1, 600) : undefined,
        icon: input.icon ? plainText(input.icon, "Icon", 1, 40) : undefined,
        imageId: input.imageId,
        imageUrl: optionalMediaUrl(input.imageUrl),
        imageAlt: input.imageAlt ? plainText(input.imageAlt, "Image description", 1, 220) : undefined,
        href: input.href ? internalPath(input.href, "Link target") : undefined,
        order: display.order,
        ...publication,
      };
  }
}

const HOME_SECTION_KEYS = new Set(["hero", "about", "management", "news", "eca", "gallery", "alumni"]);

function homeSectionKey(value: unknown): string {
  const key = String(value ?? "").trim();
  if (!HOME_SECTION_KEYS.has(key)) {
    throw new ConvexError({ code: "INVALID_SECTION", message: "Choose a valid home-page section." });
  }
  return key;
}

/** Accepts a same-site route such as `/about`, or an approved absolute HTTPS URL. */
function internalPath(value: unknown, field: string): string {
  const raw = String(value ?? "").trim();
  if (/^\/(?!\/)[^\s\\]*$/.test(raw)) return raw;
  const external = optionalUrl(raw);
  if (external) return external;
  throw new ConvexError({
    code: "INVALID_LINK",
    message: `${field} must be a site route such as /about, or an HTTPS URL.`,
  });
}

function validatePublication(values: any, actor: Doc<"users">, existing?: any) {
  const effectiveStatus = values.status ?? existing?.status ?? "draft";
  const now = Date.now();
  const publishAt = values.publishAt ?? existing?.publishAt;
  const expireAt = values.expireAt ?? existing?.expireAt;
  if ((effectiveStatus === "published" || effectiveStatus === "scheduled") && !isPublisher(actor)) {
    throw new ConvexError({ code: "PUBLISHER_REQUIRED", message: "A publisher must approve this status." });
  }
  if (effectiveStatus === "scheduled" && (!publishAt || publishAt <= now)) {
    throw new ConvexError({
      code: "INVALID_SCHEDULE",
      message: "Scheduled content needs a future publish time.",
    });
  }
  if (effectiveStatus === "published" && publishAt !== undefined && publishAt > now) {
    throw new ConvexError({
      code: "INVALID_PUBLICATION_TIME",
      message: "Future publication times must use scheduled status.",
    });
  }
  if (effectiveStatus === "published" && expireAt !== undefined && expireAt <= now) {
    throw new ConvexError({
      code: "CONTENT_ALREADY_EXPIRED",
      message: "Published content needs an expiry time in the future.",
    });
  }
  if (expireAt !== undefined && publishAt !== undefined && expireAt <= publishAt) {
    throw new ConvexError({ code: "INVALID_EXPIRY", message: "Expiry must be after publication." });
  }
}

async function ensureUniqueSlug(
  ctx: MutationCtx,
  type: ContentType,
  slug: string | undefined,
  existingId?: string,
) {
  if (!slug || !SLUGGED_TYPES.has(type)) return;
  const duplicate = await (ctx.db.query(type as any) as any)
    .withIndex("by_slug", (q: any) => q.eq("slug", slug))
    .unique();
  if (duplicate && duplicate._id !== existingId) {
    throw new ConvexError({ code: "DUPLICATE_SLUG", message: "That URL slug is already in use." });
  }
}

export const dashboard = query({
  args: {},
  returns: dashboardValidator,
  handler: async (ctx) => {
    const viewer = await requireRole(ctx, STAFF_ROLES);
    const isAdmin = viewer.roles.includes("admin");
    const canViewAdmissions = isAdmin || viewer.roles.includes("admissions");
    const canViewSubscribers = isAdmin;
    const canViewAudit = isAdmin;
    const contentTypes: ContentType[] = [
      "pages",
      "programs",
      "departments",
      "leadership",
      "teachers",
      "news",
      "notices",
      "events",
      "documents",
      "galleryAlbums",
      "testimonials",
      "faqs",
      "homeSections",
      "homeHighlights",
    ];
    const [counterRows, recentContacts, recentAdmissions, recentAudit] = await Promise.all([
      ctx.db.query("counters").take(500),
      isAdmin ? ctx.db.query("contacts").order("desc").take(5) : Promise.resolve([]),
      canViewAdmissions ? ctx.db.query("admissions").order("desc").take(5) : Promise.resolve([]),
      canViewAudit
        ? ctx.db.query("auditLogs").withIndex("by_created_at").order("desc").take(10)
        : Promise.resolve([]),
    ]);
    const counters = new Map(counterRows.map((row) => [row.key, row.value]));
    const count = (key: string) => counters.get(key) ?? 0;
    const sumStatuses = (prefix: string, statuses: readonly string[]) =>
      statuses.reduce((total, status) => total + count(`${prefix}:status:${status}`), 0);
    const content = Object.fromEntries(
      contentTypes.map((type) => [
        type,
        {
          total: count(`content:${type}:total`),
          published: count(`content:${type}:status:published`),
          draft: count(`content:${type}:status:draft`),
          scheduled: count(`content:${type}:status:scheduled`),
        },
      ]),
    );
    return {
      content,
      workflows: {
        contacts: {
          total: isAdmin ? count("workflows:contacts:total") : 0,
          open: isAdmin ? sumStatuses("workflows:contacts", ["new", "in_review", "waiting"]) : 0,
        },
        admissions: {
          total: canViewAdmissions ? count("workflows:admissions:total") : 0,
          active: canViewAdmissions
            ? sumStatuses("workflows:admissions", [
                "submitted",
                "screening",
                "documents_requested",
                "interview",
                "offered",
                "waitlisted",
              ])
            : 0,
        },
        eventRegistrations: {
          total: isAdmin ? count("workflows:eventRegistrations:total") : 0,
          registered: isAdmin ? count("workflows:eventRegistrations:status:registered") : 0,
        },
        newsletter: {
          total: canViewSubscribers ? count("workflows:newsletter:total") : 0,
          active: canViewSubscribers ? count("workflows:newsletter:status:active") : 0,
        },
      },
      jobs: {
        total: isAdmin ? count("jobs:total") : 0,
        queued: isAdmin ? sumStatuses("jobs", ["queued", "retry"]) : 0,
        failed: isAdmin ? count("jobs:status:dead") : 0,
      },
      recent: {
        contacts: recentContacts.map((row) => safeSubmission("contacts", row)),
        admissions: recentAdmissions.map((row) => safeSubmission("admissions", row)),
        audit: recentAudit,
      },
    };
  },
});

export const listContent = query({
  args: {
    type: contentTypeValidator,
    paginationOpts: paginationOptsValidator,
    status: v.optional(contentStatusValidator),
  },
  returns: paginationResultValidator(contentDocumentValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, CONTENT_ROLES);
    const collection = ctx.db.query(args.type as any) as any;
    return args.status
      ? await collection
          .withIndex("by_status", (q: any) => q.eq("status", args.status))
          .order("desc")
          .paginate(boundedPaginationOpts(args.paginationOpts))
      : await collection.order("desc").paginate(boundedPaginationOpts(args.paginationOpts));
  },
});

export const upsertContent = mutation({
  args: { payload: contentUpsertArgsValidator },
  returns: v.string(),
  handler: async (ctx, { payload: args }) => {
    const actor = await requireRole(ctx, CONTENT_ROLES);
    const id = args.id ? normalizeId(ctx, args.type, args.id) : undefined;
    const existing = id ? await (ctx.db as any).get(args.type, id) : null;
    if (id && !existing) throw new ConvexError({ code: "NOT_FOUND", message: "Content was not found." });
    const raw = args.data as any;
    if (args.type === "teachers" && raw.departmentId) {
      const department = await ctx.db.get("departments", raw.departmentId);
      if (!department) {
        throw new ConvexError({
          code: "INVALID_DEPARTMENT",
          message: "The selected department does not exist.",
        });
      }
    }
    if (args.type === "departments" && raw.headTeacherId) {
      const teacher = await ctx.db.get("teachers", raw.headTeacherId);
      if (!teacher) {
        throw new ConvexError({
          code: "INVALID_TEACHER",
          message: "The selected department head does not exist.",
        });
      }
    }
    const cleaned = cleanContent(args.type, args.data);
    if (
      args.type === "events" &&
      existing?.registeredAttendeeCount !== undefined &&
      cleaned.capacity !== undefined &&
      cleaned.capacity < existing.registeredAttendeeCount
    ) {
      throw new ConvexError({
        code: "CAPACITY_BELOW_REGISTRATIONS",
        message: "Event capacity cannot be lower than the number of already confirmed attendees.",
      });
    }
    if (existing && args.data.status === undefined) cleaned.status = existing.status;
    validatePublication(cleaned, actor, existing);
    await ensureUniqueSlug(ctx, args.type, cleaned.slug, existing?._id);
    const now = Date.now();
    const values = {
      ...cleaned,
      publishedAt: cleaned.status === "published" ? (existing?.publishedAt ?? now) : existing?.publishedAt,
      updatedBy: actor._id,
      updatedAt: now,
    };
    let resultId: string;
    if (existing) {
      await (ctx.db as any).patch(args.type, existing._id, values);
      resultId = existing._id;
    } else {
      resultId = await (ctx.db as any).insert(args.type, {
        ...values,
        createdBy: actor._id,
        createdAt: now,
      });
    }
    if (existing) {
      await recordStatusChanged(ctx, `content:${args.type}`, existing.status, cleaned.status);
    } else {
      await recordCreated(ctx, `content:${args.type}`, cleaned.status);
    }
    if (cleaned.status === "scheduled" && cleaned.publishAt) {
      await enqueueJob(ctx, {
        type: "content_publish",
        idempotencyKey: `publish:${args.type}:${resultId}:${cleaned.publishAt}`,
        payload: { entityType: args.type, entityId: resultId },
        runAt: cleaned.publishAt,
      });
    }
    if (cleaned.expireAt) {
      await enqueueJob(ctx, {
        type: "content_expire",
        idempotencyKey: `expire:${args.type}:${resultId}:${cleaned.expireAt}`,
        payload: { entityType: args.type, entityId: resultId },
        runAt: cleaned.expireAt,
      });
    }
    await writeAudit(ctx, actor, {
      action: existing ? "content.updated" : "content.created",
      entityType: args.type,
      entityId: resultId,
      summary: `${existing ? "Updated" : "Created"} ${args.type} record.`,
      metadata: { status: cleaned.status },
    });
    return resultId;
  },
});

export const changeContentStatus = mutation({
  args: {
    type: contentTypeValidator,
    id: v.string(),
    status: contentStatusValidator,
    publishAt: v.optional(v.number()),
    expireAt: v.optional(v.number()),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, PUBLISH_ROLES);
    const id = normalizeId(ctx, args.type, args.id);
    const existing = await (ctx.db as any).get(args.type, id);
    if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "Content was not found." });
    const values = {
      status: args.status,
      publishAt: args.publishAt,
      // The status control does not expose expiry. Preserve a previously
      // configured expiry unless an explicit replacement is supplied.
      expireAt: args.expireAt ?? existing.expireAt,
    };
    validatePublication(values, actor, existing);
    const now = Date.now();
    await (ctx.db as any).patch(args.type, id, {
      ...values,
      publishedAt: args.status === "published" ? (existing.publishedAt ?? now) : existing.publishedAt,
      updatedBy: actor._id,
      updatedAt: now,
    });
    await recordStatusChanged(ctx, `content:${args.type}`, existing.status, args.status);
    if (args.status === "scheduled" && args.publishAt) {
      await enqueueJob(ctx, {
        type: "content_publish",
        idempotencyKey: `publish:${args.type}:${args.id}:${args.publishAt}`,
        payload: { entityType: args.type, entityId: args.id },
        runAt: args.publishAt,
      });
    }
    if (args.expireAt) {
      await enqueueJob(ctx, {
        type: "content_expire",
        idempotencyKey: `expire:${args.type}:${args.id}:${args.expireAt}`,
        payload: { entityType: args.type, entityId: args.id },
        runAt: args.expireAt,
      });
    }
    await writeAudit(ctx, actor, {
      action: "content.status_changed",
      entityType: args.type,
      entityId: args.id,
      summary: `Changed status to ${args.status}.`,
    });
    return { ok: true };
  },
});

export const removeContent = mutation({
  args: { type: contentTypeValidator, id: v.string() },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, PUBLISH_ROLES);
    const id = normalizeId(ctx, args.type, args.id);
    const existing = await (ctx.db as any).get(args.type, id);
    if (!existing) return { ok: true };
    if (existing.status === "published" || existing.status === "scheduled") {
      throw new ConvexError({
        code: "CONTENT_ACTIVE",
        message: "Archive active content before permanently deleting it.",
      });
    }
    if (args.type === "galleryAlbums") {
      const item = await ctx.db
        .query("galleryItems")
        .withIndex("by_album_order", (q) => q.eq("albumId", id as Id<"galleryAlbums">))
        .first();
      if (item) throw new ConvexError({ code: "ALBUM_NOT_EMPTY", message: "Delete gallery items first." });
    }
    if (args.type === "departments") {
      const teacher = await ctx.db
        .query("teachers")
        .withIndex("by_department_status", (q) => q.eq("departmentId", id as Id<"departments">))
        .first();
      if (teacher)
        throw new ConvexError({ code: "CONTENT_IN_USE", message: "Reassign department teachers first." });
    }
    if (args.type === "teachers") {
      const department = await ctx.db
        .query("departments")
        .withIndex("by_head_teacher_id", (q) => q.eq("headTeacherId", id as Id<"teachers">))
        .first();
      if (department)
        throw new ConvexError({ code: "CONTENT_IN_USE", message: "Choose another department head first." });
    }
    if (args.type === "events") {
      const registration = await ctx.db
        .query("eventRegistrations")
        .withIndex("by_event_status", (q) => q.eq("eventId", id as Id<"events">))
        .first();
      if (registration)
        throw new ConvexError({
          code: "CONTENT_IN_USE",
          message: "Events with registrations cannot be deleted.",
        });
    }
    await (ctx.db as any).delete(args.type, id);
    await recordDeleted(ctx, `content:${args.type}`, existing.status);
    await writeAudit(ctx, actor, {
      action: "content.deleted",
      entityType: args.type,
      entityId: args.id,
      summary: `Deleted ${args.type} record.`,
    });
    return { ok: true };
  },
});

export const listSubmissions = query({
  args: {
    type: submissionTypeValidator,
    paginationOpts: paginationOptsValidator,
    status: v.optional(v.string()),
    eventId: v.optional(v.id("events")),
  },
  returns: paginationResultValidator(submissionOutputValidator),
  handler: async (ctx, args) => {
    await requireSubmissionRole(ctx, args.type);
    if (args.eventId && args.type !== "eventRegistrations") {
      throw new ConvexError({
        code: "INVALID_FILTER",
        message: "Event filters apply only to registrations.",
      });
    }
    const collection = ctx.db.query(args.type as any) as any;
    let result: any;
    if (args.type === "eventRegistrations" && args.eventId) {
      result = args.status
        ? await collection
            .withIndex("by_event_status", (q: any) => q.eq("eventId", args.eventId).eq("status", args.status))
            .order("desc")
            .paginate(boundedPaginationOpts(args.paginationOpts))
        : await collection
            .withIndex("by_event_created_at", (q: any) => q.eq("eventId", args.eventId))
            .order("desc")
            .paginate(boundedPaginationOpts(args.paginationOpts));
    } else {
      result = !args.status
        ? await collection.order("desc").paginate(boundedPaginationOpts(args.paginationOpts))
        : await collection
            .withIndex(
              args.type === "contacts"
                ? "by_status_created_at"
                : args.type === "admissions"
                  ? "by_status_submitted_at"
                  : "by_status_created_at",
              (q: any) => q.eq("status", args.status),
            )
            .order("desc")
            .paginate(boundedPaginationOpts(args.paginationOpts));
    }
    const page = await Promise.all(
      result.page.map(async (submission: any) => {
        if (args.type === "contacts") return safeSubmission("contacts", submission);
        if (args.type === "admissions") return safeSubmission("admissions", submission);
        const safe = safeSubmission("eventRegistrations", submission);
        const event = await ctx.db.get("events", submission.eventId);
        return {
          ...safe,
          event: event ? { _id: event._id, title: event.title, startsAt: event.startAt } : null,
        };
      }),
    );
    return {
      ...result,
      page,
    };
  },
});

export const getSubmission = query({
  args: { type: submissionTypeValidator, id: v.string() },
  returns: v.union(v.null(), submissionOutputValidator),
  handler: async (ctx, args) => {
    await requireSubmissionRole(ctx, args.type);
    const id = normalizeId(ctx, args.type, args.id);
    const submission = await (ctx.db as any).get(args.type, id);
    if (!submission) return null;
    if (args.type === "eventRegistrations") {
      const event = await ctx.db.get("events", submission.eventId);
      return {
        ...safeSubmission("eventRegistrations", submission),
        event: event ? { _id: event._id, title: event.title, startsAt: event.startAt } : null,
      };
    }
    return args.type === "contacts"
      ? safeSubmission("contacts", submission)
      : safeSubmission("admissions", submission);
  },
});

export const updateSubmission = mutation({
  args: {
    type: submissionTypeValidator,
    id: v.string(),
    status: v.string(),
    assignedTo: v.optional(v.id("users")),
    internalNotes: v.optional(v.string()),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const actor = await requireSubmissionRole(ctx, args.type);
    const allowed =
      args.type === "contacts"
        ? new Set(["new", "in_review", "waiting", "resolved", "closed", "spam"])
        : args.type === "admissions"
          ? new Set([
              "submitted",
              "screening",
              "documents_requested",
              "interview",
              "offered",
              "waitlisted",
              "enrolled",
              "declined",
              "withdrawn",
            ])
          : new Set(["registered", "waitlisted", "cancelled", "attended", "no_show"]);
    if (!allowed.has(args.status))
      throw new ConvexError({ code: "INVALID_STATUS", message: "Invalid status." });
    const id = normalizeId(ctx, args.type, args.id);
    const existing = await (ctx.db as any).get(args.type, id);
    if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "Submission was not found." });
    if (args.type !== "eventRegistrations" && args.assignedTo) {
      const assignee = await ctx.db.get("users", args.assignedTo);
      const eligible =
        assignee?.status === "active" &&
        (args.type === "admissions"
          ? assignee.roles.includes("admin") || assignee.roles.includes("admissions")
          : assignee.roles.includes("admin"));
      if (!eligible) {
        throw new ConvexError({ code: "INVALID_ASSIGNEE", message: "Choose an active, eligible assignee." });
      }
    }
    const patch: Record<string, unknown> = { status: args.status, updatedAt: Date.now() };
    if (args.type !== "eventRegistrations") {
      patch.assignedTo = args.assignedTo;
      patch.internalNotes = args.internalNotes
        ? plainText(args.internalNotes, "Internal notes", 1, 5000)
        : undefined;
    } else if (existing.status !== args.status) {
      const event = await ctx.db.get("events", existing.eventId as Id<"events">);
      if (!event) {
        throw new ConvexError({ code: "EVENT_NOT_FOUND", message: "The registration event was not found." });
      }
      let usedCapacity = event.registeredAttendeeCount ?? 0;
      if (event.registeredAttendeeCount === undefined && event.capacity) {
        const registered = (
          await Promise.all(
            (["registered", "attended", "no_show"] as const).map((status) =>
              ctx.db
                .query("eventRegistrations")
                .withIndex("by_event_status", (q) => q.eq("eventId", event._id).eq("status", status))
                .take(CAPACITY_RECONCILIATION_LIMIT + 1),
            ),
          )
        ).flat();
        if (registered.length > CAPACITY_RECONCILIATION_LIMIT) {
          throw new ConvexError({
            code: "CAPACITY_RECONCILIATION_REQUIRED",
            message: "Reconcile this event's confirmed-attendee count before changing registration status.",
          });
        }
        usedCapacity = registered.reduce((total, registration) => total + registration.attendees, 0);
      }
      const capacityStatuses = new Set(["registered", "attended", "no_show"]);
      const leavingCapacity = capacityStatuses.has(existing.status) && !capacityStatuses.has(args.status);
      const enteringCapacity = !capacityStatuses.has(existing.status) && capacityStatuses.has(args.status);
      if (enteringCapacity && event.capacity && usedCapacity + existing.attendees > event.capacity) {
        throw new ConvexError({
          code: "EVENT_CAPACITY_EXCEEDED",
          message: "This registration cannot be confirmed because the event is at capacity.",
        });
      }
      if (leavingCapacity || enteringCapacity) {
        await ctx.db.patch("events", event._id, {
          registeredAttendeeCount: Math.max(
            0,
            usedCapacity + (enteringCapacity ? existing.attendees : -existing.attendees),
          ),
        });
      }
    }
    await (ctx.db as any).patch(args.type, id, patch);
    await recordStatusChanged(ctx, `workflows:${args.type}`, existing.status, args.status);
    if (
      args.type === "eventRegistrations" &&
      existing.status !== args.status &&
      ["registered", "waitlisted", "cancelled"].includes(args.status)
    ) {
      const now = Date.now();
      await enqueueJob(ctx, {
        type: "event_confirmation",
        idempotencyKey: `event-status:${existing._id}:${args.status}:${now}`,
        payload: {
          entityType: "eventRegistrations",
          entityId: existing._id,
          recipient: existing.email,
          template:
            args.status === "registered"
              ? "event-confirmation"
              : args.status === "waitlisted"
                ? "event-waitlist"
                : "event-cancelled",
          metadata: { expectedStatus: args.status, transition: "admin" },
        },
      });
    }
    await writeAudit(ctx, actor, {
      action: "submission.updated",
      entityType: args.type,
      entityId: args.id,
      summary: `Updated submission status to ${args.status}.`,
    });
    return { ok: true };
  },
});

export const listSubscribers = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(newsletterSubscriberStatusValidator),
  },
  returns: paginationResultValidator(newsletterSubscriberOutputValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const result = args.status
      ? await ctx.db
          .query("newsletterSubscribers")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .paginate(boundedPaginationOpts(args.paginationOpts))
      : await ctx.db
          .query("newsletterSubscribers")
          .order("desc")
          .paginate(boundedPaginationOpts(args.paginationOpts));
    return {
      ...result,
      page: result.page.map((subscriber) => ({
        _id: subscriber._id,
        _creationTime: subscriber._creationTime,
        email: subscriber.email,
        name: subscriber.name,
        status: subscriber.status,
        source: subscriber.source,
        consentAt: subscriber.consentAt,
        confirmedAt: subscriber.confirmedAt,
        confirmationExpiresAt: subscriber.confirmationExpiresAt,
        unsubscribedAt: subscriber.unsubscribedAt,
        createdAt: subscriber.createdAt,
        updatedAt: subscriber.updatedAt,
      })),
    };
  },
});

export const updateSubscriber = mutation({
  args: {
    subscriberId: v.id("newsletterSubscribers"),
    status: v.union(v.literal("unsubscribed"), v.literal("bounced")),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ["admin"]);
    const subscriber = await ctx.db.get("newsletterSubscribers", args.subscriberId);
    if (!subscriber) throw new ConvexError({ code: "NOT_FOUND", message: "Subscriber not found." });
    const now = Date.now();
    await ctx.db.patch("newsletterSubscribers", subscriber._id, {
      status: args.status,
      unsubscribedAt: args.status === "unsubscribed" ? now : subscriber.unsubscribedAt,
      updatedAt: now,
    });
    await recordStatusChanged(ctx, "workflows:newsletter", subscriber.status, args.status);
    await writeAudit(ctx, actor, {
      action: "newsletter.status_changed",
      entityType: "newsletterSubscribers",
      entityId: subscriber._id,
      summary: `Changed newsletter status to ${args.status}.`,
    });
    return { ok: true };
  },
});

const newsletterCampaignInput = v.object({
  title: v.string(),
  subject: v.string(),
  preheader: v.optional(v.string()),
  body: v.string(),
});

export const getNewsletterMetrics = query({
  args: {},
  returns: v.object({
    subscribers: v.object({
      total: v.number(),
      pending: v.number(),
      active: v.number(),
      unsubscribed: v.number(),
      bounced: v.number(),
    }),
    campaigns: v.object({
      total: v.number(),
      draft: v.number(),
      scheduled: v.number(),
      queueing: v.number(),
      sending: v.number(),
      completed: v.number(),
      failed: v.number(),
      cancelled: v.number(),
    }),
  }),
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    const rows = await ctx.db.query("counters").take(500);
    const counters = new Map(rows.map((row) => [row.key, row.value]));
    const count = (key: string) => counters.get(key) ?? 0;
    return {
      subscribers: {
        total: count("workflows:newsletter:total"),
        pending: count("workflows:newsletter:status:pending"),
        active: count("workflows:newsletter:status:active"),
        unsubscribed: count("workflows:newsletter:status:unsubscribed"),
        bounced: count("workflows:newsletter:status:bounced"),
      },
      campaigns: {
        total: count("newsletterCampaigns:total"),
        draft: count("newsletterCampaigns:status:draft"),
        scheduled: count("newsletterCampaigns:status:scheduled"),
        queueing: count("newsletterCampaigns:status:queueing"),
        sending: count("newsletterCampaigns:status:sending"),
        completed: count("newsletterCampaigns:status:completed"),
        failed: count("newsletterCampaigns:status:failed"),
        cancelled: count("newsletterCampaigns:status:cancelled"),
      },
    };
  },
});

export const listNewsletterCampaigns = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(newsletterCampaignStatusValidator),
  },
  returns: paginationResultValidator(newsletterCampaignPreviewValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const result = args.status
      ? await ctx.db
          .query("newsletterCampaigns")
          .withIndex("by_status_updated_at", (q) => q.eq("status", args.status!))
          .order("desc")
          .paginate(boundedPaginationOpts(args.paginationOpts))
      : await ctx.db
          .query("newsletterCampaigns")
          .withIndex("by_updated_at")
          .order("desc")
          .paginate(boundedPaginationOpts(args.paginationOpts));
    return {
      ...result,
      page: result.page.map((campaign) => ({
        _id: campaign._id,
        _creationTime: campaign._creationTime,
        title: campaign.title,
        subject: campaign.subject,
        preheader: campaign.preheader,
        status: campaign.status,
        generation: campaign.generation,
        audienceCutoff: campaign.audienceCutoff,
        scheduledAt: campaign.scheduledAt,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt,
        paginationCursor: campaign.paginationCursor,
        targetCount: campaign.targetCount,
        deliveredCount: campaign.deliveredCount,
        failedCount: campaign.failedCount,
        suppressedCount: campaign.suppressedCount,
        createdBy: campaign.createdBy,
        updatedBy: campaign.updatedBy,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        bodyPreview: campaign.body.slice(0, 240),
      })),
    };
  },
});

export const getNewsletterCampaign = query({
  args: { campaignId: v.id("newsletterCampaigns") },
  returns: v.union(v.null(), newsletterCampaignValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    return await ctx.db.get("newsletterCampaigns", args.campaignId);
  },
});

export const upsertNewsletterCampaign = mutation({
  args: {
    campaignId: v.optional(v.id("newsletterCampaigns")),
    campaign: newsletterCampaignInput,
  },
  returns: v.id("newsletterCampaigns"),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ["admin"]);
    const existing = args.campaignId ? await ctx.db.get("newsletterCampaigns", args.campaignId) : null;
    if (args.campaignId && !existing) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Newsletter campaign not found." });
    }
    if (existing && !["draft", "scheduled"].includes(existing.status)) {
      throw new ConvexError({
        code: "CAMPAIGN_LOCKED",
        message: "A campaign cannot be edited after queueing starts.",
      });
    }
    const now = Date.now();
    const values = {
      title: singleLineText(args.campaign.title, "Campaign title", 2, 180),
      subject: singleLineText(args.campaign.subject, "Email subject", 2, 180),
      preheader: args.campaign.preheader
        ? singleLineText(args.campaign.preheader, "Preheader", 1, 300)
        : undefined,
      body: plainText(args.campaign.body, "Campaign body", 10, 50_000),
      updatedBy: actor._id,
      updatedAt: now,
    };
    const id = existing
      ? (await ctx.db.patch("newsletterCampaigns", existing._id, values), existing._id)
      : await ctx.db.insert("newsletterCampaigns", {
          ...values,
          status: "draft",
          generation: 0,
          targetCount: 0,
          deliveredCount: 0,
          failedCount: 0,
          suppressedCount: 0,
          createdBy: actor._id,
          createdAt: now,
        });
    if (!existing) await recordCreated(ctx, "newsletterCampaigns", "draft");
    await writeAudit(ctx, actor, {
      action: existing ? "newsletter_campaign.updated" : "newsletter_campaign.created",
      entityType: "newsletterCampaigns",
      entityId: id,
      summary: `${existing ? "Updated" : "Created"} newsletter campaign ${values.title}.`,
    });
    return id;
  },
});

export const scheduleNewsletterCampaign = mutation({
  args: { campaignId: v.id("newsletterCampaigns"), scheduledAt: v.optional(v.number()) },
  returns: v.object({ ok: v.boolean(), scheduledAt: v.number() }),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ["admin"]);
    const campaign = await ctx.db.get("newsletterCampaigns", args.campaignId);
    if (!campaign) throw new ConvexError({ code: "NOT_FOUND", message: "Newsletter campaign not found." });
    if (campaign.status !== "draft" && campaign.status !== "scheduled") {
      throw new ConvexError({ code: "CAMPAIGN_LOCKED", message: "This campaign has already started." });
    }
    const now = Date.now();
    const scheduledAt = args.scheduledAt ?? now;
    if (
      !Number.isSafeInteger(scheduledAt) ||
      scheduledAt < now - 5 * 60 * 1000 ||
      scheduledAt > now + 366 * 24 * 60 * 60 * 1000
    ) {
      throw new ConvexError({
        code: "INVALID_SCHEDULE",
        message: "Choose a valid send time within one year.",
      });
    }
    const runAt = Math.max(now, scheduledAt);
    const generation = campaign.generation + 1;
    await ctx.db.patch("newsletterCampaigns", campaign._id, {
      status: "scheduled",
      generation,
      scheduledAt: runAt,
      audienceCutoff: undefined,
      startedAt: undefined,
      completedAt: undefined,
      paginationCursor: undefined,
      targetCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      suppressedCount: 0,
      updatedBy: actor._id,
      updatedAt: now,
    });
    await recordStatusChanged(ctx, "newsletterCampaigns", campaign.status, "scheduled");
    await enqueueJob(ctx, {
      type: "newsletter_campaign_batch",
      idempotencyKey: `newsletter-batch:${campaign._id}:${generation}:start`,
      payload: { campaignId: campaign._id, campaignGeneration: generation },
      runAt,
      maxAttempts: 8,
    });
    await writeAudit(ctx, actor, {
      action: "newsletter_campaign.scheduled",
      entityType: "newsletterCampaigns",
      entityId: campaign._id,
      summary: `Scheduled newsletter campaign ${campaign.title}.`,
      metadata: { scheduledAt: String(runAt) },
    });
    return { ok: true, scheduledAt: runAt };
  },
});

export const cancelNewsletterCampaign = mutation({
  args: { campaignId: v.id("newsletterCampaigns") },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ["admin"]);
    const campaign = await ctx.db.get("newsletterCampaigns", args.campaignId);
    if (!campaign || campaign.status === "cancelled") return { ok: true };
    if (campaign.status === "completed") {
      throw new ConvexError({
        code: "CAMPAIGN_COMPLETE",
        message: "A completed campaign cannot be cancelled.",
      });
    }
    const now = Date.now();
    await ctx.db.patch("newsletterCampaigns", campaign._id, {
      status: "cancelled",
      completedAt: now,
      updatedBy: actor._id,
      updatedAt: now,
    });
    await recordStatusChanged(ctx, "newsletterCampaigns", campaign.status, "cancelled");
    await writeAudit(ctx, actor, {
      action: "newsletter_campaign.cancelled",
      entityType: "newsletterCampaigns",
      entityId: campaign._id,
      summary: `Cancelled newsletter campaign ${campaign.title}.`,
    });
    return { ok: true };
  },
});

export const listAiConversations = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(v.union(v.literal("active"), v.literal("closed"))),
  },
  returns: paginationResultValidator(aiConversationValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    return args.status
      ? await ctx.db
          .query("aiConversations")
          .withIndex("by_status_updated_at", (q) => q.eq("status", args.status!))
          .order("desc")
          .paginate(boundedPaginationOpts(args.paginationOpts))
      : await ctx.db
          .query("aiConversations")
          .order("desc")
          .paginate(boundedPaginationOpts(args.paginationOpts));
  },
});

export const getAiConversation = query({
  args: { conversationId: v.id("aiConversations") },
  returns: v.union(
    v.null(),
    v.object({
      conversation: aiConversationValidator,
      messages: v.array(aiMessageValidator),
    }),
  ),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const conversation = await ctx.db.get("aiConversations", args.conversationId);
    if (!conversation) return null;
    const messages = await ctx.db
      .query("aiMessages")
      .withIndex("by_conversation_created_at", (q) => q.eq("conversationId", conversation._id))
      .order("desc")
      .take(500);
    messages.reverse();
    return { conversation, messages };
  },
});

export const closeAiConversation = mutation({
  args: { conversationId: v.id("aiConversations") },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ["admin"]);
    const conversation = await ctx.db.get("aiConversations", args.conversationId);
    if (!conversation) return { ok: true };
    await ctx.db.patch("aiConversations", conversation._id, {
      status: "closed",
      updatedAt: Date.now(),
    });
    await writeAudit(ctx, actor, {
      action: "assistant.conversation_closed",
      entityType: "aiConversations",
      entityId: conversation._id,
      summary: "Closed an assistant conversation.",
    });
    return { ok: true };
  },
});

export const listUsers = query({
  args: { paginationOpts: paginationOptsValidator, status: v.optional(userStatusValidator) },
  returns: paginationResultValidator(userDocumentValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    return args.status
      ? await ctx.db
          .query("users")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .paginate(boundedPaginationOpts(args.paginationOpts))
      : await ctx.db.query("users").order("desc").paginate(boundedPaginationOpts(args.paginationOpts));
  },
});

export const listActiveAssignees = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      email: v.string(),
    }),
  ),
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "admissions"]);
    const users = await ctx.db
      .query("users")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(200);
    return users
      .filter((user) => user.roles.includes("admin") || user.roles.includes("admissions"))
      .map((user) => ({ _id: user._id, name: user.name, email: user.email }))
      .sort((left, right) => left.name.localeCompare(right.name));
  },
});

export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    roles: v.optional(v.array(roleValidator)),
    status: v.optional(userStatusValidator),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ["admin"]);
    const target = await ctx.db.get("users", args.userId);
    if (!target) throw new ConvexError({ code: "NOT_FOUND", message: "User was not found." });
    const roles = args.roles ? [...new Set(args.roles)] : target.roles;
    const nextStatus = args.status ?? target.status;
    if (nextStatus === "active" && roles.length === 0) {
      throw new ConvexError({
        code: "ROLE_REQUIRED",
        message: "An active staff account must have at least one administration role.",
      });
    }
    const removesAdmin = target.roles.includes("admin") && !roles.includes("admin");
    const disablesAdmin = target.roles.includes("admin") && args.status && args.status !== "active";
    if (removesAdmin || disablesAdmin) {
      const users = await ctx.db
        .query("users")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .take(1_001);
      if (users.length > 1_000) {
        throw new ConvexError({
          code: "ADMIN_REVIEW_REQUIRED",
          message: "This deployment requires an administrator-count review before access can be removed.",
        });
      }
      const activeAdmins = users.filter((user) => user.status === "active" && user.roles.includes("admin"));
      if (activeAdmins.length <= 1) {
        throw new ConvexError({ code: "LAST_ADMIN", message: "The final active admin cannot be removed." });
      }
    }
    await ctx.db.patch("users", target._id, {
      roles,
      status: nextStatus,
      updatedAt: Date.now(),
    });
    await writeAudit(ctx, actor, {
      action: "user.updated",
      entityType: "users",
      entityId: target._id,
      summary: `Updated access for ${target.email}.`,
      metadata: { roles: roles.join(","), status: nextStatus },
    });
    return { ok: true };
  },
});

export const listAuditActors = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      email: v.string(),
    }),
  ),
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    const users = await ctx.db.query("users").order("desc").take(500);
    return users
      .map((user) => ({ _id: user._id, name: user.name, email: user.email }))
      .sort((left, right) => left.name.localeCompare(right.name));
  },
});

export const listAuditLogs = query({
  args: {
    paginationOpts: paginationOptsValidator,
    entityType: v.optional(v.string()),
    actorId: v.optional(v.id("users")),
  },
  returns: paginationResultValidator(auditLogValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    if (args.actorId && args.entityType) {
      return await ctx.db
        .query("auditLogs")
        .withIndex("by_actor_id_and_entity_type_and_created_at", (q) =>
          q.eq("actorId", args.actorId).eq("entityType", args.entityType!),
        )
        .order("desc")
        .paginate(boundedPaginationOpts(args.paginationOpts));
    }
    if (args.actorId) {
      return await ctx.db
        .query("auditLogs")
        .withIndex("by_actor_created_at", (q) => q.eq("actorId", args.actorId))
        .order("desc")
        .paginate(boundedPaginationOpts(args.paginationOpts));
    }
    if (args.entityType) {
      return await ctx.db
        .query("auditLogs")
        .withIndex("by_entity_created_at", (q) => q.eq("entityType", args.entityType!))
        .order("desc")
        .paginate(boundedPaginationOpts(args.paginationOpts));
    }
    return await ctx.db
      .query("auditLogs")
      .withIndex("by_created_at")
      .order("desc")
      .paginate(boundedPaginationOpts(args.paginationOpts));
  },
});

export const listJobs = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  returns: paginationResultValidator(jobDocumentValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    if (args.type && args.status) {
      return await ctx.db
        .query("jobs")
        .withIndex("by_type_status", (q) => q.eq("type", args.type as any).eq("status", args.status as any))
        .order("desc")
        .paginate(boundedPaginationOpts(args.paginationOpts));
    }
    if (args.status) {
      return await ctx.db
        .query("jobs")
        .withIndex("by_status_run_at", (q) => q.eq("status", args.status as any))
        .order("desc")
        .paginate(boundedPaginationOpts(args.paginationOpts));
    }
    if (args.type) {
      return await ctx.db
        .query("jobs")
        .withIndex("by_type_status", (q) => q.eq("type", args.type as any))
        .order("desc")
        .paginate(boundedPaginationOpts(args.paginationOpts));
    }
    return await ctx.db.query("jobs").order("desc").paginate(boundedPaginationOpts(args.paginationOpts));
  },
});

export const retryJob = mutation({
  args: { jobId: v.id("jobs") },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ["admin"]);
    const job = await ctx.db.get("jobs", args.jobId);
    if (!job) throw new ConvexError({ code: "NOT_FOUND", message: "Job was not found." });
    if (job.status !== "dead") {
      throw new ConvexError({ code: "JOB_NOT_RETRYABLE", message: "Only dead jobs can be retried." });
    }
    const now = Date.now();
    if (
      job.campaignOutcome === "failed" &&
      job.payload.campaignId &&
      job.payload.campaignGeneration !== undefined
    ) {
      await adjustCampaignOutcome(ctx, {
        campaignId: job.payload.campaignId,
        generation: job.payload.campaignGeneration,
        outcome: "failed",
        delta: -1,
      });
    }
    if (
      job.type === "newsletter_campaign_batch" &&
      job.payload.campaignId &&
      job.payload.campaignGeneration !== undefined
    ) {
      const campaign = await ctx.db.get("newsletterCampaigns", job.payload.campaignId);
      if (campaign?.status === "failed" && campaign.generation === job.payload.campaignGeneration) {
        await ctx.db.patch("newsletterCampaigns", campaign._id, {
          status: "queueing",
          completedAt: undefined,
          updatedBy: actor._id,
          updatedAt: now,
        });
        await recordStatusChanged(ctx, "newsletterCampaigns", "failed", "queueing");
      }
    }
    await ctx.db.patch("jobs", job._id, {
      status: "queued",
      attempts: 0,
      runAt: now,
      lockedAt: undefined,
      lastError: undefined,
      completedAt: undefined,
      campaignOutcome: undefined,
      updatedAt: now,
    });
    await recordStatusChanged(ctx, "jobs", job.status, "queued");
    await ctx.scheduler.runAfter(0, internal.jobs.processOne, { jobId: job._id });
    await writeAudit(ctx, actor, {
      action: "job.retried",
      entityType: "jobs",
      entityId: job._id,
      summary: `Retried ${job.type} job.`,
    });
    return { ok: true };
  },
});

export const getSiteSettings = query({
  args: {},
  returns: v.union(v.null(), siteSettingsDocumentValidator),
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    return await ctx.db
      .query("siteSettings")
      .withIndex("by_singleton_key", (q) => q.eq("singletonKey", "main"))
      .unique();
  },
});

export const updateSiteSettings = mutation({
  args: { settings: siteSettingsInputValidator },
  returns: v.id("siteSettings"),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ["admin"]);
    const now = Date.now();
    const settings = args.settings;
    const values = {
      schoolName: plainText(settings.schoolName, "School name", 2, 180),
      shortName: plainText(settings.shortName, "Short name", 1, 30),
      tagline: plainText(settings.tagline, "Tagline", 2, 240),
      description: plainText(settings.description, "Description", 10, 1500),
      logoId: settings.logoId,
      logoUrl: optionalMediaUrl(settings.logoUrl),
      faviconId: settings.faviconId,
      faviconUrl: optionalMediaUrl(settings.faviconUrl),
      contact: {
        address: plainText(settings.contact.address, "Address", 2, 300),
        city: plainText(settings.contact.city, "City", 1, 100),
        country: plainText(settings.contact.country, "Country", 1, 100),
        phone: optionalPhone(settings.contact.phone) ?? "",
        secondaryPhone: optionalPhone(settings.contact.secondaryPhone),
        email: settings.contact.email.trim() ? normalizedEmail(settings.contact.email) : "",
        mapUrl: optionalUrl(settings.contact.mapUrl),
        officeHours: settings.contact.officeHours
          ? plainText(settings.contact.officeHours, "Office hours", 1, 160)
          : undefined,
      },
      social: {
        facebook: optionalUrl(settings.social.facebook),
        instagram: optionalUrl(settings.social.instagram),
        youtube: optionalUrl(settings.social.youtube),
        linkedin: optionalUrl(settings.social.linkedin),
        x: optionalUrl(settings.social.x),
      },
      seo: cleanSeo(settings.seo),
      academicYear: plainText(settings.academicYear, "Academic year", 4, 30),
      timezone: plainText(settings.timezone, "Timezone", 1, 80),
      admissionsOpen: settings.admissionsOpen,
      assistantEnabled: settings.assistantEnabled,
      maintenanceMode: settings.maintenanceMode,
      updatedBy: actor._id,
      updatedAt: now,
    };
    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_singleton_key", (q) => q.eq("singletonKey", "main"))
      .unique();
    const id = existing
      ? (await ctx.db.patch("siteSettings", existing._id, values), existing._id)
      : await ctx.db.insert("siteSettings", { singletonKey: "main", ...values });
    await writeAudit(ctx, actor, {
      action: "settings.updated",
      entityType: "siteSettings",
      entityId: id,
      summary: "Updated public site settings.",
    });
    return id;
  },
});

export const listNavigation = query({
  args: {},
  returns: v.array(navigationDocumentValidator),
  handler: async (ctx) => {
    await requireRole(ctx, CONTENT_ROLES);
    const groups = await Promise.all(
      (["header", "footer", "utility"] as const).map((location) =>
        ctx.db
          .query("navigationItems")
          .withIndex("by_location_order", (q) => q.eq("location", location))
          .take(250),
      ),
    );
    return groups.flat();
  },
});

export const upsertNavigation = mutation({
  args: { id: v.optional(v.id("navigationItems")), item: navigationInputValidator },
  returns: v.id("navigationItems"),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, PUBLISH_ROLES);
    const existing = args.id ? await ctx.db.get("navigationItems", args.id) : null;
    if (args.id && !existing)
      throw new ConvexError({ code: "NOT_FOUND", message: "Navigation item not found." });
    if (args.item.parentId) {
      if (args.item.parentId === args.id) {
        throw new ConvexError({ code: "NAVIGATION_CYCLE", message: "An item cannot be its own parent." });
      }
      const parent = await ctx.db.get("navigationItems", args.item.parentId);
      if (!parent || parent.location !== args.item.location) {
        throw new ConvexError({ code: "INVALID_PARENT", message: "Parent must exist in the same menu." });
      }
      if (args.id) {
        let ancestor: typeof parent | null = parent;
        for (let depth = 0; ancestor?.parentId && depth < 20; depth += 1) {
          if (ancestor.parentId === args.id) {
            throw new ConvexError({
              code: "NAVIGATION_CYCLE",
              message: "Navigation items cannot form a cycle.",
            });
          }
          ancestor = await ctx.db.get("navigationItems", ancestor.parentId);
        }
        if (ancestor?.parentId) {
          throw new ConvexError({ code: "NAVIGATION_DEPTH", message: "Navigation nesting is too deep." });
        }
      }
    }
    const now = Date.now();
    const rawHref = args.item.href.trim();
    const internalHref = /^\/(?!\/)[^\s\\]*$/.test(rawHref);
    const href = internalHref ? rawHref : optionalUrl(rawHref);
    if (!href)
      throw new ConvexError({ code: "INVALID_LINK", message: "Navigation links need a route or HTTPS URL." });
    const values = {
      label: plainText(args.item.label, "Label", 1, 80),
      href,
      location: args.item.location,
      parentId: args.item.parentId,
      order: Math.max(0, Math.floor(args.item.order ?? 0)),
      external: args.item.external ?? !internalHref,
      visible: args.item.visible ?? true,
      description: args.item.description
        ? plainText(args.item.description, "Description", 1, 200)
        : undefined,
      requiredRole: args.item.requiredRole,
      updatedBy: actor._id,
      updatedAt: now,
    };
    const id = existing
      ? (await ctx.db.patch("navigationItems", existing._id, values), existing._id)
      : await ctx.db.insert("navigationItems", { ...values, createdBy: actor._id, createdAt: now });
    await writeAudit(ctx, actor, {
      action: existing ? "navigation.updated" : "navigation.created",
      entityType: "navigationItems",
      entityId: id,
      summary: `${existing ? "Updated" : "Created"} navigation item ${values.label}.`,
    });
    return id;
  },
});

export const removeNavigation = mutation({
  args: { id: v.id("navigationItems") },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, PUBLISH_ROLES);
    const existing = await ctx.db.get("navigationItems", args.id);
    if (!existing) return { ok: true };
    const child = await ctx.db
      .query("navigationItems")
      .withIndex("by_parent_order", (q) => q.eq("parentId", existing._id))
      .first();
    if (child) throw new ConvexError({ code: "HAS_CHILDREN", message: "Delete child menu items first." });
    await ctx.db.delete("navigationItems", existing._id);
    await writeAudit(ctx, actor, {
      action: "navigation.deleted",
      entityType: "navigationItems",
      entityId: existing._id,
      summary: `Deleted navigation item ${existing.label}.`,
    });
    return { ok: true };
  },
});
