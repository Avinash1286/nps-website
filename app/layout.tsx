import type { Metadata, Viewport } from "next";
import { Providers } from "@/app/providers";
import { getSiteProfile } from "@/lib/data/public";
import { serializeJsonLd } from "@/lib/security/json-ld";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Site metadata and organization details are managed in Convex. Opt the root
// layout out of static prerendering so framework-generated routes (including
// the 404 page) do not attempt a network-backed settings read at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteProfile();
  const title = site.seoTitle ?? site.schoolName;
  const description =
    site.seoDescription ??
    "Official school information, academics, notices, events, admissions, and contact services.";
  const socialImage = site.seoImageUrl ?? "/og.png";

  return {
    metadataBase: new URL(siteUrl),
    applicationName: "NPS Digital Campus",
    title: { default: title, template: `%s | ${site.shortName}` },
    description,
    category: "education",
    keywords: ["Nepal Police School", "NPS Garuda", "school in Rautahat", "Nepal education"],
    icons: {
      icon: site.faviconUrl ?? site.logoUrl ?? "/media/nps-logo.png",
      apple: site.logoUrl ?? "/media/nps-logo.png",
    },
    robots: site.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "website",
      locale: "en_NP",
      siteName: site.schoolName,
      title,
      description,
      url: "/",
      images: [{ url: socialImage, alt: site.schoolName }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#061f4e",
  colorScheme: "light",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const site = await getSiteProfile();
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "School",
    name: site.schoolName,
    url: siteUrl,
    logo: new URL(site.logoUrl ?? "/media/nps-logo.png", siteUrl).toString(),
    description: site.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.location,
      addressLocality: "Garuda",
      addressRegion: "Rautahat",
      addressCountry: "NP",
    },
    ...(site.phone ? { telephone: site.phone } : {}),
    ...(site.email ? { email: site.email } : {}),
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationJsonLd) }}
        />
      </body>
    </html>
  );
}
