import Link from "next/link";
import { AlertTriangle, ArrowRight, Download, FileText, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/site/empty-state";
import { PageHero } from "@/components/site/page-hero";
import { contentMetadata } from "@/lib/content/public-metadata";
import { formatPublicDate, getNotices } from "@/lib/data/public";
import { firstSearchParam } from "@/lib/content/search-param";
export const metadata = contentMetadata({
  title: "Official notices",
  description: "Official notices and announcements from Nepal Police School, Garuda.",
  path: "/notices",
});
export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const q = firstSearchParam((await searchParams).q);
  const notices = await getNotices(200);
  const query = q?.trim().toLowerCase();
  const visible = query
    ? notices.filter((notice) =>
        [notice.title, notice.summary, notice.category, ...notice.audiences]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query)),
      )
    : notices;
  return (
    <>
      <PageHero
        eyebrow="Official information"
        title="Notices and announcements"
        description="Search published school notices, admissions updates, examination information, and downloadable announcements."
        crumbs={[{ label: "Notices" }]}
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <form className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row">
            <label className="flex-1">
              <span className="sr-only">Search notices</span>
              <input
                name="q"
                defaultValue={q}
                placeholder="Search notice titles and categories"
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-[#2e3192] focus:ring-4 focus:ring-sky-100"
              />
            </label>
            <button className="h-12 rounded-xl bg-[#2e3192] px-5 text-sm font-bold text-white">
              Search notices
            </button>
          </form>
          {visible.length ? (
            <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
              {visible.map((notice) => (
                <article
                  key={notice.id}
                  className="grid min-w-0 gap-4 py-6 sm:grid-cols-[130px_minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-500">{formatPublicDate(notice.publishedAt)}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {notice.priority && notice.priority !== "normal" && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold tracking-[.08em] uppercase ${
                            notice.priority === "urgent"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          <AlertTriangle size={11} /> {notice.priority}
                        </span>
                      )}
                      {notice.category && (
                        <span className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-extrabold tracking-[.08em] text-[#2e3192] uppercase">
                          {notice.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h2 className="leading-6 font-extrabold text-[#1e1f5c]">
                      <Link href={`/notices/${notice.slug}`}>{notice.title}</Link>
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{notice.summary}</p>
                    {notice.audiences.length > 0 && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <UsersRound size={13} className="shrink-0 text-[#2e3192]" />
                        <span className="truncate">For {notice.audiences.join(", ")}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/notices/${notice.slug}`}
                      aria-label={`Read ${notice.title}`}
                      className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-[#2e3192]"
                    >
                      <ArrowRight size={16} />
                    </Link>
                    {notice.attachmentUrl && (
                      <a
                        href={notice.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Download attachment for ${notice.title}`}
                        className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-[#2e3192]"
                      >
                        <Download size={16} />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-8">
              <EmptyState
                title={query ? "No matching notices" : "No published notices"}
                description={
                  query
                    ? "Try a broader search or clear the query."
                    : "Official notices will appear after they are published through the school content system."
                }
                actionLabel={query ? "Clear search" : "Browse downloads"}
                actionHref={query ? "/notices" : "/downloads"}
              />
            </div>
          )}
          <p className="mt-8 flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">
            <FileText size={16} className="mt-0.5 shrink-0" />
            For time-sensitive decisions, use the most recently dated official notice and confirm any
            uncertainty with the school.
          </p>
        </div>
      </section>
    </>
  );
}
