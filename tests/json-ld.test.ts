import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/lib/security/json-ld";

describe("serializeJsonLd", () => {
  it("cannot be terminated by publisher-managed script text", () => {
    const serialized = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(serialized).not.toContain("<");
    expect(serialized).toContain("\\u003c/script>");
    expect(JSON.parse(serialized)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});
