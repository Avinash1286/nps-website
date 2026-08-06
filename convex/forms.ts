import { ConvexError, v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { enqueueJob } from "./lib/jobs";
import {
  assertHoneypot,
  normalizedEmail,
  optionalPhone,
  plainText,
  positiveInteger,
  referenceNumber,
  requiredPhone,
  safeKey,
  shortHash,
  singleLineText,
} from "./lib/input";
import { enforceRateLimit } from "./lib/rateLimit";
import { guardianValidator, publicRequestFields, studentValidator } from "./lib/validators";
import { writeAudit } from "./lib/audit";
import { recordCreated, recordStatusChanged } from "./lib/metrics";

const successWithTicket = v.object({ ok: v.boolean(), ticketNumber: v.string() });
const successWithApplication = v.object({ ok: v.boolean(), applicationNumber: v.string() });
const CAPACITY_RECONCILIATION_LIMIT = 1_000;

export const submitContact = internalMutation({
  args: {
    ...publicRequestFields,
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    subject: v.string(),
    message: v.string(),
    consentToContact: v.boolean(),
    source: v.optional(v.string()),
  },
  returns: successWithTicket,
  handler: async (ctx, args) => {
    assertHoneypot(args.honeypot);
    const idempotencyKey = safeKey(args.idempotencyKey, "idempotencyKey");
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", idempotencyKey))
      .unique();
    if (existing) return { ok: true, ticketNumber: existing.ticketNumber };

    const fingerprint = safeKey(args.fingerprint, "fingerprint");
    const email = normalizedEmail(args.email);
    await enforceRateLimit(ctx, {
      key: fingerprint,
      scope: "contact:fingerprint",
      limit: 5,
      windowMs: 60 * 60 * 1000,
      blockMs: 4 * 60 * 60 * 1000,
    });
    await enforceRateLimit(ctx, {
      key: shortHash(email),
      scope: "contact:email",
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });
    if (!args.consentToContact) {
      throw new ConvexError({ code: "CONSENT_REQUIRED", message: "Consent is required." });
    }

    const now = Date.now();
    const ticketNumber = referenceNumber("NPS-C", now, idempotencyKey);
    const id = await ctx.db.insert("contacts", {
      idempotencyKey,
      ticketNumber,
      name: plainText(args.name, "Name", 2, 120),
      email,
      phone: optionalPhone(args.phone),
      subject: singleLineText(args.subject, "Subject", 3, 180),
      message: plainText(args.message, "Message", 10, 5000),
      consentToContact: true,
      status: "new",
      source: args.source ? plainText(args.source, "Source", 1, 80) : undefined,
      ipHash: fingerprint,
      createdAt: now,
      updatedAt: now,
    });
    await recordCreated(ctx, "workflows:contacts", "new");
    await Promise.all([
      enqueueJob(ctx, {
        type: "contact_receipt",
        idempotencyKey: `contact-receipt:${id}`,
        payload: { entityType: "contacts", entityId: id, recipient: email, template: "contact-receipt" },
      }),
      enqueueJob(ctx, {
        type: "contact_staff_alert",
        idempotencyKey: `contact-alert:${id}`,
        payload: { entityType: "contacts", entityId: id, template: "contact-staff-alert" },
      }),
    ]);
    await writeAudit(ctx, null, {
      action: "contact.submitted",
      entityType: "contacts",
      entityId: id,
      summary: `Contact request ${ticketNumber} submitted.`,
    });
    return { ok: true, ticketNumber };
  },
});

export const submitAdmission = internalMutation({
  args: {
    ...publicRequestFields,
    academicYear: v.string(),
    desiredGrade: v.string(),
    student: studentValidator,
    guardian: guardianValidator,
    priorSchool: v.optional(v.string()),
    notes: v.optional(v.string()),
    consent: v.boolean(),
  },
  returns: successWithApplication,
  handler: async (ctx, args) => {
    assertHoneypot(args.honeypot);
    const idempotencyKey = safeKey(args.idempotencyKey, "idempotencyKey");
    const existing = await ctx.db
      .query("admissions")
      .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", idempotencyKey))
      .unique();
    if (existing) return { ok: true, applicationNumber: existing.applicationNumber };

    const settings = await ctx.db
      .query("siteSettings")
      .withIndex("by_singleton_key", (q) => q.eq("singletonKey", "main"))
      .unique();
    if (!settings?.admissionsOpen) {
      throw new ConvexError({ code: "ADMISSIONS_CLOSED", message: "Admissions are currently closed." });
    }
    if (!args.consent) {
      throw new ConvexError({ code: "CONSENT_REQUIRED", message: "Consent is required." });
    }

    const fingerprint = safeKey(args.fingerprint, "fingerprint");
    const email = normalizedEmail(args.guardian.email);
    await enforceRateLimit(ctx, {
      key: fingerprint,
      scope: "admission:fingerprint",
      limit: 3,
      windowMs: 24 * 60 * 60 * 1000,
      blockMs: 24 * 60 * 60 * 1000,
    });
    await enforceRateLimit(ctx, {
      key: shortHash(email),
      scope: "admission:email",
      limit: 2,
      windowMs: 24 * 60 * 60 * 1000,
    });

    const now = Date.now();
    const dateOfBirth =
      typeof args.student.dateOfBirth === "number"
        ? args.student.dateOfBirth
        : Date.parse(args.student.dateOfBirth);
    const oldestBirthDate = now - 30 * 365.25 * 24 * 60 * 60 * 1000;
    const youngestBirthDate = now - 2 * 365.25 * 24 * 60 * 60 * 1000;
    if (!Number.isFinite(dateOfBirth) || dateOfBirth < oldestBirthDate || dateOfBirth > youngestBirthDate) {
      throw new ConvexError({ code: "INVALID_BIRTH_DATE", message: "Enter a valid student birth date." });
    }
    const applicationNumber = referenceNumber("NPS-A", now, idempotencyKey);
    const id = await ctx.db.insert("admissions", {
      idempotencyKey,
      applicationNumber,
      // The active intake is an operator-controlled setting. Never trust a
      // browser-provided year for the authoritative application record.
      academicYear: plainText(settings.academicYear, "Academic year", 4, 20),
      desiredGrade: plainText(args.desiredGrade, "Desired grade", 1, 40),
      student: {
        firstName: plainText(args.student.firstName, "Student first name", 1, 80),
        middleName: args.student.middleName
          ? plainText(args.student.middleName, "Student middle name", 1, 80)
          : undefined,
        lastName: plainText(args.student.lastName, "Student last name", 1, 80),
        dateOfBirth,
        gender: args.student.gender ? plainText(args.student.gender, "Gender", 1, 40) : undefined,
        citizenship: args.student.citizenship
          ? plainText(args.student.citizenship, "Citizenship", 1, 80)
          : undefined,
      },
      guardian: {
        name: plainText(args.guardian.name, "Guardian name", 2, 120),
        relationship: plainText(args.guardian.relationship, "Relationship", 2, 50),
        email,
        phone: requiredPhone(args.guardian.phone),
        address: plainText(args.guardian.address, "Address", 5, 300),
      },
      priorSchool: args.priorSchool ? plainText(args.priorSchool, "Prior school", 2, 160) : undefined,
      notes: args.notes ? plainText(args.notes, "Notes", 1, 2000) : undefined,
      consent: true,
      status: "submitted",
      submittedAt: now,
      updatedAt: now,
    });
    await recordCreated(ctx, "workflows:admissions", "submitted");
    await Promise.all([
      enqueueJob(ctx, {
        type: "admission_receipt",
        idempotencyKey: `admission-receipt:${id}`,
        payload: { entityType: "admissions", entityId: id, recipient: email, template: "admission-receipt" },
      }),
      enqueueJob(ctx, {
        type: "admission_staff_alert",
        idempotencyKey: `admission-alert:${id}`,
        payload: { entityType: "admissions", entityId: id, template: "admission-staff-alert" },
      }),
    ]);
    await writeAudit(ctx, null, {
      action: "admission.submitted",
      entityType: "admissions",
      entityId: id,
      summary: `Admission application ${applicationNumber} submitted.`,
    });
    return { ok: true, applicationNumber };
  },
});

export const subscribeNewsletter = internalMutation({
  args: {
    ...publicRequestFields,
    confirmationToken: v.string(),
    unsubscribeToken: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    source: v.optional(v.string()),
    consent: v.boolean(),
  },
  returns: v.object({
    ok: v.boolean(),
    status: v.union(v.literal("pending"), v.literal("active")),
  }),
  handler: async (ctx, args) => {
    assertHoneypot(args.honeypot);
    if (!args.consent) {
      throw new ConvexError({ code: "CONSENT_REQUIRED", message: "Consent is required." });
    }
    const idempotencyKey = safeKey(args.idempotencyKey, "idempotencyKey");
    const email = normalizedEmail(args.email);
    const existingByKey = await ctx.db
      .query("newsletterSubscribers")
      .withIndex("by_idempotency_key", (q) => q.eq("lastIdempotencyKey", idempotencyKey))
      .unique();
    if (
      existingByKey?.status === "active" ||
      (existingByKey?.status === "pending" &&
        (existingByKey.confirmationExpiresAt === undefined ||
          existingByKey.confirmationExpiresAt > Date.now()))
    ) {
      return { ok: true, status: existingByKey.status } as const;
    }
    const fingerprint = safeKey(args.fingerprint, "fingerprint");
    await enforceRateLimit(ctx, {
      key: fingerprint,
      scope: "newsletter:fingerprint",
      limit: 8,
      windowMs: 60 * 60 * 1000,
    });
    await enforceRateLimit(ctx, {
      key: shortHash(email),
      scope: "newsletter:email",
      limit: 3,
      windowMs: 24 * 60 * 60 * 1000,
    });
    const now = Date.now();
    const confirmationToken = safeKey(args.confirmationToken, "confirmationToken");
    const unsubscribeToken = safeKey(args.unsubscribeToken, "unsubscribeToken");
    const existing = await ctx.db
      .query("newsletterSubscribers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing?.status === "active") return { ok: true, status: "active" } as const;
    const values = {
      email,
      name: args.name ? plainText(args.name, "Name", 1, 120) : undefined,
      source: args.source ? plainText(args.source, "Source", 1, 80) : undefined,
      status: "pending" as const,
      consentAt: now,
      confirmedAt: undefined,
      confirmationExpiresAt: now + 7 * 24 * 60 * 60 * 1000,
      unsubscribedAt: undefined,
      confirmationToken,
      unsubscribeToken,
      lastIdempotencyKey: idempotencyKey,
      updatedAt: now,
    };
    const id = existing
      ? (await ctx.db.patch("newsletterSubscribers", existing._id, values), existing._id)
      : await ctx.db.insert("newsletterSubscribers", { ...values, createdAt: now });
    if (existing) {
      await recordStatusChanged(ctx, "workflows:newsletter", existing.status, "pending");
    } else {
      await recordCreated(ctx, "workflows:newsletter", "pending");
    }
    await enqueueJob(ctx, {
      type: "newsletter_confirmation",
      idempotencyKey: `newsletter-confirm:${id}:${shortHash(confirmationToken)}`,
      payload: {
        entityType: "newsletterSubscribers",
        entityId: id,
        recipient: email,
        template: "newsletter-confirmation",
      },
    });
    return { ok: true, status: "pending" } as const;
  },
});

export const confirmNewsletter = mutation({
  args: { token: v.string() },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const token = safeKey(args.token, "token");
    const subscriber = await ctx.db
      .query("newsletterSubscribers")
      .withIndex("by_confirmation_token", (q) => q.eq("confirmationToken", token))
      .unique();
    if (!subscriber) {
      throw new ConvexError({ code: "INVALID_TOKEN", message: "This confirmation link is invalid." });
    }
    if (subscriber.status === "active") return { ok: true };
    if (
      subscriber.status !== "pending" ||
      (subscriber.confirmationExpiresAt !== undefined && subscriber.confirmationExpiresAt <= Date.now())
    ) {
      throw new ConvexError({ code: "INVALID_TOKEN", message: "This confirmation link is invalid." });
    }
    const now = Date.now();
    await ctx.db.patch("newsletterSubscribers", subscriber._id, {
      status: "active",
      confirmedAt: now,
      updatedAt: now,
    });
    await recordStatusChanged(ctx, "workflows:newsletter", subscriber.status, "active");
    return { ok: true };
  },
});

export const unsubscribeNewsletter = mutation({
  args: { token: v.string() },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const token = safeKey(args.token, "token");
    const subscriber = await ctx.db
      .query("newsletterSubscribers")
      .withIndex("by_unsubscribe_token", (q) => q.eq("unsubscribeToken", token))
      .unique();
    if (!subscriber) return { ok: true };
    if (subscriber.status === "unsubscribed") return { ok: true };
    const now = Date.now();
    await ctx.db.patch("newsletterSubscribers", subscriber._id, {
      status: "unsubscribed",
      unsubscribedAt: now,
      updatedAt: now,
    });
    await recordStatusChanged(ctx, "workflows:newsletter", subscriber.status, "unsubscribed");
    return { ok: true };
  },
});

export const registerEvent = internalMutation({
  args: {
    ...publicRequestFields,
    cancellationToken: v.string(),
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
  handler: async (ctx, args) => {
    assertHoneypot(args.honeypot);
    if (!args.consent) {
      throw new ConvexError({ code: "CONSENT_REQUIRED", message: "Consent is required." });
    }
    const idempotencyKey = safeKey(args.idempotencyKey, "idempotencyKey");
    const existingByKey = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", idempotencyKey))
      .unique();
    if (existingByKey) {
      return {
        ok: true,
        registrationNumber: existingByKey.registrationNumber,
        status: existingByKey.status === "waitlisted" ? "waitlisted" : "registered",
      } as const;
    }

    const event = await ctx.db.get("events", args.eventId);
    const now = Date.now();
    if (
      !event ||
      event.status !== "published" ||
      (event.publishAt !== undefined && event.publishAt > now) ||
      (event.expireAt !== undefined && event.expireAt <= now) ||
      !event.registrationEnabled ||
      event.endAt <= now
    ) {
      throw new ConvexError({ code: "REGISTRATION_CLOSED", message: "Event registration is closed." });
    }
    const fingerprint = safeKey(args.fingerprint, "fingerprint");
    const email = normalizedEmail(args.email);
    await enforceRateLimit(ctx, {
      key: fingerprint,
      scope: "event:fingerprint",
      limit: 8,
      windowMs: 60 * 60 * 1000,
    });
    const registeredForEmail = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_event_email_status", (q) =>
        q.eq("eventId", event._id).eq("email", email).eq("status", "registered"),
      )
      .first();
    const waitlistedForEmail = registeredForEmail
      ? null
      : await ctx.db
          .query("eventRegistrations")
          .withIndex("by_event_email_status", (q) =>
            q.eq("eventId", event._id).eq("email", email).eq("status", "waitlisted"),
          )
          .first();
    const activeExisting = registeredForEmail ?? waitlistedForEmail;
    if (activeExisting) {
      return {
        ok: true,
        registrationNumber: activeExisting.registrationNumber,
        status: activeExisting.status === "waitlisted" ? "waitlisted" : "registered",
      } as const;
    }

    const attendees = positiveInteger(args.attendees, "Attendees", 10);
    let usedCapacity = event.registeredAttendeeCount ?? 0;
    if (event.capacity && event.registeredAttendeeCount === undefined) {
      const current = (
        await Promise.all(
          (["registered", "attended", "no_show"] as const).map((status) =>
            ctx.db
              .query("eventRegistrations")
              .withIndex("by_event_status", (q) => q.eq("eventId", event._id).eq("status", status))
              .take(CAPACITY_RECONCILIATION_LIMIT + 1),
          ),
        )
      ).flat();
      if (current.length > CAPACITY_RECONCILIATION_LIMIT) {
        throw new ConvexError({
          code: "CAPACITY_RECONCILIATION_REQUIRED",
          message: "Event capacity is temporarily unavailable while registrations are reconciled.",
        });
      }
      usedCapacity = current.reduce((total, registration) => total + registration.attendees, 0);
    }
    const status = event.capacity && usedCapacity + attendees > event.capacity ? "waitlisted" : "registered";
    const registrationNumber = referenceNumber("NPS-E", now, idempotencyKey);
    const cancellationToken = safeKey(args.cancellationToken, "cancellationToken");
    const id = await ctx.db.insert("eventRegistrations", {
      idempotencyKey,
      eventId: event._id,
      registrationNumber,
      name: plainText(args.name, "Name", 2, 120),
      email,
      phone: optionalPhone(args.phone),
      attendees,
      notes: args.notes ? plainText(args.notes, "Notes", 1, 1000) : undefined,
      consent: true,
      status,
      cancellationToken,
      createdAt: now,
      updatedAt: now,
    });
    if (status === "registered") {
      // Patching the event in the same transaction serializes concurrent
      // registrations through Convex OCC and prevents overbooking.
      await ctx.db.patch("events", event._id, {
        registeredAttendeeCount: usedCapacity + attendees,
      });
    }
    await recordCreated(ctx, "workflows:eventRegistrations", status);
    await enqueueJob(ctx, {
      type: "event_confirmation",
      idempotencyKey: `event-confirm:${id}`,
      payload: {
        entityType: "eventRegistrations",
        entityId: id,
        recipient: email,
        template: status === "registered" ? "event-confirmation" : "event-waitlist",
      },
    });
    return { ok: true, registrationNumber, status } as const;
  },
});

export const cancelEventRegistration = mutation({
  args: { token: v.string() },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const token = safeKey(args.token, "token");
    const registration = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_cancellation_token", (q) => q.eq("cancellationToken", token))
      .unique();
    if (!registration) return { ok: true };
    if (registration.status !== "cancelled") {
      const previousStatus = registration.status;
      const now = Date.now();
      if (["registered", "attended", "no_show"].includes(registration.status)) {
        const event = await ctx.db.get("events", registration.eventId);
        if (event) {
          let usedCapacity = event.registeredAttendeeCount;
          if (usedCapacity === undefined && event.capacity) {
            const current = (
              await Promise.all(
                (["registered", "attended", "no_show"] as const).map((status) =>
                  ctx.db
                    .query("eventRegistrations")
                    .withIndex("by_event_status", (q) => q.eq("eventId", event._id).eq("status", status))
                    .take(CAPACITY_RECONCILIATION_LIMIT + 1),
                ),
              )
            ).flat();
            if (current.length > CAPACITY_RECONCILIATION_LIMIT) {
              // Cancellation must remain available. Leave the legacy counter
              // unset so a later reconciliation can calculate it safely.
              usedCapacity = undefined;
            } else {
              usedCapacity = current.reduce((total, item) => total + item.attendees, 0);
            }
          }
          if (usedCapacity !== undefined) {
            await ctx.db.patch("events", event._id, {
              registeredAttendeeCount: Math.max(0, usedCapacity - registration.attendees),
            });
          }
        }
      }
      await ctx.db.patch("eventRegistrations", registration._id, {
        status: "cancelled",
        updatedAt: now,
      });
      await recordStatusChanged(ctx, "workflows:eventRegistrations", previousStatus, "cancelled");
      await enqueueJob(ctx, {
        type: "event_confirmation",
        idempotencyKey: `event-cancel:${registration._id}`,
        payload: {
          entityType: "eventRegistrations",
          entityId: registration._id,
          recipient: registration.email,
          template: "event-cancelled",
          metadata: { expectedStatus: "cancelled", transition: "self-service" },
        },
      });
    }
    return { ok: true };
  },
});
