import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { EmptyState } from "@/components/site/empty-state";
import { PageHero } from "@/components/site/page-hero";
import { FeaturedBadge } from "@/components/site/featured-badge";
import { formatPublicDate, getDocuments } from "@/lib/data/public";
export const metadata: Metadata = {
  title: "Downloads",
  description: "Approved forms, schedules, guides, and school documents from Nepal Police School, Garuda.",
};
export default async function DownloadsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const documents = await getDocuments();
  const categories = Array.from(new Set(documents.map((document) => document.category))).sort();
  const visible = category ? documents.filter((document) => document.category === category) : documents;
  return (
    <>
      <PageHero
        eyebrow="Resources"
        title="Downloads and documents"
        description="Find approved school forms, schedules, guidance, and other published resources."
        crumbs={[{ label: "Downloads" }]}
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {categories.length > 1 && (
            <nav aria-label="Document categories" className="mb-8 flex flex-wrap gap-2">
              <Link
                href="/downloads"
                className={`rounded-full px-4 py-2 text-xs font-bold ${!category ? "bg-[#2e3192] text-white" : "bg-slate-100 text-slate-700"}`}
              >
                All documents
              </Link>
              {categories.map((item) => (
                <Link
                  key={item}
                  href={`/downloads?category=${encodeURIComponent(item)}`}
                  className={`max-w-full rounded-full px-4 py-2 text-center text-xs font-bold ${category === item ? "bg-[#2e3192] text-white" : "bg-slate-100 text-slate-700"}`}
                >
                  {item}
                </Link>
              ))}
            </nav>
          )}
          {visible.length ? (
            <div className="divide-y divide-slate-200 border-y border-slate-200">
              {visible.map((document) => (
                <article
                  key={document.id}
                  className="grid min-w-0 gap-4 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="flex min-w-0 gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-50 text-[#2e3192]">
                      <FileText size={20} />
                    </span>
                    <div className="min-w-0">
                      {document.featured && <FeaturedBadge className="mb-2" />}
                      <p className="text-[11px] font-extrabold tracking-[.13em] text-[#2e3192] uppercase">
                        {document.category}
                      </p>
                      <h2 className="mt-1 leading-6 font-extrabold text-[#1e1f5c]">{document.title}</h2>
                      {document.description && (
                        <p className="mt-2 text-sm leading-6 text-slate-600">{document.description}</p>
                      )}
                      <p className="mt-2 text-xs text-slate-500">
                        {[document.fileType, document.fileSize, formatPublicDate(document.publishedAt)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  {document.downloadUrl ? (
                    <a
                      href={document.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2e3192] px-4 py-2.5 text-sm font-bold text-white sm:w-auto"
                    >
                      <Download size={16} className="shrink-0" />
                      Download
                    </a>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500">File pending publication</span>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No published documents"
              description="Approved downloads will appear here after they are published through the school content system."
              actionLabel="View notices"
              actionHref="/notices"
            />
          )}
          <p className="mt-8 text-xs leading-5 text-slate-500">
            Open files only from this official website or another channel explicitly confirmed by the school.
            Contact the office if a file is inaccessible or appears outdated.
          </p>
        </div>
      </section>
    </>
  );
}
