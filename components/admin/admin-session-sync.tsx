"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { clerkConfigured, convexConfigured } from "./admin-gate";
import { usersApi } from "./convex-api";

export function AdminSessionSync() {
  if (!clerkConfigured || !convexConfigured) return null;
  return <Sync />;
}

function Sync() {
  const { isLoaded, isSignedIn } = useAuth();
  const syncCurrent = useMutation(usersApi.syncCurrent);
  const attempted = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || attempted.current) return;
    attempted.current = true;
    void syncCurrent({}).catch(() => {
      window.dispatchEvent(
        new CustomEvent("nps:admin-sync-error", {
          detail:
            "We could not prepare your staff profile. Refresh the page, and contact the school administrator if the problem continues.",
        }),
      );
    });
  }, [isLoaded, isSignedIn, syncCurrent]);

  return null;
}
