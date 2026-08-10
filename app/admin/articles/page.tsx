import { ArticleReviewManager } from "@/components/admin/article-review-manager";
import { PageHeading } from "@/components/admin/page-heading";

export default function AdminArticlesPage() {
  return (
    <>
      <PageHeading
        eyebrow="Student publishing"
        title="Article review"
        description="Review student submissions before they appear publicly. Only administrators can approve, reject, or archive student articles."
      />
      <ArticleReviewManager />
    </>
  );
}
