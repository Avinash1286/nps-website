import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { StudentArticle } from "@/components/student/types";

const mocks = vi.hoisted(() => ({
  queryArticle: undefined as StudentArticle | null | undefined,
  queryArticles: [] as StudentArticle[] | undefined,
  saveDraft: vi.fn(),
  submitForReview: vi.fn(),
  withdrawSubmission: vi.fn(),
  deleteDraft: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/components/student/convex-api", () => ({
  studentArticlesApi: {
    currentStudent: "currentStudent",
    listMine: "listMine",
    getMine: "getMine",
    saveDraft: "saveDraft",
    submitForReview: "submitForReview",
    withdrawSubmission: "withdrawSubmission",
    deleteDraft: "deleteDraft",
  },
}));

vi.mock("convex/react", () => ({
  useQuery: (reference: string) => {
    if (reference === "listMine") return mocks.queryArticles;
    if (reference === "getMine") return mocks.queryArticle;
    return undefined;
  },
  useMutation: (reference: string) => {
    if (reference === "saveDraft") return mocks.saveDraft;
    if (reference === "submitForReview") return mocks.submitForReview;
    if (reference === "withdrawSubmission") return mocks.withdrawSubmission;
    return mocks.deleteDraft;
  },
}));

vi.mock("@/components/student/student-workspace-shell", () => ({
  StudentWorkspaceShell: ({ children, title }: { children: ReactNode; title: string }) => (
    <section>
      <h1>{title}</h1>
      {children}
    </section>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { StudentArticleEditor } from "@/components/student/student-article-editor";
import { StudentArticlesDashboard } from "@/components/student/student-articles-dashboard";

const student = { id: "student-1", name: "Student Writer", email: "student@example.com" };

function article(overrides: Partial<StudentArticle> = {}): StudentArticle {
  return {
    _id: "article-1",
    _creationTime: 1_700_000_000_000,
    title: "A day in the science laboratory",
    excerpt: "Students describe a practical science lesson.",
    body: "We prepared our materials, completed the experiment together, compared our observations, and discussed what the results taught us about careful scientific work.",
    category: "Student life",
    tags: ["science", "learning"],
    status: "draft",
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe("student article portal", () => {
  beforeEach(() => {
    mocks.queryArticle = undefined;
    mocks.queryArticles = [];
    mocks.saveDraft.mockReset();
    mocks.submitForReview.mockReset();
    mocks.withdrawSubmission.mockReset();
    mocks.deleteDraft.mockReset();
    mocks.replace.mockReset();
    mocks.refresh.mockReset();
  });

  afterEach(() => cleanup());

  it("uses review language and never offers students a public publishing control", async () => {
    const saved = article();
    const submitted = article({ status: "submitted", submittedAt: 1_700_000_100_000 });
    mocks.saveDraft.mockResolvedValue(saved);
    mocks.submitForReview.mockResolvedValue(submitted);

    render(<StudentArticleEditor student={student} />);

    fireEvent.change(screen.getByLabelText(/article title/i), { target: { value: saved.title } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: saved.category } });
    fireEvent.change(screen.getByLabelText(/short summary/i), { target: { value: saved.excerpt } });
    fireEvent.change(screen.getByLabelText(/article body/i), { target: { value: saved.body } });

    expect(screen.queryByRole("button", { name: /^publish/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
    expect(screen.getByText(/This action does not make it public\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Yes, submit for review" }));

    await waitFor(() => {
      expect(mocks.saveDraft).toHaveBeenCalledWith({
        article: {
          title: saved.title,
          excerpt: saved.excerpt,
          body: saved.body,
          category: saved.category,
          tags: [],
        },
      });
      expect(mocks.submitForReview).toHaveBeenCalledWith({ articleId: saved._id });
    });
    expect(await screen.findByText(/submitted for school review/i)).toBeInTheDocument();
  });

  it("keeps submitted work read-only but lets a student withdraw it", async () => {
    const submitted = article({ status: "submitted" });
    const withdrawn = article({ status: "draft" });
    mocks.queryArticle = submitted;
    mocks.withdrawSubmission.mockResolvedValue(withdrawn);

    render(<StudentArticleEditor student={student} articleId={submitted._id} />);

    const title = await screen.findByLabelText(/article title/i);
    expect(title).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Submit for review" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Withdraw and continue editing" }));

    await waitFor(() => expect(mocks.withdrawSubmission).toHaveBeenCalledWith({ articleId: submitted._id }));
    expect(await screen.findByText(/private draft again/i)).toBeInTheDocument();
  });

  it("shows reviewer feedback on a rejected article and allows revision", async () => {
    mocks.queryArticle = article({
      status: "rejected",
      reviewNote: "Please add a source for the final paragraph.",
    });

    render(<StudentArticleEditor student={student} articleId="article-1" />);

    expect(await screen.findByText("Please add a source for the final paragraph.")).toBeInTheDocument();
    expect(screen.getByLabelText(/article title/i)).toBeEnabled();
    expect(screen.getByRole("button", { name: "Submit for review" })).toBeInTheDocument();
  });

  it("presents statuses and status-appropriate actions in the dashboard", () => {
    mocks.queryArticles = [
      article({ _id: "draft-1" }),
      article({ _id: "review-1", title: "Sports week", status: "submitted" }),
      article({
        _id: "published-1",
        title: "Our reading club",
        status: "published",
        publicSlug: "our-reading-club",
      }),
    ];

    render(<StudentArticlesDashboard student={student} />);

    expect(screen.getByText("Awaiting review", { selector: "span" })).toBeInTheDocument();
    expect(screen.getAllByText("Published").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /continue editing/i })).toHaveAttribute(
      "href",
      "/student/articles/draft-1/edit",
    );
    expect(screen.getByRole("link", { name: /view public article/i })).toHaveAttribute(
      "href",
      "/articles/our-reading-club",
    );
    expect(screen.queryByRole("button", { name: /^publish/i })).not.toBeInTheDocument();
  });
});
