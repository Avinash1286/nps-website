"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicNavigationItem } from "@/lib/data/public";
import { useModalFocus } from "@/components/site/use-modal-focus";

type NavigationChild = readonly [label: string, href: string, external?: boolean, description?: string];
type NavigationGroup = {
  label: string;
  href: string;
  external?: boolean;
  description?: string;
  items: readonly NavigationChild[];
};

function NavigationLink({
  href,
  external,
  description,
  className,
  children,
  onClick,
  onMouseEnter,
  ariaCurrent,
}: {
  href: string;
  external?: boolean;
  description?: string;
  className: string;
  children: React.ReactNode;
  onClick?: () => void;
  onMouseEnter?: () => void;
  ariaCurrent?: "page";
}) {
  return external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={description}
      className={className}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      aria-current={ariaCurrent}
    >
      {children}
    </a>
  ) : (
    <Link
      href={href}
      title={description}
      className={className}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      aria-current={ariaCurrent}
    >
      {children}
    </Link>
  );
}

function isNavigationActive(pathname: string, href: string) {
  if (!href.startsWith("/")) return false;
  const path = href.split(/[?#]/, 1)[0];
  return path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
}

function isNavigationCurrent(pathname: string, href: string) {
  if (!href.startsWith("/")) return false;
  return pathname === href.split(/[?#]/, 1)[0];
}

const defaultNavigation = [
  {
    label: "About",
    href: "/about",
    items: [
      ["Overview", "/about"],
      ["History", "/about/history"],
      ["Mission & vision", "/about/mission-vision"],
      ["Leadership", "/about/leadership"],
      ["Community voices", "/about/testimonials"],
    ],
  },
  {
    label: "Academics",
    href: "/academics",
    items: [
      ["Overview", "/academics"],
      ["Primary", "/academics/primary"],
      ["Secondary", "/academics/secondary"],
      ["+2 programmes", "/academics/plus-2"],
      ["Curriculum", "/academics/curriculum"],
      ["Departments", "/academics/departments"],
      ["Teachers", "/teachers"],
    ],
  },
  {
    label: "Campus life",
    href: "/campus-life",
    items: [
      ["Overview", "/campus-life"],
      ["Facilities", "/campus-life/facilities"],
      ["Activities", "/campus-life/activities"],
      ["Gallery", "/campus-life/gallery"],
      ["Virtual tour", "/campus-life/virtual-tour"],
      ["Transport", "/campus-life/transport"],
    ],
  },
  {
    label: "Admissions",
    href: "/admissions",
    items: [
      ["Overview", "/admissions"],
      ["Process", "/admissions/process"],
      ["Eligibility", "/admissions/eligibility"],
      ["Fees & scholarships", "/admissions/fees-scholarships"],
      ["FAQ", "/admissions/faq"],
      ["Enquire online", "/admissions/apply"],
    ],
  },
  {
    label: "Updates",
    href: "/news",
    items: [
      ["News", "/news"],
      ["Notices", "/notices"],
      ["Events", "/events"],
      ["Downloads", "/downloads"],
    ],
  },
] as const satisfies readonly NavigationGroup[];

export function SiteHeader({
  schoolName,
  location,
  tagline,
  logoUrl,
  admissionsOpen,
  navigationItems = [],
  utilityNavigationItems = [],
}: {
  schoolName: string;
  location: string;
  tagline?: string;
  logoUrl?: string;
  admissionsOpen: boolean;
  navigationItems?: PublicNavigationItem[];
  utilityNavigationItems?: PublicNavigationItem[];
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [desktopOpen, setDesktopOpen] = useState<string | null>(null);
  const mobileDialogRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const desktopNavRef = useRef<HTMLDivElement>(null);
  const desktopToggleRefs = useRef(new Map<string, HTMLButtonElement>());
  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    setExpanded(null);
  }, []);
  const configuredNavigation: NavigationGroup[] = navigationItems
    .filter((item) => !item.parentId)
    .map((item) => ({
      label: item.label,
      href: item.href,
      external: item.external,
      description: item.description,
      items: navigationItems
        .filter((candidate) => candidate.parentId === item.id)
        .map(
          (candidate) =>
            [candidate.label, candidate.href, candidate.external, candidate.description] as const,
        ),
    }));
  const baseNavigation: readonly NavigationGroup[] = configuredNavigation.length
    ? configuredNavigation
    : defaultNavigation;
  const navigation: readonly NavigationGroup[] = admissionsOpen
    ? baseNavigation
    : baseNavigation.map((item) => ({
        ...item,
        items: item.items.filter(([, href]) => href !== "/admissions/apply"),
      }));
  const utilityLinks: PublicNavigationItem[] = utilityNavigationItems.length
    ? utilityNavigationItems
    : [
        { id: "accessibility", label: "Accessibility", href: "/accessibility" },
        { id: "contact", label: "Contact", href: "/contact" },
      ];

  useModalFocus({
    open: mobileOpen,
    containerRef: mobileDialogRef,
    triggerRef: menuButtonRef,
    onClose: closeMobile,
    initialFocusSelector: "[data-mobile-initial-focus]",
  });

  useEffect(() => {
    if (!desktopOpen) return;
    const openKey = desktopOpen;

    function handlePointerDown(event: PointerEvent) {
      if (!desktopNavRef.current?.contains(event.target as Node)) setDesktopOpen(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setDesktopOpen(null);
      window.requestAnimationFrame(() => desktopToggleRefs.current.get(openKey)?.focus());
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [desktopOpen]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 80rem)");
    function handleBreakpointChange(event: MediaQueryListEvent) {
      if (event.matches) closeMobile();
      else setDesktopOpen(null);
    }
    desktopQuery.addEventListener("change", handleBreakpointChange);
    return () => desktopQuery.removeEventListener("change", handleBreakpointChange);
  }, [closeMobile]);

  return (
    <>
      <div className="border-b border-white/10 bg-[#061d38] px-4 py-2 text-[11px] text-slate-200 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <p className="truncate">
            {tagline ?? "Official school information"} <span aria-hidden="true">&middot;</span> {location}
          </p>
          <div className="hidden items-center gap-5 sm:flex">
            {utilityLinks.map((item) => (
              <NavigationLink
                key={item.id}
                href={item.href}
                external={item.external}
                description={item.description}
                className="font-semibold text-white transition hover:text-sky-200"
              >
                {item.label}
              </NavigationLink>
            ))}
            <Link href="/sign-in" className="font-semibold text-sky-200 transition hover:text-white">
              Admin login
            </Link>
          </div>
        </div>
      </div>
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8"
        >
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={`${schoolName} home`}>
            <Image
              src={logoUrl ?? "/media/nps-logo.png"}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-full object-contain"
              priority
            />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-extrabold tracking-[-.02em] text-[#092f59] uppercase sm:text-base">
                {schoolName}
              </span>
              <span className="mt-0.5 block truncate text-[10px] font-semibold tracking-wide text-slate-500 sm:text-[11px]">
                {location}
              </span>
            </span>
          </Link>

          <div ref={desktopNavRef} className="hidden h-full items-center xl:flex">
            {navigation.map((item, index) => {
              const active = isNavigationActive(pathname, item.href);
              const open = desktopOpen === item.href && item.items.length > 0;
              const triggerId = `desktop-nav-trigger-${index}`;
              const submenuId = `desktop-nav-submenu-${index}`;
              return (
                <div
                  key={item.href}
                  className="relative flex h-full items-center"
                  onMouseLeave={(event) => {
                    if (!event.currentTarget.contains(document.activeElement)) {
                      setDesktopOpen(null);
                    }
                  }}
                  onFocusCapture={(event) => {
                    if ((event.target as HTMLElement).dataset.desktopMenuToggle !== undefined) return;
                    setDesktopOpen(item.items.length ? item.href : null);
                  }}
                  onBlurCapture={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setDesktopOpen(null);
                    }
                  }}
                >
                  <NavigationLink
                    href={item.href}
                    external={item.external}
                    description={item.description}
                    onMouseEnter={() => setDesktopOpen(item.items.length ? item.href : null)}
                    onClick={() => setDesktopOpen(null)}
                    ariaCurrent={isNavigationCurrent(pathname, item.href) ? "page" : undefined}
                    className={`flex h-full items-center px-2.5 text-[13px] font-bold whitespace-nowrap transition ${active ? "text-[#0969ad]" : "text-[#183d60] hover:text-[#0969ad]"}`}
                  >
                    {item.label}
                  </NavigationLink>
                  {item.items.length > 0 && (
                    <button
                      ref={(node) => {
                        if (node) desktopToggleRefs.current.set(item.href, node);
                        else desktopToggleRefs.current.delete(item.href);
                      }}
                      id={triggerId}
                      data-desktop-menu-toggle
                      type="button"
                      onClick={() => setDesktopOpen(open ? null : item.href)}
                      className={`mr-1 grid h-8 w-6 place-items-center rounded-md transition hover:bg-sky-50 focus:ring-2 focus:ring-sky-300 focus:outline-none ${open ? "text-[#0969ad]" : "text-[#183d60]"}`}
                      aria-label={`${open ? "Close" : "Open"} ${item.label} submenu`}
                      aria-haspopup="true"
                      aria-expanded={open}
                      aria-controls={submenuId}
                    >
                      <ChevronDown
                        size={14}
                        aria-hidden="true"
                        className={`transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                  )}
                  {open && (
                    <div
                      id={submenuId}
                      role="group"
                      aria-label={`${item.label} submenu`}
                      className={`absolute top-[68px] z-[60] max-h-[calc(100vh-7rem)] w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_50px_rgba(13,38,76,.16)] ${index >= navigation.length - 2 ? "right-0" : "left-0"}`}
                    >
                      {item.items.map(([label, href, external, description]) => (
                        <NavigationLink
                          key={href}
                          href={href}
                          external={external}
                          description={description}
                          onClick={() => setDesktopOpen(null)}
                          ariaCurrent={
                            href !== item.href && isNavigationCurrent(pathname, href) ? "page" : undefined
                          }
                          className="block rounded-xl px-4 py-3 text-sm font-semibold break-words text-slate-700 transition hover:bg-sky-50 hover:text-[#075b99] focus:bg-sky-50 focus:text-[#075b99] focus:outline-none"
                        >
                          {label}
                        </NavigationLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/search"
              aria-label="Search the website"
              className="grid h-10 w-10 place-items-center rounded-full text-[#183d60] transition hover:bg-slate-100"
            >
              <Search size={19} />
            </Link>
            {admissionsOpen && (
              <Link
                href="/admissions/apply"
                className="hidden rounded-xl bg-[#0a65a8] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#084f83] sm:inline-flex"
              >
                Admission enquiry
              </Link>
            )}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => {
                setDesktopOpen(null);
                setMobileOpen(true);
              }}
              className="grid h-10 w-10 place-items-center rounded-full text-[#183d60] hover:bg-slate-100 xl:hidden"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation-dialog"
            >
              <Menu size={22} />
            </button>
          </div>
        </nav>
      </header>

      {mobileOpen && (
        <div
          ref={mobileDialogRef}
          id="mobile-navigation-dialog"
          className="fixed inset-0 z-[80] bg-[#061d38]/55 backdrop-blur-sm xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          tabIndex={-1}
        >
          <div className="ml-auto flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <span className="text-sm font-extrabold text-[#092f59]">Menu</span>
              <button
                data-mobile-initial-focus
                type="button"
                onClick={closeMobile}
                className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-100"
                aria-label="Close navigation"
              >
                <X size={21} />
              </button>
            </div>
            <div className="flex-1 p-4">
              {navigation.map((item, index) => (
                <div key={item.href} className="border-b border-slate-100 py-1">
                  <div className="flex items-center gap-2">
                    <NavigationLink
                      href={item.href}
                      external={item.external}
                      description={item.description}
                      onClick={closeMobile}
                      ariaCurrent={isNavigationCurrent(pathname, item.href) ? "page" : undefined}
                      className="flex-1 px-3 py-3 text-sm font-extrabold text-[#143b60]"
                    >
                      {item.label}
                    </NavigationLink>
                    {item.items.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpanded(expanded === item.href ? null : item.href)}
                        className="grid h-10 w-10 place-items-center rounded-lg hover:bg-slate-100"
                        aria-label={`${expanded === item.href ? "Hide" : "Show"} ${item.label} links`}
                        aria-expanded={expanded === item.href}
                        aria-controls={`mobile-submenu-${index}`}
                      >
                        <ChevronDown
                          size={17}
                          className={`transition ${expanded === item.href ? "rotate-180" : ""}`}
                        />
                      </button>
                    )}
                  </div>
                  {expanded === item.href && (
                    <div
                      id={`mobile-submenu-${index}`}
                      role="group"
                      aria-label={`${item.label} submenu`}
                      className="mb-2 rounded-xl bg-slate-50 p-2"
                    >
                      {item.items.map(([label, href, external, description]) => (
                        <NavigationLink
                          key={href}
                          href={href}
                          external={external}
                          description={description}
                          onClick={closeMobile}
                          ariaCurrent={
                            href !== item.href && isNavigationCurrent(pathname, href) ? "page" : undefined
                          }
                          className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-white hover:text-[#075b99]"
                        >
                          {label}
                        </NavigationLink>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="mt-3 border-t border-slate-100 pt-2">
                {utilityLinks.map((item) => (
                  <NavigationLink
                    key={item.id}
                    href={item.href}
                    external={item.external}
                    description={item.description}
                    onClick={closeMobile}
                    className="block rounded-xl px-3 py-3 text-sm font-extrabold text-[#143b60]"
                  >
                    {item.label}
                  </NavigationLink>
                ))}
              </div>
              <Link
                href="/sign-in"
                onClick={closeMobile}
                className="block rounded-xl px-3 py-3 text-sm font-extrabold text-[#143b60]"
              >
                Admin login
              </Link>
            </div>
            {admissionsOpen && (
              <div className="border-t border-slate-200 p-5">
                <Link
                  href="/admissions/apply"
                  onClick={closeMobile}
                  className="flex w-full justify-center rounded-xl bg-[#0a65a8] px-4 py-3 text-sm font-bold text-white"
                >
                  Start an admission enquiry
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
