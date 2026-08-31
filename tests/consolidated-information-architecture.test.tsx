import { cleanup, render, screen, within } from "@testing-library/react";
import { createElement, type ImgHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    unoptimized: _unoptimized,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
    unoptimized?: boolean;
  }) => createElement("img", props),
}));

import { AcademicsConsolidatedPage } from "@/components/content/academics-consolidated-page";
import { DepartmentDetailPage } from "@/components/content/department-detail-page";
import { DepartmentsDirectory } from "@/components/content/departments-directory";
import { structuredPageSections } from "@/lib/content/merged-pages";
import type { PublicDepartment, PublicProgram, PublicTeacher } from "@/lib/data/public";

const programme: PublicProgram = {
  id: "programme-primary",
  slug: "primary",
  name: "Primary level",
  shortDescription: "A strong learning foundation.",
  description: "Published primary programme information.",
  gradeRange: "Grades 1–5",
  curriculum: "Languages, mathematics, science, and social studies.",
  outcomes: ["Confident communication"],
};

const department: PublicDepartment = {
  id: "department-science",
  slug: "science",
  name: "Science Department",
  description: "Published science department information.",
  responsibilities: ["Coordinate science teaching"],
  teachers: [],
};

const head: PublicTeacher = {
  id: "teacher-head",
  slug: "department-head",
  name: "Department Head",
  designation: "Head of Science",
  department: "Science Department",
  departmentSlug: "science",
  subjects: ["Science"],
};

const teacher: PublicTeacher = {
  id: "teacher-member",
  slug: "faculty-member",
  name: "Faculty Member",
  designation: "Teacher",
  department: "Science Department",
  departmentSlug: "science",
  subjects: ["Physics"],
};

describe("consolidated public information architecture", () => {
  afterEach(cleanup);

  it("parses editor-managed About sections while preserving introductory content", () => {
    expect(
      structuredPageSections(
        "Introductory copy.\n\n## History\nHistory copy.\n\n## Mission & Vision\nShared direction.",
      ),
    ).toEqual({
      overview: ["Introductory copy."],
      history: ["History copy."],
      "mission-and-vision": ["Shared direction."],
    });
  });

  it("renders programmes inline on one Academics page with stable anchors", () => {
    const { container } = render(
      <AcademicsConsolidatedPage
        title="Academics"
        description="All programmes in one place."
        image="/media/science-lab.png"
        introduction={["Published academic introduction."]}
        curriculum={{ title: "Curriculum", paragraphs: ["Published curriculum information."] }}
        programmes={[programme]}
        departments={[department]}
      />,
    );

    expect(container.querySelector("#primary")).not.toBeNull();
    expect(container.querySelector("#curriculum")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Primary level" })).toBeVisible();
    expect(screen.getByText("Published primary programme information.")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Primary level" })).toHaveAttribute("href", "#primary");
    expect(container.querySelector('a[href="/academics/primary"]')).not.toBeInTheDocument();
  });

  it("lists only the CMS departments supplied to the directory and exposes an honest empty state", () => {
    const { rerender } = render(<DepartmentsDirectory departments={[department]} />);

    expect(screen.getByRole("link", { name: /Science Department/ })).toHaveAttribute(
      "href",
      "/departments/science",
    );
    expect(screen.queryByText("Mathematics")).not.toBeInTheDocument();

    rerender(<DepartmentsDirectory departments={[]} />);
    expect(screen.getByRole("heading", { name: "No departments are published yet" })).toBeVisible();
  });

  it("shows the CMS-linked department head and faculty once each", () => {
    const { container } = render(
      <DepartmentDetailPage department={{ ...department, headTeacher: head, teachers: [head, teacher] }} />,
    );

    const facultySection = container.querySelector("#department-faculty-heading")?.parentElement
      ?.parentElement;
    expect(facultySection).not.toBeNull();
    expect(within(facultySection as HTMLElement).getAllByText("Department Head")).toHaveLength(1);
    expect(within(facultySection as HTMLElement).getAllByText("Faculty Member")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Department Head/ })).toHaveAttribute(
      "href",
      "/teachers/department-head",
    );
  });
});
