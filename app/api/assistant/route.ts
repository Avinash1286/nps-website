import { createHmac, randomUUID } from "node:crypto";
import { fetchAction } from "convex/nextjs";
import { makeFunctionReference } from "convex/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canonicalAssistantSignaturePayload } from "@/convex/lib/assistantSignature";
import { isConfiguredSecret } from "@/lib/security/configuration";
import { requestFingerprint, safeSameOriginPath } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE = "nps_ai_session";
const messageSchema = z.object({
  message: z.string().trim().min(1).max(1500),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1500),
      }),
    )
    .max(6)
    .optional(),
});

type AssistantResult = {
  answer: string;
  sources: Array<{ title: string; href: string }>;
  conversationId?: string;
  remaining?: number;
};

const askAssistant = makeFunctionReference<
  "action",
  {
    signature: string;
    requestTimestamp: number;
    fingerprint: string;
    sessionId: string;
    message: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  },
  AssistantResult
>("assistant:ask");

export async function POST(request: NextRequest) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const serviceSecret = process.env.ASSISTANT_SERVICE_SECRET;
  if (!convexUrl || !isConfiguredSecret(serviceSecret)) {
    return NextResponse.json(
      { error: "The information assistant is not configured yet." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = messageSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a question of 1,500 characters or fewer." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const existingSession = request.cookies.get(SESSION_COOKIE)?.value;
  const sessionId =
    existingSession && /^[a-f0-9-]{36}$/i.test(existingSession) ? existingSession : randomUUID();
  const fingerprint = requestFingerprint(request, sessionId, serviceSecret);
  const requestTimestamp = Date.now();
  const signaturePayload = canonicalAssistantSignaturePayload({
    requestTimestamp,
    fingerprint,
    sessionId,
    message: parsed.data.message,
    history: parsed.data.history ?? [],
  });
  const signature = createHmac("sha256", serviceSecret).update(signaturePayload, "utf8").digest("hex");

  try {
    const result = await fetchAction(
      askAssistant,
      {
        signature,
        requestTimestamp,
        fingerprint,
        sessionId,
        message: parsed.data.message,
        history: parsed.data.history,
      },
      { url: convexUrl },
    );
    const response = NextResponse.json(
      {
        answer: result.answer,
        sources: result.sources
          .map((source) => ({ ...source, href: safeSameOriginPath(source.href) }))
          .filter((source): source is { title: string; href: string } => Boolean(source.href)),
        remaining: result.remaining,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
    if (!existingSession) {
      response.cookies.set(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = /rate|too many/i.test(message) ? 429 : 502;
    return NextResponse.json(
      {
        error:
          status === 429
            ? "You have reached the assistant limit. Please try again later."
            : "The assistant could not answer right now.",
      },
      { status, headers: { "Cache-Control": "no-store", "Retry-After": status === 429 ? "60" : "10" } },
    );
  }
}
