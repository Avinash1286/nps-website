import { defineApp } from "convex/server";
import { v } from "convex/values";
import agent from "@convex-dev/agent/convex.config";
import betterAuth from "./betterAuth/convex.config";

const app = defineApp({
  env: {
    GEMINI_API_KEY: v.optional(v.string()),
    GEMINI_MODEL: v.optional(v.string()),
    ASSISTANT_SERVICE_SECRET: v.optional(v.string()),
    SITE_URL: v.string(),
    STUDENT_AUTH_TRUSTED_ORIGINS: v.optional(v.string()),
    BETTER_AUTH_SECRET: v.string(),
  },
});

app.use(agent);
app.use(betterAuth);

export default app;
