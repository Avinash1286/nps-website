import type { MetadataRoute } from "next";
import { getSiteProfile } from "@/lib/data/public";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const site = await getSiteProfile();
  return {
    rules: site.noIndex
      ? [{ userAgent: "*", disallow: "/" }]
      : [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/sign-in", "/student"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
