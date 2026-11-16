/**
 * Desktop access is a device, not a credential on a disk.
 *
 * Wiring checks for the two halves: the server hands out a grant only to a live
 * device and never echoes a token from a read, and the desktop actually uses it
 * — a device token must clear any stored Turso credential rather than sit beside
 * it, or "revoke the device" would be a lie while the old credential kept working.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const repo = path.resolve(root, "..", "..");
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), "utf8");
const readRepo = (rel: string): string => fs.readFileSync(path.join(repo, rel), "utf8");

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

const session = read("src/app/api/desk/session/route.ts");
const devices = read("src/app/api/admin/desk-devices/route.ts");
const vault = readRepo("apps/desktop/src/lib/vault.ts");
const deskSession = readRepo("apps/desktop/src/lib/desk-session.ts");
const wizard = readRepo("apps/desktop/src/components/SetupWizard.tsx");

check("a grant requires a bearer device token", () => {
  assert.match(session, /function bearer\(req: Request\)/);
  assert.match(session, /verifyDeskToken\(token\)/);
  assert.match(session, /status: 401/);
});

check("a revoked device is refused with a message a human can act on", () => {
  assert.match(session, /বাতিল হয়েছে/);
});

check("the grant expires", () => {
  assert.match(session, /GRANT_TTL_MS = 60 \* 60_000/);
  assert.match(session, /expiresAt/);
});

check("every grant is audited against the device", () => {
  assert.match(session, /action: "desk\.session\.grant"/);
  assert.match(session, /entityId: device\.id/);
});

check("a plain read never returns the credential", () => {
  const get = session.slice(session.indexOf("export async function GET"), session.indexOf("export async function POST"));
  assert.equal(/url:|token:/.test(get.replace(/deviceToken/g, "")), false);
});

check("the device list is admin-only and never lists tokens", () => {
  assert.match(devices, /requireApiRole\("admin"\)/);
  const get = devices.slice(devices.indexOf("export async function GET"), devices.indexOf("export async function POST"));
  assert.equal(/token:/.test(get), false);
  assert.equal(/token_hash/.test(get), false);
});

check("creating a device audits it and returns the token exactly once", () => {
  assert.match(devices, /action: "desk\.device\.create"/);
  assert.match(devices, /return NextResponse\.json\(\{ ok: true, device, token \}\)/);
});

check("the desktop fetches a grant instead of storing a credential", () => {
  assert.match(deskSession, /\/api\/desk\/session/);
  assert.match(deskSession, /authorization: `Bearer \$\{token\}`/);
  assert.match(deskSession, /REFRESH_MARGIN_MS/);
});

check("a device token clears any stored Turso credential", () => {
  const env = vault.slice(vault.indexOf("export async function getEnvFromVault"));
  const tokenAt = env.indexOf("HOICHOI_DESK_TOKEN");
  const deleteUrl = env.indexOf("delete out.TURSO_DATABASE_URL");
  const deleteToken = env.indexOf("delete out.TURSO_AUTH_TOKEN");
  assert.ok(tokenAt !== -1 && deleteUrl > tokenAt && deleteToken > tokenAt);
  assert.match(env, /fetchDeskGrant\(/);
});

check("a refused grant surfaces as an error, not as an empty database", () => {
  assert.match(vault, /HOICHOI_DESK_GRANT_ERROR/);
  assert.match(readRepo("apps/desktop/src/App.tsx"), /HOICHOI_DESK_GRANT_ERROR/);
});

check("the first-run wizard offers the device token first", () => {
  const step1 = wizard.slice(wizard.indexOf("Step 1/5"), wizard.indexOf("step === 2"));
  assert.match(step1, /ডেস্ক টোকেন/);
  assert.match(step1, /deskToken/);
  assert.match(step1, /deskBaseUrl/);
  assert.ok(step1.indexOf("deskToken") < step1.indexOf("TURSO_AUTH_TOKEN"), "device token must be the default path");
});

console.log(`\n${passed} desk-access wiring checks passed.`);