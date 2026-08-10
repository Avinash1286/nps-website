import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StudentArticleCard } from "@/components/site/student-article-card";
import { StudentArticleDetail } from "@/components/site/student-article-detail";
import type { PublicStudentArticleDetail } from "@/lib/data/public";

const article: PublicStudentArticleDetail = {
  id: "article-1",
  slug: "learning-through-service",
  title: "Learning through service",
  excerpt: "A reflection on teamwork and community service.",
  body: "Our class worked together on a service activity.\n\nI learned to listen and share responsibility.",
  category: "Reflection",
  tags: ["service", "teamwork"],
  authorName: "Student Writer",
  featured: false,
  publishedAt: "2026-08-09T00:00:00.000Z",
};

describe("public student articles", () => {
  afterEach(cleanup);

  it("links article cards to the public detail route and identifies the student author", () => {
    render(<StudentArticleCard article={article} />);

    expect(screen.getByRole("heading", { name: article.title })).toBeInTheDocument();
    expect(screen.getByText("By Student Writer")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /learning through service|read article/i })[0],
    ).toHaveAttribute("href", "/articles/learning-through-service");
  });

  it("clearly separates reviewed student writing from official school notices", () => {
    render(<StudentArticleDetail article={article} />);

    expect(
      screen.getByRole("heading", { name: "Student contribution, reviewed before publication" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/does not make the article an official school notice/i)).toBeInTheDocument();
    expect(screen.queryByText("Official information")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View official notices" })).toHaveAttribute("href", "/notices");
  });
});
