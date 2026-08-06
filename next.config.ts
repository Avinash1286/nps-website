import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const clerkFapiOrigin = (() => {
  try {
    const value = process.env.NEXT_PUBLIC_CLERK_FAPI;
    if (!value) return "";
    const url = new URL(value);
    return url.protocol === "https:" ? ` ${url.origin}` : "";
  } catch {
    return "";
  }
})();

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"} https://*.clerk.accounts.dev https://*.clerk.com https://*.protect.clerk.com https://challenges.cloudflare.com${clerkFapiOrigin}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `img-src 'self' data: blob: https://*.convex.cloud https://img.clerk.com https://images.clerk.dev${clerkFapiOrigin}`,
  "media-src 'self' blob: https://*.convex.cloud",
  `connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.clerk.accounts.dev https://*.clerk.com https://*.protect.clerk.com https://clerk-telemetry.com https://*.clerk-telemetry.com https://img.clerk.com https://challenges.cloudflare.com${clerkFapiOrigin}`,
  `frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://*.protect.clerk.com https://challenges.cloudflare.com${clerkFapiOrigin}`,
  "worker-src 'self' blob:",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.convex.cloud" },
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/login", destination: "/sign-in", permanent: true },
      { source: "/forgot-password", destination: "/sign-in", permanent: true },
      { source: "/academics/faculty", destination: "/teachers", permanent: true },
      { source: "/academics/downloads", destination: "/downloads", permanent: true },
      { source: "/admin/announcements", destination: "/admin/notices", permanent: true },
    ];
  },
};

export default nextConfig;
