import Link from "next/link";
import { ArrowRight, BookOpenCheck, Check, GraduationCap, Layers3, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/site/empty-state";
import { PageHero } from "@/components/site/page-hero";
import type { PublicDepartment, PublicProgram } from "@/lib/data/public";

function programmeAnchor(program: PublicProgram) {
  return `#${program.slug}`;
}

export function AcademicsConsolidatedPage({
  title,
  description,
  image,
  introduction,
  curriculum,
  programmes,
  departments,
}: {
  title: string;
  description: string;
  image: string;
  introduction: string[];
  curriculum: { title: string; description?: string; paragraphs: string[] };
  programmes: PublicProgram[];
  departments: PublicDepartment[];
}) {
  const preferredSlugs = new Set(["primary", "secondary", "plus-2"]);
  const primaryNavigation = programmes.filter((programme) => preferredSlugs.has(programme.slug));

  return (
    <>
      <PageHero
        eyebrow="Teaching and learning"
        title={title}
        description={description}
        image={image}
        crumbs={[{ label: "Academics" }]}
      />

      <nav
        aria-label="Academic page sections"
        className="sticky top-[68px] z-40 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8"
      >
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto pb-1">
          {primaryNavigation.map((programme) => (
            <Link
              key={programme.id}
              href={programmeAnchor(programme)}
              className="shrink-0 rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-[#2f3169] transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e3192]"
            >
              {programme.name}
            </Link>
          ))}
          <Link
            href="#curriculum"
            className="shrink-0 rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-[#2f3169] transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e3192]"
          >
            Curriculum
          </Link>
          <Link
            href="#departments"
            className="shrink-0 rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-[#2f3169] transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e3192]"
          >
            Departments
          </Link>
        </div>
      </nav>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-9 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
          <div>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-[#2e3192]">
              <GraduationCap size={24} aria-hidden="true" />
            </span>
            <p className="mt-6 text-xs font-extrabold tracking-[.2em] text-[#2e3192] uppercase">
              Academic overview
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-.035em] text-[#1e1f5c] sm:text-4xl">
              Every level in one place.
            </h2>
          </div>
          <div className="space-y-4">
            {introduction.map((paragraph) => (
              <p key={paragraph} className="text-base leading-8 text-slate-600">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#eef0fb] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold tracking-[.2em] text-[#2e3192] uppercase">
              Programme levels
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-.03em] text-[#1e1f5c] sm:text-4xl">
              Primary, secondary, and higher secondary
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Programme details below come from the school content system and can be updated by authorised
              administrators without creating more public pages.
            </p>
          </div>

          {programmes.length ? (
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {programmes.map((programme) => (
                <article
                  id={programme.slug}
                  key={programme.id}
                  className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_14px_38px_rgba(30,31,92,.05)] sm:p-8"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-[#2e3192]">
                      <BookOpenCheck size={20} aria-hidden="true" />
                    </span>
                    {programme.gradeRange && (
                      <span className="rounded-full bg-[#eef0fb] px-3 py-1.5 text-xs font-extrabold text-[#2f3169]">
                        {programme.gradeRange}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-6 text-2xl font-extrabold text-[#1e1f5c]">{programme.name}</h3>
                  <p className="mt-3 text-base leading-7 font-semibold text-[#2f3169]">
                    {programme.shortDescription}
                  </p>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{programme.description}</p>
                  {programme.curriculum && (
                    <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                      <h4 className="text-sm font-extrabold text-[#1e1f5c]">Curriculum overview</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{programme.curriculum}</p>
                    </div>
                  )}
                  {programme.outcomes.length > 0 && (
                    <ul className="mt-6 grid gap-2" aria-label={`${programme.name} learning outcomes`}>
                      {programme.outcomes.map((outcome) => (
                        <li key={outcome} className="flex gap-3 text-sm leading-6 text-slate-700">
                          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky-100 text-[#2e3192]">
                            <Check size={12} strokeWidth={3} aria-hidden="true" />
                          </span>
                          {outcome}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-10">
              <EmptyState
                title="Academic programmes are being reviewed"
                description="Published programme information will appear here after authorised school staff complete it in the administration workspace."
                actionLabel="Contact the school"
                actionHref="/contact"
              />
            </div>
          )}
        </div>
      </section>

      <section id="curriculum" className="scroll-mt-28 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-9 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#eef0fb] text-[#2e3192]">
              <Layers3 size={23} aria-hidden="true" />
            </span>
            <p className="mt-6 text-xs font-extrabold tracking-[.2em] text-[#2e3192] uppercase">
              Teaching framework
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-.03em] text-[#1e1f5c]">
              {curriculum.title}
            </h2>
          </div>
          <div className="rounded-3xl border border-slate-200 p-7 sm:p-9">
            {curriculum.description && (
              <p className="text-lg leading-8 font-semibold text-[#2f3169]">{curriculum.description}</p>
            )}
            <div className="mt-5 space-y-4 first:mt-0">
              {curriculum.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-base leading-8 text-slate-600">
                  {paragraph}
                </p>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/downloads"
                className="inline-flex items-center gap-2 rounded-xl bg-[#2e3192] px-5 py-3 text-sm font-extrabold text-white"
              >
                Academic downloads <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link
                href="/notices"
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-extrabold text-[#2e3192]"
              >
                Official notices
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        id="departments"
        className="scroll-mt-28 bg-[#1e1f5c] px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold tracking-[.2em] text-sky-300 uppercase">Subject areas</p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-[-.03em] sm:text-4xl">
                Departments and teachers
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-300">
                Open a department to see its published responsibilities, department head, and CMS-managed
                teacher profiles.
              </p>
            </div>
            <Link
              href="/departments"
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-extrabold text-white"
            >
              View all departments <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          {departments.length > 0 && (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {departments.slice(0, 6).map((department) => (
                <Link
                  key={department.id}
                  href={`/departments/${department.slug}`}
                  className="group rounded-2xl border border-white/15 bg-white/5 p-6 transition hover:-translate-y-0.5 hover:border-sky-300/60 hover:bg-white/10"
                >
                  <UsersRound size={20} className="text-sky-300" aria-hidden="true" />
                  <h3 className="mt-5 text-xl font-extrabold">{department.name}</h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-300">
                    {department.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-sky-300">
                    Open department <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
