"use client";

import { ArrowRight, BookOpenCheck, Clock3, FilePenLine, LoaderCircle, Plus } from "lucide-react";
import { useQuery } from "convex/react";
import Link from "next/link";
import type { ComponentType } from "react";
import { ArticleStatusBadge } from "./article-status-badge";
import { studentArticlesApi } from "./convex-api";
import { useStudentSession } from "./student-session-gate";
import { StudentWorkspaceShell } from "./student-workspace-shell";
import type { Student } from "./types";

export function formatStudentArticleDate(timestamp?: number) {
  if (!timestamp || !Number.isFinite(timestamp)) return "Not available";
  return new Intl.DateTimeFormat("en-NP", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function StudentArticlesDashboard({ student: studentOverride }: { student?: Student }) {
  const student = useStudentSession(studentOverride);
  const articles = useQuery(studentArticlesApi.listMine, {});
  const articleList = articles ?? [];

  const counts = {
    drafts: articleList.filter((article) => article.status === "draft" || article.status === "rejected")
      .length,
    review: articleList.filter((article) => article.status === "submitted").length,
    published: articleList.filter((article) => article.status === "published").length,
  };

  return (
    <StudentWorkspaceShell
      student={student}
      eyebrow="Your writing"
      title="My articles"
      description="Create a private draft, develop your ideas, and submit finished work to the school for review."
    >
      {articles === undefined ? (
        <div
          className="grid min-h-64 place-items-center rounded-2xl border border-slate-200 bg-white"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
            <LoaderCircle className="animate-spin text-[#2e3192]" size={20} aria-hidden="true" />
            Loading your articles…
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3" aria-label="Article summary">
            <SummaryCard icon={FilePenLine} label="Drafts and revisions" value={counts.drafts} />
            <SummaryCard icon={Clock3} label="Awaiting review" value={counts.review} />
            <SummaryCard icon={BookOpenCheck} label="Published" value={counts.published} />
          </div>

          <div className="mt-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#12123a]">Your article list</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Reviewer feedback and current status appear alongside each article.
              </p>
            </div>
            <Link
              href="/student/articles/new"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2e3192] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#262873] sm:w-auto"
            >
              <Plus size={17} aria-hidden="true" /> New article
            </Link>
          </div>

          {articleList.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center sm:px-8 sm:py-16">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eef0fb] text-[#2e3192]">
                <FilePenLine size={25} aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-xl font-black text-[#12123a]">Start your first article</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
                Your work begins as a private draft and stays private until authorised school staff approve
                it.
              </p>
              <Link
                href="/student/articles/new"
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2e3192] px-5 py-3 text-sm font-bold text-white"
              >
                <Plus size={17} aria-hidden="true" /> Write your first article
              </Link>
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              {articleList.map((article) => (
                <article
                  key={article._id}
                  className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 sm:p-6"
                >
                  <div className="flex min-w-0 flex-col justify-between gap-5 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <ArticleStatusBadge status={article.status} />
                        <span className="text-xs font-bold text-slate-500">{article.category}</span>
                      </div>
                      <h3 className="mt-3 text-xl font-black tracking-tight [overflow-wrap:anywhere] text-[#12123a]">
                        {article.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{article.excerpt}</p>
                      <p className="mt-3 text-xs font-semibold text-slate-500">
                        Updated {formatStudentArticleDate(article.updatedAt)}
                      </p>
                      {article.reviewNote && (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                          <span className="font-extrabold">Reviewer feedback:</span> {article.reviewNote}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                      <Link
                        href={`/student/articles/${encodeURIComponent(article._id)}/edit`}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50"
                      >
                        {article.status === "draft" || article.status === "rejected"
                          ? "Continue editing"
                          : "View details"}
                        <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                      {article.status === "published" && article.publicSlug && (
                        <Link
                          href={`/articles/${encodeURIComponent(article.publicSlug)}`}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2e3192] px-4 py-2.5 text-sm font-bold text-white"
                        >
                          View public article
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </StudentWorkspaceShell>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean | "true" }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef0fb] text-[#2e3192]">
        <Icon size={19} aria-hidden="true" />
      </span>
      <p className="mt-4 text-3xl font-black text-[#12123a]">{value}</p>
      <p className="mt-1 text-sm font-bold text-slate-600">{label}</p>
    </div>
  );
}
