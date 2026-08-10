import { makeFunctionReference } from "convex/server";
import type { Student, StudentArticle, StudentArticleDraftInput, StudentArticleSummary } from "./types";

export const studentArticlesApi = {
  currentStudent: makeFunctionReference<"query", Record<string, never>, Student | null>(
    "articles:currentStudent",
  ),
  listMine: makeFunctionReference<"query", Record<string, never>, StudentArticleSummary[]>(
    "articles:listMine",
  ),
  getMine: makeFunctionReference<"query", { articleId: string }, StudentArticle | null>("articles:getMine"),
  saveDraft: makeFunctionReference<
    "mutation",
    { articleId?: string; article: StudentArticleDraftInput },
    StudentArticle
  >("articles:saveDraft"),
  submitForReview: makeFunctionReference<"mutation", { articleId: string }, StudentArticle>(
    "articles:submitForReview",
  ),
  withdrawSubmission: makeFunctionReference<"mutation", { articleId: string }, StudentArticle>(
    "articles:withdrawSubmission",
  ),
  deleteDraft: makeFunctionReference<"mutation", { articleId: string }, { ok: boolean }>(
    "articles:deleteDraft",
  ),
};

export const studentProfileApi = {
  getCurrent: makeFunctionReference<"query", Record<string, never>, Student | null>(
    "studentProfiles:getCurrent",
  ),
  updateDisplayName: makeFunctionReference<"mutation", { name: string }, Student>(
    "studentProfiles:updateDisplayName",
  ),
};
