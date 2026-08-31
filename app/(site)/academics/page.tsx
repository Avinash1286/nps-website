import type { Metadata } from "next";
import { AcademicsConsolidatedPage } from "@/components/content/academics-consolidated-page";
import { plainParagraphs } from "@/lib/content/merged-pages";
import { contentMetadata } from "@/lib/content/public-metadata";
import { getCmsPage, getDepartments, getPrograms } from "@/lib/data/public";

const fallbackIntroduction = [
  "Academic information is organised by programme level and subject area so students and families can find the current published guidance in one place.",
];

const fallbackCurriculum = [
  "Programme-specific curriculum summaries are maintained by the academic office. Approved syllabi, examination routines, calendars, and related documents are published through official notices and downloads when available.",
];

export async function generateMetadata(): Promise<Metadata> {
  const page = await getCmsPage("academics");
  return contentMetadata({
    title: page?.title ?? "Academics",
    description:
      page?.summary ??
      "Explore primary, secondary, higher-secondary programmes, curriculum, departments, and teachers on one page.",
    seo: page?.seo,
    path: "/academics",
  });
}

export default async function AcademicsPage() {
  const [programmes, page, curriculumPage, departments] = await Promise.all([
    getPrograms(),
    getCmsPage("academics"),
    getCmsPage("academics/curriculum"),
    getDepartments({ limit: 6 }),
  ]);
  const introduction = plainParagraphs(page?.body);
  const curriculumParagraphs = plainParagraphs(curriculumPage?.body);

  return (
    <AcademicsConsolidatedPage
      title={page?.title ?? "Academics"}
      description={
        page?.summary ??
        "Primary, secondary, higher-secondary programmes, curriculum, departments, and academic support in one organised overview."
      }
      image={page?.heroImageUrl ?? "/media/science-lab.png"}
      introduction={introduction.length ? introduction : fallbackIntroduction}
      curriculum={{
        title: curriculumPage?.title ?? "Curriculum and assessment",
        description: curriculumPage?.summary,
        paragraphs: curriculumParagraphs.length ? curriculumParagraphs : fallbackCurriculum,
      }}
      programmes={programmes}
      departments={departments}
    />
  );
}
