import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// `server-only` intentionally throws when loaded outside Next's server
// bundler. Frontend unit tests exercise pure normalization helpers from those
// modules, so replace the environment marker without weakening production.
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  unstable_cache: (callback: unknown) => callback,
}));
