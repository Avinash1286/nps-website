export type Student = {
  id: string;
  name: string;
  email: string;
};

export type StudentArticleStatus = "draft" | "submitted" | "rejected" | "published" | "archived";

export type StudentArticle = {
  _id: string;
  _creationTime: number;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string[];
  status: StudentArticleStatus;
  reviewNote?: string;
  createdAt: number;
  updatedAt: number;
  submittedAt?: number;
  publishedAt?: number;
  publicSlug?: string;
};

export type StudentArticleSummary = Pick<
  StudentArticle,
  | "_id"
  | "_creationTime"
  | "title"
  | "excerpt"
  | "category"
  | "status"
  | "createdAt"
  | "updatedAt"
  | "submittedAt"
  | "publishedAt"
  | "publicSlug"
> & {
  reviewNote?: string;
};

export type StudentArticleDraftInput = Pick<
  StudentArticle,
  "title" | "excerpt" | "body" | "category" | "tags"
>;
