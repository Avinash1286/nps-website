import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StandardPage } from "@/components/site/standard-page";
import { cmsPageToStandard } from "@/lib/content/cms-page";
import { schoolLifePages } from "@/lib/content/site-pages";
import { getCmsPage } from "@/lib/data/public";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const configured = await getCmsPage(`campus-life/${section}`);
  const page = configured ? cmsPageToStandard(configured, "School life") : schoolLifePages[section];
  return page ? { title: page.title, description: page.description } : {};
}

export default async function SchoolLifeSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const configured = await getCmsPage(`campus-life/${section}`);
  const content = configured ? cmsPageToStandard(configured, "School life") : schoolLifePages[section];
  if (!content) notFound();
  return <StandardPage content={content} parentLabel="School life" parentHref="/campus-life" />;
}
