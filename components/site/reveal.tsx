"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

type RevealVariant = "up" | "left" | "right" | "scale" | "none";

const pendingReveals = new Map<Element, () => void>();
let revealObserver: IntersectionObserver | undefined;

function observeReveal(node: Element, reveal: () => void) {
  revealObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const show = pendingReveals.get(entry.target);
        pendingReveals.delete(entry.target);
        revealObserver?.unobserve(entry.target);
        show?.();
      }
      releaseObserver();
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
  );
  pendingReveals.set(node, reveal);
  revealObserver.observe(node);
  return () => {
    pendingReveals.delete(node);
    revealObserver?.unobserve(node);
    releaseObserver();
  };
}

function releaseObserver() {
  if (pendingReveals.size) return;
  revealObserver?.disconnect();
  revealObserver = undefined;
}

/**
 * Reveals its children once they scroll into view. The server-rendered markup
 * already contains the content, so search engines and no-script visitors keep
 * the full page; only the transition is progressive enhancement.
 */
export function Reveal({
  as = "div",
  variant = "up",
  delay = 0,
  className = "",
  children,
  ...rest
}: {
  as?: ElementType;
  variant?: RevealVariant;
  /** Stagger in milliseconds, applied as a transition delay. */
  delay?: number;
  className?: string;
  children: ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "children" | "className">) {
  const Tag = as as ElementType;
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;
    // Reduced motion is handled in globals.css, which pins .reveal to its final
    // state, so the observer below only ever drives the transition itself.
    return observeReveal(node, () => setVisible(true));
  }, [visible]);

  return (
    <Tag
      ref={ref}
      data-reveal={variant}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
