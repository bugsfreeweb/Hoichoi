/**
 * Rate limiter behaviour against a real (in-memory) database.
 *
 * The point of the table is that concurrent lambdas share one counter, so this
 * uses libsql rather than a mock: the `ON CONFLICT … RETURNING count` path and
 * the window arithmetic are exactly what production runs.
 */
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { hitRateLimit, peekRateLimit, windowStart } from "../rate-limit";
import { migrationSql } from "../migrations";

const ddl = migrationSql("025_rate_limits");
assert.ok(ddl, "migration 025_rate_limits must exist");

const client = createClient({ url: ":memory:" });
for (const stmt of ddl
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean)) {
  await client.execute(stmt);
}

let passed = 0;
async function check(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const T0 = Date.parse("2026-02-01T12:00:00.000Z");
const WINDOW = 10 * 60_000;

await check("the first N hits are allowed and the next one is not", async () => {
  const opts = { key: "test:basic", limit: 3, windowMs: WINDOW, now: T0, client };
  const results = [];
  for (let i = 0; i < 4; i++) results.push(await hitRateLimit(opts));
  assert.deepEqual(results.map((r) => r.allowed), [true, true, true, false]);
  assert.equal(results[2]!.remaining, 0);
  assert.equal(results[3]!.remaining, 0);
});

await check("retryAfterMs points at the end of the current window", async () => {
  const opts = { key: "test:retry", limit: 1, windowMs: WINDOW, now: T0, client };
  await hitRateLimit(opts);
  const blocked = await hitRateLimit(opts);
  assert.equal(blocked.allowed, false);
  const start = windowStart(T0, WINDOW);
  assert.equal(blocked.retryAfterMs, start + WINDOW - T0);
  assert.ok(blocked.retryAfterMs > 0 && blocked.retryAfterMs <= WINDOW);
});

await check("a new window resets the budget", async () => {
  const key = "test:reset";
  for (let i = 0; i < 2; i++) await hitRateLimit({ key, limit: 2, windowMs: WINDOW, now: T0, client });
  const blocked = await hitRateLimit({ key, limit: 2, windowMs: WINDOW, now: T0, client });
  assert.equal(blocked.allowed, false);
  const next = await hitRateLimit({ key, limit: 2, windowMs: WINDOW, now: T0 + WINDOW, client });
  assert.equal(next.allowed, true);
  assert.equal(next.remaining, 1);
});

await check("concurrent hits all count — no lost updates", async () => {
  const key = "test:concurrent";
  const opts = { key, limit: 5, windowMs: WINDOW, now: T0, client };
  await Promise.all(Array.from({ length: 5 }, () => hitRateLimit(opts)));
  assert.equal(await peekRateLimit(opts), 5);
  const sixth = await hitRateLimit(opts);
  assert.equal(sixth.allowed, false);
});

await check("buckets are independent", async () => {
  const a = { key: "test:a", limit: 1, windowMs: WINDOW, now: T0, client };
  const b = { key: "test:b", limit: 1, windowMs: WINDOW, now: T0, client };
  assert.equal((await hitRateLimit(a)).allowed, true);
  assert.equal((await hitRateLimit(a)).allowed, false);
  assert.equal((await hitRateLimit(b)).allowed, true, "one exhausted bucket must not block another");
});

await check("windowStart floors to the window boundary", async () => {
  assert.equal(windowStart(1000, 600), 600);
  assert.equal(windowStart(600, 600), 600);
  assert.equal(windowStart(599, 600), 0);
});

await check("a non-positive window is rejected instead of allowing everything", async () => {
  await assert.rejects(() => hitRateLimit({ key: "test:bad", limit: 1, windowMs: 0, now: T0, client }));
  await assert.rejects(() => hitRateLimit({ key: "test:bad", limit: 0, windowMs: WINDOW, now: T0, client }));
  await assert.rejects(() => hitRateLimit({ key: "", limit: 1, windowMs: WINDOW, now: T0, client }));
});

console.log(`[db] rate-limit: ${passed} checks passed`);
