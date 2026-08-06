import { PageHeading } from "@/components/admin/page-heading";
import { AdmissionDetail } from "@/components/admin/submission-manager";
export default async function AdmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <PageHeading
        eyebrow="Admissions operations"
        title="Application record"
        description="Review applicant and guardian information before recording workflow changes. Internal notes never appear on the public website."
      />
      <AdmissionDetail id={id} />
    </>
  );
}
