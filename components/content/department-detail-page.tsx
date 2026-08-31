import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpenCheck, Mail, Phone, UserRound, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/site/empty-state";
import { PageHero } from "@/components/site/page-hero";
import PublicImage from "@/components/site/public-image";
import type { PublicDepartment, PublicTeacher } from "@/lib/data/public";

function TeacherCard({ teacher, label }: { teacher: PublicTeacher; label?: string }) {
  return (
    <Link
      href={`/teachers/${teacher.slug}`}
      className="group grid min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-[150px_minmax(0,1fr)]"
    >
      <div className="relative min-h-48 bg-slate-100 sm:min-h-full">
        {teacher.photoUrl ? (
          <PublicImage
            src={teacher.photoUrl}
            alt={teacher.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, 150px"
          />
        ) : (
          <span className="grid h-full min-h-48 place-items-center text-slate-300">
            <UserRound size={38} aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="min-w-0 p-5">
        <p className="text-[11px] font-extrabold tracking-[.14em] text-[#2e3192] uppercase">
          {label ?? "Department faculty"}
        </p>
        <h3 className="mt-2 text-xl font-extrabold text-[#1e1f5c]">{teacher.name}</h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">{teacher.designation}</p>
        {teacher.subjects.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {teacher.subjects.slice(0, 3).map((subject) => (
              <span
                key={subject}
                className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-[#2f3169]"
              >
                {subject}
              </span>
            ))}
          </div>
        )}
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#2e3192]">
          View teacher profile <ArrowRight size={14} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export function DepartmentDetailPage({ department }: { department: PublicDepartment }) {
  const faculty = department.teachers.filter((teacher) => teacher.id !== department.headTeacher?.id);

  return (
    <>
      <PageHero
        eyebrow="Academic department"
        title={department.name}
        description={department.description}
        image="/media/science-lab.png"
        crumbs={[{ label: "Departments", href: "/departments" }, { label: department.name }]}
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <p className="text-xs font-extrabold tracking-[.18em] text-[#2e3192] uppercase">
              Department overview
            </p>
            <p className="mt-5 max-w-3xl text-xl leading-9 font-semibold text-[#2f3169]">
              {department.description}
            </p>

            {department.responsibilities.length > 0 && (
              <section
                className="mt-10 border-t border-slate-200 pt-8"
                aria-labelledby="responsibilities-heading"
              >
                <h2 id="responsibilities-heading" className="text-2xl font-extrabold text-[#1e1f5c]">
                  Department responsibilities
                </h2>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {department.responsibilities.map((responsibility) => (
                    <li
                      key={responsibility}
                      className="flex gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 font-semibold text-slate-700"
                    >
                      <BookOpenCheck
                        size={18}
                        className="mt-0.5 shrink-0 text-[#2e3192]"
                        aria-hidden="true"
                      />
                      {responsibility}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-12" aria-labelledby="department-faculty-heading">
              <div className="flex items-center gap-3">
                <UsersRound size={23} className="text-[#2e3192]" aria-hidden="true" />
                <h2 id="department-faculty-heading" className="text-2xl font-extrabold text-[#1e1f5c]">
                  Teachers and staff
                </h2>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Profiles in this section are assigned to the department and published through the school CMS.
              </p>

              {department.headTeacher && (
                <div className="mt-7">
                  <TeacherCard teacher={department.headTeacher} label="Department head" />
                </div>
              )}

              {faculty.length > 0 ? (
                <div className="mt-5 grid gap-5 xl:grid-cols-2">
                  {faculty.map((teacher) => (
                    <TeacherCard key={teacher.id} teacher={teacher} />
                  ))}
                </div>
              ) : !department.headTeacher ? (
                <div className="mt-7">
                  <EmptyState
                    title="No teacher profiles are published for this department"
                    description="Authorised staff can assign existing teacher profiles to this department in the administration workspace."
                    actionLabel="View all departments"
                    actionHref="/departments"
                  />
                </div>
              ) : null}
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            {(department.email || department.phone) && (
              <section
                className="rounded-2xl border border-slate-200 p-5"
                aria-labelledby="department-contact-heading"
              >
                <h2 id="department-contact-heading" className="text-sm font-extrabold text-[#1e1f5c]">
                  Published department contact
                </h2>
                <div className="mt-4 space-y-3 text-sm font-semibold text-[#2e3192]">
                  {department.email && (
                    <a href={`mailto:${department.email}`} className="flex min-w-0 items-center gap-2">
                      <Mail size={16} className="shrink-0" aria-hidden="true" />
                      <span className="min-w-0 break-words">{department.email}</span>
                    </a>
                  )}
                  {department.phone && (
                    <a
                      href={`tel:${department.phone.replace(/\s/g, "")}`}
                      className="flex items-center gap-2"
                    >
                      <Phone size={16} className="shrink-0" aria-hidden="true" />
                      {department.phone}
                    </a>
                  )}
                </div>
              </section>
            )}
            <nav aria-label="Department links" className="rounded-2xl bg-[#eef0fb] p-5">
              <Link
                href="/departments"
                className="inline-flex items-center gap-2 text-sm font-extrabold text-[#2e3192]"
              >
                <ArrowLeft size={15} aria-hidden="true" /> All departments
              </Link>
              <Link
                href="/academics"
                className="mt-4 flex items-center justify-between gap-3 border-t border-indigo-100 pt-4 text-sm font-extrabold text-[#2e3192]"
              >
                Academics overview <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </nav>
          </aside>
        </div>
      </section>
    </>
  );
}
