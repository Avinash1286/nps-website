import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import convex from "@convex-dev/eslint-plugin";

export default defineConfig([
  ...nextVitals,
  ...convex.configs.recommended,
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "coverage/**",
    "design-references/**",
    "convex/_generated/**",
    "convex/**/_generated/**",
  ]),
]);
