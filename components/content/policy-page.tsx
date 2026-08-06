import { PageHero } from "@/components/site/page-hero";

export function PolicyPage({
  eyebrow,
  title,
  description,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  description: string;
  updated: string;
  sections: { title: string; body: React.ReactNode }[];
}) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} description={description} crumbs={[{ label: title }]} />
      <article className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
            Last reviewed: {updated}
          </p>
          <div className="mt-10 space-y-10">
            {sections.map((section) => (
              <section key={section.title} className="border-t border-slate-200 pt-8">
                <h2 className="text-2xl font-extrabold tracking-[-.025em] text-[#092f59]">{section.title}</h2>
                <div className="mt-4 min-w-0 space-y-4 text-base leading-8 [overflow-wrap:anywhere] text-slate-700 [&_a]:font-bold [&_a]:text-[#0a65a8] [&_li]:ml-5 [&_li]:list-disc">
                  {section.body}
                </div>
              </section>
            ))}
          </div>
        </div>
      </article>
    </>
  );
}
