import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CmsPageTemplate } from "@/components/site/cms-page-template";
import type { PublicCmsPage } from "@/lib/data/public";

const basePage: PublicCmsPage = {
  id: "page-1",
  slug: "school/community",
  title: "School community",
  summary: "A concise summary.",
  body: "Opening information.\n\nSupporting detail.",
  template: "standard",
};

describe("public CMS page templates", () => {
  afterEach(cleanup);

  it("renders materially distinct standard, landing, and information layouts", () => {
    const { container, rerender } = render(<CmsPageTemplate page={basePage} />);
    expect(container.querySelector('[data-page-template="standard"]')).toBeInTheDocument();
    expect(screen.queryByText("Published feature")).not.toBeInTheDocument();

    rerender(<CmsPageTemplate page={{ ...basePage, template: "landing" }} />);
    expect(container.querySelector('[data-page-template="landing"]')).toBeInTheDocument();
    expect(screen.getByText("Published feature")).toBeVisible();

    rerender(<CmsPageTemplate page={{ ...basePage, template: "information" }} />);
    expect(container.querySelector('[data-page-template="information"]')).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "At a glance" })).toBeVisible();
  });
});
