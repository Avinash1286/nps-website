import type { Metadata } from "next";
import { ContentCard } from "@/components/site/content-card";
import { EmptyState } from "@/components/site/empty-state";
import { PageHero } from "@/components/site/page-hero";
import { getNews } from "@/lib/data/public";
export const metadata: Metadata = {
  title: "School news",
  description: "Published news and stories from Nepal Police School, Garuda.",
};
export default async function NewsPage() {
  const news = await getNews(100);
  return (
    <>
      <PageHero
        eyebrow="School updates"
        title="News and stories"
        description="Published updates from teaching, learning, activities, and the wider school community."
        crumbs={[{ label: "News" }]}
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {news.length ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {news.map((item) => (
                <ContentCard key={item.id} item={item} basePath="/news" />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No published news yet"
              description="Verified stories will appear here after they are published by authorised school staff."
              actionLabel="View notices"
              actionHref="/notices"
            />
          )}
        </div>
      </section>
    </>
  );
}
