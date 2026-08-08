import { AdminDashboard } from "@/components/admin/dashboard";
import { PageHeading } from "@/components/admin/page-heading";

export default function AdminDashboardPage() {
  return (
    <>
      <PageHeading
        eyebrow="Start here"
        title="What would you like to update?"
        description="Choose a common task below, or open Edit website to find content in the same order visitors see it."
      />
      <AdminDashboard />
    </>
  );
}
