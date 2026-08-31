import type { Metadata } from "next";
import { AboutConsolidatedPage } from "@/components/content/about-consolidated-page";
import { plainParagraphs, structuredPageSections } from "@/lib/content/merged-pages";
import { contentMetadata } from "@/lib/content/public-metadata";
import { getCmsPage } from "@/lib/data/public";

const fallbackOverview = [
  "Nepal Police School, Garuda serves students and families in Rautahat through residential and day education from Nursery through Grade 12.",
];

const fallbackHistory = [
  "The school was established in 2058 BS (2002 AD) under the welfare programme of the Nepal Police Organization. School publications record its continued development in Garuda, Rautahat.",
];

const fallbackMission = [
  "The school's published educational direction combines academic learning with discipline, responsibility, creativity, participation, and service.",
];

const fallbackVision = [
  "The motto ‘Better Schooling for Ideal Citizenship’ expresses an aspiration to help learners grow into capable, responsible, and respectful citizens.",
];

export async function generateMetadata(): Promise<Metadata> {
  const page = await getCmsPage("about");
  return contentMetadata({
    title: page?.title ?? "About",
    description:
      page?.summary ??
      "Read the history, mission, and vision of Nepal Police School, Garuda in one clear overview.",
    seo: page?.seo,
    path: "/about",
  });
}

export default async function AboutPage() {
  const [page, legacyHistory, legacyMissionVision] = await Promise.all([
    getCmsPage("about"),
    getCmsPage("about/history"),
    getCmsPage("about/mission-vision"),
  ]);
  const sections = structuredPageSections(page?.body ?? "");
  const legacyHistoryParagraphs = plainParagraphs(legacyHistory?.body);
  const legacyMissionParagraphs = plainParagraphs(legacyMissionVision?.body);
  const combinedMissionVision = sections["mission-and-vision"] ?? [];

  return (
    <AboutConsolidatedPage
      title={page?.title ?? "About Nepal Police School, Garuda"}
      description={
        page?.summary ??
        "Our history, educational purpose, and vision brought together in one clear introduction to the school."
      }
      image={page?.heroImageUrl ?? "/media/nps-campus-building.png"}
      copy={{
        overview: sections.overview?.length ? sections.overview : fallbackOverview,
        history: sections.history?.length
          ? sections.history
          : legacyHistoryParagraphs.length
            ? legacyHistoryParagraphs
            : fallbackHistory,
        mission: sections.mission?.length
          ? sections.mission
          : combinedMissionVision[0]
            ? [combinedMissionVision[0]]
            : legacyMissionParagraphs[0]
              ? [legacyMissionParagraphs[0]]
              : fallbackMission,
        vision: sections.vision?.length
          ? sections.vision
          : combinedMissionVision.length > 1
            ? combinedMissionVision.slice(1)
            : legacyMissionParagraphs.length > 1
              ? legacyMissionParagraphs.slice(1)
              : fallbackVision,
      }}
    />
  );
}
