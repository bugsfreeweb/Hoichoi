/**
 * CSRF: a cookie-authenticated write has to prove where it came from.
 *
 * `SameSite=Lax` is a browser's promise, not a fact about our server — an
 * embedded webview or a rewriting proxy can drop it. These checks pin the rule
 * itself and the fact that it is wired centrally (a route added tomorrow is
 * covered without remembering anything).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { csrfVerdict } from "../src/lib/csrf";

let passed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const base = {
  method: "POST",
  origin: null as string | null,
  fetchSite: null as string | null,
  host: "hoichoifeed.vercel.app",
  forwardedHost: null as string | null,
  forwardedProto: null as string | null,
  hasSessionCookie: true,
  allowed: [] as string[],
};

check("a same-origin form post is allowed", () => {
  assert.equal(csrfVerdict({ ...base, origin: "https://hoichoifeed.vercel.app" }).ok, true);
});

check("a look-alike origin is refused", () => {
  const v = csrfVerdict({ ...base, origin: "https://hoichoifeed.vercel.app.evil.test" });
  assert.equal(v.ok, false);
  assert.equal(v.ok === false && v.reason, "origin-mismatch");
});

check("a plain http origin is refused on an https host", () => {
  // Both schemes are matched for the request's own host, so the interesting case
  // is a *different* host over http.
  assert.equal(csrfVerdict({ ...base, origin: "http://evil.test" }).ok, false);
});

check("Origin: null (sandboxed iframe / file://) is refused", () => {
  const v = csrfVerdict({ ...base, origin: "null" });
  assert.equal(v.ok, false);
  assert.equal(v.ok === false && v.reason, "origin-null");
});

check("behind a proxy, the forwarded host counts as us", () => {
  assert.equal(
    csrfVerdict({
      ...base,
      host: "10.0.0.4:3000",
      forwardedHost: "hoichoifeed.vercel.app",
      forwardedProto: "https",
      origin: "https://hoichoifeed.vercel.app",
    }).ok,
    true,
  );
});

check("without Origin, same-origin fetch metadata is enough", () => {
  assert.equal(csrfVerdict({ ...base, fetchSite: "same-origin" }).ok, true);
  assert.equal(csrfVerdict({ ...base, fetchSite: "none" }).ok, true);
});

check("cross-site and same-site fetch metadata are refused", () => {
  assert.equal(csrfVerdict({ ...base, fetchSite: "cross-site" }).ok, false);
  assert.equal(csrfVerdict({ ...base, fetchSite: "same-site" }).ok, false);
});

check("no Origin, no fetch metadata, but a cookie: refused", () => {
  const v = csrfVerdict({ ...base });
  assert.equal(v.ok, false);
  assert.equal(v.ok === false && v.reason, "no-origin-header");
});

check("a bearer-token caller (no cookie) is never blocked", () => {
  assert.equal(csrfVerdict({ ...base, hasSessionCookie: false }).ok, true);
});

check("reads are never blocked", () => {
  for (const method of ["GET", "HEAD", "OPTIONS"]) {
    assert.equal(csrfVerdict({ ...base, method, origin: "https://evil.test" }).ok, true);
  }
});

check("an explicitly allowed origin passes", () => {
  assert.equal(csrfVerdict({ ...base, origin: "https://preview.example", allowed: ["https://preview.example"] }).ok, true);
});

check("the guard is wired centrally, not per route", () => {
  const mw = fs.readFileSync(path.resolve(import.meta.dirname, "../src/middleware.ts"), "utf8");
  assert.match(mw, /csrfVerdict/);
  assert.match(mw, /"\/api\/:path\*"/);
  assert.match(mw, /"\/admin\/:path\*"/);
  assert.match(mw, /"\/portal\/:path\*"/);
  assert.match(mw, /status: 403/);
});

check("the reason is not echoed in the body", () => {
  const mw = fs.readFileSync(path.resolve(import.meta.dirname, "../src/middleware.ts"), "utf8");
  const body = mw.slice(mw.indexOf("NextResponse.json("), mw.indexOf("status: 403"));
  assert.equal(/reason: verdict\.reason/.test(body), false);
});

console.log(`\n${passed} CSRF checks passed.`);