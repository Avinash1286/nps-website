"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Mail, Menu, Phone, Search, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicNavigationItem } from "@/lib/data/public";
import { SiteStudentAccount } from "@/components/site/site-student-account";
import { useModalFocus } from "@/components/site/use-modal-focus";

type NavigationChild = readonly [label: string, href: string, external?: boolean, description?: string];
type NavigationGroup = {
  label: string;
  href: string;
  external?: boolean;
  description?: string;
  items: readonly NavigationChild[];
};

const DESKTOP_MENU_CLOSE_DELAY_MS = 140;

function NavigationLink({
  href,
  external,
  description,
  className,
  children,
  onClick,
  ariaCurrent,
  dataActive,
}: {
  href: string;
  external?: boolean;
  description?: string;
  className: string;
  children: React.ReactNode;
  onClick?: () => void;
  ariaCurrent?: "page";
  dataActive?: boolean;
}) {
  return external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={description}
      className={className}
      onClick={onClick}
      aria-current={ariaCurrent}
      data-active={dataActive}
    >
      {children}
    </a>
  ) : (
    <Link
      href={href}
      title={description}
      className={className}
      onClick={onClick}
      aria-current={ariaCurrent}
      data-active={dataActive}
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

export function SiteHeader({
  schoolName,
  location,
  tagline,
  logoUrl,
  phone,
  email,
  admissionsOpen,
  navigationItems = [],
  utilityNavigationItems = [],
}: {
  schoolName: string;
  location: string;
  tagline?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  admissionsOpen: boolean;
  navigationItems?: PublicNavigationItem[];
  utilityNavigationItems?: PublicNavigationItem[];
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [desktopOpen, setDesktopOpen] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const mobileDialogRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const desktopNavRef = useRef<HTMLDivElement>(null);
  const desktopToggleRefs = useRef(new Map<string, HTMLButtonElement>());
  const desktopCloseTimerRef = useRef<number | null>(null);
  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    setExpanded(null);
  }, []);
  const cancelDesktopClose = useCallback(() => {
    if (desktopCloseTimerRef.current === null) return;
    window.clearTimeout(desktopCloseTimerRef.current);
    desktopCloseTimerRef.current = null;
  }, []);
  const closeDesktopMenu = useCallback(() => {
    cancelDesktopClose();
    setDesktopOpen(null);
  }, [cancelDesktopClose]);
  const openDesktopMenu = useCallback(
    (href: string | null) => {
      cancelDesktopClose();
      setDesktopOpen(href);
    },
    [cancelDesktopClose],
  );
  const scheduleDesktopClose = useCallback(() => {
    cancelDesktopClose();
    desktopCloseTimerRef.current = window.setTimeout(() => {
      desktopCloseTimerRef.current = null;
      setDesktopOpen(null);
    }, DESKTOP_MENU_CLOSE_DELAY_MS);
  }, [cancelDesktopClose]);
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
  const navigation: readonly NavigationGroup[] = admissionsOpen
    ? configuredNavigation
    : configuredNavigation.map((item) => ({
        ...item,
        items: item.items.filter(([, href]) => href !== "/admissions/apply"),
      }));
  const utilityLinks = utilityNavigationItems;
  // Student authentication is session-aware, so an editor-provided static
  // login link is replaced by the account control instead of being duplicated.
  const publicUtilityLinks = utilityLinks.filter(
    (item) => !["/student", "/student/login"].includes(item.href.split(/[?#]/, 1)[0]),
  );
  // The header always offers a staff entry point. Suppress it when an editor has
  // already published a utility link to the same route, so it never doubles up.
  const showStaffLink = !utilityLinks.some((item) => item.href.split(/[?#]/, 1)[0] === "/sign-in");

  useModalFocus({
    open: mobileOpen,
    containerRef: mobileDialogRef,
    triggerRef: menuButtonRef,
    onClose: closeMobile,
    initialFocusSelector: "[data-mobile-initial-focus]",
  });

  useEffect(() => {
    const sync = () => setScrolled(window.scrollY > 16);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  useEffect(() => () => cancelDesktopClose(), [cancelDesktopClose]);

  useEffect(() => {
    if (!desktopOpen) return;
    const openKey = desktopOpen;

    function handlePointerDown(event: PointerEvent) {
      if (!desktopNavRef.current?.contains(event.target as Node)) closeDesktopMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeDesktopMenu();
      window.requestAnimationFrame(() => desktopToggleRefs.current.get(openKey)?.focus());
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDesktopMenu, desktopOpen]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 80rem)");
    function handleBreakpointChange(event: MediaQueryListEvent) {
      if (event.matches) closeMobile();
      else closeDesktopMenu();
    }
    desktopQuery.addEventListener("change", handleBreakpointChange);
    return () => desktopQuery.removeEventListener("change", handleBreakpointChange);
  }, [closeDesktopMenu, closeMobile]);

  const telephoneHref = phone ? `tel:${phone.replace(/\s/g, "")}` : undefined;

  return (
    <>
      <div
        className={`relative z-[70] bg-[#12123a] text-[11px] text-slate-300 transition-all duration-500 ${
          scrolled ? "max-h-0 overflow-hidden opacity-0" : "max-h-16 overflow-visible opacity-100"
        }`}
      >
        <div className="mx-auto flex min-h-10 max-w-7xl items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <p className="min-w-0 flex-1 truncate font-medium whitespace-nowrap">
            {tagline ?? "Official school information"} <span aria-hidden="true">&middot;</span> {location}
          </p>
          <div className="hidden shrink-0 items-center gap-3 whitespace-nowrap sm:flex lg:gap-4 2xl:gap-5">
            {telephoneHref && (
              <a
                href={telephoneHref}
                className="hidden shrink-0 items-center gap-1.5 font-semibold whitespace-nowrap transition hover:text-white lg:inline-flex"
              >
                <Phone size={12} className="text-[#f0bd3a]" />
                {phone}
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="hidden shrink-0 items-center gap-1.5 font-semibold whitespace-nowrap transition hover:text-white 2xl:inline-flex"
              >
                <Mail size={12} className="text-[#f0bd3a]" />
                {email}
              </a>
            )}
            {publicUtilityLinks.map((item) => (
              <NavigationLink
                key={item.id}
                href={item.href}
                external={item.external}
                description={item.description}
                className="shrink-0 font-semibold whitespace-nowrap transition hover:text-white"
              >
                {item.label}
              </NavigationLink>
            ))}
            <SiteStudentAccount variant="desktop" />
            {showStaffLink && (
              <Link
                href="/sign-in"
                className="shrink-0 font-semibold whitespace-nowrap text-[#f0bd3a] transition hover:text-white"
              >
                Staff login
              </Link>
            )}
          </div>
        </div>
      </div>

      <header
        className={`sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl transition-all duration-500 ${
          scrolled ? "bg-[#262873]/95 shadow-[0_10px_30px_rgba(18,18,58,.35)]" : "bg-[#2e3192] shadow-none"
        }`}
      >
        <nav
          aria-label="Main navigation"
          className={`mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 transition-all duration-500 sm:px-6 lg:px-8 ${
            scrolled ? "h-[68px]" : "h-[86px]"
          }`}
        >
          <Link href="/" className="group flex min-w-0 items-center gap-3" aria-label={`${schoolName} home`}>
            <span className="relative shrink-0">
              <span
                aria-hidden="true"
                className="absolute inset-0 scale-90 rounded-full bg-white/15 opacity-0 transition duration-500 group-hover:scale-110 group-hover:opacity-100"
              />
              <Image
                src={logoUrl ?? "/media/nps-logo.png"}
                alt=""
                width={52}
                height={52}
                priority
                className={`relative rounded-full object-contain transition-all duration-500 ${
                  scrolled ? "h-10 w-10" : "h-12 w-12"
                }`}
              />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-extrabold tracking-[-.02em] text-white uppercase sm:text-[15px]">
                {schoolName}
              </span>
              <span className="mt-0.5 block truncate text-[10px] font-semibold tracking-[.12em] text-sky-200 uppercase sm:text-[11px]">
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
                  onPointerEnter={(event) => {
                    if (event.pointerType === "touch") return;
                    openDesktopMenu(item.items.length ? item.href : null);
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType === "touch") return;
                    if (!event.currentTarget.contains(document.activeElement)) {
                      scheduleDesktopClose();
                    }
                  }}
                  onFocusCapture={(event) => {
                    if ((event.target as HTMLElement).dataset.desktopMenuToggle !== undefined) return;
                    openDesktopMenu(item.items.length ? item.href : null);
                  }}
                  onBlurCapture={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      closeDesktopMenu();
                    }
                  }}
                >
                  <NavigationLink
                    href={item.href}
                    external={item.external}
                    description={item.description}
                    onClick={closeDesktopMenu}
                    ariaCurrent={isNavigationCurrent(pathname, item.href) ? "page" : undefined}
                    dataActive={active}
                    className={`nav-underline relative flex h-full items-center px-2.5 text-[13px] font-bold whitespace-nowrap transition-colors duration-300 ${
                      active ? "text-[#f0bd3a]" : "text-white/90 hover:text-white"
                    }`}
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
                      onClick={() => (open ? closeDesktopMenu() : openDesktopMenu(item.href))}
                      className={`mr-0.5 grid h-11 w-8 place-items-center rounded-md transition hover:bg-white/10 focus:ring-2 focus:ring-[#f0bd3a] focus:outline-none ${open ? "text-[#f0bd3a]" : "text-white/80"}`}
                      aria-label={`${open ? "Close" : "Open"} ${item.label} submenu`}
                      aria-expanded={open}
                      aria-controls={submenuId}
                    >
                      <ChevronDown
                        size={14}
                        aria-hidden="true"
                        className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                  )}
                  {open && (
                    <div
                      id={submenuId}
                      role="group"
                      aria-label={`${item.label} submenu`}
                      onPointerEnter={cancelDesktopClose}
                      className={`absolute top-full z-[60] -mt-px w-72 max-w-[calc(100vw-2rem)] pt-2 ${index >= navigation.length - 2 ? "right-0" : "left-0"}`}
                    >
                      <div
                        style={{ animationDuration: "260ms" }}
                        className="anim-fade-up relative rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(18,18,58,.18)]"
                      >
                        <span
                          aria-hidden="true"
                          className={`absolute -top-1.5 h-3 w-3 rotate-45 border-t border-l border-slate-200 bg-white ${index >= navigation.length - 2 ? "right-8" : "left-8"}`}
                        />
                        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-2">
                          {item.items.map(([label, href, external, description]) => (
                            <NavigationLink
                              key={href}
                              href={href}
                              external={external}
                              description={description}
                              onClick={closeDesktopMenu}
                              ariaCurrent={
                                href !== item.href && isNavigationCurrent(pathname, href) ? "page" : undefined
                              }
                              className="group relative block rounded-xl px-4 py-2.5 text-sm font-semibold break-words text-slate-700 transition duration-300 hover:bg-sky-50 hover:pl-6 hover:text-[#262873] focus:bg-sky-50 focus:text-[#262873] focus:outline-none"
                            >
                              <span
                                aria-hidden="true"
                                className="absolute top-1/2 left-2.5 h-4 w-0.5 -translate-y-1/2 scale-y-0 rounded-full bg-[#2e3192] transition-transform duration-300 group-hover:scale-y-100"
                              />
                              {label}
                            </NavigationLink>
                          ))}
                        </div>
                      </div>
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
              className="grid h-10 w-10 place-items-center rounded-full text-white transition duration-300 hover:scale-105 hover:bg-white/10"
            >
              <Search size={19} />
            </Link>
            {admissionsOpen && (
              <Link
                href="/admissions/apply"
                className="hidden overflow-hidden rounded-xl bg-[#f0bd3a] px-5 py-2.5 text-xs font-bold text-[#12123a] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-[#ffd15c] hover:shadow-lg hover:shadow-black/20 sm:inline-flex"
              >
                Admission enquiry
              </Link>
            )}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => {
                closeDesktopMenu();
                setMobileOpen(true);
              }}
              className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/10 xl:hidden"
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
          className="anim-fade-in fixed inset-0 z-[80] bg-[#12123a]/60 backdrop-blur-sm xl:hidden"
          style={{ animationDuration: "260ms" }}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          tabIndex={-1}
        >
          <div
            className="ml-auto flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white shadow-2xl"
            style={{ animation: "nps-drawer-in 380ms cubic-bezier(.16,1,.3,1) both" }}
          >
            <style>{`@keyframes nps-drawer-in{from{transform:translateX(100%)}to{transform:none}}`}</style>
            <div className="flex items-center justify-between bg-[#2e3192] p-5 text-white">
              <span className="flex items-center gap-2.5">
                <Image
                  src={logoUrl ?? "/media/nps-logo.png"}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-contain"
                />
                <span className="text-sm font-extrabold">Menu</span>
              </span>
              <button
                data-mobile-initial-focus
                type="button"
                onClick={closeMobile}
                className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-white/15"
                aria-label="Close navigation"
              >
                <X size={21} />
              </button>
            </div>
            <div className="flex-1 p-4">
              {navigation.map((item, index) => (
                <div
                  key={item.href}
                  className="anim-fade-up border-b border-slate-100 py-1"
                  style={{ animationDelay: `${60 + index * 45}ms`, animationDuration: "420ms" }}
                >
                  <div className="flex items-center gap-2">
                    <NavigationLink
                      href={item.href}
                      external={item.external}
                      description={item.description}
                      onClick={closeMobile}
                      ariaCurrent={isNavigationCurrent(pathname, item.href) ? "page" : undefined}
                      className="flex-1 px-3 py-3 text-sm font-extrabold text-[#2f3169]"
                    >
                      {item.label}
                    </NavigationLink>
                    {item.items.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpanded(expanded === item.href ? null : item.href)}
                        className="grid h-10 w-10 place-items-center rounded-lg transition hover:bg-slate-100"
                        aria-label={`${expanded === item.href ? "Hide" : "Show"} ${item.label} links`}
                        aria-expanded={expanded === item.href}
                        aria-controls={`mobile-submenu-${index}`}
                      >
                        <ChevronDown
                          size={17}
                          className={`transition-transform duration-300 ${expanded === item.href ? "rotate-180" : ""}`}
                        />
                      </button>
                    )}
                  </div>
                  {expanded === item.href && (
                    <div
                      id={`mobile-submenu-${index}`}
                      role="group"
                      aria-label={`${item.label} submenu`}
                      className="anim-fade-up mb-2 rounded-xl bg-slate-50 p-2"
                      style={{ animationDuration: "260ms" }}
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
                          className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-[#262873]"
                        >
                          {label}
                        </NavigationLink>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="mt-3 border-t border-slate-100 pt-2">
                {publicUtilityLinks.map((item) => (
                  <NavigationLink
                    key={item.id}
                    href={item.href}
                    external={item.external}
                    description={item.description}
                    onClick={closeMobile}
                    className="block rounded-xl px-3 py-3 text-sm font-extrabold text-[#2f3169]"
                  >
                    {item.label}
                  </NavigationLink>
                ))}
                <SiteStudentAccount variant="mobile" onNavigate={closeMobile} />
                {showStaffLink && (
                  <Link
                    href="/sign-in"
                    onClick={closeMobile}
                    className="block rounded-xl px-3 py-3 text-sm font-extrabold text-[#2f3169]"
                  >
                    Staff login
                  </Link>
                )}
              </div>
            </div>
            {admissionsOpen && (
              <div className="border-t border-slate-200 p-5">
                <Link
                  href="/admissions/apply"
                  onClick={closeMobile}
                  className="flex w-full justify-center rounded-xl bg-[#2e3192] px-4 py-3 text-sm font-bold text-white"
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
