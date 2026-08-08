import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import type { PublicNavigationItem, SiteProfile } from "@/lib/data/public";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import { Reveal } from "@/components/site/reveal";

type FooterLink = Pick<PublicNavigationItem, "id" | "label" | "href" | "external" | "description">;
type FooterGroup = { title: string; links: readonly FooterLink[] };

export function SiteFooter({
  site,
  navigationItems = [],
}: {
  site: SiteProfile;
  navigationItems?: PublicNavigationItem[];
}) {
  const roots = navigationItems.filter((item) => !item.parentId);
  const configuredGroups: FooterGroup[] = roots.flatMap((item) => {
    const children = navigationItems.filter((candidate) => candidate.parentId === item.id);
    return children.length ? [{ title: item.label, links: children }] : [];
  });
  const standalone = roots.filter(
    (item) => !navigationItems.some((candidate) => candidate.parentId === item.id),
  );
  if (standalone.length)
    configuredGroups.push({
      title: "Explore",
      links: standalone,
    });
  const footerGroups = configuredGroups;
  return (
    <footer className="relative isolate overflow-hidden bg-[#12123a] text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage: "radial-gradient(60% 70% at 12% 0%, rgba(74,81,189,.40) 0%, rgba(18,18,58,0) 70%)",
        }}
      />
      <div className="border-b border-white/10 px-4 py-14 sm:px-6 lg:px-8">
        <Reveal className="mx-auto grid max-w-7xl gap-8 rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-sm sm:p-10 lg:grid-cols-[1fr_.9fr] lg:items-center">
          <div>
            <p className="flex items-center gap-3 text-[11px] font-extrabold tracking-[.24em] text-[#f0bd3a] uppercase">
              <span aria-hidden="true" className="rule-sweep h-px w-9 bg-[#f0bd3a]" />
              School updates
            </p>
            <h2 className="mt-4 text-2xl font-extrabold tracking-[-.03em] sm:text-3xl">
              Receive important news by email
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
              Subscribe for published notices and school updates. You can unsubscribe from any email.
            </p>
          </div>
          <NewsletterForm />
        </Reveal>
      </div>
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <Reveal className="min-w-0">
            <Link href="/" className="group inline-flex max-w-full min-w-0 items-center gap-3">
              <Image
                src={site.logoUrl ?? "/media/nps-logo.png"}
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 rounded-full bg-white object-contain transition duration-500 group-hover:scale-105"
              />
              <span className="min-w-0 text-sm leading-5 font-extrabold uppercase">
                {site.schoolName}
                <br />
                <span className="text-[11px] font-semibold tracking-[.12em] text-[#f0bd3a]">
                  {site.location}
                </span>
              </span>
            </Link>
            <p className="mt-6 max-w-sm text-sm leading-7 text-slate-400">{site.description}</p>
            <div className="mt-6 space-y-3 text-sm text-slate-300">
              <p className="flex min-w-0 items-start gap-2.5">
                <MapPin size={17} className="mt-0.5 shrink-0 text-[#f0bd3a]" />
                {site.location}
              </p>
              {site.phone && (
                <a
                  href={`tel:${site.phone.replace(/\s/g, "")}`}
                  className="flex min-w-0 items-center gap-2.5 transition hover:text-white"
                >
                  <Phone size={16} className="shrink-0 text-[#f0bd3a]" />
                  {site.phone}
                </a>
              )}
              {site.secondaryPhone && (
                <a
                  href={`tel:${site.secondaryPhone.replace(/\s/g, "")}`}
                  className="flex min-w-0 items-center gap-2.5 transition hover:text-white"
                >
                  <Phone size={16} className="shrink-0 text-[#f0bd3a]" />
                  {site.secondaryPhone}
                </a>
              )}
              {site.email && (
                <a
                  href={`mailto:${site.email}`}
                  className="flex min-w-0 items-center gap-2.5 transition hover:text-white"
                >
                  <Mail size={16} className="shrink-0 text-[#f0bd3a]" />
                  {site.email}
                </a>
              )}
            </div>
            {Object.keys(site.social).length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2" aria-label="School social media">
                {Object.entries(site.social).map(([network, href]) => (
                  <a
                    key={network}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-bold text-slate-200 transition duration-300 hover:-translate-y-0.5 hover:border-[#f0bd3a]/50 hover:text-white"
                  >
                    {network === "x" ? "X" : network[0].toUpperCase() + network.slice(1)}
                    <ArrowUpRight size={12} />
                  </a>
                ))}
              </div>
            )}
          </Reveal>
          {footerGroups.map((group, index) => (
            <Reveal key={group.title} delay={90 + index * 80}>
              <h2 className="text-[11px] font-extrabold tracking-[.2em] text-[#f0bd3a] uppercase">
                {group.title}
              </h2>
              <ul className="mt-6 space-y-3.5">
                {group.links.map((item) => (
                  <li key={item.id}>
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={item.description}
                        className="inline-block text-sm text-slate-400 transition duration-300 hover:translate-x-1 hover:text-white"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        title={item.description}
                        className="inline-block text-sm text-slate-400 transition duration-300 hover:translate-x-1 hover:text-white"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
        <div className="mx-auto mt-14 flex max-w-7xl flex-col gap-4 border-t border-white/10 pt-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.schoolName}. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/privacy" className="transition hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Terms
            </Link>
            <Link href="/accessibility" className="transition hover:text-white">
              Accessibility
            </Link>
            <Link href="/admin" className="inline-flex items-center gap-1 transition hover:text-white">
              Staff portal <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
