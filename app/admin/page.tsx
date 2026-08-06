import { AdminDashboard } from "@/components/admin/dashboard";
import { PageHeading } from "@/components/admin/page-heading";

export default function AdminDashboardPage() {
  return (
    <>
      <PageHeading
        eyebrow="Workspace overview"
        title="Good administration starts with clarity"
        description="Monitor publishing, enquiries, admissions, automation, and recent administrative activity from one secure workspace."
      />
      <AdminDashboard />
    </>
  );
}
