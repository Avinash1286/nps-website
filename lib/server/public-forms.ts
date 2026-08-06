import { createHmac, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isConfiguredSecret } from "@/lib/security/configuration";
import { requestFingerprint } from "./request-security";

const FORM_SESSION_COOKIE = "nps_form_session";

export function preparePublicFormRequest(request: NextRequest) {
  const fingerprintSecret = process.env.REQUEST_FINGERPRINT_SECRET;
  const formServiceSecret = process.env.FORM_SERVICE_SECRET;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!isConfiguredSecret(fingerprintSecret) || !isConfiguredSecret(formServiceSecret) || !convexUrl)
    return null;

  const existingSession = request.cookies.get(FORM_SESSION_COOKIE)?.value;
  const sessionId =
    existingSession && /^[a-f0-9-]{36}$/i.test(existingSession) ? existingSession : randomUUID();
  return {
    convexUrl,
    existingSession,
    sessionId,
    fingerprint: requestFingerprint(request, `form:${sessionId}`, fingerprintSecret),
    formServiceSecret,
  };
}

export function signPublicFormPayload(formServiceSecret: string, payload: Record<string, unknown>) {
  const requestTimestamp = Date.now();
  const canonical = JSON.stringify({ requestTimestamp, ...payload });
  return {
    requestTimestamp,
    signature: createHmac("sha256", formServiceSecret).update(canonical, "utf8").digest("hex"),
  };
}

export function formJson(
  session: ReturnType<typeof preparePublicFormRequest>,
  body: unknown,
  init?: { status?: number },
) {
  const response = NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: { "Cache-Control": "no-store" },
  });
  if (session && !session.existingSession) {
    response.cookies.set(FORM_SESSION_COOKIE, session.sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}

export async function verifyTurnstile(
  token: string | undefined,
  request: NextRequest,
  expectedAction: string,
) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip");
  if (ip) form.set("remoteip", ip);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    const result = (await response.json()) as { success?: boolean; action?: string; hostname?: string };
    return Boolean(
      response.ok &&
      result.success &&
      result.action === expectedAction &&
      result.hostname === request.nextUrl.hostname,
    );
  } catch {
    return false;
  }
}

export function looksLikeBot(honeypot: string | undefined) {
  return Boolean(honeypot?.trim());
}
