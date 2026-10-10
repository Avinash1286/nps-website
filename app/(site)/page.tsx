import type { Metadata } from "next";
import { HomePage } from "@/components/home/home-page";
import { getSiteProfile } from "@/lib/data/public";
import {
  schoolSearchAliases,
  schoolSearchDescription,
  schoolSearchName,
  schoolSearchShortName,
} from "@/lib/content/school-search";
import { serializeJsonLd } from "@/lib/security/json-ld";
import { getSiteUrl } from "@/lib/server/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteProfile();
  const title = `${schoolSearchName} | ${schoolSearchShortName}`;
  const description = schoolSearchDescription;
  const image = site.seoImageUrl ?? "/og.png";
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "en_NP",
      siteName: schoolSearchShortName,
      title,
      description,
      url: "/",
      images: [{ url: image, alt: site.schoolName }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function Page() {
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: schoolSearchShortName,
    alternateName: schoolSearchAliases,
    url: getSiteUrl(),
    description: schoolSearchDescription,
  };

  return (
    <>
      <HomePage />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }}
      />
    </>
  );
}
