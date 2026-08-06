import { PageHeading } from "@/components/admin/page-heading";
import { SubmissionManager } from "@/components/admin/submission-manager";

export default function EventRegistrationsPage() {
  return (
    <>
      <PageHeading
        eyebrow="Event operations"
        title="Event registrations"
        description="Review attendee rosters, manage waitlists and cancellations, record attendance, and export a spreadsheet-safe CSV roster."
      />
      <SubmissionManager type="eventRegistrations" />
    </>
  );
}
