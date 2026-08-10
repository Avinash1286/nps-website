import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { normalizedSlug, plainText, shortHash, singleLineText } from "./input";

export const MAX_ARTICLES_PER_STUDENT = 50;

export type CleanArticleDraft = {
  title: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string[];
};

export function cleanArticleDraft(input: CleanArticleDraft): CleanArticleDraft {
  const seen = new Set<string>();
  const tags = input.tags
    .map((tag) => singleLineText(tag, "Tag", 1, 40))
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (tags.length > 8) {
    throw new ConvexError({ code: "INVALID_INPUT", message: "Use no more than 8 article tags." });
  }
  return {
    title: singleLineText(input.title, "Title", 1, 160),
    excerpt: plainText(input.excerpt, "Summary", 1, 500),
    body: plainText(input.body, "Article body", 1, 20_000),
    category: singleLineText(input.category, "Category", 1, 80),
    tags,
  };
}

export function validateArticleForSubmission(article: CleanArticleDraft): void {
  singleLineText(article.title, "Title", 5, 160);
  plainText(article.excerpt, "Summary", 30, 500);
  plainText(article.body, "Article body", 100, 20_000);
  singleLineText(article.category, "Category", 2, 80);
}

export async function uniqueArticleSlug(
  ctx: Pick<MutationCtx, "db">,
  title: string,
  articleId: Id<"articles">,
): Promise<string> {
  const base = normalizedSlug(title);
  const existing = await ctx.db
    .query("articles")
    .withIndex("by_slug", (q) => q.eq("slug", base))
    .first();
  if (!existing || existing._id === articleId) return base;

  const suffix = shortHash(articleId);
  for (const length of [8, 10, 12, 14]) {
    const candidate = `${base.slice(0, 120 - length - 1).replace(/-+$/, "")}-${suffix.slice(0, length)}`;
    const collision = await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .first();
    if (!collision || collision._id === articleId) return candidate;
  }
  throw new ConvexError({
    code: "SLUG_CONFLICT",
    message: "A unique article URL could not be generated.",
  });
}

export function toStudentArticle(article: Doc<"articles">) {
  return {
    _id: article._id,
    _creationTime: article._creationTime,
    title: article.title,
    excerpt: article.excerpt,
    body: article.body,
    category: article.category,
    tags: article.tags,
    status: article.status,
    reviewNote: article.reviewNote,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    submittedAt: article.submittedAt,
    publishedAt: article.publishedAt,
    publicSlug: article.status === "published" ? article.slug : undefined,
  };
}

export function toStudentArticleSummary(article: Doc<"articles">) {
  return {
    _id: article._id,
    _creationTime: article._creationTime,
    title: article.title,
    excerpt: article.excerpt,
    category: article.category,
    status: article.status,
    reviewNote: article.reviewNote,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    submittedAt: article.submittedAt,
    publishedAt: article.publishedAt,
    publicSlug: article.status === "published" ? article.slug : undefined,
  };
}

type ArticleReadContext = Pick<QueryCtx | MutationCtx, "storage">;

export async function toPublicArticleSummary(ctx: ArticleReadContext, article: Doc<"articles">) {
  if (!article.slug || article.status !== "published" || article.publishedAt === undefined) {
    throw new Error("Only published articles can be exposed publicly.");
  }
  return {
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    category: article.category,
    tags: article.tags,
    authorName: article.authorNameSnapshot ?? "Student contributor",
    featuredImageUrl: article.featuredImageId
      ? ((await ctx.storage.getUrl(article.featuredImageId)) ?? undefined)
      : undefined,
    featuredImageAlt: article.featuredImageAlt,
    featured: article.featured,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    seo: article.seo,
  };
}

export async function toAdminArticleSummary(
  ctx: ArticleReadContext,
  article: Doc<"articles">,
  author: Doc<"studentProfiles">,
) {
  return {
    _id: article._id,
    _creationTime: article._creationTime,
    title: article.title,
    excerpt: article.excerpt,
    category: article.category,
    status: article.status,
    author: { id: author._id, name: author.name, email: author.email, status: author.status },
    slug: article.slug,
    featuredImageUrl: article.featuredImageId
      ? ((await ctx.storage.getUrl(article.featuredImageId)) ?? undefined)
      : undefined,
    featuredImageAlt: article.featuredImageAlt,
    featured: article.featured,
    submittedAt: article.submittedAt,
    reviewedAt: article.reviewedAt,
    publishedAt: article.publishedAt,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
  };
}
