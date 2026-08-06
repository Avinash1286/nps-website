import { AuditManager } from "@/components/admin/audit-manager";
import { PageHeading } from "@/components/admin/page-heading";
export default function AuditPage() {
  return (
    <>
      <PageHeading
        eyebrow="Security and compliance"
        title="Audit log"
        description="Review immutable administrative actions across publishing, submissions, access control, media, automation, and global settings."
      />
      <AuditManager />
    </>
  );
}
