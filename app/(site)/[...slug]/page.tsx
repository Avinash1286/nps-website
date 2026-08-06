import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CmsPageTemplate } from "@/components/site/cms-page-template";
import { contentMetadata } from "@/lib/content/public-metadata";
import { getCmsPage } from "@/lib/data/public";

function routeSlug(parts: string[]) {
  return parts.join("/");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getCmsPage(routeSlug(slug));
  if (!page) return {};
  return contentMetadata({ title: page.title, description: page.summary, seo: page.seo });
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const page = await getCmsPage(routeSlug(slug));
  if (!page) notFound();
  return <CmsPageTemplate page={page} />;
}
