import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BookMarked, BookOpen, GraduationCap, Mail, Phone, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/site/page-hero";
import { contentMetadata } from "@/lib/content/public-metadata";
import { getTeacher } from "@/lib/data/public";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const teacher = await getTeacher(slug);
  return teacher
    ? contentMetadata({
        title: teacher.name,
        description: `${teacher.name}, ${teacher.designation} at Nepal Police School, Garuda.`,
        seo: teacher.seo,
        path: `/teachers/${slug}`,
      })
    : {};
}
export default async function TeacherPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const teacher = await getTeacher(slug);
  if (!teacher) notFound();
  return (
    <>
      <PageHero
        eyebrow={teacher.department}
        title={teacher.name}
        description={`${teacher.designation} · Nepal Police School, Garuda`}
        image="/media/nps-staff-group.jpg"
        crumbs={[
          { label: "Departments", href: "/departments" },
          { label: teacher.department, href: `/departments/${teacher.departmentSlug}` },
          { label: teacher.name },
        ]}
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[320px_1fr]">
          <aside>
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-slate-100">
              {teacher.photoUrl ? (
                <Image
                  src={teacher.photoUrl}
                  alt={teacher.name}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="320px"
                />
              ) : (
                <span className="grid h-full place-items-center text-slate-300">
                  <Users size={44} />
                </span>
              )}
            </div>
          </aside>
          <article className="min-w-0">
            <p className="text-xs font-extrabold tracking-[.18em] text-[#2e3192] uppercase">
              Faculty profile
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <BookOpen size={18} className="text-[#2e3192]" />
                <p className="mt-3 text-xs font-bold tracking-[.12em] text-slate-500 uppercase">Department</p>
                <p className="mt-1 font-extrabold text-[#2f3169]">{teacher.department}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <GraduationCap size={18} className="text-[#2e3192]" />
                <p className="mt-3 text-xs font-bold tracking-[.12em] text-slate-500 uppercase">
                  Qualification
                </p>
                <p className="mt-1 font-extrabold text-[#2f3169]">
                  {teacher.qualification ?? "To be published"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                <BookMarked size={18} className="text-[#2e3192]" />
                <p className="mt-3 text-xs font-bold tracking-[.12em] text-slate-500 uppercase">Subjects</p>
                {teacher.subjects.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {teacher.subjects.map((subject) => (
                      <span
                        key={subject}
                        className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-[#2f3169]"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 font-extrabold text-[#2f3169]">To be published</p>
                )}
              </div>
            </div>
            <section className="mt-9">
              <h2 className="text-2xl font-extrabold text-[#1e1f5c]">About</h2>
              <p className="mt-4 text-base leading-8 text-slate-700">
                {teacher.bio ??
                  "A verified professional profile will be published here by the school administration."}
              </p>
            </section>
            {(teacher.email || teacher.phone) && (
              <section className="mt-9" aria-labelledby="faculty-contact-heading">
                <h2 id="faculty-contact-heading" className="text-2xl font-extrabold text-[#1e1f5c]">
                  Published contact details
                </h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  {teacher.email && (
                    <a
                      href={`mailto:${teacher.email}`}
                      className="inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-[#2e3192]"
                    >
                      <Mail size={16} className="shrink-0" />
                      <span className="min-w-0">{teacher.email}</span>
                    </a>
                  )}
                  {teacher.phone && (
                    <a
                      href={`tel:${teacher.phone.replace(/\s/g, "")}`}
                      className="inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-[#2e3192]"
                    >
                      <Phone size={16} className="shrink-0" />
                      <span className="min-w-0">{teacher.phone}</span>
                    </a>
                  )}
                </div>
              </section>
            )}
            <div className="mt-10 flex flex-wrap gap-4 border-t border-slate-200 pt-6">
              <Link
                href={`/departments/${teacher.departmentSlug}`}
                className="max-w-full rounded-xl bg-[#2e3192] px-4 py-2.5 text-sm font-bold text-white"
              >
                View {teacher.department}
              </Link>
              <Link
                href="/departments"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#2e3192]"
              >
                <ArrowLeft size={15} />
                All departments
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
