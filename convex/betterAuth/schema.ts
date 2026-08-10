import { defineSchema } from "convex/server";
import { tables } from "./generatedSchema";

const schema = defineSchema({
  ...tables,
  // Better Auth periodically deletes expired rate-limit entries with a
  // lastRequest < cutoff query. The package schema only indexes `key`, so this
  // component-owned index prevents an unbounded table scan during cleanup.
  rateLimit: tables.rateLimit.index("lastRequest", ["lastRequest"]),
});

export default schema;
