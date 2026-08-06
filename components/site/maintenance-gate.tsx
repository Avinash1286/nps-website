"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const alwaysAvailable = new Set([
  "/newsletter/confirm",
  "/newsletter/unsubscribe",
  "/events/cancel",
  "/privacy",
  "/terms",
  "/accessibility",
]);

export function MaintenanceGate({
  enabled,
  fallback,
  children,
}: {
  enabled: boolean;
  fallback: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  return enabled && !alwaysAvailable.has(pathname) ? fallback : children;
}
