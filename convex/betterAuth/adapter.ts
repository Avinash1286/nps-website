import { createApi } from "@convex-dev/better-auth";
import { createAuthOptions } from "../auth";
import schema from "./schema";

// `createApi` reads the Better Auth model metadata while Convex analyzes this
// component. Component analysis does not inherit the parent deployment's env,
// so use inert values here; live HTTP requests still use `createAuth` in the
// parent module and its validated deployment configuration.
const schemaOptions = createAuthOptions({} as never, {
  siteUrl: "http://localhost:3000",
  secret: "schema-generation-placeholder-not-a-runtime-secret",
});

export const { create, findOne, findMany, updateOne, updateMany, deleteOne, deleteMany } = createApi(
  schema,
  () => schemaOptions,
);
