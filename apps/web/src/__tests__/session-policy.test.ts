import assert from "node:assert/strict";
import {
  SESSION_ABSOLUTE_MS,
  SESSION_IDLE_MS,
  SESSION_TOUCH_MS,
  absoluteDeadline,
  msRemaining,
  nextExpiry,
  sessionState,
  shouldTouch,
} from "../lib/session-policy";

/**
 * Session lifetime policy.
 *
 * The old policy was one 365-day window renewed on every request, so a session
 * used daily never expired. The brief requires admin credentials to expire after
 * 30 days, so the arithmetic is pinned here: absolute deadline, idle deadline,
 * and the write-throttle that keeps a polling dashboard from touching the
 * database on every request.
 */

const DAY = 86_400_000;
const T0 = Date.parse("2026-01-01T00:00:00.000Z");
const iso = (ms: number) => new Date(ms).toISOString();

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

check("a just-created session is active", () => {
  const row = { created_at: iso(T0), last_used_at: iso(T0), revoked_at: null };
  assert.equal(sessionState(row, T0 + 60_000), "active");
});

check("a session dies 30 days after creation even if used every hour", () => {
  const row = { created_at: iso(T0), last_used_at: iso(T0 + 29 * DAY), revoked_at: null };
  assert.equal(sessionState(row, T0 + 30 * DAY - 1), "active");
  assert.equal(sessionState(row, T0 + 30 * DAY), "expired");
  // Absolute cap: being used one minute ago does not save it.
  assert.equal(sessionState({ ...row, last_used_at: iso(T0 + 30 * DAY) }, T0 + 30 * DAY + 60_000), "expired");
});

check("a session dies 7 days after the last use", () => {
  const row = { created_at: iso(T0), last_used_at: iso(T0 + 1000), revoked_at: null };
  assert.equal(sessionState(row, T0 + 1000 + SESSION_IDLE_MS - 1), "active");
  assert.equal(sessionState(row, T0 + 1000 + SESSION_IDLE_MS), "idle");
});

check("a revoked session is rejected regardless of its clock", () => {
  const row = { created_at: iso(T0), last_used_at: iso(T0), revoked_at: iso(T0 + 500) };
  assert.equal(sessionState(row, T0 + 501), "revoked");
});

check("a missing created_at fails closed", () => {
  assert.equal(sessionState({ created_at: "" }, T0), "expired");
});

check("expiry never slides past the absolute deadline", () => {
  const nearEnd = T0 + 30 * DAY - 3_600_000; // one hour left
  assert.equal(nextExpiry(T0, nearEnd), absoluteDeadline(T0));
  assert.equal(nextExpiry(T0, T0), T0 + SESSION_IDLE_MS);
  assert.ok(nextExpiry(T0, nearEnd) < nearEnd + SESSION_IDLE_MS);
});

check("last_used_at is written at most every 5 minutes", () => {
  assert.equal(shouldTouch(null, T0), true);
  assert.equal(shouldTouch(iso(T0), T0 + SESSION_TOUCH_MS - 1), false);
  assert.equal(shouldTouch(iso(T0), T0 + SESSION_TOUCH_MS), true);
  assert.equal(shouldTouch(iso(T0 + 10 * DAY), T0), false, "a future timestamp must not force a write");
});

check("remaining lifetime is floored at zero", () => {
  assert.equal(msRemaining(iso(T0 + 1000), T0), 1000);
  assert.equal(msRemaining(iso(T0), T0 + 1000), 0);
  assert.equal(msRemaining(null, T0), 0);
});

check("the windows are the agreed numbers", () => {
  assert.equal(SESSION_ABSOLUTE_MS, 30 * DAY);
  assert.equal(SESSION_IDLE_MS, 7 * DAY);
});

console.log(`[web] session-policy: ${passed} checks passed`);
