import type { Metadata } from "next";
import { StudentArticleEditor } from "@/components/student/student-article-editor";
import { StudentSessionGate } from "@/components/student/student-session-gate";

export const metadata: Metadata = {
  title: "Edit student article",
  description: "Update a student article draft or review its current approval status.",
};

export default async function EditStudentArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <StudentSessionGate>
      <StudentArticleEditor articleId={id} />
    </StudentSessionGate>
  );
}
