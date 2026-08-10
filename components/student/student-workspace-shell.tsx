"use client";

import { BookOpenText, LogOut, PenLine } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { authClient } from "@/lib/auth/student-client";
import type { Student } from "./types";

export function StudentWorkspaceShell({
  student,
  eyebrow,
  title,
  description,
  children,
}: {
  student: Student;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setLogoutError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("We could not sign you out. Please try again.");
      router.replace("/student/login");
      router.refresh();
    } catch (caught) {
      setLogoutError(caught instanceof Error ? caught.message : "We could not sign you out.");
      setSigningOut(false);
    }
  }

  return (
    <section className="min-h-[46rem] bg-[#f7f8fd] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(30,31,92,.08)] sm:p-7">
          <div className="flex min-w-0 flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#eef0fb] text-[#2e3192]">
                <BookOpenText size={23} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold tracking-[.18em] text-[#2e3192] uppercase">
                  Student publishing
                </p>
                <p className="mt-1 truncate text-sm font-extrabold text-[#12123a]">{student.name}</p>
                <p className="truncate text-xs text-slate-500">{student.email}</p>
              </div>
            </div>
            <nav aria-label="Student workspace" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link
                href="/student/articles"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50"
              >
                My articles
              </Link>
              <Link
                href="/student/articles/new"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2e3192] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#262873]"
              >
                <PenLine size={16} aria-hidden="true" /> Write an article
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                disabled={signingOut}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-800 disabled:cursor-wait disabled:opacity-60"
              >
                <LogOut size={16} aria-hidden="true" /> {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </nav>
          </div>
          {logoutError && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {logoutError}
            </p>
          )}
        </div>

        <header className="mt-10 max-w-3xl">
          <p className="text-[11px] font-extrabold tracking-[.19em] text-[#2e3192] uppercase">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-.035em] text-[#12123a] sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{description}</p>
        </header>

        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}
