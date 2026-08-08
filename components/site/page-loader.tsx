"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const HOLD_MS = 900;
const FADE_MS = 620;

/**
 * Brand preloader shown while the first paint settles. The overlay is rendered
 * on the server so there is no flash of unstyled content, fades itself out with
 * CSS (so it still clears without JavaScript), and is unmounted by the effect
 * below so it can never trap focus or block scrolling afterwards.
 */
export function PageLoader({ logoUrl, schoolName }: { logoUrl?: string; schoolName: string }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    if (!reduced) body.style.overflow = "hidden";

    const release = () => {
      body.style.overflow = previousOverflow;
      setDone(true);
    };

    if (reduced) {
      release();
      return;
    }

    const timer = window.setTimeout(release, HOLD_MS + FADE_MS);
    return () => {
      window.clearTimeout(timer);
      body.style.overflow = previousOverflow;
    };
  }, []);

  if (done) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[200] grid place-items-center bg-[#12123a]"
      style={{
        animation: `nps-fade-in 200ms ease both, nps-splash-out ${FADE_MS}ms var(--ease-out-expo) ${HOLD_MS}ms forwards`,
      }}
    >
      <style>{`@keyframes nps-splash-out{to{opacity:0;visibility:hidden;pointer-events:none}}`}</style>
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(60% 55% at 50% 42%, rgba(74,81,189,.55) 0%, rgba(18,18,58,0) 70%)",
        }}
      />
      <div className="relative flex flex-col items-center">
        <div className="relative grid h-28 w-28 place-items-center">
          <span className="anim-ring absolute inset-0 rounded-full border-2 border-white/10 border-t-[#f0bd3a]" />
          <span className="anim-pulse-soft absolute inset-3 rounded-full bg-white/5" />
          <Image
            src={logoUrl ?? "/media/nps-logo.png"}
            alt=""
            width={72}
            height={72}
            priority
            className="anim-logo-in h-[72px] w-[72px] object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,.45)]"
          />
        </div>
        <p className="anim-fade-up mt-7 max-w-xs text-center text-[11px] font-bold tracking-[.28em] text-sky-200/90 uppercase">
          {schoolName}
        </p>
        <span className="mt-5 block h-px w-32 overflow-hidden bg-white/15">
          <span
            className="block h-full w-full bg-[#f0bd3a]"
            style={{
              transformOrigin: "left center",
              animation: `nps-sweep ${HOLD_MS + 200}ms var(--ease-out-expo) both`,
            }}
          />
        </span>
      </div>
    </div>
  );
}
