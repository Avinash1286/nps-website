"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type SubmissionState = { state: "idle" | "submitting" | "success" | "error"; message: string };

export function usePublicForm(endpoint: string, successMessage: string) {
  const [status, setStatus] = useState<SubmissionState>({ state: "idle", message: "" });
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const submissionId = useRef("");

  useEffect(() => {
    submissionId.current = crypto.randomUUID();
  }, []);

  async function submit(payload: Record<string, unknown>) {
    if (status.state === "submitting") return false;
    setStatus({ state: "submitting", message: "" });
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          captchaToken,
          submissionId: submissionId.current || crypto.randomUUID(),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok)
        throw new Error(result.error || result.message || "We could not submit the form. Please try again.");
      submissionId.current = crypto.randomUUID();
      setCaptchaToken("");
      setCaptchaKey((current) => current + 1);
      setStatus({ state: "success", message: result.message || successMessage });
      return true;
    } catch (error) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "We could not submit the form. Please try again.",
      });
      return false;
    }
  }

  return {
    status,
    submit,
    captcha: { key: captchaKey, setToken: setCaptchaToken },
    clear: () => setStatus({ state: "idle", message: "" }),
  };
}

type TurnstileApi = {
  render: (
    target: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: "auto";
      size: "flexible" | "compact";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function TurnstileField({
  action,
  onTokenChange,
}: {
  action: string;
  onTokenChange: (token: string) => void;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onTokenChange);
  const [scriptReady, setScriptReady] = useState(false);
  const [widgetSize, setWidgetSize] = useState<"flexible" | "compact">("compact");

  useEffect(() => {
    callback.current = onTokenChange;
  }, [onTokenChange]);

  useEffect(() => {
    const target = container.current;
    if (!siteKey || !target) return;
    const updateSize = () => {
      const nextSize = target.getBoundingClientRect().width >= 300 ? "flexible" : "compact";
      setWidgetSize((current) => (current === nextSize ? current : nextSize));
    };
    updateSize();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateSize);
    observer.observe(target);
    return () => observer.disconnect();
  }, [siteKey]);

  useEffect(() => {
    const turnstile = window.turnstile;
    if (!siteKey || !scriptReady || !turnstile || !container.current) return;
    const widgetId = turnstile.render(container.current, {
      sitekey: siteKey,
      action,
      theme: "auto",
      size: widgetSize,
      callback: (token) => callback.current(token),
      "expired-callback": () => callback.current(""),
      "error-callback": () => callback.current(""),
    });
    return () => turnstile.remove(widgetId);
  }, [action, scriptReady, siteKey, widgetSize]);

  if (!siteKey) return null;

  return (
    <div className="space-y-2">
      <Script
        id="cloudflare-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={container} className="max-w-full" />
      <p className="text-xs leading-5 text-slate-500">Bot protection must complete before submission.</p>
    </div>
  );
}

export function FormMessage({ state, message }: SubmissionState) {
  if (state === "idle" || state === "submitting" || !message) return null;
  return (
    <div
      role={state === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm leading-6 [overflow-wrap:anywhere] ${state === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}
    >
      {message}
    </div>
  );
}

export const fieldClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2e3192] focus:ring-4 focus:ring-sky-100";

export function HoneypotField() {
  return (
    <div className="absolute top-auto left-[-9999px] h-px w-px overflow-hidden" aria-hidden="true">
      <label>
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
