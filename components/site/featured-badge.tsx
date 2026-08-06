import { Star } from "lucide-react";

export function FeaturedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold tracking-[.1em] text-amber-800 uppercase ${className}`}
    >
      <Star size={11} fill="currentColor" /> Featured
    </span>
  );
}
