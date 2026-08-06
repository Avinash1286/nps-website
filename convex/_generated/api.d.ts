/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as assistant from "../assistant.js";
import type * as assistantAdmin from "../assistantAdmin.js";
import type * as assistantData from "../assistantData.js";
import type * as content from "../content.js";
import type * as crons from "../crons.js";
import type * as formActions from "../formActions.js";
import type * as forms from "../forms.js";
import type * as jobs from "../jobs.js";
import type * as lib_assistantSignature from "../lib/assistantSignature.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_input from "../lib/input.js";
import type * as lib_jobs from "../lib/jobs.js";
import type * as lib_metrics from "../lib/metrics.js";
import type * as lib_newsletter from "../lib/newsletter.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_secrets from "../lib/secrets.js";
import type * as lib_validators from "../lib/validators.js";
import type * as media from "../media.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  assistant: typeof assistant;
  assistantAdmin: typeof assistantAdmin;
  assistantData: typeof assistantData;
  content: typeof content;
  crons: typeof crons;
  formActions: typeof formActions;
  forms: typeof forms;
  jobs: typeof jobs;
  "lib/assistantSignature": typeof lib_assistantSignature;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  "lib/input": typeof lib_input;
  "lib/jobs": typeof lib_jobs;
  "lib/metrics": typeof lib_metrics;
  "lib/newsletter": typeof lib_newsletter;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/secrets": typeof lib_secrets;
  "lib/validators": typeof lib_validators;
  media: typeof media;
  seed: typeof seed;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};
