"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  Activity,
  Bot,
  BookOpenCheck,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  ContactRound,
  FileText,
  FolderKanban,
  GalleryHorizontalEnd,
  GraduationCap,
  Images,
  LayoutDashboard,
  Mail,
  Menu,
  MessageSquareQuote,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  School,
  Settings,
  ShieldCheck,
  Users,
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
};
type NavigationGroup = { label: string; items: NavigationItem[] };

const navigation: NavigationGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        roles: [...ADMIN_ACCESS_ROLES.activeStaff],
      },
    ],
  },
  {
    label: "Website",
    items: [
      { label: "Pages", href: "/admin/pages", icon: FolderKanban, roles: [...ADMIN_ACCESS_ROLES.content] },
      {
        label: "Navigation",
        href: "/admin/navigation",
        icon: Waypoints,
        roles: [...ADMIN_ACCESS_ROLES.navigation],
      },
      {
        label: "Programmes",
        href: "/admin/programs",
        icon: BookOpenCheck,
        roles: [...ADMIN_ACCESS_ROLES.content],
      },
      {
        label: "Departments",
        href: "/admin/departments",
        icon: GraduationCap,
        roles: [...ADMIN_ACCESS_ROLES.content],
      },
      {
        label: "Leadership",
        href: "/admin/leadership",
        icon: ShieldCheck,
        roles: [...ADMIN_ACCESS_ROLES.content],
      },
      {
        label: "Testimonials",
        href: "/admin/testimonials",
        icon: MessageSquareQuote,
        roles: [...ADMIN_ACCESS_ROLES.content],
      },
      {
        label: "Teachers",
        href: "/admin/teachers",
        icon: GraduationCap,
        roles: [...ADMIN_ACCESS_ROLES.content],
      },
    ],
  },
  {
    label: "Publishing",
    items: [
      { label: "News", href: "/admin/news", icon: Newspaper, roles: [...ADMIN_ACCESS_ROLES.content] },
      {
        label: "Notices",
        href: "/admin/notices",
        icon: ClipboardList,
        roles: [...ADMIN_ACCESS_ROLES.content],
      },
      {
        label: "FAQs",
        href: "/admin/faqs",
        icon: CircleHelp,
        roles: [...ADMIN_ACCESS_ROLES.content],
      },
      { label: "Events", href: "/admin/events", icon: CalendarDays, roles: [...ADMIN_ACCESS_ROLES.content] },
      {
        label: "Gallery",
        href: "/admin/gallery",
        icon: GalleryHorizontalEnd,
        roles: [...ADMIN_ACCESS_ROLES.content],
      },
      {
        label: "Documents",
        href: "/admin/documents",
        icon: FileText,
        roles: [...ADMIN_ACCESS_ROLES.content],
      },
      { label: "Media", href: "/admin/media", icon: Images, roles: [...ADMIN_ACCESS_ROLES.content] },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "Admissions",
        href: "/admin/admissions",
        icon: School,
        roles: [...ADMIN_ACCESS_ROLES.admissions],
      },
      {
        label: "Contacts",
        href: "/admin/contacts",
        icon: ContactRound,
        roles: [...ADMIN_ACCESS_ROLES.adminOnly],
      },
      {
        label: "Event registrations",
        href: "/admin/registrations",
        icon: CalendarDays,
        roles: [...ADMIN_ACCESS_ROLES.adminOnly],
      },
      {
        label: "Newsletter",
        href: "/admin/newsletter",
        icon: Mail,
        roles: [...ADMIN_ACCESS_ROLES.adminOnly],
      },
      { label: "AI assistant", href: "/admin/ai", icon: Bot, roles: [...ADMIN_ACCESS_ROLES.adminOnly] },
      {
        label: "Background jobs",
        href: "/admin/jobs",
        icon: Activity,
        roles: [...ADMIN_ACCESS_ROLES.adminOnly],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Users & roles", href: "/admin/users", icon: Users, roles: [...ADMIN_ACCESS_ROLES.adminOnly] },
      {
        label: "Audit log",
        href: "/admin/audit",
        icon: ClipboardList,
        roles: [...ADMIN_ACCESS_ROLES.adminOnly],
      },
      {
        label: "Settings",
        href: "/admin/settings",
        icon: Settings,
        roles: [...ADMIN_ACCESS_ROLES.adminOnly],
      },
    ],
  },
];

export function AdminShell({ children, authConfigured }: { children: ReactNode; authConfigured: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [desktop, setDesktop] = useState(true);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const servicesConfigured = authConfigured && clerkConfigured && convexConfigured;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
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
      );
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

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#0b1e36]">
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
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,calc(100vw-2rem))] flex-col border-r border-white/10 bg-[#071c38] pb-[env(safe-area-inset-bottom)] text-white shadow-2xl transition-[width,transform] duration-200 lg:translate-x-0 ${sidebarCollapsed ? "lg:w-[5.5rem]" : "lg:w-[18rem]"} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <button
          type="button"
          onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
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
            href="/"
            aria-label={sidebarCollapsed ? "Nepal Police School public website" : undefined}
            title={sidebarCollapsed ? "Nepal Police School public website" : undefined}
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
              <b className="block truncate text-sm">Digital Campus</b>
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
            <PanelLeftClose size={17} aria-hidden="true" />
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
                Nepal Police School
              </p>
              <p className="mt-1 truncate text-sm font-bold text-slate-700">Secure administration</p>
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
  return navigation.map((group) => {
    const items = group.items.filter(
      (item) =>
        (item.href === "/admin" && roles.length === 0) || item.roles.some((role) => roles.includes(role)),
    );
    if (!items.length) return null;
    return (
      <div key={group.label} className={collapsed ? "mb-3 lg:mb-4" : "mb-6"}>
        <p
          className={`mb-2 px-3 text-[10px] font-extrabold tracking-[.18em] text-slate-400 uppercase ${collapsed ? "lg:hidden" : ""}`}
        >
          {group.label}
        </p>
        <div className="space-y-1">
          {items.map(({ label, href, icon: Icon }) => {
            const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
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
                  className={active ? "text-white" : "text-slate-400 group-hover:text-sky-300"}
                />
                <span className={`flex-1 ${collapsed ? "lg:hidden" : ""}`}>{label}</span>
                {active && <ChevronRight size={14} className={collapsed ? "lg:hidden" : ""} />}
              </Link>
            );
          })}
        </div>
      </div>
    );
  });
}
