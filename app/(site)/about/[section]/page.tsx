import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { StandardPage } from "@/components/site/standard-page";
import { cmsPageToStandard } from "@/lib/content/cms-page";
import { getCmsPage } from "@/lib/data/public";

const mergedSections: Record<string, string> = {
  history: "/about#history",
  "mission-vision": "/about#mission",
};

export async function generateMetadata({ params }: PageProps<"/about/[section]">): Promise<Metadata> {
  const { section } = await params;
  if (mergedSections[section]) return { robots: { index: false, follow: true } };
  const configured = await getCmsPage(`about/${section}`);
  return configured ? { title: configured.title, description: configured.summary } : {};
}

export default async function AboutSectionPage({ params }: PageProps<"/about/[section]">) {
  const { section } = await params;
  const mergedDestination = mergedSections[section];
  if (mergedDestination) permanentRedirect(mergedDestination);

  const configured = await getCmsPage(`about/${section}`);
  if (!configured) notFound();
  return (
    <StandardPage
      content={cmsPageToStandard(configured, "About the school")}
      parentLabel="About"
      parentHref="/about"
    />
  );
}
