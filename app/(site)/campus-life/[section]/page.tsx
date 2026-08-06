import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StandardPage } from "@/components/site/standard-page";
import { cmsPageToStandard } from "@/lib/content/cms-page";
import { campusPages } from "@/lib/content/site-pages";
import { getCmsPage } from "@/lib/data/public";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const configured = await getCmsPage(`campus-life/${section}`);
  const page = configured ? cmsPageToStandard(configured, "Campus life") : campusPages[section];
  return page ? { title: page.title, description: page.description } : {};
}

export default async function CampusSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const configured = await getCmsPage(`campus-life/${section}`);
  const content = configured ? cmsPageToStandard(configured, "Campus life") : campusPages[section];
  if (!content) notFound();
  return <StandardPage content={content} parentLabel="Campus life" parentHref="/campus-life" />;
}
