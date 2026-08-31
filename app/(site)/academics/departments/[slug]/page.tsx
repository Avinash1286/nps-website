import { permanentRedirect } from "next/navigation";

export default async function LegacyDepartmentPage({ params }: PageProps<"/academics/departments/[slug]">) {
  const { slug } = await params;
  permanentRedirect(`/departments/${slug}`);
}
