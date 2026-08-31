import { DepartmentsDirectory } from "@/components/content/departments-directory";
import { contentMetadata } from "@/lib/content/public-metadata";
import { getDepartments } from "@/lib/data/public";

export const metadata = contentMetadata({
  title: "Academic departments",
  description:
    "Explore published academic departments and the teachers assigned to them at Nepal Police School, Garuda.",
  path: "/departments",
});

export default async function DepartmentsPage() {
  const departments = await getDepartments();
  return <DepartmentsDirectory departments={departments} />;
}
