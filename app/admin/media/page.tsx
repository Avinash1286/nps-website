import { MediaManager } from "@/components/admin/media-manager";
import { PageHeading } from "@/components/admin/page-heading";
export default function MediaPage() {
  return (
    <>
      <PageHeading
        eyebrow="Digital asset management"
        title="Media library"
        description="Upload verified images, documents, and video to Convex storage with accessible descriptions and traceable ownership."
      />
      <MediaManager />
    </>
  );
}
