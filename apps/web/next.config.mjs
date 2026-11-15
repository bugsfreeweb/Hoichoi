/** @type {import('next').NextConfig} */
import { securityHeaders } from "./security-headers.mjs";

const isProd = process.env.NODE_ENV === "production";
// Report-only until someone has watched the reports. Flip with CSP_ENFORCE=true.
const enforceCsp = process.env.CSP_ENFORCE === "true";

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@hoichoi/dash", "@hoichoi/db", "@hoichoi/shared-types", "@hoichoi/llm"],
  // Schema setup runs from the inlined migrations module (packages/db/src/
  // migrations.generated.ts), so no .sql file is needed at request time. These
  // patterns keep the real files in the function bundle too, for the
  // `HOICHOI_MIGRATIONS_DIR` override and for the disk-first path in
  // packages/db/src/migrations.ts.
  outputFileTracingIncludes: {
    "/api/**": ["../../packages/db/migrations/**/*.sql"],
    "/admin/**": ["../../packages/db/migrations/**/*.sql"],
  },
  serverExternalPackages: ["@libsql/client", "bcryptjs", "sharp"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders({ production: isProd, dev: !isProd, enforce: enforceCsp }),
      },
    ];
  },
};

export default nextConfig;
