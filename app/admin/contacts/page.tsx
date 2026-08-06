import { PageHeading } from "@/components/admin/page-heading";
import { SubmissionManager } from "@/components/admin/submission-manager";
export default function ContactsPage() {
  return (
    <>
      <PageHeading
        eyebrow="Community support"
        title="Contact enquiries"
        description="Triage website enquiries, assign an accountable staff member, preserve internal context, and close resolved requests."
      />
      <SubmissionManager type="contacts" />
    </>
  );
}
