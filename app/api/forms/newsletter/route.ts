import { fetchAction } from "convex/nextjs";
import { makeFunctionReference } from "convex/server";
import { NextRequest } from "next/server";
import { z } from "zod";
import {
  formJson,
  looksLikeBot,
  preparePublicFormRequest,
  signPublicFormPayload,
  verifyTurnstile,
} from "@/lib/server/public-forms";

const schema = z.object({
  email: z.string().trim().email().max(160),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  consent: z.literal(true),
  website: z.string().max(200).optional(),
  honeypot: z.string().max(200).optional(),
  idempotencyKey: z.string().uuid().optional(),
  submissionId: z.string().uuid().optional(),
  captchaToken: z.string().max(2048).optional(),
});

const subscribeNewsletter = makeFunctionReference<
  "action",
  {
    signature: string;
    requestTimestamp: number;
    fingerprint: string;
    honeypot?: string;
    idempotencyKey: string;
    email: string;
    name?: string;
    source?: string;
    consent: boolean;
  },
  { ok: boolean; status: string }
>("formActions:subscribeNewsletter");

export async function POST(request: NextRequest) {
  const session = preparePublicFormRequest(request);
  if (!session)
    return formJson(session, { error: "Newsletter subscriptions are not configured." }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return formJson(session, { error: "Enter a valid email and confirm your consent." }, { status: 400 });
  const honeypot = parsed.data.website || parsed.data.honeypot;
  if (looksLikeBot(honeypot)) return formJson(session, { ok: true, status: "pending" }, { status: 201 });
  if (!(await verifyTurnstile(parsed.data.captchaToken, request, "newsletter"))) {
    return formJson(session, { error: "Human verification failed. Please try again." }, { status: 400 });
  }

  try {
    const args = {
      fingerprint: session.fingerprint,
      idempotencyKey: parsed.data.idempotencyKey ?? parsed.data.submissionId ?? crypto.randomUUID(),
      email: parsed.data.email.toLowerCase(),
      name: parsed.data.name || undefined,
      source: "website-footer",
      consent: true,
    };
    const signed = signPublicFormPayload(session.formServiceSecret, {
      form: "newsletter",
      fingerprint: args.fingerprint,
      honeypot: null,
      idempotencyKey: args.idempotencyKey,
      email: args.email,
      name: args.name ?? null,
      source: args.source,
      consent: args.consent,
    });
    const result = await fetchAction(subscribeNewsletter, { ...args, ...signed }, { url: session.convexUrl });
    return formJson(
      session,
      { ...result, message: "Your subscription request has been recorded." },
      { status: 201 },
    );
  } catch (error) {
    const rateLimited = error instanceof Error && /rate|too many/i.test(error.message);
    return formJson(
      session,
      { error: rateLimited ? "Please wait before trying again." : "Subscription could not be saved." },
      { status: rateLimited ? 429 : 502 },
    );
  }
}
