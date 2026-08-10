"use client";

import { CheckCircle2, LoaderCircle, LockKeyhole, Mail, RotateCcw, Save, UserRound } from "lucide-react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/student-client";
import { studentProfileApi } from "./convex-api";
import { useStudentSession } from "./student-session-gate";
import { StudentWorkspaceShell } from "./student-workspace-shell";
import type { Student } from "./types";

type ProfileFeedback = { kind: "success" | "error"; message: string } | null;

const fieldClass =
  "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2e3192] focus:ring-4 focus:ring-sky-100 read-only:cursor-not-allowed read-only:bg-slate-50 read-only:text-slate-600";

function normalizedDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function StudentProfile({ student: studentOverride }: { student?: Student }) {
  const sessionStudent = useStudentSession(studentOverride);
  const router = useRouter();
  const updateDisplayName = useMutation(studentProfileApi.updateDisplayName);
  const [profile, setProfile] = useState(sessionStudent);
  const [name, setName] = useState(sessionStudent.name);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<ProfileFeedback>(null);

  const normalizedName = normalizedDisplayName(name);
  const nameChanged = normalizedName !== profile.name;
  const validName = normalizedName.length >= 2 && normalizedName.length <= 120;

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!validName) {
      setFeedback({
        kind: "error",
        message: "Enter a display name between 2 and 120 characters.",
      });
      return;
    }

    if (!nameChanged) {
      setFeedback({ kind: "success", message: "Your profile is already up to date." });
      return;
    }

    setSaving(true);
    setFeedback(null);
    let canonicalNameUpdated = false;
    try {
      const authResult = await authClient.updateUser({ name: normalizedName });
      if (authResult.error) throw new Error("PROFILE_UPDATE_FAILED");
      canonicalNameUpdated = true;

      const updatedProfile = await updateDisplayName({ name: normalizedName });
      setProfile(updatedProfile);
      setName(updatedProfile.name);
      setFeedback({
        kind: "success",
        message: "Your display name has been updated.",
      });
      router.refresh();
    } catch {
      if (canonicalNameUpdated) {
        try {
          await authClient.updateUser({ name: profile.name });
          router.refresh();
        } catch {
          // The visible error still asks the student to retry. A later session
          // refresh reconciles the account label with the stored profile.
        }
      }
      setFeedback({
        kind: "error",
        message: "We could not update your profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  function resetName() {
    setName(profile.name);
    setFeedback(null);
  }

  return (
    <StudentWorkspaceShell
      student={profile}
      eyebrow="Account settings"
      title="My profile"
      description="Keep the name shown with your student account and published writing accurate."
    >
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <form
          onSubmit={(event) => void saveProfile(event)}
          className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
          aria-labelledby="profile-details-title"
        >
          <div className="flex items-start gap-4 border-b border-slate-200 pb-6">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#eef0fb] text-[#2e3192]">
              <UserRound size={23} aria-hidden="true" />
            </span>
            <div>
              <h2 id="profile-details-title" className="text-xl font-black tracking-tight text-[#12123a]">
                Profile details
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Your display name appears in the student workspace and may appear beside approved articles.
              </p>
            </div>
          </div>

          {feedback && (
            <div
              role={feedback.kind === "error" ? "alert" : "status"}
              aria-live="polite"
              className={`mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-6 ${
                feedback.kind === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {feedback.kind === "success" && (
                <CheckCircle2 className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <div className="mt-6 space-y-6">
            <label className="block text-sm font-bold text-slate-700" htmlFor="student-display-name">
              Display name <span className="text-red-600">*</span>
              <input
                id="student-display-name"
                name="name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setFeedback(null);
                }}
                required
                minLength={2}
                maxLength={120}
                autoComplete="name"
                aria-describedby="student-display-name-help"
                className={fieldClass}
              />
              <span
                id="student-display-name-help"
                className="mt-2 flex flex-wrap justify-between gap-2 text-xs leading-5 font-medium text-slate-500"
              >
                <span>Use the name you want readers and school staff to recognise.</span>
                <span>{name.length}/120</span>
              </span>
            </label>

            <label className="block text-sm font-bold text-slate-700" htmlFor="student-profile-email">
              Sign-in email address
              <span className="relative block">
                <Mail
                  className="pointer-events-none absolute top-1/2 left-4 mt-1 -translate-y-1/2 text-emerald-700"
                  size={18}
                  aria-hidden="true"
                />
                <input
                  id="student-profile-email"
                  type="email"
                  value={profile.email}
                  readOnly
                  autoComplete="email"
                  aria-describedby="student-profile-email-help"
                  className={`${fieldClass} pl-11`}
                />
              </span>
              <span
                id="student-profile-email-help"
                className="mt-2 block text-xs leading-5 font-medium text-slate-500"
              >
                Your sign-in email cannot be changed from this page. Contact the school if it needs
                correcting.
              </span>
            </label>
          </div>

          <div className="mt-7 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:flex-wrap">
            <button
              type="submit"
              disabled={saving || !nameChanged || !validName}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2e3192] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#262873] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
            >
              {saving ? (
                <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />
              ) : (
                <Save size={17} aria-hidden="true" />
              )}
              {saving ? "Saving…" : "Save profile"}
            </button>
            {nameChanged && (
              <button
                type="button"
                onClick={resetName}
                disabled={saving}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 disabled:opacity-60 sm:w-auto"
              >
                <RotateCcw size={16} aria-hidden="true" /> Reset
              </button>
            )}
          </div>
        </form>

        <aside className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm leading-6 text-sky-950 sm:p-6">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#2e3192] shadow-sm">
            <LockKeyhole size={20} aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-black">Account security</h2>
          <p className="mt-2">
            Keep your password private and sign out when using a shared device. Only your display name can be
            edited here.
          </p>
        </aside>
      </div>
    </StudentWorkspaceShell>
  );
}
