"use client";

import PublicImage from "@/components/site/public-image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, Quote } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Reveal } from "@/components/site/reveal";
import type { PublicLeader } from "@/lib/data/public";

const INTERVAL_MS = 9000;

function messageOf(leader: PublicLeader) {
  return (
    leader.message ??
    leader.bio ??
    "A verified message from this office will be published by the school administration."
  );
}

function profileHref(leader: PublicLeader) {
  return leader.slug ? `/about/leadership/${leader.slug}` : "/about/leadership";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ManagementCarousel({ leaders }: { leaders: readonly PublicLeader[] }) {
  const [index, setIndex] = useState(0);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [autoPlayPaused, setAutoPlayPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const count = leaders.length;
  const paused = interactionPaused || autoPlayPaused;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

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

  const active = leaders[index];
  if (!active) return null;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Messages from the school leadership"
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onFocusCapture={() => setInteractionPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setInteractionPaused(false);
        }
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
      className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:gap-16"
    >
      <Reveal variant="left" className="relative mx-auto w-full max-w-sm lg:mx-0">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-[#262873]">
          {leaders.map((leader, leaderIndex) => (
            <div
              key={leader.id}
              aria-hidden={leaderIndex !== index}
              className="absolute inset-0"
              style={{
                opacity: leaderIndex === index ? 1 : 0,
                transform: leaderIndex === index ? "scale(1)" : "scale(1.04)",
                transition: reduced
                  ? undefined
                  : "opacity 900ms cubic-bezier(.16,1,.3,1), transform 1200ms cubic-bezier(.16,1,.3,1)",
              }}
            >
              {leader.photoUrl ? (
                <PublicImage
                  src={leader.photoUrl}
                  alt={leaderIndex === index ? leader.name : ""}
                  fill
                  sizes="(max-width: 1024px) 100vw, 30vw"
                  className="object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_top,#4a51bd,#262873_58%,#12123a)] text-6xl font-black text-white/90">
                  <span aria-hidden="true">{initials(leader.name)}</span>
                </div>
              )}
            </div>
          ))}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#12123a] via-[#12123a]/70 to-transparent p-6 pt-16">
            <div key={active.id} className="anim-fade-up">
              <p className="text-lg leading-6 font-extrabold text-white">{active.name}</p>
              <p className="mt-1.5 text-xs font-bold tracking-wide text-[#f0bd3a] uppercase">
                {active.designation}
              </p>
            </div>
          </div>
        </div>
        <span
          aria-hidden="true"
          className="absolute -top-5 -left-5 -z-10 hidden h-28 w-28 rounded-2xl border-2 border-[#f0bd3a]/40 lg:block"
        />
      </Reveal>

      <Reveal variant="right" delay={120}>
        <div className="flex items-start justify-between gap-4">
          <Quote size={44} className="shrink-0 text-[#f0bd3a]" aria-hidden="true" />
          {count > 1 && (
            <div className="flex items-center gap-2">
              <span className="mr-1 text-xs font-bold text-slate-400" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}/{String(count).padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={() => setAutoPlayPaused((value) => !value)}
                aria-label={autoPlayPaused ? "Resume messages" : "Pause messages"}
                aria-pressed={autoPlayPaused}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
              >
                {autoPlayPaused ? <Play size={14} /> : <Pause size={14} />}
              </button>
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label="Previous message"
                className="grid h-9 w-9 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                aria-label="Next message"
                className="grid h-9 w-9 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <div aria-live={paused ? "polite" : "off"} aria-atomic="true">
          <div key={active.id} className="anim-fade-up">
            <blockquote className="mt-6 line-clamp-6 min-h-[11rem] text-lg leading-9 font-medium whitespace-pre-line text-slate-100 sm:min-h-[13rem] sm:text-xl sm:leading-10">
              {messageOf(active)}
            </blockquote>
            <Link
              href={profileHref(active)}
              className="group mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[#f0bd3a] transition hover:text-white"
            >
              Read the full message from {active.name}
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {count > 1 && (
          <div className="mt-10 grid gap-3 border-t border-white/10 pt-8 sm:grid-cols-2 xl:grid-cols-3">
            {leaders.map((leader, leaderIndex) => {
              const isActive = leaderIndex === index;
              return (
                <button
                  key={leader.id}
                  type="button"
                  onClick={() => go(leaderIndex)}
                  aria-label={`Show the message from ${leader.name}`}
                  aria-current={isActive}
                  className={`hover-lift relative flex items-center gap-3 overflow-hidden rounded-2xl border p-3 text-left transition ${
                    isActive
                      ? "border-[#f0bd3a]/60 bg-white/[0.08]"
                      : "border-white/10 bg-white/[0.03] hover:border-white/25"
                  }`}
                >
                  {leader.photoUrl ? (
                    <PublicImage
                      src={leader.photoUrl}
                      alt=""
                      width={44}
                      height={44}
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black text-white"
                    >
                      {initials(leader.name)}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm leading-5 font-extrabold text-white">
                      {leader.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] leading-4 font-semibold text-sky-200/90">
                      {leader.designation}
                    </span>
                  </span>
                  {isActive && !reduced && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-white/10"
                    >
                      <span
                        key={`${index}-${paused}`}
                        className="block h-full w-full bg-[#f0bd3a]"
                        style={{
                          transformOrigin: "left center",
                          animationName: "nps-sweep",
                          animationDuration: `${INTERVAL_MS}ms`,
                          animationTimingFunction: "linear",
                          animationFillMode: "both",
                          animationPlayState: paused ? "paused" : "running",
                        }}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </Reveal>
    </div>
  );
}
