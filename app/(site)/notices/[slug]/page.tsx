import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetailPage } from "@/components/site/detail-page";
import { contentMetadata } from "@/lib/content/public-metadata";
import { getNotice } from "@/lib/data/public";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getNotice(slug);
  return item
    ? contentMetadata({
        title: item.title,
        description: item.summary,
        seo: item.seo,
        path: `/notices/${slug}`,
      })
    : {};
}
export default async function NoticeDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getNotice(slug);
  if (!item) notFound();
  return <DetailPage item={item} type="Notice" />;
}
