import { httpRouter } from "convex/server";
import { authComponent, createAuth, studentSiteOrigin } from "./auth";

const http = httpRouter();

authComponent.registerRoutesLazy(http, createAuth, {
  basePath: "/api/auth",
  cors: true,
  trustedOrigins: [studentSiteOrigin()],
});

export default http;
