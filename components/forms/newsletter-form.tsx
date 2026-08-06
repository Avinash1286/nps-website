"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  FormMessage,
  HoneypotField,
  TurnstileField,
  usePublicForm,
} from "@/components/forms/use-public-form";

export function NewsletterForm() {
  const { status, submit, captcha } = usePublicForm(
    "/api/forms/newsletter",
    "Subscription confirmed. Please check your inbox for future updates.",
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
    <form onSubmit={handleSubmit} className="relative">
      <HoneypotField />
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="newsletter-email">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          required
          type="email"
          maxLength={160}
          autoComplete="email"
          placeholder="you@example.com"
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/15 bg-white px-4 text-sm text-slate-900 outline-none focus:ring-4 focus:ring-sky-300/25"
        />
        <button
          type="submit"
          disabled={status.state === "submitting"}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 text-sm font-extrabold text-white transition hover:bg-sky-400 disabled:opacity-60"
        >
          {status.state === "submitting" ? (
            "Subscribing…"
          ) : (
            <>
              Subscribe <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
      <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-300">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-sky-500"
        />
        <span>I agree to receive school updates and understand I can unsubscribe.</span>
      </label>
      <TurnstileField key={captcha.key} action="newsletter" onTokenChange={captcha.setToken} />
      <div className="mt-3 [&>div]:border-white/10 [&>div]:bg-white/10 [&>div]:text-white">
        <FormMessage {...status} />
      </div>
    </form>
  );
}
