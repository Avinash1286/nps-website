import { NewsletterManager } from "@/components/admin/newsletter-manager";
import { PageHeading } from "@/components/admin/page-heading";

export default function NewsletterPage() {
  return (
    <>
      <PageHeading
        eyebrow="Audience communications"
        title="Newsletter"
        description="Manage confirmed subscribers and send auditable campaigns through the resilient Convex delivery queue."
      />
      <NewsletterManager />
    </>
  );
}
