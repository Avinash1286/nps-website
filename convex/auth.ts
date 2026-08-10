import { createClient, type AuthFunctions, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import betterAuthSchema from "./betterAuth/schema";
import { normalizedEmail, plainText } from "./lib/input";
import { betterAuthConfig } from "./auth.config";

const authFunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel, typeof betterAuthSchema>(components.betterAuth, {
  authFunctions,
  local: {
    schema: betterAuthSchema,
  },
  triggers: {
    user: {
      onCreate: async (ctx, authUser) => {
        const now = Date.now();
        await ctx.db.insert("studentProfiles", {
          authUserId: authUser._id,
          email: normalizedEmail(authUser.email),
          name: plainText(authUser.name, "Name", 1, 120),
          status: "active",
          termsAcceptedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      },
      onUpdate: async (ctx, authUser) => {
        const profile = await ctx.db
          .query("studentProfiles")
          .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
          .unique();
        if (!profile) return;
        await ctx.db.patch("studentProfiles", profile._id, {
          email: normalizedEmail(authUser.email),
          name: plainText(authUser.name, "Name", 1, 120),
          updatedAt: Date.now(),
        });
      },
      onDelete: async (ctx, authUser) => {
        const profile = await ctx.db
          .query("studentProfiles")
          .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
          .unique();
        if (!profile) return;
        await ctx.db.patch("studentProfiles", profile._id, {
          status: "suspended",
          updatedAt: Date.now(),
        });
      },
    },
  },
});

function exactStudentOrigin(raw: string, variableName: string): string {
  if (/[*?]/.test(raw)) {
    throw new Error(`${variableName} must not contain wildcard origins.`);
  }
  const url = new URL(raw);
  if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new Error(
      `${variableName} must contain exact application origins without a path, query, or credentials.`,
    );
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) {
    throw new Error(`${variableName} must use HTTPS, except for http://localhost during development.`);
  }
  return url.origin;
}

export function studentSiteOrigin(): string {
  const raw = process.env.SITE_URL?.trim();
  if (!raw) throw new Error("SITE_URL is required for student authentication.");
  return exactStudentOrigin(raw, "SITE_URL");
}

export function studentTrustedOrigins(siteUrl = studentSiteOrigin()): string[] {
  const canonicalOrigin = exactStudentOrigin(siteUrl, "SITE_URL");
  const configured = process.env.STUDENT_AUTH_TRUSTED_ORIGINS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const additional = (configured ?? []).map((origin) =>
    exactStudentOrigin(origin, "STUDENT_AUTH_TRUSTED_ORIGINS"),
  );
  if (
    new URL(canonicalOrigin).protocol === "https:" &&
    additional.some((origin) => new URL(origin).protocol === "http:")
  ) {
    throw new Error(
      "STUDENT_AUTH_TRUSTED_ORIGINS must not add localhost to an HTTPS production auth deployment.",
    );
  }
  return [...new Set([canonicalOrigin, ...additional])];
}

function studentAuthBaseUrl(siteUrl: string, trustedOrigins: string[]): BetterAuthOptions["baseURL"] {
  if (trustedOrigins.length === 1) return siteUrl;
  return {
    allowedHosts: trustedOrigins,
    protocol: "auto",
    fallback: siteUrl,
  };
}

function authSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  }
  return secret;
}

export function hasAcceptedStudentTerms(body: unknown): boolean {
  return Boolean(
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    (body as Record<string, unknown>).termsAccepted === true,
  );
}

type AuthSchemaGenerationOverrides = {
  siteUrl: string;
  secret: string;
};

export const createAuthOptions = (
  ctx: GenericCtx<DataModel>,
  schemaGeneration?: AuthSchemaGenerationOverrides,
) => {
  const siteUrl = schemaGeneration?.siteUrl ?? studentSiteOrigin();
  const trustedOrigins = schemaGeneration ? [siteUrl] : studentTrustedOrigins(siteUrl);
  return {
    appName: "Nepal Police School Student Publishing",
    baseURL: studentAuthBaseUrl(siteUrl, trustedOrigins),
    secret: schemaGeneration?.secret ?? authSecret(),
    trustedOrigins,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: false,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 30,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (authContext) => {
        if (authContext.path !== "/sign-up/email") return;
        if (!hasAcceptedStudentTerms(authContext.body)) {
          throw new APIError("BAD_REQUEST", {
            code: "TERMS_NOT_ACCEPTED",
            message: "You must accept the terms of use and privacy notice to create an account.",
          });
        }
      }),
    },
    plugins: [convex({ authConfig: betterAuthConfig })],
  } satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx<DataModel>, schemaGeneration?: AuthSchemaGenerationOverrides) =>
  betterAuth(createAuthOptions(ctx, schemaGeneration));

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();
