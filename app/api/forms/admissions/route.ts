import { fetchAction } from "convex/nextjs";
import { makeFunctionReference } from "convex/server";
import { NextRequest } from "next/server";
import { z } from "zod";
import { normalizeAcademicYear } from "@/lib/content/academic-year";
import {
  formJson,
  looksLikeBot,
  preparePublicFormRequest,
  signPublicFormPayload,
  verifyTurnstile,
} from "@/lib/server/public-forms";

const antiAbuseFields = {
  website: z.string().max(200).optional(),
  honeypot: z.string().max(200).optional(),
  idempotencyKey: z.string().uuid().optional(),
  submissionId: z.string().uuid().optional(),
  captchaToken: z.string().max(2048).optional(),
  consent: z.literal(true),
};

const academicYearField = z.preprocess(
  (value) => (typeof value === "string" ? normalizeAcademicYear(value) : value),
  z.string().trim().min(1).max(40).default("current"),
);

const nestedSchema = z.object({
  ...antiAbuseFields,
  academicYear: academicYearField,
  desiredGrade: z.string().trim().min(1).max(80),
  student: z.object({
    firstName: z.string().trim().min(1).max(80),
    middleName: z.string().trim().max(80).optional().or(z.literal("")),
    lastName: z.string().trim().min(1).max(80),
    dateOfBirth: z.string().trim().min(4).max(40),
    gender: z.string().trim().max(40).optional().or(z.literal("")),
    citizenship: z.string().trim().max(80).optional().or(z.literal("")),
  }),
  guardian: z.object({
    name: z.string().trim().min(2).max(120),
    relationship: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(160),
    phone: z.string().trim().min(7).max(40),
    address: z.string().trim().min(4).max(300),
  }),
  priorSchool: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(1500).optional().or(z.literal("")),
});

const enquirySchema = z.object({
  ...antiAbuseFields,
  academicYear: academicYearField,
  intendedLevel: z.string().trim().min(1).max(80),
  studentName: z.string().trim().min(2).max(160),
  dateOfBirth: z.string().trim().min(4).max(40),
  guardianName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(7).max(40),
  previousSchool: z.string().trim().max(200).optional().or(z.literal("")),
  message: z.string().trim().max(1500).optional().or(z.literal("")),
});

const schema = z.union([nestedSchema, enquirySchema]);

type AdmissionArgs = {
  fingerprint: string;
  honeypot?: string;
  idempotencyKey: string;
  academicYear: string;
  desiredGrade: string;
  student: {
    firstName: string;
    middleName?: string;
    lastName: string;
    dateOfBirth: string;
    gender?: string;
    citizenship?: string;
  };
  guardian: { name: string; relationship: string; email: string; phone: string; address: string };
  priorSchool?: string;
  notes?: string;
  consent: boolean;
};

const submitAdmission = makeFunctionReference<
  "action",
  AdmissionArgs & { signature: string; requestTimestamp: number },
  { ok: boolean; applicationNumber: string }
>("formActions:submitAdmission");

function normalizeAdmission(data: z.infer<typeof schema>, fingerprint: string): AdmissionArgs {
  const idempotencyKey = data.idempotencyKey ?? data.submissionId ?? crypto.randomUUID();
  if ("student" in data) {
    return {
      fingerprint,
      idempotencyKey,
      academicYear: data.academicYear,
      desiredGrade: data.desiredGrade,
      student: {
        ...data.student,
        middleName: data.student.middleName || undefined,
        gender: data.student.gender || undefined,
        citizenship: data.student.citizenship || undefined,
      },
      guardian: { ...data.guardian, email: data.guardian.email.toLowerCase() },
      priorSchool: data.priorSchool || undefined,
      notes: data.notes || undefined,
      consent: true,
    };
  }

  const nameParts = data.studentName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ") || nameParts[0];
  return {
    fingerprint,
    idempotencyKey,
    academicYear: data.academicYear,
    desiredGrade: data.intendedLevel,
    student: { firstName, lastName, dateOfBirth: data.dateOfBirth },
    guardian: {
      name: data.guardianName,
      relationship: "Parent or guardian",
      email: data.email.toLowerCase(),
      phone: data.phone,
      address: "Not collected in the online enquiry",
    },
    priorSchool: data.previousSchool || undefined,
    notes: data.message || undefined,
    consent: true,
  };
}

export async function POST(request: NextRequest) {
  const session = preparePublicFormRequest(request);
  if (!session) {
    return formJson(session, { error: "Online admission enquiries are not configured." }, { status: 503 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return formJson(session, { error: "Please check every required application field." }, { status: 400 });
  }
  const honeypot = parsed.data.website || parsed.data.honeypot;
  if (looksLikeBot(honeypot)) {
    return formJson(session, { ok: true, applicationNumber: "received" }, { status: 201 });
  }
  if (!(await verifyTurnstile(parsed.data.captchaToken, request, "admission-enquiry"))) {
    return formJson(session, { error: "Human verification failed. Please try again." }, { status: 400 });
  }

  try {
    const args = normalizeAdmission(parsed.data, session.fingerprint);
    const signed = signPublicFormPayload(session.formServiceSecret, {
      form: "admission",
      fingerprint: args.fingerprint,
      honeypot: null,
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
    const result = await fetchAction(submitAdmission, { ...args, ...signed }, { url: session.convexUrl });
    return formJson(
      session,
      { ...result, message: `Your admissions enquiry reference is ${result.applicationNumber}.` },
      { status: 201 },
    );
  } catch (error) {
    const rateLimited = error instanceof Error && /rate|too many/i.test(error.message);
    return formJson(
      session,
      {
        error: rateLimited
          ? "Please wait before submitting again."
          : "The application could not be submitted.",
      },
      { status: rateLimited ? 429 : 502 },
    );
  }
}
