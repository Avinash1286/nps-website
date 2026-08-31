import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetailPage } from "@/components/site/detail-page";
import { contentMetadata } from "@/lib/content/public-metadata";
import { getNewsItem } from "@/lib/data/public";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getNewsItem(slug);
  return item
    ? contentMetadata({
        title: item.title,
        description: item.summary,
        seo: item.seo,
        path: `/news/${slug}`,
      })
    : {};
}
export default async function NewsDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getNewsItem(slug);
  if (!item) notFound();
  return <DetailPage item={item} type="News" />;
}
