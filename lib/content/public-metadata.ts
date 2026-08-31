import type { Metadata } from "next";
import type { PublicSeo } from "@/lib/data/public";

export function contentMetadata({
  title,
  description,
  seo,
  path,
}: {
  title: string;
  description?: string;
  seo?: PublicSeo;
  path?: string;
}): Metadata {
  const resolvedTitle = seo?.title ?? title;
  const resolvedDescription = seo?.description ?? description;
  const images = [seo?.imageUrl ?? "/og.png"];
  return {
    title: resolvedTitle,
    description: resolvedDescription,
    alternates: path ? { canonical: path } : undefined,
    robots: seo?.noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      title: resolvedTitle,
      description: resolvedDescription,
      url: path,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description: resolvedDescription,
      images,
    },
  };
}
