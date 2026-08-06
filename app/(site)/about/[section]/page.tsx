import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StandardPage } from "@/components/site/standard-page";
import { aboutPages } from "@/lib/content/site-pages";
import { cmsPageToStandard } from "@/lib/content/cms-page";
import { getCmsPage } from "@/lib/data/public";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const configured = await getCmsPage(`about/${section}`);
  const page = configured ? cmsPageToStandard(configured, "About the school") : aboutPages[section];
  return page ? { title: page.title, description: page.description } : {};
}
export default async function AboutSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const configured = await getCmsPage(`about/${section}`);
  const content = configured ? cmsPageToStandard(configured, "About the school") : aboutPages[section];
  if (!content) notFound();
  return <StandardPage content={content} parentLabel="About" parentHref="/about" />;
}
