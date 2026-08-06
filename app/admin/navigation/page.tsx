import { NavigationManager } from "@/components/admin/navigation-manager";
import { PageHeading } from "@/components/admin/page-heading";
export default function NavigationPage() {
  return (
    <>
      <PageHeading
        eyebrow="Website structure"
        title="Navigation"
        description="Build accessible header, footer, and utility menus with explicit destinations, visibility, ordering, and optional role requirements."
      />
      <NavigationManager />
    </>
  );
}
