import { defineApp } from "convex/server";
import { v } from "convex/values";
import agent from "@convex-dev/agent/convex.config";

const app = defineApp({
  env: {
    GEMINI_API_KEY: v.optional(v.string()),
    GEMINI_MODEL: v.optional(v.string()),
    ASSISTANT_SERVICE_SECRET: v.optional(v.string()),
  },
});

app.use(agent);

export default app;
