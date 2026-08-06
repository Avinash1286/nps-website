import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import {
  contentStatusValidator,
  newsletterCampaignStatusValidator,
  newsletterSubscriberStatusValidator,
  roleValidator,
  seoValidator,
  userStatusValidator,
} from "../schema";

export {
  contentStatusValidator,
  newsletterCampaignStatusValidator,
  newsletterSubscriberStatusValidator,
  paginationOptsValidator,
  roleValidator,
  userStatusValidator,
};

export function boundedPaginationOpts<T extends { numItems: number; cursor: string | null }>(options: T): T {
  if (!Number.isSafeInteger(options.numItems) || options.numItems < 1 || options.numItems > 100) {
    throw new ConvexError({
      code: "INVALID_PAGINATION",
      message: "Page size must be an integer between 1 and 100.",
    });
  }
  return options;
}

export const optionalPublicationInput = {
  status: v.optional(contentStatusValidator),
  publishAt: v.optional(v.number()),
  expireAt: v.optional(v.number()),
};

export const optionalDisplayInput = {
  featured: v.optional(v.boolean()),
  order: v.optional(v.number()),
  seo: v.optional(seoValidator),
};

export const pageInputValidator = v.object({
  slug: v.string(),
  title: v.string(),
  summary: v.optional(v.string()),
  body: v.string(),
  template: v.optional(v.string()),
  heroImageId: v.optional(v.id("_storage")),
  heroImageUrl: v.optional(v.string()),
  ...optionalDisplayInput,
  ...optionalPublicationInput,
});

export const programInputValidator = v.object({
  slug: v.string(),
  name: v.string(),
  shortDescription: v.string(),
  description: v.string(),
  gradeRange: v.optional(v.string()),
  curriculum: v.optional(v.string()),
  outcomes: v.array(v.string()),
  heroImageId: v.optional(v.id("_storage")),
  heroImageUrl: v.optional(v.string()),
  ...optionalDisplayInput,
  ...optionalPublicationInput,
});

export const departmentInputValidator = v.object({
  slug: v.string(),
  name: v.string(),
  description: v.string(),
  responsibilities: v.array(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  headTeacherId: v.optional(v.id("teachers")),
  ...optionalDisplayInput,
  ...optionalPublicationInput,
});

export const leadershipInputValidator = v.object({
  slug: v.optional(v.string()),
  name: v.string(),
  role: v.string(),
  bio: v.string(),
  quote: v.optional(v.string()),
  photoId: v.optional(v.id("_storage")),
  photoUrl: v.optional(v.string()),
  email: v.optional(v.string()),
  order: v.optional(v.number()),
  ...optionalPublicationInput,
});

export const teacherInputValidator = v.object({
  slug: v.string(),
  name: v.string(),
  title: v.string(),
  departmentId: v.optional(v.id("departments")),
  bio: v.string(),
  qualifications: v.array(v.string()),
  subjects: v.array(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  showContact: v.optional(v.boolean()),
  photoId: v.optional(v.id("_storage")),
  photoUrl: v.optional(v.string()),
  order: v.optional(v.number()),
  seo: v.optional(seoValidator),
  ...optionalPublicationInput,
});

export const newsInputValidator = v.object({
  slug: v.string(),
  title: v.string(),
  excerpt: v.string(),
  body: v.string(),
  category: v.string(),
  tags: v.array(v.string()),
  authorName: v.optional(v.string()),
  featuredImageId: v.optional(v.id("_storage")),
  featuredImageUrl: v.optional(v.string()),
  featured: v.optional(v.boolean()),
  seo: v.optional(seoValidator),
  ...optionalPublicationInput,
});

export const noticeInputValidator = v.object({
  slug: v.string(),
  title: v.string(),
  summary: v.optional(v.string()),
  body: v.string(),
  priority: v.union(v.literal("normal"), v.literal("important"), v.literal("urgent")),
  audiences: v.array(v.string()),
  attachmentId: v.optional(v.id("_storage")),
  attachmentUrl: v.optional(v.string()),
  startAt: v.optional(v.number()),
  seo: v.optional(seoValidator),
  ...optionalPublicationInput,
});

export const eventInputValidator = v.object({
  slug: v.string(),
  title: v.string(),
  summary: v.optional(v.string()),
  description: v.string(),
  startAt: v.number(),
  endAt: v.number(),
  timezone: v.string(),
  venue: v.optional(v.string()),
  isOnline: v.boolean(),
  meetingUrl: v.optional(v.string()),
  capacity: v.optional(v.number()),
  registrationEnabled: v.boolean(),
  featuredImageId: v.optional(v.id("_storage")),
  featuredImageUrl: v.optional(v.string()),
  featured: v.optional(v.boolean()),
  seo: v.optional(seoValidator),
  ...optionalPublicationInput,
});

export const documentInputValidator = v.object({
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
  ...optionalDisplayInput,
  ...optionalPublicationInput,
});

export const galleryAlbumInputValidator = v.object({
  slug: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  coverImageId: v.optional(v.id("_storage")),
  coverImageUrl: v.optional(v.string()),
  eventDate: v.optional(v.number()),
  ...optionalDisplayInput,
  ...optionalPublicationInput,
});

export const testimonialInputValidator = v.object({
  name: v.string(),
  role: v.optional(v.string()),
  organization: v.optional(v.string()),
  quote: v.string(),
  photoId: v.optional(v.id("_storage")),
  photoUrl: v.optional(v.string()),
  order: v.optional(v.number()),
  ...optionalPublicationInput,
});

export const faqInputValidator = v.object({
  question: v.string(),
  answer: v.string(),
  category: v.optional(v.string()),
  order: v.optional(v.number()),
  ...optionalPublicationInput,
});

export const contentTypeValidator = v.union(
  v.literal("pages"),
  v.literal("programs"),
  v.literal("departments"),
  v.literal("leadership"),
  v.literal("teachers"),
  v.literal("news"),
  v.literal("notices"),
  v.literal("events"),
  v.literal("documents"),
  v.literal("galleryAlbums"),
  v.literal("testimonials"),
  v.literal("faqs"),
);

export const contentInputValidator = v.union(
  pageInputValidator,
  programInputValidator,
  departmentInputValidator,
  leadershipInputValidator,
  teacherInputValidator,
  newsInputValidator,
  noticeInputValidator,
  eventInputValidator,
  documentInputValidator,
  galleryAlbumInputValidator,
  testimonialInputValidator,
  faqInputValidator,
);

const optionalContentId = { id: v.optional(v.string()) };

export const contentUpsertArgsValidator = v.union(
  v.object({ type: v.literal("pages"), ...optionalContentId, data: pageInputValidator }),
  v.object({ type: v.literal("programs"), ...optionalContentId, data: programInputValidator }),
  v.object({ type: v.literal("departments"), ...optionalContentId, data: departmentInputValidator }),
  v.object({ type: v.literal("leadership"), ...optionalContentId, data: leadershipInputValidator }),
  v.object({ type: v.literal("teachers"), ...optionalContentId, data: teacherInputValidator }),
  v.object({ type: v.literal("news"), ...optionalContentId, data: newsInputValidator }),
  v.object({ type: v.literal("notices"), ...optionalContentId, data: noticeInputValidator }),
  v.object({ type: v.literal("events"), ...optionalContentId, data: eventInputValidator }),
  v.object({ type: v.literal("documents"), ...optionalContentId, data: documentInputValidator }),
  v.object({ type: v.literal("galleryAlbums"), ...optionalContentId, data: galleryAlbumInputValidator }),
  v.object({ type: v.literal("testimonials"), ...optionalContentId, data: testimonialInputValidator }),
  v.object({ type: v.literal("faqs"), ...optionalContentId, data: faqInputValidator }),
);

export const siteSettingsInputValidator = v.object({
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
  seo: seoValidator,
  academicYear: v.string(),
  timezone: v.string(),
  admissionsOpen: v.boolean(),
  assistantEnabled: v.boolean(),
  maintenanceMode: v.boolean(),
});

export const navigationInputValidator = v.object({
  label: v.string(),
  href: v.string(),
  location: v.union(v.literal("header"), v.literal("footer"), v.literal("utility")),
  parentId: v.optional(v.id("navigationItems")),
  order: v.optional(v.number()),
  external: v.optional(v.boolean()),
  visible: v.optional(v.boolean()),
  description: v.optional(v.string()),
  requiredRole: v.optional(roleValidator),
});

export const workflowStatusValidator = v.union(
  v.literal("new"),
  v.literal("in_review"),
  v.literal("waiting"),
  v.literal("resolved"),
  v.literal("closed"),
  v.literal("spam"),
);

export const admissionStatusValidator = v.union(
  v.literal("submitted"),
  v.literal("screening"),
  v.literal("documents_requested"),
  v.literal("interview"),
  v.literal("offered"),
  v.literal("waitlisted"),
  v.literal("enrolled"),
  v.literal("declined"),
  v.literal("withdrawn"),
);

export const registrationStatusValidator = v.union(
  v.literal("registered"),
  v.literal("waitlisted"),
  v.literal("cancelled"),
  v.literal("attended"),
  v.literal("no_show"),
);

export const submissionTypeValidator = v.union(
  v.literal("contacts"),
  v.literal("admissions"),
  v.literal("eventRegistrations"),
);

export const publicRequestFields = {
  fingerprint: v.string(),
  honeypot: v.optional(v.string()),
  idempotencyKey: v.string(),
};

export const studentValidator = v.object({
  firstName: v.string(),
  middleName: v.optional(v.string()),
  lastName: v.string(),
  dateOfBirth: v.union(v.number(), v.string()),
  gender: v.optional(v.string()),
  citizenship: v.optional(v.string()),
});

export const guardianValidator = v.object({
  name: v.string(),
  relationship: v.string(),
  email: v.string(),
  phone: v.string(),
  address: v.string(),
});

export const assistantHistoryValidator = v.array(
  v.object({
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  }),
);
