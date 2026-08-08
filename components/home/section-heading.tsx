import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/site/reveal";

/** Shared section header: eyebrow rule, title, optional lead copy and action. */
export function SectionHeading({
  eyebrow,
  title,
  headingId,
  description,
  action,
  tone = "light",
  align = "start",
  className = "",
}: {
  eyebrow?: string;
  title: string;
  /** Matches the `aria-labelledby` on the owning section. */
  headingId?: string;
  description?: string;
  action?: { label: string; href: string };
  tone?: "light" | "dark";
  align?: "start" | "center";
  className?: string;
}) {
  const centered = align === "center";
  return (
    <Reveal
      className={`flex flex-col gap-5 ${
        centered ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between"
      } ${className}`}
    >
      <div className={centered ? "max-w-2xl" : "max-w-2xl"}>
        {eyebrow && (
          <p
            className={`flex items-center gap-3 text-[11px] font-extrabold tracking-[.24em] uppercase ${
              centered ? "justify-center" : ""
            } ${tone === "dark" ? "text-[#f0bd3a]" : "text-[#2e3192]"}`}
          >
            {!centered && (
              <span
                aria-hidden="true"
                className={`rule-sweep h-px w-9 ${tone === "dark" ? "bg-[#f0bd3a]" : "bg-[#2e3192]"}`}
              />
            )}
            {eyebrow}
          </p>
        )}
        <h2
          id={headingId}
          className={`${eyebrow ? "mt-4" : ""} text-3xl leading-[1.12] font-extrabold tracking-[-.035em] sm:text-[2.6rem] ${
            tone === "dark" ? "text-white" : "text-[#1e1f5c]"
          }`}
        >
          {title}
        </h2>
        {description && (
          <p className={`mt-5 text-base leading-8 ${tone === "dark" ? "text-slate-300" : "text-slate-600"}`}>
            {description}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className={`group inline-flex shrink-0 items-center gap-2 text-sm font-extrabold transition ${
            tone === "dark" ? "text-[#f0bd3a] hover:text-white" : "text-[#2e3192] hover:text-[#1e1f5c]"
          }`}
        >
          {action.label}
          <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      )}
    </Reveal>
  );
}
