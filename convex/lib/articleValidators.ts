import { v } from "convex/values";
import { articleStatusValidator, seoValidator, studentProfileStatusValidator } from "../schema";

export const studentArticleDraftInputValidator = v.object({
  title: v.string(),
  excerpt: v.string(),
  body: v.string(),
  category: v.string(),
  tags: v.array(v.string()),
});

const studentArticleFields = {
  _id: v.id("articles"),
  _creationTime: v.number(),
  title: v.string(),
  excerpt: v.string(),
  body: v.string(),
  category: v.string(),
  tags: v.array(v.string()),
  status: articleStatusValidator,
  reviewNote: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  submittedAt: v.optional(v.number()),
  publishedAt: v.optional(v.number()),
  publicSlug: v.optional(v.string()),
};

export const studentArticleValidator = v.object(studentArticleFields);

export const studentArticleSummaryValidator = v.object({
  _id: v.id("articles"),
  _creationTime: v.number(),
  title: v.string(),
  excerpt: v.string(),
  category: v.string(),
  status: articleStatusValidator,
  reviewNote: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  submittedAt: v.optional(v.number()),
  publishedAt: v.optional(v.number()),
  publicSlug: v.optional(v.string()),
});

const publicArticleSummaryFields = {
  slug: v.string(),
  title: v.string(),
  excerpt: v.string(),
  category: v.string(),
  tags: v.array(v.string()),
  authorName: v.string(),
  featuredImageUrl: v.optional(v.string()),
  featuredImageAlt: v.optional(v.string()),
  featured: v.boolean(),
  publishedAt: v.number(),
  updatedAt: v.number(),
  seo: seoValidator,
};

export const publicArticleSummaryValidator = v.object(publicArticleSummaryFields);
export const publicArticleValidator = v.object({
  ...publicArticleSummaryFields,
  body: v.string(),
});

const adminArticleSummaryFields = {
  _id: v.id("articles"),
  _creationTime: v.number(),
  title: v.string(),
  excerpt: v.string(),
  category: v.string(),
  status: articleStatusValidator,
  author: v.object({
    id: v.id("studentProfiles"),
    name: v.string(),
    email: v.string(),
    status: studentProfileStatusValidator,
  }),
  slug: v.optional(v.string()),
  featuredImageUrl: v.optional(v.string()),
  featuredImageAlt: v.optional(v.string()),
  featured: v.boolean(),
  submittedAt: v.optional(v.number()),
  reviewedAt: v.optional(v.number()),
  publishedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
};

export const adminArticleSummaryValidator = v.object(adminArticleSummaryFields);
export const adminArticleValidator = v.object({
  ...adminArticleSummaryFields,
  body: v.string(),
  tags: v.array(v.string()),
  reviewNote: v.optional(v.string()),
  seo: seoValidator,
});
