"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

export type HeroSlide = {
  src: string;
  alt: string;
  caption: string;
};

const INTERVAL_MS = 3500;
const CROSSFADE_MS = 700;

export function HeroCarousel({ slides, children }: { slides: readonly HeroSlide[]; children: ReactNode }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const count = slides.length;

  const go = useCallback(
    (next: number) => {
      if (!count) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (paused || reduced || count < 2) return;
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % count), INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [index, paused, reduced, count]);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    }
  }

  const active = slides[index] ?? slides[0];

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="School highlights"
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
      className="relative isolate min-h-[600px] overflow-hidden bg-[#12123a] text-white sm:min-h-[680px] lg:max-h-[860px] lg:min-h-[calc(100vh-116px)]"
    >
      {slides.map((slide, slideIndex) => (
        <div
          key={slide.src}
          aria-hidden={slideIndex !== index}
          className="absolute inset-0 -z-30 ease-[cubic-bezier(.16,1,.3,1)]"
          style={{
            opacity: slideIndex === index ? 1 : 0,
            transition: `opacity ${CROSSFADE_MS}ms cubic-bezier(.16,1,.3,1)`,
          }}
        >
          <Image
            src={slide.src}
            alt={slideIndex === index ? slide.alt : ""}
            fill
            priority={slideIndex === 0}
            sizes="100vw"
            className={`object-cover object-center ${reduced ? "" : "anim-ken-burns-loop"}`}
          />
        </div>
      ))}

      {/* Left-weighted scrim: dark enough to keep the headline readable, light
          enough that the photograph itself stays the subject of the section. */}
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(100deg,rgba(12,12,40,.82)_0%,rgba(18,18,58,.55)_34%,rgba(24,25,70,.16)_66%,rgba(24,25,70,.02)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-52 bg-gradient-to-t from-[#12123a]/90 via-[#12123a]/35 to-transparent" />

      <div className="mx-auto flex min-h-[600px] max-w-7xl flex-col justify-center px-4 pt-20 pb-40 sm:min-h-[680px] sm:px-6 lg:min-h-[calc(100vh-116px)] lg:px-8">
        {children}
      </div>

      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pb-8 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8">
          {active && (
            <p
              key={active.caption}
              className="anim-fade-up max-w-md text-sm leading-6 font-semibold text-slate-200"
              aria-live="polite"
            >
              <span className="mr-3 inline-block text-[#f0bd3a]">
                {String(index + 1).padStart(2, "0")}
                <span className="text-slate-400">/{String(count).padStart(2, "0")}</span>
              </span>
              {active.caption}
            </p>
          )}

          {count > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2" role="tablist" aria-label="Choose a slide">
                {slides.map((slide, slideIndex) => {
                  const isActive = slideIndex === index;
                  return (
                    <button
                      key={slide.src}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-label={`Show slide ${slideIndex + 1}: ${slide.caption}`}
                      onClick={() => go(slideIndex)}
                      className={`h-1.5 overflow-hidden rounded-full transition-all duration-500 ${
                        isActive ? "w-12 bg-white/25" : "w-4 bg-white/25 hover:bg-white/50"
                      }`}
                    >
                      {isActive && (
                        <span
                          key={`${index}-${paused}-${reduced}`}
                          className="block h-full w-full bg-[#f0bd3a]"
                          style={
                            reduced
                              ? { transform: "scaleX(1)" }
                              : {
                                  transformOrigin: "left center",
                                  animation: `nps-sweep ${INTERVAL_MS}ms linear both`,
                                  animationPlayState: paused ? "paused" : "running",
                                }
                          }
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="ml-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaused((value) => !value)}
                  aria-label={paused ? "Resume slideshow" : "Pause slideshow"}
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
                >
                  {paused ? <Play size={15} /> : <Pause size={15} />}
                </button>
                <button
                  type="button"
                  onClick={() => go(index - 1)}
                  aria-label="Previous slide"
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  aria-label="Next slide"
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
