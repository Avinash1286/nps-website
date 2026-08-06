"use client";

import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { Component, type ReactNode } from "react";
import { AssistantLauncher } from "./assistant-launcher";

type PublicSiteSettings = { assistantEnabled?: boolean } | null;

const getSiteSettings = makeFunctionReference<"query", Record<string, never>, PublicSiteSettings>(
  "content:getSiteSettings",
);

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const hasConvexProvider = Boolean(convexUrl && !convexUrl.includes("your-deployment"));

export function AssistantAvailability({ initialEnabled }: { initialEnabled: boolean }) {
  if (!hasConvexProvider) return initialEnabled ? <AssistantLauncher /> : null;
  return (
    <AssistantAvailabilityErrorBoundary fallback={initialEnabled ? <AssistantLauncher /> : null}>
      <LiveAssistantAvailability initialEnabled={initialEnabled} />
    </AssistantAvailabilityErrorBoundary>
  );
}

class AssistantAvailabilityErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function LiveAssistantAvailability({ initialEnabled }: { initialEnabled: boolean }) {
  const settings = useQuery(getSiteSettings, {});
  const enabled = settings === undefined ? initialEnabled : settings?.assistantEnabled === true;
  return enabled ? <AssistantLauncher /> : null;
}
