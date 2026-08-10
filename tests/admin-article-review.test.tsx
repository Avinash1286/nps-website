import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({
  approve: vi.fn(),
  reject: vi.fn(),
  archive: vi.fn(),
  usePaginatedQuery: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("convex/server", () => ({ makeFunctionReference: (name: string) => name }));
vi.mock("convex/react", () => ({
  usePaginatedQuery: mocks.usePaginatedQuery,
  useQuery: mocks.useQuery,
  useMutation: (reference: string) => {
    if (reference === "articleAdmin:approve") return mocks.approve;
    if (reference === "articleAdmin:reject") return mocks.reject;
    return mocks.archive;
  },
}));
vi.mock("@/components/admin/admin-gate", () => ({
  AdminFeatureGate: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/admin/content-manager", () => ({ formatDate: () => "9 August 2026" }));

import { ArticleReviewManager } from "@/components/admin/article-review-manager";

const detail = {
  _id: "article-1",
  _creationTime: 1,
  title: "Learning through service",
  excerpt: "A student reflection.",
  body: "This full body is loaded only when an administrator opens the review.",
  category: "Reflection",
  tags: ["service"],
  status: "submitted",
  author: { id: "student-1", name: "Student Writer", email: "student@example.com", status: "active" },
  submittedAt: 10,
  createdAt: 1,
  updatedAt: 10,
};

describe("student article moderation", () => {
  beforeEach(() => {
    mocks.approve.mockReset().mockResolvedValue({ ok: true, status: "published", publishedAt: 20 });
    mocks.reject.mockReset().mockResolvedValue({ ok: true, status: "rejected" });
    mocks.archive.mockReset().mockResolvedValue({ ok: true, status: "archived" });
    mocks.usePaginatedQuery.mockReset().mockReturnValue({
      results: [
        {
          _id: "article-1",
          _creationTime: 1,
          title: "Learning through service",
          excerpt: "A student reflection.",
          category: "Reflection",
          status: "submitted",
          author: {
            id: "student-1",
            name: "Student Writer",
            email: "student@example.com",
            status: "active",
          },
          submittedAt: 10,
          createdAt: 1,
          updatedAt: 10,
        },
      ],
      status: "Exhausted",
      loadMore: vi.fn(),
    });
    mocks.useQuery
      .mockReset()
      .mockImplementation((_reference: string, args: unknown) => (args === "skip" ? undefined : detail));
  });

  afterEach(cleanup);

  it("loads the full article only after opening a summary row and confirms publication", async () => {
    render(<ArticleReviewManager />);

    expect(mocks.usePaginatedQuery).toHaveBeenCalledWith(
      "articleAdmin:listArticles",
      { status: "submitted" },
      { initialNumItems: 40 },
    );
    expect(screen.queryByRole("option", { name: "Draft" })).not.toBeInTheDocument();
    expect(screen.queryByText(/full body is loaded only/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review Learning through service" }));

    expect(mocks.useQuery).toHaveBeenLastCalledWith("articleAdmin:getArticle", { id: "article-1" });
    expect(screen.getByText(/full body is loaded only/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Approve and publish" }));
    expect(screen.getByText("Publish this student article now?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm decision" }));

    await waitFor(() => expect(mocks.approve).toHaveBeenCalledWith({ id: "article-1" }));
    expect(await screen.findByText(/is published in Student articles/i)).toBeInTheDocument();
  });
});
