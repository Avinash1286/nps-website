import type { Metadata } from "next";
import Image from "@/components/site/public-image";
import Link from "next/link";
import { ArrowLeft, MessageSquareQuote } from "lucide-react";
import { EmptyState } from "@/components/site/empty-state";
import { PageHero } from "@/components/site/page-hero";
import { getTestimonials } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Community voices",
  description: "Approved reflections from the Nepal Police School, Garuda community.",
};

export default async function TestimonialsPage() {
  const testimonials = await getTestimonials(100);
  return (
    <>
      <PageHero
        eyebrow="Our community"
        title="Community voices"
        description="Approved reflections from people connected with our school community, published with administrative review."
        image="/media/nps-staff-group.jpg"
        crumbs={[{ label: "About", href: "/about" }, { label: "Community voices" }]}
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {testimonials.length ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {testimonials.map((item) => (
                <figure
                  key={item.id}
                  className="flex min-w-0 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
                >
                  <MessageSquareQuote className="text-[#2e3192]" size={28} aria-hidden="true" />
                  <blockquote className="mt-5 flex-1 text-base leading-8 text-slate-700">
                    “{item.quote}”
                  </blockquote>
                  <figcaption className="mt-7 flex items-center gap-3 border-t border-slate-100 pt-5">
                    {item.photoUrl ? (
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
                        <Image src={item.photoUrl} alt="" fill className="object-cover" sizes="48px" />
                      </span>
                    ) : (
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky-50 text-sm font-black text-[#2e3192]">
                        {item.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0">
                      <strong className="block truncate text-sm text-[#1e1f5c]">{item.name}</strong>
                      {(item.role || item.organization) && (
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {[item.role, item.organization].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No community reflections published yet"
              description="Approved testimonials will appear here after authorised staff publish them."
              actionLabel="Learn about the school"
              actionHref="/about"
            />
          )}
          <Link
            href="/about"
            className="mt-10 inline-flex items-center gap-2 text-sm font-bold text-[#2e3192]"
          >
            <ArrowLeft size={15} /> Back to about the school
          </Link>
        </div>
      </section>
    </>
  );
}
