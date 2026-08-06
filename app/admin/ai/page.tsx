import { AiManager } from "@/components/admin/ai-manager";
import { PageHeading } from "@/components/admin/page-heading";
export default function AiPage() {
  return (
    <>
      <PageHeading
        eyebrow="Digital support"
        title="AI assistant"
        description="Control the public Gemini assistant, verify production configuration, inspect its Convex-backed response queue, and use restricted transcript review only for moderation or support."
      />
      <AiManager />
    </>
  );
}
