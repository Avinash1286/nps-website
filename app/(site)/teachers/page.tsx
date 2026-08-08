import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search, Users } from "lucide-react";
import { EmptyState } from "@/components/site/empty-state";
import { PageHero } from "@/components/site/page-hero";
import { getTeachers } from "@/lib/data/public";
export const metadata: Metadata = {
  title: "Teachers",
  description: "Browse verified faculty profiles and academic departments at Nepal Police School, Garuda.",
};
export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; q?: string }>;
}) {
  const { department, q } = await searchParams;
  const teachers = await getTeachers(department);
  const query = q?.trim().toLowerCase();
  const visible = query
    ? teachers.filter((teacher) =>
        [teacher.name, teacher.designation, teacher.department, teacher.qualification, ...teacher.subjects]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query)),
      )
    : teachers;
  const departments = Array.from(
    new Map(teachers.map((teacher) => [teacher.departmentSlug, teacher.department])).entries(),
  );
  return (
    <>
      <PageHero
        eyebrow="Our faculty"
        title="Teachers and mentors"
        description="Browse profiles published by the school and find faculty by subject area."
        image="/media/nps-staff-group.jpg"
        crumbs={[{ label: "Teachers" }]}
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <form className="grid min-w-0 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_240px_auto]">
            <label className="relative">
              <span className="sr-only">Search faculty</span>
              <Search size={17} className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search by name, role, subject, or qualification"
                className="h-12 w-full rounded-xl border border-slate-300 bg-white pr-4 pl-11 text-sm outline-none focus:border-[#2e3192] focus:ring-4 focus:ring-sky-100"
              />
            </label>
            <label>
              <span className="sr-only">Department</span>
              <select
                name="department"
                defaultValue={department ?? ""}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-[#2e3192]"
              >
                <option value="">All departments</option>
                {departments.map(([slug, name]) => (
                  <option key={slug} value={slug}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <button className="h-12 rounded-xl bg-[#2e3192] px-5 text-sm font-bold text-white">
              Filter directory
            </button>
          </form>
          {visible.length ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((teacher) => (
                <Link
                  key={teacher.id}
                  href={`/teachers/${teacher.slug}`}
                  className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(30,31,92,.1)]"
                >
                  <div className="relative aspect-[4/5] bg-slate-100">
                    {teacher.photoUrl ? (
                      <Image
                        src={teacher.photoUrl}
                        alt={teacher.name}
                        fill
                        unoptimized
                        className="object-cover transition duration-500 group-hover:scale-[1.02]"
                        sizes="(max-width: 768px) 100vw, 25vw"
                      />
                    ) : (
                      <span className="grid h-full place-items-center text-slate-300">
                        <Users size={36} />
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-[11px] font-extrabold tracking-[.13em] text-[#2e3192] uppercase">
                      {teacher.department}
                    </p>
                    <h2 className="mt-2 text-lg font-extrabold text-[#1e1f5c]">{teacher.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{teacher.designation}</p>
                    {teacher.subjects.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {teacher.subjects.slice(0, 2).map((subject) => (
                          <span
                            key={subject}
                            className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-[#262873]"
                          >
                            {subject}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#2e3192]">
                      View profile <ArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-10">
              <EmptyState
                title={
                  query || department ? "No matching faculty profiles" : "Faculty profiles are being prepared"
                }
                description={
                  query || department
                    ? "Adjust the search or clear the department filter to view other published profiles."
                    : "Verified faculty profiles will appear here after authorised staff publish them through the content system."
                }
                actionLabel={query || department ? "Clear filters" : "Explore departments"}
                actionHref={query || department ? "/teachers" : "/academics/departments"}
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
