"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useState } from "react";

export function TokenAction({
  endpoint,
  token,
  buttonLabel,
  successMessage,
}: {
  endpoint: string;
  token?: string;
  buttonLabel: string;
  successMessage: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit() {
    if (!token || state === "loading" || state === "success") return;
    setState("loading");
    setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The link could not be processed.");
      setState("success");
      setMessage(successMessage);
    } catch (caught) {
      setState("error");
      setMessage(caught instanceof Error ? caught.message : "The link could not be processed.");
    }
  }

  if (!token) {
    return (
      <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
        This link is incomplete or invalid.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <p
          role={state === "error" ? "alert" : "status"}
          className={`rounded-xl p-4 text-sm leading-6 ${state === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}
        >
          {message}
        </p>
      )}
      {state !== "success" && (
        <button
          type="button"
          onClick={() => void submit()}
          disabled={state === "loading"}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0a65a8] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {state === "loading" ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <CheckCircle2 size={16} />
          )}
          {state === "loading" ? "Processing…" : buttonLabel}
        </button>
      )}
    </div>
  );
}
