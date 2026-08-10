import type { Metadata } from "next";
import { StudentArticleEditor } from "@/components/student/student-article-editor";
import { StudentSessionGate } from "@/components/student/student-session-gate";

export const metadata: Metadata = {
  title: "Write a student article",
  description: "Create a private student article draft and submit it for school review.",
};

export default function NewStudentArticlePage() {
  return (
    <StudentSessionGate>
      <StudentArticleEditor />
    </StudentSessionGate>
  );
}
