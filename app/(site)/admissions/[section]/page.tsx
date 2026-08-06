import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StandardPage } from "@/components/site/standard-page";
import { admissionPages } from "@/lib/content/site-pages";
import { cmsPageToStandard } from "@/lib/content/cms-page";
import { getCmsPage } from "@/lib/data/public";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const configured = await getCmsPage(`admissions/${section}`);
  const page = configured ? cmsPageToStandard(configured, "Admissions") : admissionPages[section];
  return page ? { title: page.title, description: page.description } : {};
}
export default async function AdmissionSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const configured = await getCmsPage(`admissions/${section}`);
  const content = configured ? cmsPageToStandard(configured, "Admissions") : admissionPages[section];
  if (!content) notFound();
  return <StandardPage content={content} parentLabel="Admissions" parentHref="/admissions" />;
}
