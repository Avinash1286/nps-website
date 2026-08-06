import { JobsManager } from "@/components/admin/jobs-manager";
import { PageHeading } from "@/components/admin/page-heading";
export default function JobsPage() {
  return (
    <>
      <PageHeading
        eyebrow="System operations"
        title="Background jobs"
        description="Inspect scheduled publishing, notifications, AI responses, and retention work. Retry only failed jobs after reviewing their recorded error."
      />
      <JobsManager />
    </>
  );
}
