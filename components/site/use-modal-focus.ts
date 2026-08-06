"use client";

import { type RefObject, useEffect } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

type ModalFocusOptions = {
  open: boolean;
  containerRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  initialFocusSelector?: string;
};

/** Keeps keyboard focus inside an open modal and safely restores its trigger on close. */
export function useModalFocus({
  open,
  containerRef,
  triggerRef,
  onClose,
  initialFocusSelector,
}: ModalFocusOptions) {
  useEffect(() => {
    if (!open) return;

    const container = containerRef.current;
    if (!container) return;

    const trigger = triggerRef.current;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : trigger;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function focusableElements() {
      return Array.from(container!.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.tabIndex >= 0 && element.getAttribute("aria-hidden") !== "true",
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const elements = focusableElements();
      if (!elements.length) {
        event.preventDefault();
        container!.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;
      if (!container!.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const frame = window.requestAnimationFrame(() => {
      const requested = initialFocusSelector
        ? container.querySelector<HTMLElement>(initialFocusSelector)
        : null;
      const target = requested ?? focusableElements()[0] ?? container;
      if (!container.contains(document.activeElement)) target.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      const restoreTarget = trigger ?? previouslyFocused;
      if (restoreTarget?.isConnected) restoreTarget.focus({ preventScroll: true });
    };
  }, [containerRef, initialFocusSelector, onClose, open, triggerRef]);
}
