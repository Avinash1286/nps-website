import { describe, expect, it } from "vitest";
import { formatEventDateTimeRange } from "@/lib/data/public";

describe("formatEventDateTimeRange", () => {
  it("honours a valid event timezone", () => {
    const value = formatEventDateTimeRange("2026-08-06T12:00:00.000Z", "2026-08-06T13:00:00.000Z", "UTC");
    expect(value).toContain("UTC");
    expect(value).toMatch(/12:00/);
  });

  it("falls back safely when a configured timezone is invalid", () => {
    const value = formatEventDateTimeRange("2026-08-06T12:00:00.000Z", undefined, "Not/AZone");
    expect(value).toContain("Nepal time");
  });
});
