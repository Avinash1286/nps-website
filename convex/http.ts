import { httpRouter } from "convex/server";
import { authComponent, createAuth, studentTrustedOrigins } from "./auth";

const http = httpRouter();

authComponent.registerRoutesLazy(http, createAuth, {
  basePath: "/api/auth",
  cors: true,
  trustedOrigins: studentTrustedOrigins(),
});

export default http;
