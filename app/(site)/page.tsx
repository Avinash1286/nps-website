import type { Metadata } from "next";
import { HomePage } from "@/components/home/home-page";
import { getSiteProfile } from "@/lib/data/public";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteProfile();
  const title = site.seoTitle ?? site.schoolName;
  const description = site.seoDescription ?? site.description;
  const image = site.seoImageUrl ?? "/og.png";
  return {
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "en_NP",
      title,
      description,
      url: "/",
      images: [{ url: image, alt: site.schoolName }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function Page() {
  return <HomePage />;
}
