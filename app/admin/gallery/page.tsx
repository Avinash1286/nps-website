import { AdminCollectionPage } from "@/components/admin/content-manager";
import { GalleryItemsManager } from "@/components/admin/gallery-items-manager";

export default function AdminGalleryPage() {
  return (
    <>
      <AdminCollectionPage collection="gallery" />
      <GalleryItemsManager />
    </>
  );
}
