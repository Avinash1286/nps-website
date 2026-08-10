import { describe, expect, test } from "vitest";
import schema from "./schema";

describe("Better Auth local component schema", () => {
  test("indexes rate-limit cleanup by last request time", () => {
    const rateLimitTable = schema.tables.rateLimit as unknown as {
      indexes: Array<{ indexDescriptor: string; fields: string[] }>;
    };

    expect(rateLimitTable.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ indexDescriptor: "lastRequest", fields: ["lastRequest"] }),
      ]),
    );
  });
});
