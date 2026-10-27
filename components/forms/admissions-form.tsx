"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { normalizeAcademicYear } from "@/lib/content/academic-year";
import {
  fieldClass,
  FormMessage,
  HoneypotField,
  TurnstileField,
  usePublicForm,
} from "@/components/forms/use-public-form";

export function AdmissionsForm({ academicYear }: { academicYear?: string }) {
  const confirmedYear = normalizeAcademicYear(academicYear);
  const { status, submit, captcha } = usePublicForm(
    "/api/forms/admissions",
    "Your admission enquiry has been recorded. Keep the reference returned by the school for follow-up.",
  );
  const [consent, setConsent] = useState(false);
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const sent = await submit({ ...values, consent });
    if (sent) {
      form.reset();
      setConsent(false);
    }
  }
  return (
    <form
      onSubmit={handleSubmit}
      className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,47,78,.08)] sm:p-8"
    >
      <HoneypotField />
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">
          Student&apos;s full name <span className="text-red-600">*</span>
          <input name="studentName" required maxLength={120} autoComplete="name" className={fieldClass} />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Date of birth <span className="text-red-600">*</span>
          <input name="dateOfBirth" required type="date" className={fieldClass} />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Parent or guardian name <span className="text-red-600">*</span>
          <input name="guardianName" required maxLength={120} className={fieldClass} />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Guardian email <span className="text-red-600">*</span>
          <input
            name="email"
            required
            type="email"
            maxLength={160}
            autoComplete="email"
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Guardian phone <span className="text-red-600">*</span>
          <input name="phone" required type="tel" maxLength={30} autoComplete="tel" className={fieldClass} />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Level of interest <span className="text-red-600">*</span>
          <select name="intendedLevel" required defaultValue="" className={fieldClass}>
            <option value="" disabled>
              Select a level
            </option>
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="plus-2">+2</option>
            <option value="unsure">Not sure yet</option>
          </select>
        </label>
        <label className="text-sm font-bold text-slate-700">
          Current or previous school
          <input name="previousSchool" maxLength={160} className={fieldClass} />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Academic year
          <input
            name="academicYear"
            maxLength={40}
            value={confirmedYear ?? "Current intake"}
            readOnly
            aria-readonly="true"
            className={`${fieldClass} cursor-not-allowed bg-slate-50 text-slate-600`}
          />
          {!confirmedYear && (
            <span className="mt-2 block text-xs leading-5 font-normal text-slate-500">
              Confirm the academic year with the school or in the latest admissions notice.
            </span>
          )}
        </label>
      </div>
      <label className="mt-5 block text-sm font-bold text-slate-700">
        Additional information
        <textarea
          name="message"
          maxLength={1500}
          rows={5}
          className={fieldClass}
          placeholder="Tell us what you need help with. Do not upload or paste sensitive identity documents here."
        />
      </label>
      <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-slate-600">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#2e3192]"
        />
        <span>
          I confirm this information is accurate and consent to the school using it to respond about
          admissions. I understand this is an enquiry and does not confirm admission.{" "}
          <span className="text-red-600">*</span>
        </span>
      </label>
      <div className="mt-6 space-y-4">
        <TurnstileField key={captcha.key} action="admission-enquiry" onTokenChange={captcha.setToken} />
        <FormMessage {...status} />
        <button
          type="submit"
          disabled={status.state === "submitting"}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2e3192] px-5 py-3 text-sm font-bold text-white hover:bg-[#262873] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          <Send size={17} className="shrink-0" />
          {status.state === "submitting" ? "Submitting…" : "Submit enquiry"}
        </button>
      </div>
    </form>
  );
}
