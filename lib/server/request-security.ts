import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";

export function getRequestIp(request: NextRequest) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function requestFingerprint(request: NextRequest, sessionId: string, secret: string) {
  const input = [getRequestIp(request), request.headers.get("user-agent") ?? "unknown", sessionId].join("|");
  return createHmac("sha256", secret).update(input).digest("hex");
}

export function safeSameOriginPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}
