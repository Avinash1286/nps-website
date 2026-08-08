import { AdminCollectionPage } from "@/components/admin/content-manager";

const websitePageSections = new Set(["about", "academics", "campus-life", "admissions"]);

export default async function AdminPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;
  return (
    <AdminCollectionPage
      collection="pages"
      initialSearch={section && websitePageSections.has(section) ? section : ""}
    />
  );
}
