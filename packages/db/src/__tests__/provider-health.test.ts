/**
 * Media provider health.
 *
 * The point of this module is that a dead upload target stops being tried first
 * and a full quota stops being used — while a *stale* cooldown never stops
 * uploads entirely. Those two rules pull in opposite directions, so they are
 * tested against a real database, not a mock.
 */
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { migrationSql } from "../migrations";
import {
  backoffMs,
  cooldownUntil,
  getProviderHealth,
  listProviderHealth,
  overQuota,
  providerState,
  recordProviderFailure,
  recordProviderRemoval,
  recordProviderSkip,
  recordProviderSuccess,
  registerProvider,
  storageProviderIdentity,
  syncStorageProviders,
  updateProviderSettings,
  usableNow,
  COOLDOWN_AFTER,
  COOLDOWN_BASE_MS,
  COOLDOWN_MAX_MS,
} from "../provider-health";
import { __useClientForTests } from "../client";

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

const client = createClient({ url: ":memory:" });
__useClientForTests(client);
const ddl = migrationSql("029_media_provider_health");
assert.ok(ddl, "migration 029_media_provider_health must exist");
// Strip SQL comments first: a semicolon inside a comment would split a statement
// in half and the "statement" would then be a comment (which libsql rejects).
const statements = ddl
  .replace(/^\s*--.*$/gm, "")
  .split(";")
  .map((x) => x.trim())
  .filter(Boolean);
for (const stmt of statements) {
  await client.execute(stmt);
}

const base = {
  provider_key: "github:owner/repo",
  kind: "github" as const,
  label: "GitHub media",
  enabled: true,
  quota_bytes: null,
  used_bytes: 0,
  objects: 0,
  success_count: 0,
  failure_count: 0,
  consecutive_failures: 0,
  last_success_at: null,
  last_failure_at: null,
  last_error: null,
  last_fallback_reason: null,
  cooldown_until: null,
  created_at: "",
  updated_at: "",
};

await check("one failure is noise, two start a cooldown", () => {
  assert.equal(backoffMs(1), 0, "a single failure must not demote the primary");
  assert.equal(backoffMs(COOLDOWN_AFTER), COOLDOWN_BASE_MS);
  assert.ok(backoffMs(3) > backoffMs(COOLDOWN_AFTER));
  assert.equal(backoffMs(50), COOLDOWN_MAX_MS, "backoff is capped");
  assert.equal(cooldownUntil(1), null);
  assert.ok(cooldownUntil(2));
});

await check("state reflects quota before cooldown", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  assert.equal(providerState(base, now), "ok");
  assert.equal(providerState({ ...base, enabled: false }, now), "disabled");
  assert.equal(providerState({ ...base, consecutive_failures: 1 }, now), "degraded");
  assert.equal(
    providerState({ ...base, cooldown_until: "2026-01-01T00:10:00.000Z", consecutive_failures: 2 }, now),
    "cooldown",
  );
  assert.equal(
    providerState({ ...base, quota_bytes: 100, used_bytes: 100 }, now),
    "quota_exceeded",
    "a reached quota must win over a healthy streak",
  );
  // A quota of 0 (or unknown) is not "full": only a positive quota can fill up.
  assert.equal(overQuota({ quota_bytes: 0, used_bytes: 5 }), false);
  assert.equal(overQuota({ quota_bytes: null, used_bytes: 5 }), false);
  assert.equal(overQuota({ quota_bytes: 5, used_bytes: 5 }), true);
});

await check("an elapsed cooldown is usable again, a live one is not", () => {
  const past = { ...base, consecutive_failures: 2, cooldown_until: "2020-01-01T00:00:00.000Z" };
  const future = { ...base, consecutive_failures: 2, cooldown_until: "2999-01-01T00:00:00.000Z" };
  assert.equal(usableNow(past), true);
  assert.equal(usableNow(future), false);
});

await check("provider keys identify a repo, not just a provider kind", () => {
  assert.deepEqual(storageProviderIdentity({ kind: "github", label: "", repo: "owner/a" }), {
    key: "github:owner/a",
    kind: "github",
    label: "GitHub · owner/a",
  });
  assert.equal(storageProviderIdentity({ kind: "github", label: "", repo: "owner/b" }).key, "github:owner/b");
  assert.equal(
    storageProviderIdentity({ kind: "s3", label: "", provider: "backblaze", bucket: "media" }).key,
    "s3:backblaze:media",
  );
  // An unconfigured adapter still gets its own row instead of colliding with a
  // configured one.
  assert.equal(storageProviderIdentity({ kind: "github", label: "" }).key, "github:unset");
});

await check("success records bytes and clears the failure streak", async () => {
  await registerProvider({ key: "github:owner/repo", kind: "github", label: "GitHub media" });
  await recordProviderFailure("github:owner/repo", "403 Forbidden");
  let row = await getProviderHealth("github:owner/repo");
  assert.equal(row?.consecutive_failures, 1);
  assert.equal(row?.last_error, "403 Forbidden");
  assert.ok(row?.cooldown_until === null, "one failure must not start a cooldown");

  await recordProviderSuccess("github:owner/repo", 2048);
  row = await getProviderHealth("github:owner/repo");
  assert.equal(row?.consecutive_failures, 0);
  assert.equal(row?.used_bytes, 2048);
  assert.equal(row?.objects, 1);
  assert.equal(row?.last_error, null);
  assert.equal(row?.success_count, 1);
});

await check("two failures start a cooldown and keep the message", async () => {
  await recordProviderFailure("github:owner/repo", "timeout");
  await recordProviderFailure("github:owner/repo", "second: 500");
  const row = await getProviderHealth("github:owner/repo");
  assert.equal(row?.consecutive_failures, 2);
  // The lifetime counter keeps history; the streak is what drives the cooldown.
  assert.ok((row?.failure_count ?? 0) >= 2);
  assert.ok(row?.cooldown_until, "expected a cooldown");
  assert.equal(providerState(row!), "cooldown");
});

await check("deleting an object gives the bytes back, never goes negative", async () => {
  await recordProviderSuccess("github:owner/repo", 1000);
  await recordProviderRemoval("github:owner/repo", 1000);
  let row = await getProviderHealth("github:owner/repo");
  assert.equal(row?.used_bytes, 2048, "2048 + 1000 - 1000");
  await recordProviderRemoval("github:owner/repo", 999_999);
  row = await getProviderHealth("github:owner/repo");
  assert.equal(row?.used_bytes, 0);
  assert.equal(row?.objects, 0);
});

await check("a quota can be set, reached and cleared", async () => {
  await updateProviderSettings("github:owner/repo", { quota_bytes: 4096 });
  await recordProviderSuccess("github:owner/repo", 4096);
  let row = await getProviderHealth("github:owner/repo");
  assert.equal(row?.quota_bytes, 4096);
  assert.equal(providerState(row!), "quota_exceeded");
  assert.equal(usableNow(row!), false);

  await updateProviderSettings("github:owner/repo", { quota_bytes: null, clear_cooldown: true });
  row = await getProviderHealth("github:owner/repo");
  assert.equal(row?.quota_bytes, null);
  assert.equal(row?.consecutive_failures, 0);
  assert.equal(row?.cooldown_until, null);
});

await check("skips are recorded as a human-readable fallback reason", async () => {
  // A skip never creates a row: it only annotates a provider the uploader saw.
  assert.equal(await getProviderHealth("s3:nowhere:media"), null);
  await registerProvider({ key: "s3:backblaze:media", kind: "s3", label: "B2" });
  await recordProviderSkip("s3:backblaze:media", "upload failed; fell back to GitHub media");
  const row = await getProviderHealth("s3:backblaze:media");
  assert.equal(row?.last_fallback_reason, "upload failed; fell back to GitHub media");
});

await check("syncStorageProviders registers each configured target once", async () => {
  await syncStorageProviders([
    { kind: "github", label: "GitHub 1", repo: "owner/one", enabled: true },
    { kind: "github", label: "GitHub 2", repo: "owner/two", enabled: false },
    { kind: "s3", label: "B2", provider: "backblaze", bucket: "media", enabled: true },
  ]);
  const rows = await listProviderHealth();
  const keys = rows.map((r) => r.provider_key);
  assert.ok(keys.includes("github:owner/one"));
  assert.ok(keys.includes("github:owner/two"));
  assert.ok(keys.includes("s3:backblaze:media"));
  const disabled = rows.find((r) => r.provider_key === "github:owner/two");
  assert.equal(disabled?.enabled, false, "a disabled adapter is visible but excluded");
});

await check("long error text is clamped, control characters stripped", async () => {
  const nasty = "x".repeat(900) + "\n[forged] line";
  await recordProviderFailure("s3:backblaze:media", nasty);
  const row = await getProviderHealth("s3:backblaze:media");
  assert.ok((row?.last_error ?? "").length <= 500);
  assert.equal((row?.last_error ?? "").includes("\n"), false);
});

console.log(`[db] provider-health: ${passed} checks passed`);
process.exit(process.exitCode ?? 0);
