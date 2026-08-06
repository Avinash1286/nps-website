"use node";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { isConfiguredSecret } from "./lib/secrets";
import { guardianValidator, publicRequestFields, studentValidator } from "./lib/validators";

const SIGNATURE_TTL_MS = 120_000;

type ContactSubmissionResult = { ok: boolean; ticketNumber: string };
type AdmissionSubmissionResult = { ok: boolean; applicationNumber: string };
type NewsletterSubscriptionResult = { ok: boolean; status: "pending" | "active" };
type EventRegistrationResult = {
  ok: boolean;
  registrationNumber: string;
  status: "registered" | "waitlisted";
};

function authorize(signature: string, requestTimestamp: number, canonical: string): void {
  const secret = process.env.FORM_SERVICE_SECRET;
  if (!isConfiguredSecret(secret)) {
    throw new ConvexError({
      code: "SERVICE_UNAVAILABLE",
      message: "Form submissions are temporarily unavailable.",
    });
  }
  if (!Number.isSafeInteger(requestTimestamp) || Math.abs(Date.now() - requestTimestamp) > SIGNATURE_TTL_MS) {
    throw new ConvexError({ code: "REQUEST_EXPIRED", message: "This form request has expired." });
  }
  const supplied = signature.trim();
  if (!/^[a-f0-9]{64}$/.test(supplied)) {
    throw new ConvexError({ code: "UNAUTHORIZED", message: "Invalid form request." });
  }
  const expected = createHmac("sha256", secret).update(canonical, "utf8").digest("hex");
  const valid = timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"));
  if (!valid) {
    throw new ConvexError({ code: "UNAUTHORIZED", message: "Invalid form request." });
  }
}

export const submitContact = action({
  args: {
    signature: v.string(),
    requestTimestamp: v.number(),
    ...publicRequestFields,
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    subject: v.string(),
    message: v.string(),
    consentToContact: v.boolean(),
    source: v.optional(v.string()),
  },
  returns: v.object({ ok: v.boolean(), ticketNumber: v.string() }),
  handler: async (ctx, args): Promise<ContactSubmissionResult> => {
    const canonical = JSON.stringify({
      requestTimestamp: args.requestTimestamp,
      form: "contact",
      fingerprint: args.fingerprint,
      honeypot: args.honeypot ?? null,
      idempotencyKey: args.idempotencyKey,
      name: args.name,
      email: args.email,
      phone: args.phone ?? null,
      subject: args.subject,
      message: args.message,
      consentToContact: args.consentToContact,
      source: args.source ?? null,
    });
    authorize(args.signature, args.requestTimestamp, canonical);
    const { signature: _signature, requestTimestamp: _requestTimestamp, ...input } = args;
    const result: ContactSubmissionResult = await ctx.runMutation(internal.forms.submitContact, input);
    return result;
  },
});

export const submitAdmission = action({
  args: {
    signature: v.string(),
    requestTimestamp: v.number(),
    ...publicRequestFields,
    academicYear: v.string(),
    desiredGrade: v.string(),
    student: studentValidator,
    guardian: guardianValidator,
    priorSchool: v.optional(v.string()),
    notes: v.optional(v.string()),
    consent: v.boolean(),
  },
  returns: v.object({ ok: v.boolean(), applicationNumber: v.string() }),
  handler: async (ctx, args): Promise<AdmissionSubmissionResult> => {
    const canonical = JSON.stringify({
      requestTimestamp: args.requestTimestamp,
      form: "admission",
      fingerprint: args.fingerprint,
      honeypot: args.honeypot ?? null,
      idempotencyKey: args.idempotencyKey,
      academicYear: args.academicYear,
      desiredGrade: args.desiredGrade,
      student: {
        firstName: args.student.firstName,
        middleName: args.student.middleName ?? null,
        lastName: args.student.lastName,
        dateOfBirth: args.student.dateOfBirth,
        gender: args.student.gender ?? null,
        citizenship: args.student.citizenship ?? null,
      },
      guardian: {
        name: args.guardian.name,
        relationship: args.guardian.relationship,
        email: args.guardian.email,
        phone: args.guardian.phone,
        address: args.guardian.address,
      },
      priorSchool: args.priorSchool ?? null,
      notes: args.notes ?? null,
      consent: args.consent,
    });
    authorize(args.signature, args.requestTimestamp, canonical);
    const { signature: _signature, requestTimestamp: _requestTimestamp, ...input } = args;
    const result: AdmissionSubmissionResult = await ctx.runMutation(internal.forms.submitAdmission, input);
    return result;
  },
});

export const subscribeNewsletter = action({
  args: {
    signature: v.string(),
    requestTimestamp: v.number(),
    ...publicRequestFields,
    email: v.string(),
    name: v.optional(v.string()),
    source: v.optional(v.string()),
    consent: v.boolean(),
  },
  returns: v.object({
    ok: v.boolean(),
    status: v.union(v.literal("pending"), v.literal("active")),
  }),
  handler: async (ctx, args): Promise<NewsletterSubscriptionResult> => {
    const canonical = JSON.stringify({
      requestTimestamp: args.requestTimestamp,
      form: "newsletter",
      fingerprint: args.fingerprint,
      honeypot: args.honeypot ?? null,
      idempotencyKey: args.idempotencyKey,
      email: args.email,
      name: args.name ?? null,
      source: args.source ?? null,
      consent: args.consent,
    });
    authorize(args.signature, args.requestTimestamp, canonical);
    const { signature: _signature, requestTimestamp: _requestTimestamp, ...input } = args;
    const result: NewsletterSubscriptionResult = await ctx.runMutation(internal.forms.subscribeNewsletter, {
      ...input,
      confirmationToken: randomBytes(32).toString("base64url"),
      unsubscribeToken: randomBytes(32).toString("base64url"),
    });
    return result;
  },
});

export const registerEvent = action({
  args: {
    signature: v.string(),
    requestTimestamp: v.number(),
    ...publicRequestFields,
    eventId: v.id("events"),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    attendees: v.number(),
    notes: v.optional(v.string()),
    consent: v.boolean(),
  },
  returns: v.object({
    ok: v.boolean(),
    registrationNumber: v.string(),
    status: v.union(v.literal("registered"), v.literal("waitlisted")),
  }),
  handler: async (ctx, args): Promise<EventRegistrationResult> => {
    const canonical = JSON.stringify({
      requestTimestamp: args.requestTimestamp,
      form: "event",
      fingerprint: args.fingerprint,
      honeypot: args.honeypot ?? null,
      idempotencyKey: args.idempotencyKey,
      eventId: args.eventId,
      name: args.name,
      email: args.email,
      phone: args.phone ?? null,
      attendees: args.attendees,
      notes: args.notes ?? null,
      consent: args.consent,
    });
    authorize(args.signature, args.requestTimestamp, canonical);
    const { signature: _signature, requestTimestamp: _requestTimestamp, ...input } = args;
    const result: EventRegistrationResult = await ctx.runMutation(internal.forms.registerEvent, {
      ...input,
      cancellationToken: randomBytes(32).toString("base64url"),
    });
    return result;
  },
});
