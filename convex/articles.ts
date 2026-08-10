import { paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  publicArticleSummaryValidator,
  publicArticleValidator,
  studentArticleDraftInputValidator,
  studentArticleSummaryValidator,
  studentArticleValidator,
} from "./lib/articleValidators";
import {
  MAX_ARTICLES_PER_STUDENT,
  cleanArticleDraft,
  toPublicArticleSummary,
  toStudentArticle,
  toStudentArticleSummary,
  uniqueArticleSlug,
  validateArticleForSubmission,
} from "./lib/articles";
import { writeAudit } from "./lib/audit";
import { enforceRateLimit } from "./lib/rateLimit";
import { recordCreated, recordDeleted, recordStatusChanged } from "./lib/metrics";
import { currentStudentAuthUser, currentStudentProfile, ensureStudentProfile } from "./lib/studentAuth";
import { boundedPaginationOpts, paginationOptsValidator } from "./lib/validators";

const currentStudentValidator = v.object({
  id: v.string(),
  name: v.string(),
  email: v.string(),
});

async function ownedArticle(ctx: Parameters<typeof ensureStudentProfile>[0], articleId: Id<"articles">) {
  const profile = await ensureStudentProfile(ctx);
  const article = await ctx.db.get("articles", articleId);
  if (!article || article.authorId !== profile._id) {
    throw new ConvexError({ code: "NOT_FOUND", message: "Article not found." });
  }
  return { profile, article };
}

export const currentStudent = query({
  args: {},
  returns: v.union(v.null(), currentStudentValidator),
  handler: async (ctx) => {
    const authUser = await currentStudentAuthUser(ctx);
    if (!authUser) return null;
    const profile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
      .unique();
    if (profile?.status === "suspended") return null;
    return {
      id: profile?._id ?? authUser._id,
      name: profile?.name ?? authUser.name,
      email: profile?.email ?? authUser.email,
    };
  },
});

export const listMine = query({
  args: {},
  returns: v.array(studentArticleSummaryValidator),
  handler: async (ctx) => {
    const profile = await currentStudentProfile(ctx);
    if (!profile) return [];
    if (profile.status !== "active") {
      throw new ConvexError({ code: "ACCOUNT_DISABLED", message: "This student account is suspended." });
    }
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_author_id_and_updated_at", (q) => q.eq("authorId", profile._id))
      .order("desc")
      .take(MAX_ARTICLES_PER_STUDENT);
    return articles.map(toStudentArticleSummary);
  },
});

export const getMine = query({
  args: { articleId: v.id("articles") },
  returns: v.union(v.null(), studentArticleValidator),
  handler: async (ctx, args) => {
    const profile = await currentStudentProfile(ctx);
    if (!profile) return null;
    if (profile.status !== "active") {
      throw new ConvexError({ code: "ACCOUNT_DISABLED", message: "This student account is suspended." });
    }
    const article = await ctx.db.get("articles", args.articleId);
    if (!article || article.authorId !== profile._id) return null;
    return toStudentArticle(article);
  },
});

export const saveDraft = mutation({
  args: {
    articleId: v.optional(v.id("articles")),
    article: studentArticleDraftInputValidator,
  },
  returns: studentArticleValidator,
  handler: async (ctx, args) => {
    const profile = await ensureStudentProfile(ctx);
    await enforceRateLimit(ctx, {
      key: profile._id,
      scope: "student-articles:save",
      limit: 60,
      windowMs: 10 * 60 * 1000,
    });
    const clean = cleanArticleDraft(args.article);
    const now = Date.now();

    if (args.articleId) {
      const article = await ctx.db.get("articles", args.articleId);
      if (!article || article.authorId !== profile._id) {
        throw new ConvexError({ code: "NOT_FOUND", message: "Article not found." });
      }
      if (article.status !== "draft" && article.status !== "rejected") {
        throw new ConvexError({
          code: "INVALID_STATE",
          message: "Only draft or rejected articles can be edited.",
        });
      }
      const nextStatus = article.status === "rejected" ? ("draft" as const) : article.status;
      await ctx.db.patch("articles", article._id, { ...clean, status: nextStatus, updatedAt: now });
      if (article.status === "rejected") {
        await recordStatusChanged(ctx, "articles", "rejected", "draft");
        await writeAudit(ctx, null, {
          action: "article.revision_started",
          entityType: "articles",
          entityId: article._id,
          summary: "A student began a private revision after review feedback.",
          metadata: { studentProfileId: profile._id },
        });
      }
      return toStudentArticle((await ctx.db.get("articles", article._id))!);
    }

    await enforceRateLimit(ctx, {
      key: profile._id,
      scope: "student-articles:create",
      limit: 10,
      windowMs: 24 * 60 * 60 * 1000,
    });
    const retained = await ctx.db
      .query("articles")
      .withIndex("by_author_id_and_updated_at", (q) => q.eq("authorId", profile._id))
      .take(MAX_ARTICLES_PER_STUDENT + 1);
    if (retained.length >= MAX_ARTICLES_PER_STUDENT) {
      throw new ConvexError({
        code: "ARTICLE_LIMIT_REACHED",
        message: `Each student may retain up to ${MAX_ARTICLES_PER_STUDENT} articles. Delete an old draft first.`,
      });
    }
    const id = await ctx.db.insert("articles", {
      authorId: profile._id,
      ...clean,
      status: "draft",
      featured: false,
      seo: {},
      createdAt: now,
      updatedAt: now,
    });
    await recordCreated(ctx, "articles", "draft");
    await writeAudit(ctx, null, {
      action: "article.created",
      entityType: "articles",
      entityId: id,
      summary: "A student created a private article draft.",
      metadata: { studentProfileId: profile._id },
    });
    return toStudentArticle((await ctx.db.get("articles", id))!);
  },
});

export const submitForReview = mutation({
  args: { articleId: v.id("articles") },
  returns: studentArticleValidator,
  handler: async (ctx, args) => {
    const { profile, article } = await ownedArticle(ctx, args.articleId);
    if (article.status !== "draft" && article.status !== "rejected") {
      throw new ConvexError({ code: "INVALID_STATE", message: "This article cannot be submitted." });
    }
    await enforceRateLimit(ctx, {
      key: profile._id,
      scope: "student-articles:submit",
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    validateArticleForSubmission(article);
    const now = Date.now();
    const slug = article.slug ?? (await uniqueArticleSlug(ctx, article.title, article._id));
    await ctx.db.patch("articles", article._id, {
      slug,
      status: "submitted",
      submittedAt: now,
      reviewedBy: undefined,
      reviewedAt: undefined,
      reviewNote: undefined,
      updatedAt: now,
    });
    await recordStatusChanged(ctx, "articles", article.status, "submitted");
    await writeAudit(ctx, null, {
      action: "article.submitted",
      entityType: "articles",
      entityId: article._id,
      summary: "A student submitted an article for administrator review.",
      metadata: { studentProfileId: profile._id },
    });
    return toStudentArticle((await ctx.db.get("articles", article._id))!);
  },
});

export const withdrawSubmission = mutation({
  args: { articleId: v.id("articles") },
  returns: studentArticleValidator,
  handler: async (ctx, args) => {
    const { profile, article } = await ownedArticle(ctx, args.articleId);
    if (article.status !== "submitted") {
      throw new ConvexError({ code: "INVALID_STATE", message: "Only submitted articles can be withdrawn." });
    }
    await enforceRateLimit(ctx, {
      key: profile._id,
      scope: "student-articles:withdraw",
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    const now = Date.now();
    await ctx.db.patch("articles", article._id, {
      status: "draft",
      submittedAt: undefined,
      updatedAt: now,
    });
    await recordStatusChanged(ctx, "articles", "submitted", "draft");
    await writeAudit(ctx, null, {
      action: "article.withdrawn",
      entityType: "articles",
      entityId: article._id,
      summary: "A student withdrew an article from review.",
      metadata: { studentProfileId: profile._id },
    });
    return toStudentArticle((await ctx.db.get("articles", article._id))!);
  },
});

export const deleteDraft = mutation({
  args: { articleId: v.id("articles") },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const { profile, article } = await ownedArticle(ctx, args.articleId);
    if (article.status !== "draft" && article.status !== "rejected") {
      throw new ConvexError({ code: "INVALID_STATE", message: "Only drafts can be deleted." });
    }
    await enforceRateLimit(ctx, {
      key: profile._id,
      scope: "student-articles:delete",
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    await ctx.db.delete("articles", article._id);
    await recordDeleted(ctx, "articles", article.status);
    await writeAudit(ctx, null, {
      action: "article.deleted",
      entityType: "articles",
      entityId: article._id,
      summary: "A student deleted a private article draft.",
      metadata: { studentProfileId: profile._id },
    });
    return { ok: true };
  },
});

export const listPublished = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(publicArticleSummaryValidator),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("articles")
      .withIndex("by_status_and_published_at", (q) => q.eq("status", "published"))
      .order("desc")
      .paginate(boundedPaginationOpts(args.paginationOpts));
    return {
      ...page,
      page: await Promise.all(page.page.map((article) => toPublicArticleSummary(ctx, article))),
    };
  },
});

export const getPublished = query({
  args: { slug: v.string() },
  returns: v.union(v.null(), publicArticleValidator),
  handler: async (ctx, args) => {
    const article = await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug.trim().toLowerCase()))
      .first();
    if (!article || article.status !== "published" || article.publishedAt === undefined) return null;
    return { ...(await toPublicArticleSummary(ctx, article)), body: article.body };
  },
});
