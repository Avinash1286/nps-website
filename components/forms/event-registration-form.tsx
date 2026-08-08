"use client";

import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import {
  fieldClass,
  FormMessage,
  HoneypotField,
  TurnstileField,
  usePublicForm,
} from "@/components/forms/use-public-form";

export function EventRegistrationForm({ eventSlug, eventTitle }: { eventSlug: string; eventTitle: string }) {
  const { status, submit, captcha } = usePublicForm(
    "/api/forms/events",
    "Your event registration has been received. Any confirmation or further instructions will be sent separately.",
  );
  const [consent, setConsent] = useState(false);
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const sent = await submit({ ...values, eventSlug, eventTitle, consent });
    if (sent) {
      form.reset();
      setConsent(false);
    }
  }
  return (
    <form
      onSubmit={handleSubmit}
      className="relative mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8"
    >
      <HoneypotField />
      <h2 className="text-xl font-extrabold text-[#1e1f5c]">Register interest in this event</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Registration is subject to event capacity and school confirmation.
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">
          Full name <span className="text-red-600">*</span>
          <input name="name" required maxLength={100} autoComplete="name" className={fieldClass} />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Email <span className="text-red-600">*</span>
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
          Phone
          <input name="phone" type="tel" maxLength={30} autoComplete="tel" className={fieldClass} />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Number attending <span className="text-red-600">*</span>
          <input
            name="attendeeCount"
            required
            type="number"
            min={1}
            max={10}
            defaultValue={1}
            className={fieldClass}
          />
        </label>
      </div>
      <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-slate-600">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#2e3192]"
        />
        <span>
          I consent to the school using this information to manage this event registration.{" "}
          <span className="text-red-600">*</span>
        </span>
      </label>
      <div className="mt-6 space-y-4">
        <TurnstileField key={captcha.key} action="event-registration" onTokenChange={captcha.setToken} />
        <FormMessage {...status} />
        <button
          type="submit"
          disabled={status.state === "submitting"}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2e3192] px-5 py-3 text-sm font-bold text-white disabled:opacity-60 sm:w-auto"
        >
          <CalendarCheck size={17} className="shrink-0" />
          {status.state === "submitting" ? "Registering…" : "Register interest"}
        </button>
      </div>
    </form>
  );
}
