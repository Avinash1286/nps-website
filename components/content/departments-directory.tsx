import Link from "next/link";
import { ArrowRight, BookMarked } from "lucide-react";
import { EmptyState } from "@/components/site/empty-state";
import { FeaturedBadge } from "@/components/site/featured-badge";
import { PageHero } from "@/components/site/page-hero";
import type { PublicDepartment } from "@/lib/data/public";

export function DepartmentsDirectory({ departments }: { departments: PublicDepartment[] }) {
  return (
    <>
      <PageHero
        eyebrow="Subject areas"
        title="Academic departments"
        description="Open a department to see its published information and the teachers assigned to it by the school administration."
        image="/media/science-lab.png"
        crumbs={[{ label: "Departments" }]}
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xl leading-9 font-semibold text-[#2f3169] sm:text-2xl">
              Every department page is connected directly to CMS-managed teacher profiles. Only information
              published by authorised school staff appears here.
            </p>
          </div>
          {departments.length ? (
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {departments.map((department) => (
                <Link
                  key={department.id}
                  href={`/departments/${department.slug}`}
                  className="group min-w-0 rounded-2xl border border-slate-200 p-6 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_16px_38px_rgba(14,49,80,.08)]"
                >
                  <BookMarked className="text-[#2e3192]" aria-hidden="true" />
                  {department.featured && <FeaturedBadge className="mt-4" />}
                  <h2 className="mt-5 text-xl font-extrabold text-[#1e1f5c]">{department.name}</h2>
                  <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-600">
                    {department.description}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[#2e3192]">
                    View department and teachers <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-12">
              <EmptyState
                title="No departments are published yet"
                description="Department cards will appear after authorised staff create and publish them in the administration workspace. No placeholder departments or teacher names are shown."
                actionLabel="Explore academics"
                actionHref="/academics"
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
