import type { Metadata } from "next";
import { StudentProfile } from "@/components/student/student-profile";
import { StudentSessionGate } from "@/components/student/student-session-gate";

export const metadata: Metadata = {
  title: "My student profile",
  description: "Review and update your student publishing profile.",
};

export default function StudentProfilePage() {
  return (
    <StudentSessionGate>
      <StudentProfile />
    </StudentSessionGate>
  );
}
