/** @type {import('next').NextConfig} */
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
  serverExternalPackages: [
    "@libsql/client",
    "bcryptjs",
    "sharp",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // SAMEORIGIN, not DENY: the admin's LIVE design studio previews the
          // real public site inside a same-origin iframe. DENY blocked even that,
          // so the studio panel stayed blank. SAMEORIGIN still refuses to be
          // framed by any other origin, which is what clickjacking protection
          // actually requires here.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Belt-and-braces for browsers that ignore X-Frame-Options on this
          // response path; keeps the framing lock to our own origin.
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;