import { makeFunctionReference } from "convex/server";

export type PublicationStatus = "draft" | "scheduled" | "published" | "archived";
export type AdminRecord = {
  _id: string;
  _creationTime?: number;
  status?: string;
  title?: string;
  name?: string;
  slug?: string;
  [key: string]: unknown;
};

export type PageResult<T> = {
  page: T[];
  isDone: boolean;
  continueCursor: string;
  splitCursor?: string | null;
  pageStatus?: "SplitRecommended" | "SplitRequired" | null;
};

export type DashboardResult = {
  content?: Record<string, { total: number; published: number; draft: number; scheduled: number }>;
  workflows?: {
    contacts?: { total: number; open: number };
    admissions?: { total: number; active: number };
    eventRegistrations?: { total: number; registered: number };
    newsletter?: { total: number; active: number };
  };
  jobs?: { total: number; queued: number; failed: number };
  recent?: { contacts?: AdminRecord[]; admissions?: AdminRecord[]; audit?: AdminRecord[] };
  countsCappedAt?: number;
  [key: string]: unknown;
};

export type NewsletterMetrics = {
  subscribers: {
    total: number;
    pending: number;
    active: number;
    unsubscribed: number;
    bounced: number;
  };
  campaigns: {
    total: number;
    draft: number;
    scheduled: number;
    queueing: number;
    sending: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
};

export type ContentType =
  | "pages"
  | "facilities"
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

export type SubmissionType = "contacts" | "admissions" | "eventRegistrations";

export type AssistantContextStatus = "draft" | "published" | "archived";

export type AssistantContextInput = {
  title: string;
  category: string;
  content: string;
  keywords: string[];
  publicPath?: string;
  priority: number;
  status: AssistantContextStatus;
};

export type AssistantContext = AssistantContextInput & {
  _id: string;
  _creationTime: number;
  publishedAt?: number;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
};

export type AssistantConfiguration = {
  assistantEnabled: boolean;
  geminiConfigured: boolean;
  serviceSigningConfigured: boolean;
  agentMounted: boolean;
  provider: "gemini";
  model: string;
  publishedContextCount: number;
  contextLimit: number;
};

type PaginationOpts = { numItems: number; cursor: string | null };

export const adminApi = {
  dashboard: makeFunctionReference<"query", Record<string, never>, DashboardResult>("admin:dashboard"),
  listContent: makeFunctionReference<
    "query",
    { type: ContentType; paginationOpts: PaginationOpts; status?: PublicationStatus },
    PageResult<AdminRecord>
  >("admin:listContent"),
  upsertContent: makeFunctionReference<
    "mutation",
    { payload: { type: ContentType; id?: string; data: Record<string, unknown> } },
    string
  >("admin:upsertContent"),
  removeContent: makeFunctionReference<"mutation", { type: ContentType; id: string }, { ok: boolean }>(
    "admin:removeContent",
  ),
  changeContentStatus: makeFunctionReference<
    "mutation",
    { type: ContentType; id: string; status: PublicationStatus; publishAt?: number; expireAt?: number },
    { ok: boolean }
  >("admin:changeContentStatus"),
  listSubmissions: makeFunctionReference<
    "query",
    { type: SubmissionType; paginationOpts: PaginationOpts; status?: string; eventId?: string },
    PageResult<AdminRecord>
  >("admin:listSubmissions"),
  getSubmission: makeFunctionReference<"query", { type: SubmissionType; id: string }, AdminRecord | null>(
    "admin:getSubmission",
  ),
  updateSubmission: makeFunctionReference<
    "mutation",
    { type: SubmissionType; id: string; status: string; assignedTo?: string; internalNotes?: string },
    { ok: boolean }
  >("admin:updateSubmission"),
  listSubscribers: makeFunctionReference<
    "query",
    { paginationOpts: PaginationOpts; status?: string },
    PageResult<AdminRecord>
  >("admin:listSubscribers"),
  updateSubscriber: makeFunctionReference<
    "mutation",
    { subscriberId: string; status: "unsubscribed" | "bounced" },
    { ok: boolean }
  >("admin:updateSubscriber"),
  getNewsletterMetrics: makeFunctionReference<"query", Record<string, never>, NewsletterMetrics>(
    "admin:getNewsletterMetrics",
  ),
  listNewsletterCampaigns: makeFunctionReference<
    "query",
    {
      paginationOpts: PaginationOpts;
      status?: "draft" | "scheduled" | "queueing" | "sending" | "completed" | "failed" | "cancelled";
    },
    PageResult<AdminRecord>
  >("admin:listNewsletterCampaigns"),
  getNewsletterCampaign: makeFunctionReference<"query", { campaignId: string }, AdminRecord | null>(
    "admin:getNewsletterCampaign",
  ),
  upsertNewsletterCampaign: makeFunctionReference<
    "mutation",
    {
      campaignId?: string;
      campaign: { title: string; subject: string; preheader?: string; body: string };
    },
    string
  >("admin:upsertNewsletterCampaign"),
  scheduleNewsletterCampaign: makeFunctionReference<
    "mutation",
    { campaignId: string; scheduledAt?: number },
    { ok: boolean; scheduledAt: number }
  >("admin:scheduleNewsletterCampaign"),
  cancelNewsletterCampaign: makeFunctionReference<"mutation", { campaignId: string }, { ok: boolean }>(
    "admin:cancelNewsletterCampaign",
  ),
  listAiConversations: makeFunctionReference<
    "query",
    { paginationOpts: PaginationOpts; status?: "active" | "closed" },
    PageResult<AdminRecord>
  >("admin:listAiConversations"),
  getAiConversation: makeFunctionReference<
    "query",
    { conversationId: string },
    { conversation: AdminRecord; messages: AdminRecord[] } | null
  >("admin:getAiConversation"),
  closeAiConversation: makeFunctionReference<"mutation", { conversationId: string }, { ok: boolean }>(
    "admin:closeAiConversation",
  ),
  listUsers: makeFunctionReference<
    "query",
    { paginationOpts: PaginationOpts; status?: string },
    PageResult<AdminRecord>
  >("admin:listUsers"),
  listActiveAssignees: makeFunctionReference<"query", Record<string, never>, AdminRecord[]>(
    "admin:listActiveAssignees",
  ),
  updateUser: makeFunctionReference<
    "mutation",
    { userId: string; roles?: string[]; status?: string },
    { ok: boolean }
  >("admin:updateUser"),
  listAuditActors: makeFunctionReference<
    "query",
    Record<string, never>,
    Array<{ _id: string; name: string; email: string }>
  >("admin:listAuditActors"),
  listAuditLogs: makeFunctionReference<
    "query",
    { paginationOpts: PaginationOpts; entityType?: string; actorId?: string },
    PageResult<AdminRecord>
  >("admin:listAuditLogs"),
  listJobs: makeFunctionReference<
    "query",
    { paginationOpts: PaginationOpts; status?: string; type?: string },
    PageResult<AdminRecord>
  >("admin:listJobs"),
  retryJob: makeFunctionReference<"mutation", { jobId: string }, { ok: boolean }>("admin:retryJob"),
  getSiteSettings: makeFunctionReference<"query", Record<string, never>, Record<string, unknown> | null>(
    "admin:getSiteSettings",
  ),
  updateSiteSettings: makeFunctionReference<"mutation", { settings: Record<string, unknown> }, string>(
    "admin:updateSiteSettings",
  ),
  listNavigation: makeFunctionReference<"query", Record<string, never>, AdminRecord[]>(
    "admin:listNavigation",
  ),
  upsertNavigation: makeFunctionReference<"mutation", { id?: string; item: Record<string, unknown> }, string>(
    "admin:upsertNavigation",
  ),
  removeNavigation: makeFunctionReference<"mutation", { id: string }, { ok: boolean }>(
    "admin:removeNavigation",
  ),
};

export const assistantAdminApi = {
  getConfiguration: makeFunctionReference<"query", Record<string, never>, AssistantConfiguration>(
    "assistantAdmin:getConfiguration",
  ),
  setEnabled: makeFunctionReference<
    "mutation",
    { enabled: boolean },
    { ok: true; enabled: boolean } | { ok: false; message: string }
  >("assistantAdmin:setEnabled"),
  listContexts: makeFunctionReference<"query", { status?: AssistantContextStatus }, AssistantContext[]>(
    "assistantAdmin:listContexts",
  ),
  upsertContext: makeFunctionReference<"mutation", { id?: string; context: AssistantContextInput }, string>(
    "assistantAdmin:upsertContext",
  ),
  removeContext: makeFunctionReference<"mutation", { id: string }, { ok: boolean }>(
    "assistantAdmin:removeContext",
  ),
};

export const mediaApi = {
  generateUploadUrl: makeFunctionReference<"mutation", Record<string, never>, string>(
    "media:generateUploadUrl",
  ),
  finalizeUpload: makeFunctionReference<
    "mutation",
    { storageId: string; fileName: string; mimeType: string; size: number; alt?: string; folder?: string },
    string
  >("media:finalizeUpload"),
  deleteMedia: makeFunctionReference<"mutation", { mediaId: string }, { ok: boolean }>("media:deleteMedia"),
  listMedia: makeFunctionReference<
    "query",
    { paginationOpts: PaginationOpts; folder?: string },
    PageResult<AdminRecord>
  >("media:listMedia"),
  getMediaByStorageId: makeFunctionReference<"query", { storageId: string }, AdminRecord | null>(
    "media:getMediaByStorageId",
  ),
  listGalleryItemsAdmin: makeFunctionReference<
    "query",
    { albumId: string; paginationOpts: PaginationOpts },
    PageResult<AdminRecord>
  >("media:listGalleryItemsAdmin"),
  upsertGalleryItem: makeFunctionReference<
    "mutation",
    {
      id?: string;
      item: {
        albumId: string;
        storageId?: string;
        url?: string;
        thumbnailUrl?: string;
        mediaType: "image" | "video";
        alt: string;
        caption?: string;
        credit?: string;
        order?: number;
        visible?: boolean;
      };
    },
    string
  >("media:upsertGalleryItem"),
  deleteGalleryItem: makeFunctionReference<"mutation", { id: string }, { ok: boolean }>(
    "media:deleteGalleryItem",
  ),
};

export const usersApi = {
  syncCurrent: makeFunctionReference<"mutation", Record<string, never>, string>("users:syncCurrent"),
  bootstrapEligibility: makeFunctionReference<
    "query",
    Record<string, never>,
    { status: "eligible" | "approved" | "approval_required" }
  >("users:bootstrapEligibility"),
  bootstrapFirstAdmin: makeFunctionReference<"mutation", Record<string, never>, { ok: boolean }>(
    "users:bootstrapFirstAdmin",
  ),
  current: makeFunctionReference<"query", Record<string, never>, AdminRecord | null>("users:current"),
};
