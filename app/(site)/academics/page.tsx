import type { Metadata } from "next";
import { OverviewPage } from "@/components/content/overview-page";
import { pageParagraphs } from "@/lib/content/cms-page";
import { contentMetadata } from "@/lib/content/public-metadata";
import { getCmsPage, getPrograms } from "@/lib/data/public";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getCmsPage("academics");
  return contentMetadata({
    title: page?.title ?? "Academics",
    description:
      page?.summary ??
      "Explore academic pathways, curriculum, departments, library, sports, and teaching at Nepal Police School, Garuda.",
    seo: page?.seo,
  });
}

const baselinePathways = [
  {
    title: "Primary years",
    description: "Strong foundations in language, numeracy, inquiry, and learning habits.",
    href: "/academics/primary",
    meta: "Pathway",
  },
  {
    title: "Secondary years",
    description: "Deeper subject learning, independent study, and progress guidance.",
    href: "/academics/secondary",
    meta: "Pathway",
  },
  {
    title: "+2 programmes",
    description: "Current programme and subject information for higher-secondary applicants.",
    href: "/academics/plus-2",
    meta: "Pathway",
  },
];

export default async function AcademicsPage() {
  const [configured, page] = await Promise.all([getPrograms(), getCmsPage("academics")]);
  const paragraphs = page ? pageParagraphs(page) : [];
  const pathways = configured.length
    ? configured.map((program) => ({
        title: program.name,
        description: program.shortDescription,
        href: `/academics/${program.slug}`,
        meta: program.featured
          ? `Featured programme${program.gradeRange ? ` · ${program.gradeRange}` : ""}`
          : (program.gradeRange ?? "Programme"),
      }))
    : baselinePathways;

  return (
    <OverviewPage
      eyebrow="Teaching and learning"
      title={page?.title ?? "Academic pathways with clear purpose"}
      description={
        page?.summary ??
        "Explore each stage of learning, the curriculum approach, academic departments, and the people who support student progress."
      }
      image={page?.heroImageUrl ?? "/media/science-lab.png"}
      introEyebrow="Academic direction"
      introTitle="Learning built on understanding, practice, and guidance."
      intro={
        paragraphs[0] ??
        "Academic information is organised by pathway and subject area so families can find what they need without relying on a single long page. Current grades, programmes, subjects, and schedules are confirmed through official school communication."
      }
      additionalCopy={paragraphs.slice(1)}
      featureImage="/media/science-lab.png"
      cardHeading="Explore teaching and learning"
      cards={[
        ...pathways,
        {
          title: "Curriculum",
          description: "How learning goals, teaching, assessment, and official documents fit together.",
          href: "/academics/curriculum",
          meta: "Academic framework",
        },
        {
          title: "Departments",
          description: "Subject-area overviews and links to relevant faculty profiles.",
          href: "/academics/departments",
          meta: "Subject areas",
        },
        {
          title: "Library and sports",
          description: "Resources, independent learning, movement, teamwork, and wellbeing.",
          href: "/academics/library",
          meta: "Student development",
        },
      ]}
      principles={[
        {
          title: "Clear expectations",
          description:
            "Students should know what they are learning, what good work looks like, and how to improve.",
        },
        {
          title: "Meaningful feedback",
          description: "Assessment supports next steps as well as reporting progress.",
        },
        {
          title: "Safe practical learning",
          description: "Hands-on work follows appropriate supervision, preparation, and safety guidance.",
        },
        {
          title: "Family communication",
          description: "Timely information helps families support attendance, study, and wellbeing.",
        },
      ]}
      cta={{
        title: "Need programme-specific guidance?",
        description:
          "Review the admissions pages or send an enquiry before making plans based on programme availability.",
        label: "Admissions information",
        href: "/admissions",
        secondaryLabel: "Meet our teachers",
        secondaryHref: "/teachers",
      }}
    />
  );
}
