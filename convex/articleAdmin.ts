import { paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { adminArticleSummaryValidator, adminArticleValidator } from "./lib/articleValidators";
import { toAdminArticleSummary, uniqueArticleSlug, validateArticleForSubmission } from "./lib/articles";
import { writeAudit } from "./lib/audit";
import { requireRole } from "./lib/auth";
import { optionalMediaUrl, plainText, singleLineText } from "./lib/input";
import { recordStatusChanged } from "./lib/metrics";
import { seoValidator } from "./schema";
import { boundedPaginationOpts, paginationOptsValidator } from "./lib/validators";

const ADMIN_ONLY = ["admin"] as const;
const moderationStatusValidator = v.union(
  v.literal("submitted"),
  v.literal("rejected"),
  v.literal("published"),
  v.literal("archived"),
);

async function requiredAuthor(ctx: QueryCtx | MutationCtx, authorId: Id<"studentProfiles">) {
  const author = await ctx.db.get("studentProfiles", authorId);
  if (!author) {
    throw new ConvexError({ code: "DATA_INTEGRITY", message: "The article author profile is missing." });
  }
  return author;
}

async function fullAdminArticle(ctx: QueryCtx | MutationCtx, article: Doc<"articles">) {
  const author = await requiredAuthor(ctx, article.authorId);
  return {
    ...(await toAdminArticleSummary(ctx, article, author)),
    body: article.body,
    tags: article.tags,
    reviewNote: article.reviewNote,
    seo: article.seo,
  };
}

export const listArticles = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: moderationStatusValidator,
  },
  returns: paginationResultValidator(adminArticleSummaryValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_ONLY);
    const page = await ctx.db
      .query("articles")
      .withIndex("by_status_and_updated_at", (q) => q.eq("status", args.status))
      .order("desc")
      .paginate(boundedPaginationOpts(args.paginationOpts));
    return {
      ...page,
      page: await Promise.all(
        page.page.map(async (article) => {
          const author = await requiredAuthor(ctx, article.authorId);
          return await toAdminArticleSummary(ctx, article, author);
        }),
      ),
    };
  },
});

export const getArticle = query({
  args: { id: v.id("articles") },
  returns: v.union(v.null(), adminArticleValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_ONLY);
    const article = await ctx.db.get("articles", args.id);
    return article && article.status !== "draft" ? await fullAdminArticle(ctx, article) : null;
  },
});

export const updateEditorial = mutation({
  args: {
    id: v.id("articles"),
    editorial: v.object({
      category: v.string(),
      featuredImageId: v.optional(v.id("_storage")),
      featuredImageAlt: v.optional(v.string()),
      featured: v.boolean(),
      seo: seoValidator,
    }),
  },
  returns: adminArticleValidator,
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ADMIN_ONLY);
    const article = await ctx.db.get("articles", args.id);
    if (!article || article.status === "draft") {
      throw new ConvexError({ code: "NOT_FOUND", message: "Article not found." });
    }

    if (args.editorial.featuredImageId) {
      const asset = await ctx.db
        .query("mediaAssets")
        .withIndex("by_storage_id", (q) => q.eq("storageId", args.editorial.featuredImageId!))
        .unique();
      if (!asset || asset.status !== "ready" || !asset.mimeType.startsWith("image/")) {
        throw new ConvexError({
          code: "INVALID_MEDIA",
          message: "Choose a ready image from the media library.",
        });
      }
      if (!args.editorial.featuredImageAlt?.trim()) {
        throw new ConvexError({
          code: "ALT_TEXT_REQUIRED",
          message: "Alternative text is required for the image.",
        });
      }
    }

    const now = Date.now();
    await ctx.db.patch("articles", article._id, {
      category: singleLineText(args.editorial.category, "Category", 1, 80),
      featuredImageId: args.editorial.featuredImageId,
      featuredImageAlt: args.editorial.featuredImageAlt
        ? plainText(args.editorial.featuredImageAlt, "Alternative text", 1, 300)
        : undefined,
      featured: args.editorial.featured,
      seo: {
        title: args.editorial.seo.title
          ? singleLineText(args.editorial.seo.title, "SEO title", 1, 180)
          : undefined,
        description: args.editorial.seo.description
          ? plainText(args.editorial.seo.description, "SEO description", 1, 500)
          : undefined,
        imageUrl: optionalMediaUrl(args.editorial.seo.imageUrl),
        noIndex: args.editorial.seo.noIndex,
      },
      updatedAt: now,
    });
    await writeAudit(ctx, actor, {
      action: "article.editorial_updated",
      entityType: "articles",
      entityId: article._id,
      summary: `Updated editorial presentation for ${article.title}.`,
    });
    return await fullAdminArticle(ctx, (await ctx.db.get("articles", article._id))!);
  },
});

export const approve = mutation({
  args: { id: v.id("articles") },
  returns: v.object({ ok: v.literal(true), status: v.literal("published"), publishedAt: v.number() }),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ADMIN_ONLY);
    const article = await ctx.db.get("articles", args.id);
    if (!article) throw new ConvexError({ code: "NOT_FOUND", message: "Article not found." });
    if (article.status !== "submitted") {
      throw new ConvexError({ code: "INVALID_STATE", message: "Only submitted articles can be approved." });
    }
    validateArticleForSubmission(article);
    const author = await requiredAuthor(ctx, article.authorId);
    if (author.status !== "active") {
      throw new ConvexError({
        code: "ACCOUNT_DISABLED",
        message: "This article cannot be published while the student account is suspended.",
      });
    }
    const now = Date.now();
    const slug = article.slug ?? (await uniqueArticleSlug(ctx, article.title, article._id));
    await ctx.db.patch("articles", article._id, {
      slug,
      status: "published",
      authorNameSnapshot: author.name,
      reviewNote: undefined,
      reviewedBy: actor._id,
      reviewedAt: now,
      publishedAt: now,
      updatedAt: now,
    });
    await recordStatusChanged(ctx, "articles", "submitted", "published");
    await writeAudit(ctx, actor, {
      action: "article.approved",
      entityType: "articles",
      entityId: article._id,
      summary: `Approved and published ${article.title}.`,
      metadata: { studentProfileId: article.authorId },
    });
    return { ok: true as const, status: "published" as const, publishedAt: now };
  },
});

export const reject = mutation({
  args: { id: v.id("articles"), note: v.string() },
  returns: v.object({ ok: v.literal(true), status: v.literal("rejected") }),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ADMIN_ONLY);
    const article = await ctx.db.get("articles", args.id);
    if (!article) throw new ConvexError({ code: "NOT_FOUND", message: "Article not found." });
    if (article.status !== "submitted") {
      throw new ConvexError({ code: "INVALID_STATE", message: "Only submitted articles can be rejected." });
    }
    const note = plainText(args.note, "Review note", 3, 1_000);
    const now = Date.now();
    await ctx.db.patch("articles", article._id, {
      status: "rejected",
      reviewNote: note,
      reviewedBy: actor._id,
      reviewedAt: now,
      updatedAt: now,
    });
    await recordStatusChanged(ctx, "articles", "submitted", "rejected");
    await writeAudit(ctx, actor, {
      action: "article.rejected",
      entityType: "articles",
      entityId: article._id,
      summary: `Rejected ${article.title} with feedback for the student.`,
      metadata: { studentProfileId: article.authorId },
    });
    return { ok: true as const, status: "rejected" as const };
  },
});

export const archive = mutation({
  args: { id: v.id("articles"), note: v.optional(v.string()) },
  returns: v.object({ ok: v.literal(true), status: v.literal("archived") }),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ADMIN_ONLY);
    const article = await ctx.db.get("articles", args.id);
    if (!article) throw new ConvexError({ code: "NOT_FOUND", message: "Article not found." });
    if (article.status !== "published") {
      throw new ConvexError({ code: "INVALID_STATE", message: "Only published articles can be archived." });
    }
    const note = args.note ? plainText(args.note, "Archive note", 3, 1_000) : undefined;
    const now = Date.now();
    await ctx.db.patch("articles", article._id, {
      status: "archived",
      reviewNote: note,
      reviewedBy: actor._id,
      reviewedAt: now,
      updatedAt: now,
    });
    await recordStatusChanged(ctx, "articles", "published", "archived");
    await writeAudit(ctx, actor, {
      action: "article.archived",
      entityType: "articles",
      entityId: article._id,
      summary: `Archived ${article.title}.`,
      metadata: { studentProfileId: article.authorId },
    });
    return { ok: true as const, status: "archived" as const };
  },
});
