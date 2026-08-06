import { PageHeading } from "@/components/admin/page-heading";
import { SubmissionManager } from "@/components/admin/submission-manager";
export default function AdmissionsPage() {
  return (
    <>
      <PageHeading
        eyebrow="Admissions operations"
        title="Applications"
        description="Review submitted applications, assign staff ownership, record private notes, and move candidates through a clear admissions workflow."
      />
      <SubmissionManager type="admissions" />
    </>
  );
}
