import type { Metadata, Viewport } from "next";
import { getSiteProfile } from "@/lib/data/public";
import { schoolSearchAliases } from "@/lib/content/school-search";
import { serializeJsonLd } from "@/lib/security/json-ld";
import { getSiteUrl } from "@/lib/server/site-url";
import "./globals.css";

const siteUrl = getSiteUrl();

// Public CMS data is cached for a short interval in lib/data/public.ts. This
// keeps institutional content fresh without forcing every anonymous request
// through a full server render. Authenticated route groups opt back into
// dynamic rendering in their own layouts.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteProfile();
  const title = site.seoTitle ?? site.schoolName;
  const description =
    site.seoDescription ??
    "Official school information, academics, notices, events, admissions, and contact services.";
  const socialImage = site.seoImageUrl ?? "/og.png";

  return {
    metadataBase: new URL(siteUrl),
    applicationName: "NPS Digital School",
    title: { default: title, template: `%s | ${site.shortName}` },
    description,
    category: "education",
    keywords: [...schoolSearchAliases, "school in Rautahat", "Nepal education"],
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
  themeColor: "#1e1f5c",
  colorScheme: "light",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const site = await getSiteProfile();
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "School",
    name: site.schoolName,
    alternateName: schoolSearchAliases,
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
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        {/* Scroll reveals are progressive enhancement: without scripting the
            content must render in its final state rather than stay hidden. */}
        <noscript>
          <style>{`.reveal{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationJsonLd) }}
        />
      </body>
    </html>
  );
}
