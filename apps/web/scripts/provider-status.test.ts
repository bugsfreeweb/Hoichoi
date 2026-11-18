/**
 * The status board describes the fleet, and it only says what it measured.
 *
 * Three regressions are pinned here, all of which were live:
 *
 *  1. The headline numbers were computed from the page of twenty rows on screen,
 *     so they changed when an operator turned the page and a dead provider on
 *     page two was never counted.
 *  2. A provider that had never been called was drawn as if it were fine.
 *  3. A rate limit was a number in a row with nothing compared against it, so
 *     "how much is left" was unanswerable.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import {
  listAiProviderStatus,
  providerVerdict,
  VERDICT_LABEL_BN,
  type AiProviderStatusRow,
  type ProviderCallStats,
} from "../../../packages/db/src/ai-provider-status";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), "utf8");

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed++;
}

const emptyStats = (over: Partial<ProviderCallStats> = {}): ProviderCallStats => ({
  calls24h: 0,
  fails24h: 0,
  calls7d: 0,
  fails7d: 0,
  p50Ms: null,
  p95Ms: null,
  lastCallAt: null,
  lastErrorKind: null,
  hourly: [],
  ...over,
});

const row = (over: Partial<AiProviderStatusRow> = {}): AiProviderStatusRow => ({
  id: "r1",
  key: "google",
  name: "Google",
  purpose: "text",
  model: "gemini",
  priority: 1,
  isActive: true,
  isFreeTier: true,
  hasStoredKey: false,
  keyEnvVar: "GOOGLE_API_KEY",
  rateLimitRpm: 60,
  callsLastMinute: 0,
  lastOkAt: null,
  lastErrorAt: null,
  errorCount: 0,
  stats: emptyStats(),
  ...over,
});

const loader = read("packages/db/src/ai-provider-status.ts");
const boardRaw = read("apps/web/src/components/admin/ProviderStatusBoard.tsx");
/** Comments may name the broken pattern; only code must not contain it. */
const board = boardRaw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const page = read("apps/web/src/app/admin/(console)/providers/page.tsx");

check("the loader reads every row, and is not paginated", () => {
  assert.match(loader, /SELECT \* FROM llm_providers ORDER BY priority/);
  const providerQuery = loader.slice(loader.indexOf("SELECT * FROM llm_providers"), loader.indexOf("SELECT provider, ok"));
  assert.ok(!/LIMIT/.test(providerQuery), "the provider query has no LIMIT");
});

check("the page's tiles come from the fleet, not the page in view", () => {
  assert.match(page, /const fleet = await listAiProviderStatus\(\)/);
  assert.match(page, /const active = fleet\.filter/);
  assert.ok(!/const active = providers\.filter/.test(page), "the page-scoped aggregate is gone");
});

check("a never-called provider is not called healthy", () => {
  assert.equal(providerVerdict(row()), "unused");
  assert.equal(VERDICT_LABEL_BN.unused, "কল হয়নি");
  // One real call in the last 24 h — with no failure since — is evidence of life.
  assert.equal(
    providerVerdict(row({ stats: emptyStats({ calls24h: 1, calls7d: 1, p50Ms: 300 }) })),
    "alive",
  );
});

check("a failure wins over an old success, and an explicit off wins over both", () => {
  const failing = row({
    lastOkAt: "2026-01-01T00:00:00.000Z",
    lastErrorAt: "2026-01-02T00:00:00.000Z",
    errorCount: 2,
  });
  assert.equal(providerVerdict(failing), "failing");
  assert.equal(providerVerdict({ ...failing, isActive: false }), "off");
});

check("a burst of failures inside the hour counts even when the row's counters are clean", () => {
  const now = Date.parse("2026-02-01T12:00:00.000Z");
  const hour = new Date(now - 10 * 60_000).toISOString().slice(0, 13);
  const burst = row({
    lastOkAt: new Date(now - 60_000).toISOString(),
    stats: emptyStats({
      calls24h: 20,
      calls7d: 20,
      hourly: [{ hour, calls: 6, fails: 4 }],
    }),
  });
  assert.equal(providerVerdict(burst, now), "failing");
});

check("a rate limit is shown against measured calls, never invented", () => {
  assert.match(loader, /callsLastMinute: runs\.filter\(\(r\) => Date\.parse\(r\.createdAt\) >= minuteAgo\)\.length/);
  assert.match(loader, /rateLimitRpm: row\.rate_limit_rpm === null/);
  assert.match(board, /Math\.max\(0, limit - row\.callsLastMinute\)/);
  assert.match(board, /limit === null \? "ঘোষিত নয়"/);
});

check("the hourly chart is 24 real buckets, oldest first, zero-filled", () => {
  const fn = loader.slice(loader.indexOf("function hourlyBuckets"), loader.indexOf("export async function listAiProviderStatus"));
  assert.match(fn, /for \(let i = 0; i < 24; i\+\+\)/);
  assert.match(fn, /calls: 0, fails: 0/);
  assert.match(fn, /slot\.calls \+= 1/);
  assert.ok(fn.indexOf("- 23 * 3_600_000") > 0, "starts 23 hours back");
});

check("the board groups text and images and is rendered on the server", () => {
  assert.match(board, /title="লেখা \(TEXT\)"/);
  assert.match(board, /title="ছবি \(IMAGE\)"/);
  assert.ok(!/"use client"/.test(board), "a server component: no client fetch, no default-then-swap");
  assert.match(board, /data-provider-status=\{verdict\}/);
});

check("alpha tints are mixed from the token, because a variable cannot take /10", () => {
  // `bg-cat-teal/10` compiles to nothing when the colour is a var(), which made
  // the pill and every bar transparent in the first build of this board.
  assert.ok(!/bg-cat-teal\/\d+/.test(board), "no alpha modifier on a var() colour");
  assert.ok(!/bg-alizarin\/\d+/.test(board));
  assert.match(board, /color-mix\(in srgb, var\(--color-cat-teal\)/);
  assert.match(board, /rgba\(26,20,13,0\.10\)/, "an empty hour is a baseline, not a healthy bar");
});

check("status is an accent strip and a glow, so it reads at a glance", () => {
  assert.match(board, /inset 3px 0 0 0 #2f9e6e/);
  assert.match(board, /inset 3px 0 0 0 #d64541/);
});

void listAiProviderStatus; // imported for its type surface; the SQL is asserted above

console.log(`\n[web] provider status: ${passed} checks passed`);
