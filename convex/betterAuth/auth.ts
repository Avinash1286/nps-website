import { createAuth } from "../auth";

// Static instance used only by the Better Auth CLI when regenerating this
// component's schema. These placeholders are not runtime credentials; the
// HTTP auth handler still requires SITE_URL and BETTER_AUTH_SECRET.
export const auth = createAuth({} as never, {
  siteUrl: "http://localhost:3000",
  secret: "schema-generation-placeholder-not-a-runtime-secret",
});
