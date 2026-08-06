import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "convex",
          include: ["convex/**/*.test.{ts,js}"],
          environment: "edge-runtime",
        },
      },
      {
        extends: true,
        test: {
          name: "frontend",
          include: ["tests/**/*.test.{ts,tsx,js,jsx}"],
          environment: "jsdom",
          setupFiles: ["./tests/setup.ts"],
        },
      },
    ],
    coverage: {
      reporter: ["text", "html"],
      include: ["lib/**/*.ts", "components/**/*.tsx"],
    },
  },
});
