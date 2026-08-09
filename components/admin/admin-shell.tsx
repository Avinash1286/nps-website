"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  Activity,
  Bot,
  BookOpenCheck,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  ContactRound,
  FileText,
  FolderKanban,
  GalleryHorizontalEnd,
  Globe2,
  Home,
  Images,
  LayoutDashboard,
  LayoutList,
  Mail,
  Menu,
  MessageSquareQuote,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  School,
  ScrollText,
  Settings,
  ShieldCheck,
  Tickets,
  Users,
  UsersRound,
  Waypoints,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { ADMIN_ACCESS_ROLES, type AdminRole } from "@/lib/admin/authorization";
import { clerkConfigured, convexConfigured } from "./admin-gate";
import { AdminSessionSync } from "./admin-session-sync";
import { usersApi } from "./convex-api";

type NavigationItem = {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  roles: AdminRole[];
  description: string;
  searchTerms?: string;
};
type NavigationGroup = { label: string; description: string; items: NavigationItem[] };

export const adminNavigation: NavigationGroup[] = [
  {
    label: "Overview",
    description: "Start here",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        roles: [...ADMIN_ACCESS_ROLES.activeStaff],
        description: "Activity, metrics and common tasks",
      },
      {
        label: "Edit website",
        href: "/admin/website",
        icon: Globe2,
        roles: [...ADMIN_ACCESS_ROLES.content],
        description: "Choose the page exactly as visitors see it",
        searchTerms: "website editor content map public site start here",
      },
    ],
  },
  {
    label: "Home & site",
    description: "Homepage and site structure",
    items: [
      {
        label: "Homepage sections",
        href: "/admin/home-sections",
        icon: Home,
        roles: [...ADMIN_ACCESS_ROLES.content],
        description: "Hero, welcome and feature sections",
        searchTerms: "homepage front page hero welcome features call to action",
      },
      {
        label: "Homepage highlights",
        href: "/admin/home-cards",
        icon: LayoutList,
        roles: [...ADMIN_ACCESS_ROLES.content],
        description: "Slides, value pillars and activity cards",
        searchTerms: "home cards carousel slides values activities eca",
      },
      {
        label: "Website pages",
        href: "/admin/pages",
        icon: FolderKanban,
        roles: [...ADMIN_ACCESS_ROLES.content],
        description: "About, academics, School life, and admissions pages",
        searchTerms: "history mission vision curriculum facilities transport eligibility fees custom pages",
      },
      {
        label: "Navigation menus",
        href: "/admin/navigation",
        icon: Waypoints,
        roles: [...ADMIN_ACCESS_ROLES.navigation],
        description: "Header, footer and utility links",
        searchTerms: "menu links header footer navbar",
      },
    ],
  },
  {
    label: "About",
    description: "School identity and people",
    items: [
      {
        label: "Leadership",
        href: "/admin/leadership",
        icon: ShieldCheck,
        roles: [...ADMIN_ACCESS_ROLES.content],
        description: "Leadership profiles and messages",
        searchTerms: "principal management people about",
      },
      {
        label: "Testimonials",
        href: "/admin/testimonials",
        icon: MessageSquareQuote,
        roles: [...ADMIN_ACCESS_ROLES.content],
        description: "Community voices and quotations",
        searchTerms: "reviews alumni parents students community voices",
      },
    ],
  },
  {
    label: "Academics",
    description: "Learning programmes and staff",
    items: [
      {
        label: "Programmes",
        href: "/admin/programs",
        icon: BookOpenCheck,
        roles: [...ADMIN_ACCESS_ROLES.content],
        description: "Primary, secondary and +2 programmes",
        searchTerms: "courses primary secondary plus 2 curriculum academics",
      },
      {
        label: "Departments",
        href: "/admin/departments",
        icon: Building2,
        roles: [...ADMIN_ACCESS_ROLES.content],
        description: "Academic departments and responsibilities",
        searchTerms: "faculty subjects academics",
      },
      {
        label: "Teachers",
        href: "/admin/teachers",
        icon: UsersRound,
        roles: [...ADMIN_ACCESS_ROLES.content],
        description: "Teacher profiles, subjects and contacts",
        searchTerms: "staff faculty academics people",
      },
    ],
  },
  {
    label: "School life",
    description: "School activities and media",
    items: [
      {
        label: "Facilities",
        href: "/admin/facilities",
        icon: Building2,
        roles: [...ADMIN_ACCESS_ROLES.content],
        description: "Facility cards, evidence, images, and verification status",
        searchTerms: "facilities classrooms labs library hostel dining medical sports transport grounds",
      },
      {
        label: "Gallery",
        href: "/admin/gallery",
        icon: GalleryHorizontalEnd,
        roles: [...ADMIN_ACCESS_ROLES.content],
        description: "Public photo and video albums",
        searchTerms: "school photos videos albums",
      },
      {
        label: "Media library",
        href: "/admin/media",
        icon: Images,
        roles: [...ADMIN_ACCESS_ROLES.content],
        description: "Uploaded images and reusable files",
        searchTerms: "uploads assets photos files images",
      },
    ],
  },
  {
    label: "Admissions",
    description: "Admissions content and applications",
    items: [
      {
        label: "Admission applications",
        href: "/admin/admissions",
        icon: School,
        roles: [...ADMIN_ACCESS_ROLES.admissions],
        description: "Review and manage submitted applications",
        searchTerms: "admissions enquiries forms applicants students",
      },
      {
        label: "Admissions FAQs",
        href: "/admin/faqs",
        icon: CircleHelp,
        roles: [...ADMIN_ACCESS_ROLES.content],
        description: "Published questions and answers",
        searchTerms: "frequently asked questions help ai assistant",
      },
    ],
  },
  {
    label: "Updates",
    description: "News, notices and resources",
    items: [
      {
        label: "News",
        href: "/admin/news",
        icon: Newspaper,
        roles: [...ADMIN_ACCESS_ROLES.content],
        description: "School stories and published updates",
        searchTerms: "articles stories announcements",
      },
      {
        label: "Notices",
        href: "/admin/notices",
        icon: ClipboardList,
        roles: [...ADMIN_ACCESS_ROLES.content],
        description: "Official notices and announcements",
        searchTerms: "urgent alerts updates",
      },
      {
        label: "Events",
        href: "/admin/events",
        icon: CalendarDays,
        roles: [...ADMIN_ACCESS_ROLES.content],
        description: "Calendar, capacity and registration settings",
        searchTerms: "dates calendar activities schedule",
      },
      {
        label: "Downloads & documents",
        href: "/admin/documents",
        icon: FileText,
        roles: [...ADMIN_ACCESS_ROLES.content],
        description: "Public forms, files and resources",
        searchTerms: "downloads files resources documents",
      },
    ],
  },
  {
    label: "Communications",
    description: "Enquiries and audience engagement",
    items: [
      {
        label: "Contact enquiries",
        href: "/admin/contacts",
        icon: ContactRound,
        roles: [...ADMIN_ACCESS_ROLES.adminOnly],
        description: "Messages submitted through the contact form",
        searchTerms: "contacts inbox messages support",
      },
      {
        label: "Event registrations",
        href: "/admin/registrations",
        icon: Tickets,
        roles: [...ADMIN_ACCESS_ROLES.adminOnly],
        description: "Attendees and registration records",
        searchTerms: "events bookings attendees",
      },
      {
        label: "Newsletter",
        href: "/admin/newsletter",
        icon: Mail,
        roles: [...ADMIN_ACCESS_ROLES.adminOnly],
        description: "Subscribers and email campaigns",
        searchTerms: "mailing list email outreach",
      },
    ],
  },
  {
    label: "AI & automation",
    description: "Digital support and reliable delivery",
    items: [
      {
        label: "AI assistant",
        href: "/admin/ai",
        icon: Bot,
        roles: [...ADMIN_ACCESS_ROLES.adminOnly],
        description: "Knowledge context and Gemini settings",
        searchTerms: "chatbot context gemini knowledge digital support",
      },
      {
        label: "Background jobs",
        href: "/admin/jobs",
        icon: Activity,
        roles: [...ADMIN_ACCESS_ROLES.adminOnly],
        description: "Delivery queue, failures and retries",
        searchTerms: "automation queue cron retry email",
      },
    ],
  },
  {
    label: "Administration",
    description: "Access, security and configuration",
    items: [
      {
        label: "Users & roles",
        href: "/admin/users",
        icon: Users,
        roles: [...ADMIN_ACCESS_ROLES.adminOnly],
        description: "Approvals, roles and account access",
        searchTerms: "permissions staff administrators",
      },
      {
        label: "Audit log",
        href: "/admin/audit",
        icon: ScrollText,
        roles: [...ADMIN_ACCESS_ROLES.adminOnly],
        description: "History of administrative changes",
        searchTerms: "security activity records history",
      },
      {
        label: "Site settings",
        href: "/admin/settings",
        icon: Settings,
        roles: [...ADMIN_ACCESS_ROLES.adminOnly],
        description: "School profile, contact details and site controls",
        searchTerms: "logo school seo configuration maintenance contact",
      },
    ],
  },
];

const navigationItemsByHref = new Map(
  adminNavigation.flatMap((group) => group.items.map((item) => [item.href, item] as const)),
);

function navigationItems(...hrefs: string[]): NavigationItem[] {
  return hrefs.map((href) => navigationItemsByHref.get(href)).filter((item) => item !== undefined);
}

/**
 * The default sidebar is intentionally task-oriented. Detailed website editors
 * remain available through Edit website and appear when the sidebar is searched.
 */
export const primaryAdminNavigation: NavigationGroup[] = [
  {
    label: "Start",
    description: "Overview and website editing",
    items: navigationItems("/admin", "/admin/website", "/admin/facilities"),
  },
  {
    label: "Publish",
    description: "Share updates and resources",
    items: navigationItems("/admin/news", "/admin/notices", "/admin/events", "/admin/documents"),
  },
  {
    label: "Requests",
    description: "Applications and messages",
    items: navigationItems(
      "/admin/admissions",
      "/admin/contacts",
      "/admin/registrations",
      "/admin/newsletter",
    ),
  },
  {
    label: "Tools",
    description: "Media, AI, and delivery",
    items: navigationItems("/admin/media", "/admin/ai", "/admin/jobs"),
  },
  {
    label: "Administration",
    description: "Menus, access, and settings",
    items: navigationItems("/admin/navigation", "/admin/users", "/admin/audit", "/admin/settings"),
  },
];

export function isAdminNavigationItemActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function currentNavigationLocation(pathname: string) {
  for (const group of adminNavigation) {
    const item = group.items.find((candidate) => isAdminNavigationItemActive(pathname, candidate.href));
    if (item) return { group, item };
  }
  return null;
}

export function AdminShell({ children, authConfigured }: { children: ReactNode; authConfigured: boolean }) {
  const pathname = usePathname();
  const currentLocation = currentNavigationLocation(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [desktop, setDesktop] = useState(true);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const servicesConfigured = authConfigured && clerkConfigured && convexConfigured;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSidebarCollapsed(window.localStorage.getItem("nps-admin-sidebar-collapsed") === "true");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => {
      setDesktop(media.matches);
      if (media.matches) setMobileOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const menuButton = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab" || !asideRef.current) return;
      const focusable = Array.from(
        asideRef.current.querySelectorAll<HTMLElement>(
          "a[href],button:not([disabled]),[tabindex]:not([tabindex='-1'])",
        ),
      ).filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      menuButton?.focus();
    };
  }, [mobileOpen]);

  function toggleSidebar() {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      window.localStorage.setItem("nps-admin-sidebar-collapsed", String(next));
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[#f4f5fd] text-[#12123a]">
      <AdminSessionSync />
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        id="admin-navigation-panel"
        ref={asideRef}
        data-collapsed={sidebarCollapsed ? "true" : "false"}
        role={mobileOpen && !desktop ? "dialog" : undefined}
        aria-modal={mobileOpen && !desktop ? "true" : undefined}
        aria-label={mobileOpen && !desktop ? "Administration navigation" : undefined}
        inert={!desktop && !mobileOpen ? true : undefined}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,calc(100vw-2rem))] flex-col border-r border-white/10 bg-[#12123a] pb-[env(safe-area-inset-bottom)] text-white shadow-2xl transition-[width,transform] duration-200 lg:translate-x-0 ${sidebarCollapsed ? "lg:w-[5.5rem]" : "lg:w-[18rem]"} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute top-6 -right-3.5 z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:border-sky-300 hover:text-sky-700 focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:outline-none lg:inline-flex"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!sidebarCollapsed}
          aria-controls="admin-navigation-panel"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>

        <div
          className={`flex h-20 items-center justify-between border-b border-white/10 px-5 ${sidebarCollapsed ? "lg:justify-center lg:px-3" : ""}`}
        >
          <Link
            href="/admin"
            aria-label={sidebarCollapsed ? "Administration dashboard" : undefined}
            title={sidebarCollapsed ? "Administration dashboard" : undefined}
            className={`flex min-w-0 items-center gap-3 rounded-lg focus:ring-2 focus:ring-sky-300 focus:outline-none ${sidebarCollapsed ? "lg:justify-center" : ""}`}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1 shadow-lg shadow-sky-950/40">
              <Image
                src="/media/nps-logo.png"
                alt="Nepal Police School emblem"
                width={44}
                height={44}
                className="h-full w-full object-contain"
                priority
              />
            </span>
            <span className={`min-w-0 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
              <b className="block truncate text-sm">Digital School</b>
              <span className="block truncate text-[11px] text-sky-200">Administration console</span>
            </span>
          </Link>
          <button
            ref={closeButtonRef}
            onClick={() => setMobileOpen(false)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav
          aria-label="Administration"
          className={`flex-1 overflow-y-auto px-3 py-5 ${sidebarCollapsed ? "lg:px-2" : ""}`}
        >
          {servicesConfigured ? (
            <RoleAwareNavigation
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
              collapsed={sidebarCollapsed}
            />
          ) : (
            <NavigationLinks
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
              roles={[]}
              collapsed={sidebarCollapsed}
            />
          )}
        </nav>

        <div className={`border-t border-white/10 p-4 ${sidebarCollapsed ? "lg:p-3" : ""}`}>
          <Link
            href="/"
            aria-label={sidebarCollapsed ? "View public website" : undefined}
            title={sidebarCollapsed ? "View public website" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-300 hover:bg-white/8 hover:text-white ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}
          >
            <Globe2 size={17} aria-hidden="true" />
            <span className={sidebarCollapsed ? "lg:hidden" : ""}>View public website</span>
          </Link>
        </div>
      </aside>

      <div
        data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}
        className={`transition-[padding] duration-200 ${sidebarCollapsed ? "lg:pl-[5.5rem]" : "lg:pl-[18rem]"}`}
      >
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/90 bg-white/90 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              ref={menuButtonRef}
              onClick={() => setMobileOpen(true)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 p-2.5 text-slate-700 hover:bg-slate-50 lg:hidden"
              aria-label="Open administration menu"
              aria-expanded={mobileOpen}
              aria-controls="admin-navigation-panel"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-extrabold tracking-[.18em] text-sky-700 uppercase">
                Nepal Police School{currentLocation ? ` · ${currentLocation.group.label}` : ""}
              </p>
              <p className="mt-1 truncate text-sm font-bold text-slate-700">
                {currentLocation?.item.label ?? "Secure administration"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`hidden rounded-full px-3 py-1.5 text-xs font-bold sm:inline-flex ${authConfigured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}
            >
              {authConfigured ? "Protected session" : "Setup mode"}
            </span>
            {authConfigured ? (
              <UserButton />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-600">
                NPS
              </span>
            )}
          </div>
        </header>
        <main id="main-content" className="mx-auto w-full max-w-[96rem] px-4 py-7 sm:px-7 sm:py-10 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}

function RoleAwareNavigation({
  pathname,
  onNavigate,
  collapsed,
}: {
  pathname: string;
  onNavigate: () => void;
  collapsed: boolean;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const user = useQuery(usersApi.current, isLoaded && isSignedIn ? {} : "skip");
  const roles =
    user?.status === "active" && Array.isArray(user.roles)
      ? user.roles.filter((role): role is AdminRole =>
          ["admin", "publisher", "editor", "admissions"].includes(String(role)),
        )
      : [];
  if (user === undefined) {
    return (
      <div className={`space-y-3 px-2 ${collapsed ? "lg:px-0" : ""}`} aria-label="Loading navigation">
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={`block h-11 animate-pulse rounded-xl bg-white/8 ${collapsed ? "lg:mx-auto lg:w-11" : ""}`}
          />
        ))}
      </div>
    );
  }
  return <NavigationLinks pathname={pathname} onNavigate={onNavigate} roles={roles} collapsed={collapsed} />;
}

function NavigationLinks({
  pathname,
  onNavigate,
  roles,
  collapsed,
}: {
  pathname: string;
  onNavigate: () => void;
  roles: AdminRole[];
  collapsed: boolean;
}) {
  const [query, setQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    const activeGroup = primaryAdminNavigation.find((group) =>
      group.items.some((item) => isAdminNavigationItemActive(pathname, item.href)),
    );
    return [activeGroup?.label ?? "Start"];
  });
  const normalizedQuery = query.trim().toLocaleLowerCase("en-US");
  const baseGroups = normalizedQuery ? adminNavigation : primaryAdminNavigation;
  const activeLocation = currentNavigationLocation(pathname);
  const activeIsInBase = baseGroups.some((group) =>
    group.items.some((item) => isAdminNavigationItemActive(pathname, item.href)),
  );
  const navigationGroups =
    !normalizedQuery && activeLocation && !activeIsInBase
      ? [
          baseGroups[0],
          {
            label: "Current editor",
            description: "The workspace you have open",
            items: [activeLocation.item],
          },
          ...baseGroups.slice(1),
        ]
      : baseGroups;
  const roleVisibleGroups = navigationGroups.flatMap((group) => {
    const items = group.items.filter(
      (item) =>
        (item.href === "/admin" && roles.length === 0) || item.roles.some((role) => roles.includes(role)),
    );
    return items.length ? [{ ...group, items }] : [];
  });
  const visibleGroups = roleVisibleGroups.flatMap((group) => {
    if (!normalizedQuery) return [group];
    if (group.label.toLocaleLowerCase("en-US").includes(normalizedQuery)) return [group];
    const items = group.items.filter((item) =>
      [item.label, item.description, item.searchTerms ?? ""]
        .join(" ")
        .toLocaleLowerCase("en-US")
        .includes(normalizedQuery),
    );
    return items.length ? [{ ...group, items }] : [];
  });
  const activeGroupLabel = roleVisibleGroups.find((group) =>
    group.items.some((item) => isAdminNavigationItemActive(pathname, item.href)),
  )?.label;

  function toggleGroup(label: string) {
    setExpandedGroups((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    );
  }

  return (
    <>
      <div className={`sticky top-0 z-10 mb-4 bg-[#12123a] pb-1 ${collapsed ? "lg:hidden" : ""}`}>
        <label className="relative block">
          <span className="sr-only">Find an administration section</span>
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a section…"
            className="h-11 w-full rounded-xl border border-white/10 bg-white/7 pr-10 pl-10 text-sm text-white outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear section search"
              className="absolute top-1/2 right-1.5 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </label>
      </div>

      {visibleGroups.length ? (
        visibleGroups.map((group, groupIndex) => {
          const groupId = `admin-navigation-group-${groupIndex}`;
          const expanded =
            Boolean(normalizedQuery) ||
            expandedGroups.includes(group.label) ||
            activeGroupLabel === group.label;
          return (
            <section
              key={group.label}
              aria-labelledby={`${groupId}-heading`}
              className={`border-b border-white/8 py-2 last:border-0 ${collapsed ? "lg:py-1" : ""}`}
            >
              <button
                id={`${groupId}-heading`}
                type="button"
                onClick={() => toggleGroup(group.label)}
                aria-expanded={expanded}
                aria-controls={groupId}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-white/6 focus:ring-2 focus:ring-sky-400 focus:outline-none ${collapsed ? "lg:hidden" : ""}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-extrabold tracking-[.16em] text-slate-300 uppercase">
                    {group.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                    {group.description}
                  </span>
                </span>
                <ChevronDown
                  size={15}
                  aria-hidden="true"
                  className={`shrink-0 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              </button>
              <ul
                id={groupId}
                className={`${expanded ? "mt-1 space-y-1" : "hidden"} ${collapsed ? "lg:mt-0 lg:block lg:space-y-1" : ""}`}
              >
                {group.items.map(({ label, href, icon: Icon, description }) => {
                  const active = isAdminNavigationItemActive(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={onNavigate}
                        aria-label={collapsed ? label : undefined}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? label : undefined}
                        className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${collapsed ? "lg:justify-center lg:px-0" : ""} ${
                          active
                            ? "bg-sky-500 text-white shadow-lg shadow-sky-950/30"
                            : "text-slate-300 hover:bg-white/8 hover:text-white"
                        }`}
                      >
                        <Icon
                          size={17}
                          aria-hidden="true"
                          className={`shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-sky-300"}`}
                        />
                        <span className={`min-w-0 flex-1 ${collapsed ? "lg:hidden" : ""}`}>
                          <span className="block truncate">{label}</span>
                          <span
                            className={`mt-0.5 block truncate text-[11px] font-normal ${active ? "text-sky-50" : "text-slate-400 group-hover:text-slate-200"}`}
                          >
                            {description}
                          </span>
                        </span>
                        {active && <ChevronRight size={14} className={collapsed ? "lg:hidden" : ""} />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      ) : (
        <div
          className={`rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center ${collapsed ? "lg:hidden" : ""}`}
        >
          <p className="text-sm font-bold text-white">No matching section</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Try a page name such as “notices” or “teachers”.
          </p>
        </div>
      )}
    </>
  );
}
