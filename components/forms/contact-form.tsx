"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import {
  fieldClass,
  FormMessage,
  HoneypotField,
  TurnstileField,
  usePublicForm,
} from "@/components/forms/use-public-form";

export function ContactForm() {
  const { status, submit, captcha } = usePublicForm(
    "/api/forms/contact",
    "Thank you. Your message has been received by the school team.",
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
      <p className="text-xs font-extrabold tracking-[.18em] text-[#0a65a8] uppercase">Send a message</p>
      <h2 className="mt-3 text-2xl font-extrabold tracking-[-.025em] text-[#092f59]">How can we help?</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Use this form for general, admissions, or website enquiries. Do not include passwords, financial
        details, or sensitive student records.
      </p>
      <HoneypotField />
      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">
          Full name <span className="text-red-600">*</span>
          <input name="name" required maxLength={100} autoComplete="name" className={fieldClass} />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Email address <span className="text-red-600">*</span>
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
          Phone number
          <input name="phone" type="tel" maxLength={30} autoComplete="tel" className={fieldClass} />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Topic <span className="text-red-600">*</span>
          <select name="topic" required defaultValue="" className={fieldClass}>
            <option value="" disabled>
              Select a topic
            </option>
            <option value="general">General information</option>
            <option value="admissions">Admissions</option>
            <option value="academics">Academics</option>
            <option value="transport">Transport</option>
            <option value="website">Website support</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>
      <label className="mt-5 block text-sm font-bold text-slate-700">
        Subject <span className="text-red-600">*</span>
        <input name="subject" required maxLength={160} className={fieldClass} />
      </label>
      <label className="mt-5 block text-sm font-bold text-slate-700">
        Message <span className="text-red-600">*</span>
        <textarea name="message" required minLength={10} maxLength={3000} rows={6} className={fieldClass} />
      </label>
      <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-slate-600">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-[#0a65a8]"
        />
        <span>
          I consent to the school using this information to respond to my enquiry.{" "}
          <span className="text-red-600">*</span>
        </span>
      </label>
      <div className="mt-6 space-y-4">
        <TurnstileField key={captcha.key} action="contact" onTokenChange={captcha.setToken} />
        <FormMessage {...status} />
        <button
          type="submit"
          disabled={status.state === "submitting"}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a65a8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#084f83] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          {status.state === "submitting" ? (
            "Sending…"
          ) : status.state === "success" ? (
            <>
              <CheckCircle2 size={17} />
              Sent
            </>
          ) : (
            <>
              <Send size={17} />
              Send message
            </>
          )}
        </button>
      </div>
    </form>
  );
}
