import type { MetadataRoute } from "next";
import { getSiteProfile } from "@/lib/data/public";
import { getSiteUrl } from "@/lib/server/site-url";

export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = getSiteUrl();
  const site = await getSiteProfile();
  return {
    rules: site.noIndex
      ? [{ userAgent: "*", disallow: "/" }]
      : [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/sign-in", "/student"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
