import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StudentAuthProvider } from "@/components/student/student-auth-provider";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function StudentLayout({ children }: { children: ReactNode }) {
  let initialToken: string | null = null;
  if (process.env.NEXT_PUBLIC_CONVEX_URL && process.env.NEXT_PUBLIC_CONVEX_SITE_URL) {
    try {
      const { getStudentAuthToken } = await import("@/lib/auth/student-server");
      initialToken = (await getStudentAuthToken()) ?? null;
    } catch {
      // Client-side session recovery remains available. Keeping the token
      // optional also lets this route show a setup state before deployment
      // environment variables have been provisioned.
    }
  }
  return <StudentAuthProvider initialToken={initialToken}>{children}</StudentAuthProvider>;
}
