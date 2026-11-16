/**
 * Desk device tokens.
 *
 * The pin that matters: the plaintext token exists only in the create response.
 * A database row can never be turned back into a working token, a revoked device
 * is refused on the next call, and one device's revoke cannot take another down.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { applyMigration, __useClientForTests } from "../client";
import { migrationSql } from "../migrations";
import { createDeskDevice, deskDeviceById, listDeskDevices, revokeDeskDevice, verifyDeskToken } from "../desk-devices";

let passed = 0;
async function check(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const file = path.join(os.tmpdir(), `hoichoi-desk-${Date.now()}.db`);
const client = createClient({ url: `file:${file}` });
__useClientForTests(client);
const sql = migrationSql("036_desk_devices");
assert.ok(sql, "migration 036_desk_devices must exist");
await applyMigration(client, "036_desk_devices", sql);

let officeToken = "";
let officeId = "";

await check("a new token is hdc_-prefixed and long enough to matter", async () => {
  const { device, token } = await createDeskDevice({ email: "a@x.io", label: "অফিসের Windows", createdBy: "a@x.io" });
  officeToken = token;
  officeId = device.id;
  assert.match(token, /^hdc_[0-9a-f]{64}$/);
  assert.equal(device.label, "অফিসের Windows");
});

await check("only the hash is stored, never the token", async () => {
  const rows = (await client.execute("SELECT * FROM desk_devices")).rows as Array<Record<string, unknown>>;
  assert.equal(rows.length, 1);
  const row = rows[0]!;
  assert.equal(String(row.token_hash).includes(officeToken), false);
  assert.equal(String(row.token_hash).length, 64);
  assert.equal(row.prefix, officeToken.slice(0, 6));
});

await check("the token verifies and stamps last use", async () => {
  const res = await verifyDeskToken(officeToken);
  assert.equal(res.ok, true);
  assert.equal(res.device?.id, officeId);
  const device = await deskDeviceById(officeId);
  assert.ok(device?.lastUsedAt, "last_used_at must be set by a successful check");
});

await check("a wrong or foreign token is refused", async () => {
  assert.equal((await verifyDeskToken("hdc_" + "0".repeat(64))).ok, false);
  assert.equal((await verifyDeskToken("not-a-token")).error, "unknown");
});

await check("a revoked device is refused on the very next call", async () => {
  const revoked = await revokeDeskDevice({ id: officeId, by: "a@x.io", reason: "laptop sold" });
  assert.ok(revoked?.revokedAt);
  const res = await verifyDeskToken(officeToken);
  assert.equal(res.ok, false);
  assert.equal(res.error, "revoked");
});

await check("revoking is a stamp, not a delete", async () => {
  const device = await deskDeviceById(officeId);
  assert.ok(device, "the row survives so the record of the machine survives");
  assert.equal(device?.revokedReason, "laptop sold");
  assert.equal(device?.revokedBy, "a@x.io");
});

await check("the list hides revoked devices unless asked", async () => {
  assert.equal((await listDeskDevices()).length, 0);
  assert.equal((await listDeskDevices({ includeRevoked: true })).length, 1);
});

await check("one device's revoke does not touch another", async () => {
  const { device, token } = await createDeskDevice({ email: "b@x.io", label: "ঘরের Mac", createdBy: "a@x.io" });
  assert.equal((await verifyDeskToken(token)).ok, true);
  await revokeDeskDevice({ id: officeId, by: "a@x.io" });
  assert.equal((await verifyDeskToken(token)).ok, true, "the second device is unaffected");
  assert.equal(device.email, "b@x.io");
});

await check("revoking an unknown id is a no-op, not an error", async () => {
  assert.equal(await revokeDeskDevice({ id: "nope", by: "a@x.io" }), null);
});

console.log(`\n${passed} desk-device checks passed.`);
client.close();
try {
  fs.unlinkSync(file);
} catch {
  // temp file
}