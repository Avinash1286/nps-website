import { PageHeading } from "@/components/admin/page-heading";
import { SettingsManager } from "@/components/admin/settings-manager";
export default function SettingsPage() {
  return (
    <>
      <PageHeading
        eyebrow="Global configuration"
        title="Site settings"
        description="Manage the school identity, contact details, discovery metadata, and high-impact public feature controls."
      />
      <SettingsManager />
    </>
  );
}
