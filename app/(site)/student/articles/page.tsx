import type { Metadata } from "next";
import { StudentArticlesDashboard } from "@/components/student/student-articles-dashboard";
import { StudentSessionGate } from "@/components/student/student-session-gate";

export const metadata: Metadata = {
  title: "My student articles",
  description: "Write, review, and submit student articles for school approval.",
};

export default function StudentArticlesPage() {
  return (
    <StudentSessionGate>
      <StudentArticlesDashboard />
    </StudentSessionGate>
  );
}
