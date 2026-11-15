/**
 * Security headers.
 *
 * A wrong header is invisible until something breaks, and a permissive CSP looks
 * identical to a strict one in the browser. These checks assert the policy
 * directly: no eval in production, no wildcard permissions, HSTS only over
 * production, and a report endpoint that treats its input as hostile.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCsp, cspDirectives, cspHeaderName, securityHeaders, CSP_REPORT_PATH } from "../security-headers.mjs";
import { parseReports, formatReports, MAX_REPORT_BYTES } from "../src/lib/csp-report";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

let passed = 0;
async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const header = (list: { key: string; value: string }[], key: string) =>
  list.find((h) => h.key === key)?.value ?? "";

await check("production never ships 'unsafe-eval'", () => {
  const prod = buildCsp({ dev: false });
  assert.equal(prod.includes("unsafe-eval"), false, `prod CSP leaks eval: ${prod}`);
  const dev = buildCsp({ dev: true });
  assert.ok(dev.includes("'unsafe-eval'"), "dev needs eval for HMR");
});

await check("dangerous surfaces are closed", () => {
  const d = cspDirectives();
  assert.deepEqual(d["object-src"], ["'none'"]);
  assert.deepEqual(d["base-uri"], ["'self'"]);
  assert.deepEqual(d["form-action"], ["'self'"]);
  assert.deepEqual(d["frame-ancestors"], ["'self'"]);
  assert.deepEqual(d["default-src"], ["'self'"]);
  assert.ok(d["report-uri"]?.includes(CSP_REPORT_PATH));
  // A wildcard anywhere would make the rest of the policy decorative.
  const all = Object.values(d).flat().join(" ");
  assert.equal(all.includes("*"), false, `wildcard in CSP: ${all}`);
});

await check("the report-only switch is what flips enforcement", () => {
  assert.equal(cspHeaderName(false), "Content-Security-Policy-Report-Only");
  assert.equal(cspHeaderName(true), "Content-Security-Policy");
  const reportOnly = securityHeaders({ production: true, enforce: false }).map((h) => h.key);
  assert.ok(reportOnly.includes("Content-Security-Policy-Report-Only"));
  assert.equal(reportOnly.includes("Content-Security-Policy"), false);
  const enforced = securityHeaders({ production: true, enforce: true }).map((h) => h.key);
  assert.ok(enforced.includes("Content-Security-Policy"));
});

await check("HSTS is production-only and long-lived", () => {
  const prod = securityHeaders({ production: true });
  const value = header(prod, "Strict-Transport-Security");
  assert.match(value, /max-age=\d+/);
  const maxAge = Number(value.match(/max-age=(\d+)/)![1]);
  assert.ok(maxAge >= 31_536_000, `HSTS max-age too short: ${maxAge}`);
  assert.match(value, /includeSubDomains/);
  // A dev server that sends HSTS bricks localhost https for a year.
  const dev = securityHeaders({ production: false });
  assert.equal(header(dev, "Strict-Transport-Security"), "");
});

await check("Permissions-Policy denies rather than allows", () => {
  const value = header(securityHeaders({ production: true }), "Permissions-Policy");
  for (const feature of ["camera=()", "microphone=()", "geolocation=()", "payment=()"]) {
    assert.ok(value.includes(feature), `missing ${feature}`);
  }
  assert.equal(/=(\(?["']?\*)/.test(value), false, `wildcard permission: ${value}`);
});

await check("every response keeps the basic hardening headers", () => {
  const keys = securityHeaders({ production: true }).map((h) => h.key);
  for (const key of ["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy"]) {
    assert.ok(keys.includes(key), `missing ${key}`);
  }
});

await check("a legacy csp-report body is parsed", () => {
  const raw = JSON.stringify({
    "csp-report": {
      "effective-directive": "script-src",
      "blocked-uri": "https://evil.example/x.js",
      "document-uri": "https://hoichoifeed.vercel.app/post/x",
      "line-number": 12,
    },
  });
  const parsed = parseReports("application/csp-report", raw);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]?.directive, "script-src");
  assert.equal(parsed[0]?.blockedUri, "https://evil.example/x.js");
  const line = formatReports(parsed)[0] ?? "";
  assert.match(line, /^\[csp\] script-src blocked https:\/\/evil\.example/);
});

await check("a Reporting API batch is parsed and capped", () => {
  const many = Array.from({ length: 50 }, () => ({
    type: "csp-violation",
    body: { effectiveDirective: "img-src", blockedURL: "https://x.example/a.png" },
  }));
  const parsed = parseReports("application/reports+json", JSON.stringify(many));
  assert.equal(parsed.length, 20, `expected the 20-report cap, got ${parsed.length}`);
  assert.equal(parsed[0]?.directive, "img-src");
});

await check("hostile bodies are refused, never thrown on", () => {
  assert.deepEqual(parseReports("application/csp-report", "{not json"), []);
  assert.deepEqual(parseReports("application/csp-report", "null"), []);
  assert.deepEqual(parseReports("application/csp-report", JSON.stringify({ "csp-report": {} })), []);
  const huge = JSON.stringify({ "csp-report": { "blocked-uri": "x".repeat(MAX_REPORT_BYTES + 10) } });
  assert.deepEqual(parseReports("application/csp-report", huge), []);
  // Control characters must not survive into a log line.
  const injected = JSON.stringify({
    "csp-report": { "blocked-uri": "a\n[error] forged line", "effective-directive": "img-src" },
  });
  const parsed = parseReports("application/csp-report", injected);
  assert.equal(parsed.length, 1);
  const line = formatReports(parsed)[0] ?? "";
  assert.equal(line.includes("\n"), false);
});

await check("the collector is rate-limited and stores nothing", () => {
  const route = readFileSync(resolve(ROOT, "src/app/api/csp-report/route.ts"), "utf8");
  assert.ok(route.includes("limitRequest(req, LIMITS.cspReport)"), "collector must be rate-limited");
  assert.ok(route.includes("MAX_REPORT_BYTES"), "collector must cap the body");
  assert.equal(/INSERT INTO|execute\(/.test(route), false, "violations must not be persisted");
  const nextConfig = readFileSync(resolve(ROOT, "next.config.mjs"), "utf8");
  assert.ok(nextConfig.includes("securityHeaders("), "next.config must use the shared policy");
});

console.log(`[web] security-headers: ${passed} checks passed`);
