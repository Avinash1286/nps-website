import type { Metadata } from "next";
import type { PublicSeo } from "@/lib/data/public";

export function contentMetadata({
  title,
  description,
  seo,
}: {
  title: string;
  description?: string;
  seo?: PublicSeo;
}): Metadata {
  return {
    title: seo?.title ?? title,
    description: seo?.description ?? description,
    robots: seo?.noIndex ? { index: false, follow: true } : undefined,
    openGraph: seo?.imageUrl ? { images: [seo.imageUrl] } : undefined,
  };
}
