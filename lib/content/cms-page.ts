import type { StandardPageContent } from "./site-pages";
import type { PublicCmsPage } from "../data/public";

export function pageParagraphs(page: PublicCmsPage) {
  return page.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function cmsPageToStandard(
  page: PublicCmsPage,
  eyebrow: string,
  related?: StandardPageContent["related"],
): StandardPageContent {
  const paragraphs = pageParagraphs(page);
  return {
    eyebrow,
    title: page.title,
    description: page.summary ?? paragraphs[0] ?? "Published school information.",
    intro: paragraphs[0] ?? page.body,
    image: page.heroImageUrl,
    sections: paragraphs.slice(1).map((body, index) => ({
      title: index === 0 ? "Information" : `More information ${index + 1}`,
      body,
    })),
    related,
  };
}
