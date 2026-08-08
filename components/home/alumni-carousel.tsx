"use client";

import PublicImage from "@/components/site/public-image";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { PublicTestimonial } from "@/lib/data/public";

const INTERVAL_MS = 8000;

export function AlumniCarousel({ items }: { items: readonly PublicTestimonial[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % count), INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [index, paused, count]);

  const active = items[index];
  if (!active) return null;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Alumni voices"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          go(index + 1);
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          go(index - 1);
        }
      }}
    >
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-sm sm:p-12">
        <Quote size={120} className="pointer-events-none absolute -top-4 right-4 text-white/[0.05]" />
        <div key={active.id} className="anim-fade-up relative min-h-[13rem]">
          <blockquote className="text-lg leading-9 font-medium text-slate-100 sm:text-2xl sm:leading-[2.6rem]">
            &ldquo;{active.quote}&rdquo;
          </blockquote>
          <figcaption className="mt-8 flex items-center gap-4">
            {active.photoUrl ? (
              <PublicImage
                src={active.photoUrl}
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-[#f0bd3a]/60"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#2e3192] text-lg font-extrabold text-white ring-2 ring-[#f0bd3a]/60"
              >
                {active.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="leading-5 font-extrabold text-white">{active.name}</p>
              <p className="mt-1 text-xs leading-5 font-semibold tracking-wide text-sky-200/90">
                {[active.role, active.organization].filter(Boolean).join(" · ") || "Alumnus"}
              </p>
            </div>
          </figcaption>
        </div>
      </div>

      {count > 1 && (
        <div className="mt-7 flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {items.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                onClick={() => go(itemIndex)}
                aria-label={`Show testimonial from ${item.name}`}
                aria-current={itemIndex === index}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  itemIndex === index ? "w-10 bg-[#f0bd3a]" : "w-4 bg-white/25 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous testimonial"
              className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next testimonial"
              className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
