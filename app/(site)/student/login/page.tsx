import type { Metadata } from "next";
import { StudentAuthForm } from "@/components/student/student-auth-form";

export const metadata: Metadata = {
  title: "Student login",
  description: "Sign in to the Nepal Police School student article workspace.",
};

export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string | string[] }>;
}) {
  const registered = (await searchParams).registered;
  return <StudentAuthForm mode="login" registrationComplete={registered === "1"} />;
}
