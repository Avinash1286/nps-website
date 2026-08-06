import { PageHeading } from "@/components/admin/page-heading";
import { UsersManager } from "@/components/admin/users-manager";
export default function UsersPage() {
  return (
    <>
      <PageHeading
        eyebrow="Access governance"
        title="Users and roles"
        description="Grant least-privilege access, review synchronized Clerk identities, and suspend accounts at the Convex authorization boundary."
      />
      <UsersManager />
    </>
  );
}
