import { describe, expect, it } from "vitest";
import {
  normalizedEmail,
  normalizedSlug,
  optionalUrl,
  plainText,
  referenceNumber,
  richText,
} from "@/convex/lib/input";

describe("Convex input normalization", () => {
  it("normalizes email addresses and route slugs", () => {
    expect(normalizedEmail(" Staff@Example.EDU.NP ")).toBe("staff@example.edu.np");
    expect(normalizedSlug("  Science & Technology  ")).toBe("science-technology");
  });

  it("removes active content from rich text", () => {
    const value = richText(
      '<p onclick="steal()">Welcome</p><script>alert(1)</script><a href="javascript:run()">Link</a>',
      "Body",
    );
    expect(value).not.toMatch(/script|onclick|javascript:/i);
    expect(value).toContain("Welcome");
  });

  it("rejects unsafe URL protocols and invalid lengths", () => {
    expect(() => optionalUrl("javascript:alert(1)")).toThrow();
    expect(() => plainText("x", "Message", 2, 10)).toThrow();
  });

  it("creates deterministic, non-PII reference numbers", () => {
    const number = referenceNumber("NPS-C", Date.UTC(2026, 7, 6), "submission-key-123");
    expect(number).toMatch(/^NPS-C-20260806-[A-Z0-9]{8}$/);
    expect(number).not.toContain("submission-key");
  });
});
