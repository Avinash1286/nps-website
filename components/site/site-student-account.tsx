"use client";

import { BookOpenText, ChevronDown, CircleUserRound, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { authClient } from "@/lib/auth/student-client";

type SiteStudentAccountProps = {
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
};

function studentDisplayName(user: { name?: string | null; email?: string | null }) {
  const name = user.name?.trim();
  if (name) return name;

  const emailName = user.email?.split("@", 1)[0]?.trim();
  return emailName || "Student";
}

export function SiteStudentAccount({ variant, onNavigate }: SiteStudentAccountProps) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const user = session?.user;
  const displayName = user ? studentDisplayName(user) : "";

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setLogoutError("");

    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("We could not sign you out. Please try again.");

      setOpen(false);
      onNavigate?.();
      router.replace("/student/login");
      router.refresh();
    } catch (caught) {
      setLogoutError(caught instanceof Error ? caught.message : "We could not sign you out.");
      setSigningOut(false);
    }
  }

  if (variant === "mobile") {
    if (isPending) {
      return (
        <div
          role="status"
          aria-label="Checking student session"
          className="mx-3 my-2 min-h-12 animate-pulse rounded-xl bg-slate-100"
        />
      );
    }

    if (!user) {
      return (
        <Link
          href="/student/login"
          onClick={onNavigate}
          className="block rounded-xl px-3 py-3 text-sm font-extrabold text-[#2f3169]"
        >
          Student login
        </Link>
      );
    }

    return (
      <section
        className="my-2 rounded-2xl border border-slate-200 bg-slate-50 p-3"
        aria-label="Student account"
      >
        <div className="flex min-w-0 items-center gap-3 px-1 py-1">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e8eafa] text-[#2e3192]">
            <CircleUserRound size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-[#12123a]">{displayName}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
        <nav aria-label="Student account links" className="mt-3 grid gap-1">
          <Link
            href="/student/profile"
            onClick={onNavigate}
            className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-[#2f3169] transition hover:bg-white"
          >
            <CircleUserRound size={17} aria-hidden="true" /> Profile
          </Link>
          <Link
            href="/student/articles"
            onClick={onNavigate}
            className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-[#2f3169] transition hover:bg-white"
          >
            <BookOpenText size={17} aria-hidden="true" /> My articles
          </Link>
        </nav>
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={signingOut}
          className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
        >
          <LogOut size={17} aria-hidden="true" /> {signingOut ? "Logging out…" : "Logout"}
        </button>
        {logoutError && (
          <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs leading-5 text-red-800">
            {logoutError}
          </p>
        )}
      </section>
    );
  }

  return (
    <div ref={containerRef} className="relative flex w-32 shrink-0 justify-end">
      {isPending ? (
        <span
          role="status"
          aria-label="Checking student session"
          className="h-5 w-24 animate-pulse rounded-full bg-white/15"
        />
      ) : !user ? (
        <Link href="/student/login" className="font-semibold whitespace-nowrap transition hover:text-white">
          Student login
        </Link>
      ) : (
        <>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => {
              setLogoutError("");
              setOpen((current) => !current);
            }}
            className="flex min-w-0 items-center gap-1.5 rounded-md font-semibold text-white transition hover:text-[#f0bd3a] focus-visible:ring-2 focus-visible:ring-[#f0bd3a] focus-visible:outline-none"
            aria-expanded={open}
            aria-controls={menuId}
          >
            <CircleUserRound size={14} className="shrink-0" aria-hidden="true" />
            <span className="max-w-20 truncate" title={displayName}>
              {displayName}
            </span>
            <ChevronDown
              size={12}
              aria-hidden="true"
              className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
          {open && (
            <div
              id={menuId}
              className="anim-fade-up absolute top-full right-0 z-[90] mt-3 w-60 rounded-2xl border border-slate-200 bg-white p-2 text-slate-700 shadow-[0_22px_55px_rgba(18,18,58,.24)]"
              style={{ animationDuration: "220ms" }}
            >
              <div className="border-b border-slate-100 px-3 py-2.5">
                <p className="truncate text-sm font-extrabold text-[#12123a]">{displayName}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{user.email}</p>
              </div>
              <nav aria-label="Student account links" className="mt-1">
                <Link
                  href="/student/profile"
                  onClick={() => setOpen(false)}
                  className="flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition hover:bg-sky-50 hover:text-[#262873]"
                >
                  <CircleUserRound size={16} aria-hidden="true" /> Profile
                </Link>
                <Link
                  href="/student/articles"
                  onClick={() => setOpen(false)}
                  className="flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition hover:bg-sky-50 hover:text-[#262873]"
                >
                  <BookOpenText size={16} aria-hidden="true" /> My articles
                </Link>
              </nav>
              <button
                type="button"
                onClick={() => void signOut()}
                disabled={signingOut}
                className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
              >
                <LogOut size={16} aria-hidden="true" /> {signingOut ? "Logging out…" : "Logout"}
              </button>
              {logoutError && (
                <p
                  role="alert"
                  className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-800"
                >
                  {logoutError}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
