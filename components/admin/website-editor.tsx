"use client";

import { useQuery } from "convex/react";
import {
  ArrowRight,
  BookOpenCheck,
  Building2,
  CalendarDays,
  CircleHelp,
  ExternalLink,
  FileText,
  GalleryHorizontalEnd,
  GraduationCap,
  Home,
  Images,
  LayoutList,
  LoaderCircle,
  MessageSquareQuote,
  Newspaper,
  PanelsTopLeft,
  School,
  Settings,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { ADMIN_ACCESS_ROLES, hasAdminAccess, type AdminRole } from "@/lib/admin/authorization";
import { AdminFeatureGate } from "./admin-gate";
import { usersApi } from "./convex-api";

type WebsiteEditorDestination = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  roles: readonly AdminRole[];
};

export type WebsiteEditorSection = {
  key: "home" | "about" | "academics" | "school" | "admissions" | "updates" | "sitewide";
  title: string;
  description: string;
  publicHref: string;
  icon: LucideIcon;
  destinations: readonly WebsiteEditorDestination[];
};

const contentRoles = ADMIN_ACCESS_ROLES.content;

export const websiteEditorSections: readonly WebsiteEditorSection[] = [
  {
    key: "home",
    title: "Home",
    description:
      "The first page families see: hero slides, section copy, feature cards, and calls to action.",
    publicHref: "/",
    icon: Home,
    destinations: [
      {
        label: "Homepage sections",
        description: "Edit headings, messages, imagery, and section links.",
        href: "/admin/home-sections",
        icon: PanelsTopLeft,
        roles: contentRoles,
      },
      {
        label: "Highlights & hero slides",
        description: "Manage carousel slides, value pillars, and activity cards.",
        href: "/admin/home-cards",
        icon: Sparkles,
        roles: contentRoles,
      },
    ],
  },
  {
    key: "about",
    title: "About",
    description: "School story, institutional information, leadership, and community perspectives.",
    publicHref: "/about",
    icon: School,
    destinations: [
      {
        label: "About pages",
        description: "Edit the About overview, history, mission, and other routed pages.",
        href: "/admin/pages?section=about",
        icon: FileText,
        roles: contentRoles,
      },
      {
        label: "Leadership",
        description: "Maintain leadership profiles, portraits, roles, and messages.",
        href: "/admin/leadership",
        icon: ShieldCheck,
        roles: contentRoles,
      },
      {
        label: "Community voices",
        description: "Review and publish approved testimonials.",
        href: "/admin/testimonials",
        icon: MessageSquareQuote,
        roles: contentRoles,
      },
    ],
  },
  {
    key: "academics",
    title: "Academics",
    description: "Programme pathways, teaching departments, and the public faculty directory.",
    publicHref: "/academics",
    icon: GraduationCap,
    destinations: [
      {
        label: "Academic pages",
        description: "Edit overview, curriculum, primary, secondary, and +2 routed pages.",
        href: "/admin/pages?section=academics",
        icon: FileText,
        roles: contentRoles,
      },
      {
        label: "Programmes",
        description: "Edit grade ranges, curriculum summaries, outcomes, and programme pages.",
        href: "/admin/programs",
        icon: BookOpenCheck,
        roles: contentRoles,
      },
      {
        label: "Departments",
        description: "Maintain subject areas, responsibilities, and department heads.",
        href: "/admin/departments",
        icon: Building2,
        roles: contentRoles,
      },
      {
        label: "Teachers",
        description: "Manage faculty profiles, qualifications, subjects, and contact visibility.",
        href: "/admin/teachers",
        icon: UsersRound,
        roles: contentRoles,
      },
    ],
  },
  {
    key: "school",
    title: "School life",
    description: "Facilities, activities, transport information, virtual tour copy, and school photographs.",
    publicHref: "/campus-life",
    icon: Building2,
    destinations: [
      {
        label: "School life pages",
        description: "Edit facilities, activities, transport, and other routed School life pages.",
        href: "/admin/pages?section=campus-life",
        icon: FileText,
        roles: contentRoles,
      },
      {
        label: "Gallery",
        description: "Organize published albums and their individual media items.",
        href: "/admin/gallery",
        icon: GalleryHorizontalEnd,
        roles: contentRoles,
      },
    ],
  },
  {
    key: "admissions",
    title: "Admissions",
    description:
      "Public admissions guidance, eligibility information, common questions, and downloadable forms.",
    publicHref: "/admissions",
    icon: School,
    destinations: [
      {
        label: "Admissions pages",
        description: "Edit the overview, process, eligibility, fees, and scholarships pages.",
        href: "/admin/pages?section=admissions",
        icon: FileText,
        roles: contentRoles,
      },
      {
        label: "Frequently asked questions",
        description: "Publish approved answers used on the admissions help page.",
        href: "/admin/faqs",
        icon: CircleHelp,
        roles: contentRoles,
      },
      {
        label: "Downloads & documents",
        description: "Publish prospectuses, policies, forms, and academic documents.",
        href: "/admin/documents",
        icon: FileText,
        roles: contentRoles,
      },
    ],
  },
  {
    key: "updates",
    title: "Updates",
    description: "Time-sensitive stories, notices, events, and resources published for the school community.",
    publicHref: "/news",
    icon: Newspaper,
    destinations: [
      {
        label: "News",
        description: "Draft, review, schedule, and publish official school stories.",
        href: "/admin/news",
        icon: Newspaper,
        roles: contentRoles,
      },
      {
        label: "Notices",
        description: "Publish audience-specific notices with priority and attachments.",
        href: "/admin/notices",
        icon: LayoutList,
        roles: contentRoles,
      },
      {
        label: "Events",
        description: "Manage dates, venues, capacity, and public registration availability.",
        href: "/admin/events",
        icon: CalendarDays,
        roles: contentRoles,
      },
      {
        label: "Downloads & documents",
        description: "Maintain the public downloads library.",
        href: "/admin/documents",
        icon: FileText,
        roles: contentRoles,
      },
    ],
  },
  {
    key: "sitewide",
    title: "Sitewide",
    description: "Shared menus, media, school identity, contact details, and public feature controls.",
    publicHref: "/",
    icon: Waypoints,
    destinations: [
      {
        label: "Navigation menus",
        description: "Arrange header, footer, and utility navigation.",
        href: "/admin/navigation",
        icon: Waypoints,
        roles: ADMIN_ACCESS_ROLES.navigation,
      },
      {
        label: "Media library",
        description: "Upload and reuse verified images, files, and video.",
        href: "/admin/media",
        icon: Images,
        roles: contentRoles,
      },
      {
        label: "Site settings",
        description: "Manage identity, contacts, search metadata, and public feature controls.",
        href: "/admin/settings",
        icon: Settings,
        roles: ADMIN_ACCESS_ROLES.adminOnly,
      },
    ],
  },
] as const;

export function websiteEditorSectionsForRoles(roles: readonly string[]): WebsiteEditorSection[] {
  return websiteEditorSections.flatMap((section) => {
    const destinations = section.destinations.filter((destination) =>
      hasAdminAccess(roles, destination.roles),
    );
    return destinations.length ? [{ ...section, destinations }] : [];
  });
}

export function WebsiteEditor() {
  return (
    <AdminFeatureGate requiredRoles={ADMIN_ACCESS_ROLES.content}>
      <WebsiteEditorForCurrentUser />
    </AdminFeatureGate>
  );
}

function WebsiteEditorForCurrentUser() {
  const user = useQuery(usersApi.current, {});
  if (user === undefined || user === null) {
    return (
      <div className="grid min-h-52 place-items-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <LoaderCircle className="mx-auto animate-spin text-sky-700" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-slate-600">Preparing the website editor…</p>
        </div>
      </div>
    );
  }

  const roles = Array.isArray(user.roles) ? user.roles.map(String) : [];
  const sections = websiteEditorSectionsForRoles(roles);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-[#12123a] p-5 text-white shadow-xl shadow-slate-300/40 sm:p-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-400/15 text-sky-200">
              <Waypoints size={21} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-extrabold tracking-[.18em] text-sky-300 uppercase">
                Public site map
              </p>
              <h2 className="mt-2 text-xl font-black">Choose where the change should appear</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                The sections follow the same order visitors use on the public website. Open a workspace below,
                make the change, then publish it when it has been reviewed.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-bold text-sky-100">
            {sections.length} sections available
          </span>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        {sections.map((section) => {
          const SectionIcon = section.icon;
          return (
            <section
              key={section.key}
              aria-labelledby={`website-section-${section.key}`}
              className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-100 bg-gradient-to-br from-sky-50/90 to-white p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-800">
                      <SectionIcon size={19} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h2 id={`website-section-${section.key}`} className="text-lg font-black text-slate-950">
                        {section.title}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{section.description}</p>
                    </div>
                  </div>
                  <Link
                    href={section.publicHref}
                    aria-label={`View ${section.title} on the public website`}
                    title={`View ${section.title} on the public website`}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-sky-200 hover:text-sky-800 focus:ring-2 focus:ring-sky-400 focus:outline-none"
                  >
                    <ExternalLink size={16} aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <div className="flex-1 divide-y divide-slate-100 px-2 py-2">
                {section.destinations.map((destination) => {
                  const DestinationIcon = destination.icon;
                  return (
                    <Link
                      key={`${section.key}-${destination.href}-${destination.label}`}
                      href={destination.href}
                      className="group flex min-h-20 items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-sky-50/70 focus:ring-2 focus:ring-sky-400 focus:outline-none"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-sky-100 group-hover:text-sky-800">
                        <DestinationIcon size={17} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block text-sm text-slate-900">{destination.label}</b>
                        <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                          {destination.description}
                        </span>
                      </span>
                      <ArrowRight
                        size={16}
                        className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-sky-700"
                        aria-hidden="true"
                      />
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
