import type { Metadata } from "next";
import { AssistantAvailability } from "@/components/assistant/assistant-availability";
import { MaintenanceGate } from "@/components/site/maintenance-gate";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getNavigation, getSiteProfile } from "@/lib/data/public";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteProfile();
  const socialImage = site.seoImageUrl ?? "/og.png";
  return {
    title: { default: site.seoTitle ?? site.schoolName, template: `%s | ${site.shortName}` },
    description:
      site.seoDescription ??
      "Official information, academics, admissions, notices, events, and resources from Nepal Police School, Garuda, Rautahat.",
    openGraph: {
      type: "website",
      siteName: site.schoolName,
      images: [{ url: socialImage, alt: site.schoolName }],
    },
    twitter: { card: "summary_large_image", images: [socialImage] },
  };
}

export default async function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [site, headerNavigation, footerNavigation, utilityNavigation] = await Promise.all([
    getSiteProfile(),
    getNavigation("header"),
    getNavigation("footer"),
    getNavigation("utility"),
  ]);

  return (
    <MaintenanceGate
      enabled={site.maintenanceMode}
      fallback={
        <main
          id="main-content"
          className="grid min-h-screen min-w-0 place-items-center bg-[#061d38] px-4 py-12 [overflow-wrap:anywhere] text-white sm:px-5 sm:py-16"
        >
          <section className="w-full max-w-2xl rounded-3xl border border-white/15 bg-white/5 p-6 text-center shadow-2xl backdrop-blur sm:p-12">
            <p className="text-xs font-extrabold tracking-[.2em] text-sky-300 uppercase">
              Scheduled maintenance
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              The school website will be back shortly.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-200">
              {site.schoolName} is completing a website update. Please use the verified contact details below
              for time-sensitive school matters.
            </p>
            <div className="mt-8 space-y-2 text-sm text-slate-200">
              <p>{site.location}</p>
              {site.phone && (
                <p>
                  <a className="font-bold text-white underline" href={`tel:${site.phone.replace(/\s/g, "")}`}>
                    {site.phone}
                  </a>
                </p>
              )}
              {site.email && (
                <p>
                  <a className="font-bold text-white underline" href={`mailto:${site.email}`}>
                    {site.email}
                  </a>
                </p>
              )}
            </div>
          </section>
        </main>
      }
    >
      <div className="min-h-screen min-w-0 bg-white [overflow-wrap:anywhere] text-[#173f61]">
        <SiteHeader
          schoolName={site.schoolName}
          location={site.location}
          tagline={site.tagline}
          logoUrl={site.logoUrl}
          admissionsOpen={site.admissionsOpen}
          navigationItems={headerNavigation}
          utilityNavigationItems={utilityNavigation}
        />
        <main id="main-content" className="min-w-0">
          {children}
        </main>
        <SiteFooter site={site} navigationItems={footerNavigation} />
        <AssistantAvailability initialEnabled={site.assistantEnabled} />
      </div>
    </MaintenanceGate>
  );
}
