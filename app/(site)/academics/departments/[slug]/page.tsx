import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StandardPage } from "@/components/site/standard-page";
import { contentMetadata } from "@/lib/content/public-metadata";
import { departments, type StandardPageContent } from "@/lib/content/site-pages";
import { getDepartment, type PublicDepartment } from "@/lib/data/public";

function departmentPage(department: PublicDepartment): StandardPageContent {
  const teachers = department.teachers.filter((teacher) => teacher.id !== department.headTeacher?.id);
  return {
    eyebrow: "Academic department",
    title: department.name,
    description: department.description,
    intro: department.description,
    sections: department.responsibilities.length
      ? [
          {
            title: "Department responsibilities",
            body: "This department supports the following published areas of teaching and learning.",
            points: department.responsibilities,
          },
        ]
      : [],
    related: [
      ...teachers.slice(0, 8).map((teacher) => ({
        label: teacher.name,
        href: `/teachers/${teacher.slug}`,
      })),
      { label: "All teachers in this department", href: `/teachers?department=${department.slug}` },
      { label: "All departments", href: "/academics/departments" },
    ],
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const department = await getDepartment(slug);
  const page = department ? departmentPage(department) : departments[slug];
  return page
    ? contentMetadata({
        title: `${page.title} department`,
        description: page.description,
        seo: department?.seo,
      })
    : {};
}

export default async function DepartmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const department = await getDepartment(slug);
  const fallback = departments[slug];
  const content = department
    ? departmentPage(department)
    : fallback && {
        ...fallback,
        related: [
          { label: "Faculty in this department", href: `/teachers?department=${slug}` },
          { label: "All departments", href: "/academics/departments" },
        ],
      };
  if (!content) notFound();
  const head = department?.headTeacher;
  return (
    <StandardPage
      content={content}
      parentLabel="Departments"
      parentHref="/academics/departments"
      featuredProfile={
        head
          ? {
              eyebrow: "Department head",
              name: head.name,
              designation: head.designation,
              description: head.bio,
              subjects: head.subjects,
              photoUrl: head.photoUrl,
              href: `/teachers/${head.slug}`,
            }
          : undefined
      }
    />
  );
}
