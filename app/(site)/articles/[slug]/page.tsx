import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudentArticleDetail } from "@/components/site/student-article-detail";
import { contentMetadata } from "@/lib/content/public-metadata";
import { getSiteProfile, getStudentArticle } from "@/lib/data/public";
import { serializeJsonLd } from "@/lib/security/json-ld";
import { getSiteUrl } from "@/lib/server/site-url";

type ArticleRouteProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ArticleRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getStudentArticle(slug);
  return article
    ? contentMetadata({
        title: article.title,
        description: article.excerpt,
        seo: article.seo,
        path: `/articles/${slug}`,
      })
    : {};
}

export default async function StudentArticlePage({ params }: ArticleRouteProps) {
  const { slug } = await params;
  const [article, site] = await Promise.all([getStudentArticle(slug), getSiteProfile()]);
  if (!article) notFound();
  const siteUrl = getSiteUrl();
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    mainEntityOfPage: new URL(`/articles/${article.slug}`, siteUrl).toString(),
    author: { "@type": "Person", name: article.authorName },
    publisher: { "@type": "School", name: site.schoolName, url: siteUrl },
    ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
    ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
    ...(article.featuredImageUrl ? { image: new URL(article.featuredImageUrl, siteUrl).toString() } : {}),
  };
  return (
    <>
      <StudentArticleDetail article={article} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }}
      />
    </>
  );
}
