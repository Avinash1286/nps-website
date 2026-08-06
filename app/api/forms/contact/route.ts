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
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  subject: z.string().trim().min(2).max(160).optional(),
  topic: z.string().trim().min(2).max(160).optional(),
  message: z.string().trim().min(10).max(3000),
  consentToContact: z.boolean().optional(),
  consent: z.boolean().optional(),
  website: z.string().max(200).optional(),
  honeypot: z.string().max(200).optional(),
  idempotencyKey: z.string().uuid().optional(),
  submissionId: z.string().uuid().optional(),
  captchaToken: z.string().max(2048).optional(),
});

const submitContact = makeFunctionReference<
  "action",
  {
    signature: string;
    requestTimestamp: number;
    fingerprint: string;
    honeypot?: string;
    idempotencyKey: string;
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    consentToContact: boolean;
    source?: string;
  },
  { ok: boolean; ticketNumber: string }
>("formActions:submitContact");

export async function POST(request: NextRequest) {
  const session = preparePublicFormRequest(request);
  if (!session)
    return formJson(session, { error: "The contact service is not configured." }, { status: 503 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return formJson(session, { error: "Please check the form and try again." }, { status: 400 });
  const honeypot = parsed.data.website || parsed.data.honeypot;
  if (looksLikeBot(honeypot))
    return formJson(session, { ok: true, ticketNumber: "received" }, { status: 201 });
  const consent = parsed.data.consentToContact ?? parsed.data.consent ?? false;
  if (!consent)
    return formJson(session, { error: "Consent is required so the school can respond." }, { status: 400 });
  if (!(await verifyTurnstile(parsed.data.captchaToken, request, "contact"))) {
    return formJson(session, { error: "Human verification failed. Please try again." }, { status: 400 });
  }

  try {
    const args = {
      fingerprint: session.fingerprint,
      idempotencyKey: parsed.data.idempotencyKey ?? parsed.data.submissionId ?? crypto.randomUUID(),
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone || undefined,
      subject: parsed.data.subject ?? parsed.data.topic ?? "Website enquiry",
      message: parsed.data.message,
      consentToContact: true,
      source: "/contact",
    };
    const signed = signPublicFormPayload(session.formServiceSecret, {
      form: "contact",
      fingerprint: args.fingerprint,
      honeypot: null,
      idempotencyKey: args.idempotencyKey,
      name: args.name,
      email: args.email,
      phone: args.phone ?? null,
      subject: args.subject,
      message: args.message,
      consentToContact: args.consentToContact,
      source: args.source,
    });
    const result = await fetchAction(submitContact, { ...args, ...signed }, { url: session.convexUrl });
    return formJson(
      session,
      { ...result, message: `Thank you. Your enquiry reference is ${result.ticketNumber}.` },
      { status: 201 },
    );
  } catch (error) {
    const rateLimited = error instanceof Error && /rate|too many/i.test(error.message);
    return formJson(
      session,
      {
        error: rateLimited
          ? "Too many requests. Please wait before trying again."
          : "Your message could not be submitted right now.",
      },
      { status: rateLimited ? 429 : 502 },
    );
  }
}
