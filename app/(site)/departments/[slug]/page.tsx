import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DepartmentDetailPage } from "@/components/content/department-detail-page";
import { contentMetadata } from "@/lib/content/public-metadata";
import { getDepartment } from "@/lib/data/public";

type DepartmentPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: DepartmentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const department = await getDepartment(slug);
  return department
    ? contentMetadata({
        title: department.name,
        description: department.description,
        seo: department.seo,
        path: `/departments/${slug}`,
      })
    : {};
}

export default async function DepartmentPage({ params }: DepartmentPageProps) {
  const { slug } = await params;
  const department = await getDepartment(slug);
  if (!department) notFound();
  return <DepartmentDetailPage department={department} />;
}
