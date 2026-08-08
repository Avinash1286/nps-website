"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

type RevealVariant = "up" | "left" | "right" | "scale" | "none";

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
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
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
