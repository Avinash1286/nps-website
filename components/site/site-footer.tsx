import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import type { PublicNavigationItem, SiteProfile } from "@/lib/data/public";
import { NewsletterForm } from "@/components/forms/newsletter-form";

type FooterLink = Pick<PublicNavigationItem, "id" | "label" | "href" | "external" | "description">;
type FooterGroup = { title: string; links: readonly FooterLink[] };

const groups: readonly FooterGroup[] = [
  {
    title: "School",
    links: [
      { id: "about", label: "About", href: "/about" },
      { id: "leadership", label: "Leadership", href: "/about/leadership" },
      { id: "testimonials", label: "Community voices", href: "/about/testimonials" },
      { id: "teachers", label: "Teachers", href: "/teachers" },
      { id: "campus-life", label: "Campus life", href: "/campus-life" },
    ],
  },
  {
    title: "Learning",
    links: [
      { id: "academics", label: "Academics", href: "/academics" },
      { id: "curriculum", label: "Curriculum", href: "/academics/curriculum" },
      { id: "departments", label: "Departments", href: "/academics/departments" },
      { id: "library", label: "Library", href: "/academics/library" },
    ],
  },
  {
    title: "Information",
    links: [
      { id: "admissions", label: "Admissions", href: "/admissions" },
      { id: "faqs", label: "Frequently asked questions", href: "/admissions/faq" },
      { id: "notices", label: "Notices", href: "/notices" },
      { id: "events", label: "Events", href: "/events" },
      { id: "downloads", label: "Downloads", href: "/downloads" },
    ],
  },
];

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
  const footerGroups = configuredGroups.length ? configuredGroups : groups;
  return (
    <footer className="bg-[#061d38] text-white">
      <div className="border-b border-white/10 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-3xl bg-[#0b2b4b] p-6 sm:p-8 lg:grid-cols-[1fr_.9fr] lg:items-center">
          <div>
            <p className="text-xs font-bold tracking-[.18em] text-sky-300 uppercase">School updates</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Receive important news by email
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Subscribe for published notices and school updates. You can unsubscribe from any email.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </div>
      <div className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="min-w-0">
            <Link href="/" className="inline-flex max-w-full min-w-0 items-center gap-3">
              <Image
                src={site.logoUrl ?? "/media/nps-logo.png"}
                alt=""
                width={52}
                height={52}
                className="shrink-0 rounded-full bg-white object-contain"
              />
              <span className="min-w-0 text-sm leading-5 font-extrabold uppercase">
                {site.schoolName}
                <br />
                <span className="font-semibold text-sky-200 normal-case">{site.location}</span>
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300">{site.description}</p>
            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <p className="flex min-w-0 items-start gap-2">
                <MapPin size={17} className="mt-0.5 shrink-0 text-sky-300" />
                {site.location}
              </p>
              {site.phone && (
                <a
                  href={`tel:${site.phone.replace(/\s/g, "")}`}
                  className="flex min-w-0 items-center gap-2 hover:text-white"
                >
                  <Phone size={16} className="shrink-0 text-sky-300" />
                  {site.phone}
                </a>
              )}
              {site.secondaryPhone && (
                <a
                  href={`tel:${site.secondaryPhone.replace(/\s/g, "")}`}
                  className="flex min-w-0 items-center gap-2 hover:text-white"
                >
                  <Phone size={16} className="shrink-0 text-sky-300" />
                  {site.secondaryPhone}
                </a>
              )}
              {site.email && (
                <a href={`mailto:${site.email}`} className="flex min-w-0 items-center gap-2 hover:text-white">
                  <Mail size={16} className="shrink-0 text-sky-300" />
                  {site.email}
                </a>
              )}
            </div>
            {Object.keys(site.social).length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2" aria-label="School social media">
                {Object.entries(site.social).map(([network, href]) => (
                  <a
                    key={network}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-white/30 hover:text-white"
                  >
                    {network === "x" ? "X" : network[0].toUpperCase() + network.slice(1)}
                    <ArrowUpRight size={12} />
                  </a>
                ))}
              </div>
            )}
          </div>
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-xs font-extrabold tracking-[.16em] text-sky-300 uppercase">
                {group.title}
              </h2>
              <ul className="mt-5 space-y-3">
                {group.links.map((item) => (
                  <li key={item.id}>
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={item.description}
                        className="text-sm text-slate-300 transition hover:text-white"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        title={item.description}
                        className="text-sm text-slate-300 transition hover:text-white"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-4 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.schoolName}. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/accessibility" className="hover:text-white">
              Accessibility
            </Link>
            <Link href="/admin" className="inline-flex items-center gap-1 hover:text-white">
              Staff portal <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
