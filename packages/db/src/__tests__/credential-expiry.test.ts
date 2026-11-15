/**
 * Credential expiry arithmetic.
 *
 * The feature exists to warn *before* a key dies, so the boundaries are the
 * product: exactly `warn_days` left is "due", one day more is "ok", the expiry
 * instant itself is "expired", and a garbage date fails loud instead of turning
 * into a silent "ok".
 */
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { applyMigration } from "../client";
import { migrationSql } from "../migrations";
import { credentialState, credentialsDue, listCredentials, markNotified, shouldNotify, upsertCredential } from "../credentials";

const DAY = 86_400_000;
const T0 = Date.parse("2026-03-01T09:00:00.000Z");
const at = (ms: number) => new Date(ms).toISOString();

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

check("far-future expiry is ok", () => {
  const st = credentialState(at(T0 + 30 * DAY), T0, 7);
  assert.equal(st.state, "ok");
  assert.equal(st.daysLeft, 30);
});

check("7 days left is due, 8 days left is not", () => {
  assert.equal(credentialState(at(T0 + 8 * DAY), T0, 7).state, "ok");
  assert.equal(credentialState(at(T0 + 7 * DAY), T0, 7).state, "due");
});

check("the expiry instant itself is expired", () => {
  assert.equal(credentialState(at(T0), T0, 7).state, "expired");
  assert.equal(credentialState(at(T0 - 1), T0, 7).state, "expired");
});

check("daysLeft goes negative once expired", () => {
  assert.equal(credentialState(at(T0 - 3 * DAY), T0, 7).daysLeft, -3);
});

check("a custom warn window is respected", () => {
  assert.equal(credentialState(at(T0 + 20 * DAY), T0, 30).state, "due");
  assert.equal(credentialState(at(T0 + 20 * DAY), T0, 7).state, "ok");
});

check("a negative warn window cannot silence the warning", () => {
  assert.equal(credentialState(at(T0 + 2 * DAY), T0, -5).state, "ok");
  // 1ms left floors to 0 days: still a warning, not a false "expired".
  assert.equal(credentialState(at(T0 + 1), T0, -5).state, "due");
});

check("an unparseable date fails loud, never silent-ok", () => {
  const st = credentialState("not-a-date", T0, 7);
  assert.equal(st.state, "expired");
  assert.equal(st.expiresAt, null);
});

check("no expiry tracked means no warning", () => {
  assert.equal(credentialState(null, T0, 7).state, "ok");
  assert.equal(credentialState("", T0, 7).state, "ok");
});

check("shouldNotify: due once, then once per day", () => {
  const row = { expires_at: at(T0 + 3 * DAY), warn_days: 7, last_notified_at: null };
  assert.equal(shouldNotify(row, T0), true);
  assert.equal(shouldNotify({ ...row, last_notified_at: at(T0 - 60_000) }, T0), false, "already mailed today");
  assert.equal(shouldNotify({ ...row, last_notified_at: at(T0 - DAY) }, T0), true, "a day has passed");
});

check("shouldNotify: nothing to say when the credential is healthy", () => {
  const row = { expires_at: at(T0 + 40 * DAY), warn_days: 7, last_notified_at: null };
  assert.equal(shouldNotify(row, T0), false);
});

check("shouldNotify: an expired credential keeps warning daily", () => {
  const row = { expires_at: at(T0 - 2 * DAY), warn_days: 7, last_notified_at: at(T0 - 2 * DAY) };
  assert.equal(shouldNotify(row, T0), true);
});

/* ---------- storage round-trip (real database) ---------- */

const client = createClient({ url: ":memory:" });
// 027 alters `llm_providers`, so the base schema has to exist first.
for (const name of ["001_init", "027_credential_expiry"]) {
  const sql = migrationSql(name);
  assert.ok(sql, `migration ${name} must exist`);
  await applyMigration(client, name, sql);
}

await check("a due credential is reported once, then not again the same day", async () => {
  await upsertCredential(
    { name: "GitHub PAT", scope: "vcs", expires_at: new Date(T0 + 3 * DAY).toISOString(), warn_days: 7 },
    client,
  );
  const first = await credentialsDue(T0, client);
  assert.equal(first.length, 1);
  assert.equal(first[0]!.row.name, "GitHub PAT");
  assert.equal(first[0]!.status.state, "due");
  await markNotified([first[0]!.row.id], T0, client);
  assert.equal((await credentialsDue(T0 + 60_000, client)).length, 0, "a second run the same day must be silent");
  assert.equal((await credentialsDue(T0 + 2 * DAY, client)).length, 1, "it must warn again the next day");
});

await check("renewing a credential clears the notification stamp", async () => {
  const renewed = await upsertCredential(
    { name: "GitHub PAT", scope: "vcs", expires_at: new Date(T0 + 90 * DAY).toISOString() },
    client,
  );
  assert.equal(renewed.last_notified_at, null);
  assert.equal((await credentialsDue(T0 + 2 * DAY, client)).length, 0, "a renewed credential is not due");
});

await check("upsert is by name, so renewal updates the row instead of duplicating it", async () => {
  const rows = await listCredentials(client);
  assert.equal(rows.filter((r) => r.name === "GitHub PAT").length, 1);
});

await check("a garbage expiry is rejected at write time", async () => {
  await assert.rejects(() => upsertCredential({ name: "bad", expires_at: "soon" }, client));
  await assert.rejects(() => upsertCredential({ name: "   ", expires_at: new Date(T0).toISOString() }, client));
});

console.log(`[db] credentials: ${passed} checks passed`);
