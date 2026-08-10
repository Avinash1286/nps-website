import type { Metadata } from "next";
import { StudentAuthForm } from "@/components/student/student-auth-form";

export const metadata: Metadata = {
  title: "Create a student publishing account",
  description: "Register to write and submit student articles for school review.",
};

export default function StudentRegisterPage() {
  return <StudentAuthForm mode="register" />;
}
