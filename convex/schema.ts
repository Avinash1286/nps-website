import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const roleValidator = v.union(
  v.literal("admin"),
  v.literal("publisher"),
  v.literal("editor"),
  v.literal("admissions"),
);

export const userStatusValidator = v.union(v.literal("active"), v.literal("suspended"), v.literal("pending"));

export const contentStatusValidator = v.union(
  v.literal("draft"),
  v.literal("scheduled"),
  v.literal("published"),
  v.literal("archived"),
);

export const assistantContextStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

export const newsletterCampaignStatusValidator = v.union(
  v.literal("draft"),
  v.literal("scheduled"),
  v.literal("queueing"),
  v.literal("sending"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled"),
);

export const newsletterSubscriberStatusValidator = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("unsubscribed"),
  v.literal("bounced"),
);

export const seoValidator = v.object({
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  noIndex: v.optional(v.boolean()),
});

export const facilityIconKeyValidator = v.union(
  v.literal("classroom"),
  v.literal("science"),
  v.literal("computer"),
  v.literal("library"),
  v.literal("sports"),
  v.literal("indoor-sports"),
  v.literal("hostel"),
  v.literal("dining"),
  v.literal("medical"),
  v.literal("transport"),
  v.literal("auditorium"),
  v.literal("grounds"),
);

export const facilityVerificationStatusValidator = v.union(
  v.literal("confirmed"),
  v.literal("school_confirmation_required"),
);

const publicationFields = {
  status: contentStatusValidator,
  publishAt: v.optional(v.number()),
  expireAt: v.optional(v.number()),
  publishedAt: v.optional(v.number()),
  createdBy: v.id("users"),
  updatedBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
};

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

const workflowStatusValidator = v.union(
  v.literal("new"),
  v.literal("in_review"),
  v.literal("waiting"),
  v.literal("resolved"),
  v.literal("closed"),
  v.literal("spam"),
);

export default defineSchema({
  publicationClock: defineTable({
    singletonKey: v.literal("main"),
    currentTime: v.number(),
    updatedAt: v.number(),
  }).index("by_singleton_key", ["singletonKey"]),

  users: defineTable({
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
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  siteSettings: defineTable({
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
    seo: seoValidator,
    academicYear: v.string(),
    timezone: v.string(),
    admissionsOpen: v.boolean(),
    assistantEnabled: v.boolean(),
    maintenanceMode: v.boolean(),
    updatedBy: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_singleton_key", ["singletonKey"])
    .index("by_logo_id", ["logoId"])
    .index("by_logo_url", ["logoUrl"])
    .index("by_favicon_id", ["faviconId"])
    .index("by_favicon_url", ["faviconUrl"]),

  assistantContexts: defineTable({
    title: v.string(),
    category: v.string(),
    content: v.string(),
    keywords: v.array(v.string()),
    publicPath: v.optional(v.string()),
    priority: v.number(),
    status: assistantContextStatusValidator,
    publishedAt: v.optional(v.number()),
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_updated_at", ["updatedAt"])
    .index("by_status_and_priority_and_updated_at", ["status", "priority", "updatedAt"]),

  /**
   * Editable copy for each home-page section, keyed by `slug` (one row per
   * section). Keeps the marketing wording in the CMS instead of the component.
   */
  homeSections: defineTable({
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
    ...publicationFields,
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_image_id", ["imageId"])
    .index("by_image_url", ["imageUrl"])
    .index("by_secondary_image_id", ["secondaryImageId"])
    .index("by_secondary_image_url", ["secondaryImageUrl"])
    .index("by_status_publish_at", ["status", "publishAt"])
    .index("by_status_expire_at", ["status", "expireAt"]),

  /**
   * Ordered cards inside a home-page section: hero carousel slides, the about
   * value pillars, and the ECA activity cards.
   */
  homeHighlights: defineTable({
    section: v.union(v.literal("hero"), v.literal("about"), v.literal("eca")),
    title: v.string(),
    summary: v.optional(v.string()),
    icon: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
    imageAlt: v.optional(v.string()),
    href: v.optional(v.string()),
    order: v.number(),
    ...publicationFields,
  })
    .index("by_status", ["status"])
    .index("by_status_order", ["status", "order"])
    .index("by_section_status_order", ["section", "status", "order"])
    .index("by_image_id", ["imageId"])
    .index("by_image_url", ["imageUrl"])
    .index("by_status_publish_at", ["status", "publishAt"])
    .index("by_status_expire_at", ["status", "expireAt"]),

  navigationItems: defineTable({
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
  })
    .index("by_location_order", ["location", "order"])
    .index("by_parent_order", ["parentId", "order"]),

  pages: defineTable({
    slug: v.string(),
    title: v.string(),
    summary: v.optional(v.string()),
    body: v.string(),
    template: v.optional(v.string()),
    heroImageId: v.optional(v.id("_storage")),
    heroImageUrl: v.optional(v.string()),
    featured: v.boolean(),
    order: v.number(),
    seo: seoValidator,
    ...publicationFields,
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_hero_image_id", ["heroImageId"])
    .index("by_hero_image_url", ["heroImageUrl"])
    .index("by_status_order", ["status", "order"])
    .index("by_status_featured_order", ["status", "featured", "order"])
    .index("by_status_publish_at", ["status", "publishAt"])
    .index("by_status_expire_at", ["status", "expireAt"])
    .searchIndex("search_title", { searchField: "title", filterFields: ["status"] })
    .searchIndex("search_body", { searchField: "body", filterFields: ["status"] }),

  facilities: defineTable({
    slug: v.string(),
    name: v.string(),
    summary: v.string(),
    details: v.optional(v.string()),
    iconKey: facilityIconKeyValidator,
    verificationStatus: facilityVerificationStatusValidator,
    sourceLabel: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
    imageAlt: v.optional(v.string()),
    featured: v.boolean(),
    order: v.number(),
    seo: seoValidator,
    ...publicationFields,
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_status_order", ["status", "order"])
    .index("by_status_and_verification_status_and_order", ["status", "verificationStatus", "order"])
    .index("by_image_id", ["imageId"])
    .index("by_image_url", ["imageUrl"])
    .index("by_status_publish_at", ["status", "publishAt"])
    .index("by_status_expire_at", ["status", "expireAt"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["status"] })
    .searchIndex("search_summary", { searchField: "summary", filterFields: ["status"] }),

  programs: defineTable({
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
    seo: seoValidator,
    ...publicationFields,
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_hero_image_id", ["heroImageId"])
    .index("by_hero_image_url", ["heroImageUrl"])
    .index("by_status_order", ["status", "order"])
    .index("by_status_featured_order", ["status", "featured", "order"])
    .index("by_status_publish_at", ["status", "publishAt"])
    .index("by_status_expire_at", ["status", "expireAt"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["status"] })
    .searchIndex("search_description", { searchField: "description", filterFields: ["status"] }),

  departments: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    responsibilities: v.array(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    headTeacherId: v.optional(v.id("teachers")),
    featured: v.boolean(),
    order: v.number(),
    seo: seoValidator,
    ...publicationFields,
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_head_teacher_id", ["headTeacherId"])
    .index("by_status_order", ["status", "order"])
    .index("by_status_featured_order", ["status", "featured", "order"])
    .index("by_status_publish_at", ["status", "publishAt"])
    .index("by_status_expire_at", ["status", "expireAt"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["status"] })
    .searchIndex("search_description", { searchField: "description", filterFields: ["status"] }),

  leadership: defineTable({
    slug: v.optional(v.string()),
    name: v.string(),
    role: v.string(),
    bio: v.string(),
    quote: v.optional(v.string()),
    photoId: v.optional(v.id("_storage")),
    photoUrl: v.optional(v.string()),
    email: v.optional(v.string()),
    order: v.number(),
    ...publicationFields,
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_photo_id", ["photoId"])
    .index("by_photo_url", ["photoUrl"])
    .index("by_status_order", ["status", "order"])
    .index("by_status_publish_at", ["status", "publishAt"])
    .index("by_status_expire_at", ["status", "expireAt"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["status"] })
    .searchIndex("search_role", { searchField: "role", filterFields: ["status"] })
    .searchIndex("search_bio", { searchField: "bio", filterFields: ["status"] }),

  teachers: defineTable({
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
    seo: seoValidator,
    ...publicationFields,
  })
    .index("by_slug", ["slug"])
    .index("by_department_status", ["departmentId", "status"])
    .index("by_status", ["status"])
    .index("by_photo_id", ["photoId"])
    .index("by_photo_url", ["photoUrl"])
    .index("by_status_order", ["status", "order"])
    .index("by_status_publish_at", ["status", "publishAt"])
    .index("by_status_expire_at", ["status", "expireAt"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["status"] })
    .searchIndex("search_title", { searchField: "title", filterFields: ["status"] })
    .searchIndex("search_bio", { searchField: "bio", filterFields: ["status"] }),

  news: defineTable({
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
    seo: seoValidator,
    ...publicationFields,
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_featured_image_id", ["featuredImageId"])
    .index("by_featured_image_url", ["featuredImageUrl"])
    .index("by_status_featured", ["status", "featured"])
    .index("by_status_publish_at", ["status", "publishAt"])
    .index("by_status_expire_at", ["status", "expireAt"])
    .searchIndex("search_title", { searchField: "title", filterFields: ["status"] })
    .searchIndex("search_body", { searchField: "body", filterFields: ["status"] }),

  notices: defineTable({
    slug: v.string(),
    title: v.string(),
    summary: v.optional(v.string()),
    body: v.string(),
    priority: v.union(v.literal("normal"), v.literal("important"), v.literal("urgent")),
    audiences: v.array(v.string()),
    attachmentId: v.optional(v.id("_storage")),
    attachmentUrl: v.optional(v.string()),
    startAt: v.optional(v.number()),
    seo: seoValidator,
    ...publicationFields,
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_attachment_id", ["attachmentId"])
    .index("by_attachment_url", ["attachmentUrl"])
    .index("by_status_publish_at", ["status", "publishAt"])
    .index("by_status_expire_at", ["status", "expireAt"])
    .searchIndex("search_title", { searchField: "title", filterFields: ["status"] })
    .searchIndex("search_body", { searchField: "body", filterFields: ["status"] }),

  events: defineTable({
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
    registeredAttendeeCount: v.optional(v.number()),
    registrationEnabled: v.boolean(),
    featuredImageId: v.optional(v.id("_storage")),
    featuredImageUrl: v.optional(v.string()),
    featured: v.boolean(),
    seo: seoValidator,
    ...publicationFields,
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_featured_image_id", ["featuredImageId"])
    .index("by_featured_image_url", ["featuredImageUrl"])
    .index("by_status_start_at", ["status", "startAt"])
    .index("by_status_end_at", ["status", "endAt"])
    .index("by_status_publish_at", ["status", "publishAt"])
    .index("by_status_expire_at", ["status", "expireAt"])
    .searchIndex("search_title", { searchField: "title", filterFields: ["status"] })
    .searchIndex("search_description", { searchField: "description", filterFields: ["status"] }),

  documents: defineTable({
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
    seo: seoValidator,
    ...publicationFields,
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_storage_id", ["storageId"])
    .index("by_external_url", ["externalUrl"])
    .index("by_status_order", ["status", "order"])
    .index("by_status_publish_at", ["status", "publishAt"])
    .index("by_status_expire_at", ["status", "expireAt"])
    .searchIndex("search_title", { searchField: "title", filterFields: ["status"] }),

  galleryAlbums: defineTable({
    slug: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    coverImageId: v.optional(v.id("_storage")),
    coverImageUrl: v.optional(v.string()),
    eventDate: v.optional(v.number()),
    featured: v.boolean(),
    order: v.number(),
    seo: seoValidator,
    ...publicationFields,
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_cover_image_id", ["coverImageId"])
    .index("by_cover_image_url", ["coverImageUrl"])
    .index("by_status_order", ["status", "order"])
    .index("by_status_publish_at", ["status", "publishAt"])
    .index("by_status_expire_at", ["status", "expireAt"]),

  galleryItems: defineTable({
    albumId: v.id("galleryAlbums"),
    storageId: v.optional(v.id("_storage")),
    url: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    mediaType: v.union(v.literal("image"), v.literal("video")),
    alt: v.string(),
    caption: v.optional(v.string()),
    credit: v.optional(v.string()),
    order: v.number(),
    visible: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_album_order", ["albumId", "order"])
    .index("by_storage_id", ["storageId"])
    .index("by_url", ["url"])
    .index("by_thumbnail_url", ["thumbnailUrl"]),

  testimonials: defineTable({
    name: v.string(),
    role: v.optional(v.string()),
    organization: v.optional(v.string()),
    quote: v.string(),
    photoId: v.optional(v.id("_storage")),
    photoUrl: v.optional(v.string()),
    order: v.number(),
    ...publicationFields,
  })
    .index("by_status", ["status"])
    .index("by_photo_id", ["photoId"])
    .index("by_photo_url", ["photoUrl"])
    .index("by_status_order", ["status", "order"])
    .index("by_status_publish_at", ["status", "publishAt"])
    .index("by_status_expire_at", ["status", "expireAt"]),

  faqs: defineTable({
    question: v.string(),
    answer: v.string(),
    category: v.optional(v.string()),
    order: v.number(),
    ...publicationFields,
  })
    .index("by_status", ["status"])
    .index("by_status_order", ["status", "order"])
    .index("by_status_category_order", ["status", "category", "order"])
    .index("by_status_publish_at", ["status", "publishAt"])
    .index("by_status_expire_at", ["status", "expireAt"])
    .searchIndex("search_question", { searchField: "question", filterFields: ["status"] })
    .searchIndex("search_answer", { searchField: "answer", filterFields: ["status"] }),

  contacts: defineTable({
    idempotencyKey: v.string(),
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
    ipHash: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_idempotency_key", ["idempotencyKey"])
    .index("by_ticket_number", ["ticketNumber"])
    .index("by_status_created_at", ["status", "createdAt"])
    .index("by_status_updated_at", ["status", "updatedAt"])
    .index("by_email_created_at", ["email", "createdAt"]),

  admissions: defineTable({
    idempotencyKey: v.string(),
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
    status: v.union(
      v.literal("submitted"),
      v.literal("screening"),
      v.literal("documents_requested"),
      v.literal("interview"),
      v.literal("offered"),
      v.literal("waitlisted"),
      v.literal("enrolled"),
      v.literal("declined"),
      v.literal("withdrawn"),
    ),
    assignedTo: v.optional(v.id("users")),
    internalNotes: v.optional(v.string()),
    submittedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_idempotency_key", ["idempotencyKey"])
    .index("by_application_number", ["applicationNumber"])
    .index("by_status_submitted_at", ["status", "submittedAt"])
    .index("by_status_updated_at", ["status", "updatedAt"])
    .index("by_guardian_email", ["guardian.email"]),

  newsletterSubscribers: defineTable({
    lastIdempotencyKey: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    status: newsletterSubscriberStatusValidator,
    source: v.optional(v.string()),
    consentAt: v.number(),
    confirmedAt: v.optional(v.number()),
    confirmationExpiresAt: v.optional(v.number()),
    unsubscribedAt: v.optional(v.number()),
    confirmationToken: v.optional(v.string()),
    unsubscribeToken: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_idempotency_key", ["lastIdempotencyKey"])
    .index("by_confirmation_token", ["confirmationToken"])
    .index("by_unsubscribe_token", ["unsubscribeToken"])
    .index("by_status", ["status"])
    .index("by_status_updated_at", ["status", "updatedAt"])
    .index("by_status_created_at", ["status", "createdAt"])
    .index("by_status_confirmed_at", ["status", "confirmedAt"])
    .index("by_status_confirmation_expires_at", ["status", "confirmationExpiresAt"]),

  newsletterCampaigns: defineTable({
    title: v.string(),
    subject: v.string(),
    preheader: v.optional(v.string()),
    body: v.string(),
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
  })
    .index("by_status_updated_at", ["status", "updatedAt"])
    .index("by_updated_at", ["updatedAt"])
    .index("by_scheduled_at", ["scheduledAt"]),

  eventRegistrations: defineTable({
    idempotencyKey: v.string(),
    eventId: v.id("events"),
    registrationNumber: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    attendees: v.number(),
    notes: v.optional(v.string()),
    consent: v.boolean(),
    status: v.union(
      v.literal("registered"),
      v.literal("waitlisted"),
      v.literal("cancelled"),
      v.literal("attended"),
      v.literal("no_show"),
    ),
    cancellationToken: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_idempotency_key", ["idempotencyKey"])
    .index("by_registration_number", ["registrationNumber"])
    .index("by_status_created_at", ["status", "createdAt"])
    .index("by_event_status", ["eventId", "status"])
    .index("by_event_created_at", ["eventId", "createdAt"])
    .index("by_event_email", ["eventId", "email"])
    .index("by_event_email_status", ["eventId", "email", "status"])
    .index("by_cancellation_token", ["cancellationToken"]),

  mediaAssets: defineTable({
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    alt: v.optional(v.string()),
    folder: v.optional(v.string()),
    url: v.optional(v.string()),
    status: v.union(v.literal("ready"), v.literal("deleted")),
    uploadedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_storage_id", ["storageId"])
    .index("by_status_created_at", ["status", "createdAt"])
    .index("by_folder_created_at", ["folder", "createdAt"])
    .index("by_folder_and_status_and_created_at", ["folder", "status", "createdAt"]),

  auditLogs: defineTable({
    actorId: v.optional(v.id("users")),
    actorClerkId: v.optional(v.string()),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    summary: v.string(),
    metadata: v.optional(v.record(v.string(), v.string())),
    createdAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_actor_created_at", ["actorId", "createdAt"])
    .index("by_actor_id_and_entity_type_and_created_at", ["actorId", "entityType", "createdAt"])
    .index("by_entity_created_at", ["entityType", "createdAt"]),

  jobs: defineTable({
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
    campaignOutcome: v.optional(
      v.union(v.literal("delivered"), v.literal("failed"), v.literal("suppressed")),
    ),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_idempotency_key", ["idempotencyKey"])
    .index("by_status_run_at", ["status", "runAt"])
    .index("by_status_locked_at", ["status", "lockedAt"])
    .index("by_status_updated_at", ["status", "updatedAt"])
    .index("by_type_status", ["type", "status"]),

  aiConversations: defineTable({
    ownerKey: v.string(),
    userId: v.optional(v.id("users")),
    agentThreadId: v.optional(v.string()),
    title: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("closed")),
    lastMessageAt: v.number(),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner_updated_at", ["ownerKey", "updatedAt"])
    .index("by_status_updated_at", ["status", "updatedAt"])
    .index("by_expires_at", ["expiresAt"]),

  aiMessages: defineTable({
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
  })
    .index("by_conversation_created_at", ["conversationId", "createdAt"])
    .index("by_status_created_at", ["status", "createdAt"]),

  rateLimits: defineTable({
    key: v.string(),
    scope: v.string(),
    windowStartedAt: v.number(),
    count: v.number(),
    blockedUntil: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_key_scope", ["key", "scope"])
    .index("by_updated_at", ["updatedAt"]),

  counters: defineTable({
    key: v.string(),
    value: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
