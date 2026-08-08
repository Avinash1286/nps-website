import {
  BookOpen,
  FlaskConical,
  HeartHandshake,
  MessagesSquare,
  Music4,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import type { ComponentType } from "react";

const icons: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  trophy: Trophy,
  shield: ShieldCheck,
  music: Music4,
  debate: MessagesSquare,
  science: FlaskConical,
  service: HeartHandshake,
  book: BookOpen,
  sparkles: Sparkles,
};

/** Resolves an admin-selected icon key, falling back to a neutral marker. */
export function highlightIcon(key?: string) {
  return (key && icons[key]) || Star;
}
