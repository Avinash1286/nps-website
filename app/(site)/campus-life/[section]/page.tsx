import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { StandardPage } from "@/components/site/standard-page";
import { cmsPageToStandard } from "@/lib/content/cms-page";
import { schoolLifePages } from "@/lib/content/site-pages";
import { getCmsPage } from "@/lib/data/public";
import { contentMetadata } from "@/lib/content/public-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const configured = await getCmsPage(`campus-life/${section}`);
  const page = configured ? cmsPageToStandard(configured, "School life") : schoolLifePages[section];
  return page
    ? contentMetadata({
        title: page.title,
        description: page.description,
        seo: configured?.seo,
        path: `/campus-life/${section}`,
      })
    : {};
}

export default async function SchoolLifeSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "facilities") permanentRedirect("/facilities");
  if (section === "virtual-tour") permanentRedirect("/facilities");
  if (section === "transport") permanentRedirect("/facilities#transportation");
  const configured = await getCmsPage(`campus-life/${section}`);
  const content = configured ? cmsPageToStandard(configured, "School life") : schoolLifePages[section];
  if (!content) notFound();
  return <StandardPage content={content} parentLabel="School life" parentHref="/campus-life" />;
}
