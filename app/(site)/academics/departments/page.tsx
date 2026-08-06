import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookMarked } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { FeaturedBadge } from "@/components/site/featured-badge";
import { departments as baselineDepartments } from "@/lib/content/site-pages";
import { getDepartments } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Academic departments",
  description: "Explore academic subject areas and related faculty at Nepal Police School, Garuda.",
};

export default async function DepartmentsPage() {
  const configured = await getDepartments();
  const departments = configured.length
    ? configured.map((department) => ({
        slug: department.slug,
        title: department.name,
        description: department.description,
        featured: department.featured,
      }))
    : Object.entries(baselineDepartments).map(([slug, department]) => ({
        slug,
        title: department.title,
        description: department.description,
        featured: false,
      }));

  return (
    <>
      <PageHero
        eyebrow="Subject areas"
        title="Academic departments"
        description="Explore how each subject area contributes to knowledge, practical skills, communication, and responsible learning."
        image="/media/science-lab.png"
        crumbs={[{ label: "Academics", href: "/academics" }, { label: "Departments" }]}
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="max-w-3xl text-xl leading-9 font-semibold text-[#173f61]">
            Department pages provide a stable home for curriculum information and links to verified teacher
            profiles. Current staffing and subject availability come from the school content system.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((department) => (
              <Link
                key={department.slug}
                href={`/academics/departments/${department.slug}`}
                className="group min-w-0 rounded-2xl border border-slate-200 p-6 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_16px_38px_rgba(14,49,80,.08)]"
              >
                <BookMarked className="text-[#0a65a8]" />
                {department.featured && <FeaturedBadge className="mt-4" />}
                <h2 className="mt-5 text-xl font-extrabold text-[#092f59]">{department.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{department.description}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[#0a65a8]">
                  View department <ArrowRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
