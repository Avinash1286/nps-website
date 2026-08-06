import { ConvexError } from "convex/values";

export function plainText(value: string, field: string, min: number, max: number): string {
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  if (cleaned.length < min || cleaned.length > max) {
    throw new ConvexError({
      code: "INVALID_INPUT",
      message: `${field} must be between ${min} and ${max} characters.`,
    });
  }
  return cleaned;
}

export function singleLineText(value: string, field: string, min: number, max: number): string {
  return plainText(value, field, min, max).replace(/\s+/g, " ").trim();
}

export function richText(value: string, field: string, max = 100_000): string {
  const cleaned = plainText(value, field, 1, max)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<\/?(?:object|embed|form|input|button)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(?:javascript|vbscript)\s*:/gi, "");
  return cleaned;
}

export function normalizedEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new ConvexError({ code: "INVALID_EMAIL", message: "Enter a valid email address." });
  }
  return email;
}

export function optionalPhone(value?: string): string | undefined {
  if (!value) return undefined;
  const phone = value.trim();
  if (phone.length < 7 || phone.length > 30 || !/^[+()\-\s\d.]+$/.test(phone)) {
    throw new ConvexError({ code: "INVALID_PHONE", message: "Enter a valid phone number." });
  }
  return phone;
}

export function requiredPhone(value: string): string {
  const phone = optionalPhone(value);
  if (!phone) throw new ConvexError({ code: "INVALID_PHONE", message: "Phone is required." });
  return phone;
}

export function normalizedSlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/, "");
  if (!slug) throw new ConvexError({ code: "INVALID_SLUG", message: "A valid slug is required." });
  return slug;
}

export function normalizedPageSlug(value: string): string {
  const raw = value.trim().toLowerCase();
  if (!raw || raw.length > 120 || raw.startsWith("/") || raw.endsWith("/") || raw.includes("\\")) {
    throw new ConvexError({ code: "INVALID_SLUG", message: "A valid page path is required." });
  }
  const rawSegments = raw.split("/");
  if (rawSegments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new ConvexError({ code: "INVALID_SLUG", message: "A valid page path is required." });
  }
  const segments = rawSegments.map((segment) => segment.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
  if (segments.some((segment) => !segment)) {
    throw new ConvexError({ code: "INVALID_SLUG", message: "A valid page path is required." });
  }
  const slug = segments.join("/");
  if (slug.length > 120) {
    throw new ConvexError({ code: "INVALID_SLUG", message: "Page paths must be 120 characters or fewer." });
  }
  return slug;
}

export function optionalUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    const localHttp =
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1");
    if (parsed.protocol !== "https:" && !localHttp) throw new Error("protocol");
    return parsed.toString();
  } catch {
    throw new ConvexError({ code: "INVALID_URL", message: "Enter a valid HTTPS URL." });
  }
}

export function optionalMediaUrl(value?: string): string | undefined {
  if (!value) return undefined;
  const raw = value.trim();
  if (
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    !raw.includes("\\") &&
    !/[\u0000-\u001F\u007F]/.test(raw)
  ) {
    return raw;
  }
  try {
    const parsed = new URL(raw);
    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname.endsWith(".convex.cloud") ||
      parsed.port ||
      parsed.username ||
      parsed.password
    ) {
      throw new Error("origin");
    }
    return parsed.toString();
  } catch {
    throw new ConvexError({
      code: "INVALID_MEDIA_URL",
      message: "Use a same-origin path, a Convex storage URL, or an uploaded storage ID.",
    });
  }
}

export function assertHoneypot(value?: string): void {
  if (value?.trim()) {
    throw new ConvexError({ code: "SPAM_REJECTED", message: "Submission rejected." });
  }
}

export function safeKey(value: string, field = "key", max = 160): string {
  const key = value.trim();
  if (key.length < 8 || key.length > max || !/^[a-zA-Z0-9_.:@\-/]+$/.test(key)) {
    throw new ConvexError({ code: "INVALID_INPUT", message: `${field} is invalid.` });
  }
  return key;
}

export function shortHash(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ (code + index), 0x85ebca6b);
  }
  return `${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`.padStart(14, "0");
}

export function referenceNumber(prefix: string, now: number, seed: string): string {
  const date = new Date(now).toISOString().slice(0, 10).replace(/-/g, "");
  return `${prefix}-${date}-${shortHash(seed).slice(0, 8).toUpperCase()}`;
}

export function opaqueToken(seed: string): string {
  const segments = ["nps", "unsubscribe", "registration", "2026"].map((salt) => shortHash(`${salt}:${seed}`));
  return segments.join("");
}

export function positiveInteger(value: number, field: string, maximum: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new ConvexError({
      code: "INVALID_INPUT",
      message: `${field} must be an integer between 1 and ${maximum}.`,
    });
  }
  return value;
}
