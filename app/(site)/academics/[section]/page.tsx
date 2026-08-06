import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StandardPage } from "@/components/site/standard-page";
import { academicPages, type StandardPageContent } from "@/lib/content/site-pages";
import { contentMetadata } from "@/lib/content/public-metadata";
import { getProgram, type PublicProgram } from "@/lib/data/public";

function programPage(program: PublicProgram): StandardPageContent {
  const sections: StandardPageContent["sections"] = [];
  if (program.curriculum) {
    sections.push({ title: "Curriculum", body: program.curriculum });
  }
  if (program.outcomes.length) {
    sections.push({
      title: "Learning outcomes",
      body: "The programme is planned around the following published outcomes.",
      points: program.outcomes,
    });
  }
  return {
    eyebrow: program.gradeRange ?? "Academic programme",
    title: program.name,
    description: program.shortDescription,
    intro: program.description,
    image: program.heroImageUrl,
    sections,
    related: [
      { label: "Explore departments", href: "/academics/departments" },
      { label: "Ask about admissions", href: "/admissions/apply" },
    ],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const program = await getProgram(section);
  const page = program ? programPage(program) : academicPages[section];
  return page ? contentMetadata({ title: page.title, description: page.description, seo: program?.seo }) : {};
}

export default async function AcademicSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const program = await getProgram(section);
  const content = program ? programPage(program) : academicPages[section];
  if (!content) notFound();
  return <StandardPage content={content} parentLabel="Academics" parentHref="/academics" />;
}
