"use client";

import Link from "next/link";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { Bot, ExternalLink, LoaderCircle, Send, ShieldCheck, X } from "lucide-react";

type Source = { title: string; href: string };
type Message = { role: "user" | "assistant"; content: string; sources?: Source[] };

const suggestions = [
  "How does the admissions process work?",
  "Where can I find the latest notices?",
  "What academic programmes are available?",
];

export function AssistantPanel({
  onClose,
  fullPage = false,
  embedded = false,
  headingId,
  sourceLinksNewTab = false,
}: {
  onClose?: () => void;
  fullPage?: boolean;
  embedded?: boolean;
  headingId?: string;
  sourceLinksNewTab?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello. I can help you find verified information published by Nepal Police School on this website. I will direct you to the school office when an answer is not available.",
    },
  ]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageInputId = useId();
  const safetyMessageId = useId();
  const generatedHeadingId = useId();
  const panelHeadingId = headingId ?? generatedHeadingId;
  const endRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const reducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest" });
  }, [messages, busy]);

  async function ask(question: string) {
    const clean = question.trim();
    if (!clean || busy) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: clean }];
    setMessages(nextMessages);
    setValue("");
    setError(null);
    setBusy(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          history: nextMessages.slice(-7, -1).map(({ role, content }) => ({ role, content })),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        answer?: string;
        sources?: Source[];
        error?: string;
      };
      if (!response.ok || !payload.answer) {
        throw new Error(payload.error ?? "The assistant is unavailable right now.");
      }
      setMessages((current) => [
        ...current,
        { role: "assistant", content: payload.answer!, sources: payload.sources ?? [] },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "The assistant is unavailable right now.",
      );
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(value);
  }

  return (
    <section
      aria-label="NPS information assistant"
      className={
        embedded
          ? "flex h-[min(680px,75dvh)] min-h-[520px] w-full flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-lg"
          : fullPage
            ? "flex min-h-[560px] w-full flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-xl sm:min-h-[640px] sm:rounded-[2rem]"
            : "flex h-dvh w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[min(720px,calc(100dvh-3rem))] sm:w-[min(430px,calc(100vw-3rem))] sm:rounded-[1.75rem] sm:border sm:border-white/60"
      }
    >
      <header className="flex items-center justify-between gap-2 bg-[#1e1f5c] px-4 pt-[max(.75rem,env(safe-area-inset-top))] pb-3 text-white sm:gap-4 sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-500/20 text-sky-100">
            <Bot size={21} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id={panelHeadingId} className="text-xs leading-5 font-extrabold sm:text-sm">
              NPS Information Assistant
            </h2>
            <p className="mt-0.5 hidden text-[11px] text-blue-200 min-[380px]:block">
              Answers from published school content
            </p>
          </div>
        </div>
        {onClose && (
          <button
            data-assistant-close
            type="button"
            className="shrink-0 rounded-lg p-2 transition hover:bg-white/10 focus-visible:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:outline-none"
            onClick={onClose}
            aria-label="Close assistant"
          >
            <X size={20} />
          </button>
        )}
      </header>

      <div
        className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#f7f8fd] p-4"
        role="log"
        aria-label="Assistant conversation"
        aria-live="polite"
        aria-relevant="additions text"
        aria-busy={busy}
      >
        {messages.map((message, index) => (
          <article
            className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 [overflow-wrap:anywhere] ${
              message.role === "user"
                ? "ml-auto rounded-br-md bg-[#3a3fa5] text-white"
                : "rounded-bl-md border border-sky-100 bg-white text-[#2f3169] shadow-sm"
            }`}
            key={`${message.role}-${index}`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.sources && message.sources.length > 0 && (
              <div className="mt-3 border-t border-sky-100 pt-3">
                <p className="text-[10px] font-extrabold tracking-[0.16em] text-sky-700 uppercase">Sources</p>
                <ul className="mt-2 space-y-1.5">
                  {message.sources.map((source) => (
                    <li key={`${source.href}-${source.title}`}>
                      <Link
                        className="inline-flex max-w-full items-center gap-1 text-xs font-bold break-words text-sky-800 underline"
                        href={source.href}
                        onClick={sourceLinksNewTab ? undefined : onClose}
                        target={sourceLinksNewTab ? "_blank" : undefined}
                        rel={sourceLinksNewTab ? "noreferrer" : undefined}
                      >
                        {source.title}
                        {sourceLinksNewTab && <span className="sr-only"> (opens in a new tab)</span>}
                        <ExternalLink size={11} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ))}
        {busy && (
          <div className="flex w-fit items-center gap-2 rounded-2xl rounded-bl-md border border-sky-100 bg-white px-4 py-3 text-sm text-slate-600">
            <LoaderCircle className="animate-spin text-sky-700" size={16} aria-hidden="true" /> Checking
            published information…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-sky-100 bg-white px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4">
        {messages.length === 1 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {suggestions.map((suggestion) => (
              <button
                type="button"
                className="shrink-0 rounded-full border border-sky-200 px-3 py-1.5 text-[11px] font-bold text-sky-800 transition hover:border-sky-300 hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                key={suggestion}
                onClick={() => void ask(suggestion)}
                disabled={busy}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        {error && (
          <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs leading-5 text-red-800" role="alert">
            {error}{" "}
            <Link className="font-bold underline" href="/contact" onClick={onClose}>
              Contact the school office
            </Link>
            .
          </p>
        )}
        <form className="flex items-end gap-2" onSubmit={submit}>
          <label className="sr-only" htmlFor={messageInputId}>
            Ask a question
          </label>
          <input
            id={messageInputId}
            className="min-w-0 flex-1 rounded-xl border border-sky-200 px-4 py-3 text-sm transition outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100 disabled:cursor-wait disabled:bg-slate-50"
            value={value}
            maxLength={1500}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Ask about admissions, notices, or academics…"
            disabled={busy}
            aria-describedby={safetyMessageId}
          />
          <button
            type="submit"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#3a3fa5] text-white transition hover:bg-[#2e3192] focus-visible:ring-4 focus-visible:ring-sky-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy || !value.trim()}
            aria-label="Send question"
          >
            <Send size={17} aria-hidden="true" />
          </button>
        </form>
        <p
          id={safetyMessageId}
          className="mt-3 flex items-start gap-1.5 text-[10px] leading-4 text-slate-500"
        >
          <ShieldCheck className="mt-0.5 shrink-0" size={12} aria-hidden="true" />
          Do not share personal student information. AI responses can be incomplete; official notices and the
          school office remain authoritative.
        </p>
      </div>
    </section>
  );
}
