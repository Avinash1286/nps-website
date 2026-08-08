"use client";

import { useCallback, useRef, useState } from "react";
import { Bot, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { AssistantPanel } from "./assistant-panel";
import { useModalFocus } from "@/components/site/use-modal-focus";

export function AssistantLauncher() {
  const pathname = usePathname();
  const assistantPage = pathname === "/assistant" || pathname.startsWith("/assistant/");

  if (assistantPage) return null;
  return <FloatingAssistantLauncher key={pathname} />;
}

function FloatingAssistantLauncher() {
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useModalFocus({
    open,
    containerRef: dialogRef,
    triggerRef: launcherRef,
    onClose: close,
    initialFocusSelector: "[data-assistant-close]",
  });

  function toggle() {
    setHasOpened(true);
    setOpen((current) => !current);
  }

  return (
    <>
      {hasOpened && (
        <div
          ref={dialogRef}
          id="nps-assistant-dialog"
          className="fixed inset-0 z-[70] flex items-end justify-end bg-slate-950/40 p-0 backdrop-blur-[2px] sm:p-6 sm:pt-[max(1.5rem,env(safe-area-inset-top))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pl-[max(1.5rem,env(safe-area-inset-left))]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="nps-assistant-dialog-title"
          tabIndex={-1}
          hidden={!open}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={close}
            aria-hidden="true"
            tabIndex={-1}
          />
          <div className="relative h-dvh w-full sm:h-auto sm:w-auto">
            <AssistantPanel headingId="nps-assistant-dialog-title" onClose={close} />
          </div>
        </div>
      )}
      <button
        ref={launcherRef}
        type="button"
        className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-[#3a3fa5] px-3.5 py-3 text-sm font-extrabold text-white shadow-[0_16px_40px_rgba(6,51,120,.32)] transition hover:-translate-y-0.5 hover:bg-[#2e3192] hover:shadow-[0_20px_48px_rgba(6,51,120,.4)] focus-visible:ring-4 focus-visible:ring-sky-300/60 focus-visible:outline-none sm:right-[max(1.5rem,env(safe-area-inset-right))] sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-4"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={hasOpened ? "nps-assistant-dialog" : undefined}
        aria-label={open ? "Close NPS assistant" : "Open NPS assistant"}
      >
        {open ? <X size={20} aria-hidden="true" /> : <Bot size={20} aria-hidden="true" />}
        <span className="hidden sm:inline">Ask NPS</span>
      </button>
    </>
  );
}
