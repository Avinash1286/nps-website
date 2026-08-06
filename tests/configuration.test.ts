import { describe, expect, it } from "vitest";
import { isConfiguredSecret as isConfiguredConvexSecret } from "../convex/lib/secrets";
import { isConfiguredSecret as isConfiguredWebSecret } from "@/lib/security/configuration";

describe("server secret configuration", () => {
  const strongSecret = "ca82b52cb5c5fd706a5d5fc306bb60e087dbfe221b76fd8f";

  it("accepts sufficiently long non-placeholder credentials", () => {
    expect(isConfiguredWebSecret(strongSecret)).toBe(true);
    expect(isConfiguredConvexSecret(strongSecret)).toBe(true);
  });

  it.each([
    undefined,
    "short",
    "replace_with_a_long_random_secret",
    "your-example-secret-value-that-is-long",
  ])("rejects missing, weak, and copied example credentials", (value) => {
    expect(isConfiguredWebSecret(value)).toBe(false);
    expect(isConfiguredConvexSecret(value)).toBe(false);
  });
});
