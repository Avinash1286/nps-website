"use client";

import { LoaderCircle } from "lucide-react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { studentArticlesApi } from "./convex-api";
import type { Student } from "./types";

const StudentSessionContext = createContext<Student | null>(null);

export function useStudentSession(override?: Student) {
  const contextualStudent = useContext(StudentSessionContext);
  const student = override ?? contextualStudent;
  if (!student) throw new Error("useStudentSession must be used inside StudentSessionGate.");
  return student;
}

export function StudentSessionGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const student = useQuery(studentArticlesApi.currentStudent, {});

  useEffect(() => {
    if (student === null) router.replace("/student/login");
  }, [router, student]);

  if (student === undefined || student === null) {
    return (
      <section className="grid min-h-[36rem] place-items-center px-4 py-16" aria-live="polite">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
          <LoaderCircle className="animate-spin text-[#2e3192]" size={21} aria-hidden="true" />
          {student === null ? "Taking you to student login…" : "Checking your student session…"}
        </div>
      </section>
    );
  }

  return <StudentSessionContext.Provider value={student}>{children}</StudentSessionContext.Provider>;
}
