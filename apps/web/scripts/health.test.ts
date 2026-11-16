/**
 * Health report and log redaction.
 *
 * The health endpoint is public and a monitor decides from it whether to page
 * someone, so two things must be true: it only answers "unhealthy" for things
 * that actually break serving, and it never carries anything private.
 */
import assert from "node:assert/strict";
import { buildHealthReport, healthStatusCode, probe, SLOW_PROBE_MS } from "../src/lib/health";
import { redact } from "../src/lib/log";

let passed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const base = { version: "1.1.26", commit: "abc1234", startedAt: 1_000 };

check("all probes ok is healthy and 200", () => {
  const report = buildHealthReport({ ...base, probes: [probe("db", 12, "ok"), probe("migrations", 4, "ok")] }, 61_000);
  assert.equal(report.status, "healthy");
  assert.equal(report.ok, true);
  assert.equal(healthStatusCode(report), 200);
  assert.equal(report.uptimeSeconds, 60);
});

check("a dead database is unhealthy and 503", () => {
  const report = buildHealthReport({ ...base, probes: [probe("db", 900, "fail", "timeout")] }, 2_000);
  assert.equal(report.status, "unhealthy");
  assert.equal(report.ok, false);
  assert.equal(healthStatusCode(report), 503);
});

check("a broken optional dependency is degraded but still serves", () => {
  const report = buildHealthReport(
    { ...base, probes: [probe("db", 3, "ok"), probe("mail", 0, "fail", "no transport")] },
    2_000,
  );
  assert.equal(report.status, "degraded");
  assert.equal(report.ok, false, "degraded is not healthy");
  assert.equal(healthStatusCode(report), 200, "but readers can still be served");
});

check("a slow probe is reported as degraded, not ok", () => {
  const slow = probe("db", SLOW_PROBE_MS + 200, "ok");
  assert.equal(slow.status, "degraded");
  assert.ok(slow.ms > SLOW_PROBE_MS);
});

check("skipped configuration is not a failure", () => {
  const report = buildHealthReport(
    { ...base, probes: [probe("db", 2, "ok"), probe("media", 1, "skipped", "no provider")] },
    2_000,
  );
  assert.equal(report.status, "healthy");
});

check("the payload carries no secret or reader identifier", () => {
  const report = buildHealthReport(
    { ...base, probes: [probe("db", 2, "ok", "ok"), probe("media", 1, "ok", "2/2 usable")] },
    2_000,
  );
  const text = JSON.stringify(report);
  for (const forbidden of ["password", "secret", "token", "api_key", "@", "ip"]) {
    assert.equal(text.toLowerCase().includes(forbidden), false, `payload leaked "${forbidden}"`);
  }
});

check("redact() strips secrets, emails and IPs at any depth", () => {
  const redacted = redact({
    password: "hunter2",
    Authorization: "Bearer abc",
    user: { email: "reader@example.com", nested: { api_key: "sk-live" } },
    ip: "203.0.113.9",
    ipHash: "deadbeef",
    safe: "keep me",
  }) as Record<string, unknown>;
  const text = JSON.stringify(redacted);
  assert.equal(text.includes("hunter2"), false);
  assert.equal(text.includes("sk-live"), false);
  assert.equal(text.includes("reader@example.com"), false, "the address itself must not survive");
  assert.ok(text.includes("***@example.com"), "the domain shape is the useful part");
  assert.equal(text.includes("203.0.113.9"), false);
  assert.equal(text.includes("deadbeef"), false);
  assert.ok(text.includes("keep me"));
});

check("a very deep object is truncated rather than exploded", () => {
  let deep: Record<string, unknown> = { end: true };
  for (let i = 0; i < 10; i++) deep = { next: deep };
  const out = JSON.stringify(redact(deep));
  assert.ok(out.includes("[depth]"));
});

console.log(`[web] health: ${passed} checks passed`);
process.exit(process.exitCode ?? 0);
