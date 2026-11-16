/**
 * Advertiser isolation, from the call-site side.
 *
 * The database tests prove the queries are scoped. This proves nobody can call
 * them unscoped: the portal must never reach an admin-wide reader, and a scoped
 * reader must never be called without an argument. Both are one-line mistakes
 * that produce a cross-tenant page and no error, so they are pinned here rather
 * than trusted to review.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(APP, "../..");

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

/** Every .tsx/.ts under a directory, with its text. */
function sources(dir: string): Array<{ file: string; text: string }> {
  const out: Array<{ file: string; text: string }> = [];
  for (const entry of fs.readdirSync(dir, { recursive: true })) {
    const rel = String(entry).replace(/\\/g, "/");
    if (!/\.(ts|tsx)$/.test(rel)) continue;
    out.push({ file: rel, text: fs.readFileSync(path.join(dir, rel), "utf8") });
  }
  return out;
}

const portal = [
  ...sources(path.join(APP, "src/app/portal")),
  ...sources(path.join(APP, "src/components/ads")),
];
const adminAds = [
  ...sources(path.join(APP, "src/app/admin/(console)/ads")),
  ...sources(path.join(APP, "src/components/admin/ads")),
];

const SCOPED = [
  "listAdCreatives",
  "listAdBookings",
  "getAdAnalytics",
  "listAdEvents",
  // Billing is the same rule: the advertiser sees their invoices, nobody else's.
  "listInvoices",
  "invoiceBalance",
  "listPaymentsForClient",
];
const ADMIN_WIDE = [
  "listAllAdCreatives",
  "listAllAdBookings",
  "listAllAdEvents",
  "getAllAdAnalytics",
  "listAdClients",
  "listAllInvoices",
];

check("the portal never imports an admin-wide ad reader", () => {
  const offenders = portal.filter(({ text }) => ADMIN_WIDE.some((name) => new RegExp(`\\b${name}\\b`).test(text)));
  if (offenders.length) {
    throw new Error(
      `admin-wide readers reachable from the advertiser portal: ${offenders.map((o) => o.file).join(", ")}`,
    );
  }
});

check("no scoped reader is called without an argument in the portal", () => {
  const offenders: string[] = [];
  for (const { file, text } of portal) {
    for (const name of SCOPED) {
      // `listAdBookings()` / `getAdAnalytics( )` — an admin dump by omission.
      const bare = new RegExp(`${name}\\(\\s*\\)`, "g");
      if (bare.test(text)) offenders.push(`${file}: ${name}()`);
    }
  }
  if (offenders.length) {
    throw new Error(`called with no client id: ${offenders.join(", ")}`);
  }
});

check("every scoped call in the portal is given the signed-in client", () => {
  for (const { file, text } of portal) {
    for (const name of SCOPED) {
      const calls = text.match(new RegExp(`${name}\\(([^)]*)\\)`, "g")) ?? [];
      for (const call of calls) {
        if (/^[a-zA-Z]+\(client\.id\)$/.test(call)) continue;
        throw new Error(`${file}: ${call} does not pass client.id`);
      }
    }
  }
});

check("the scoped readers require a client id by signature", () => {
  // Two modules, one rule: ads.ts for campaigns, ad-invoices.ts for money.
  const ads = [
    fs.readFileSync(path.join(ROOT, "packages/db/src/ads.ts"), "utf8"),
    fs.readFileSync(path.join(ROOT, "packages/db/src/ad-invoices.ts"), "utf8"),
  ].join("\n");
  for (const name of SCOPED) {
    const signature = ads.match(new RegExp(`export async function ${name}\\(([^)]*)\\)`))?.[1];
    if (signature === undefined) throw new Error(`${name} is missing from packages/db`);
    if (!/clientId: string/.test(signature)) {
      throw new Error(`${name}(${signature}) — a required client id is the whole guard`);
    }
  }
  // Only the readers are pinned this way: `createAdCreative` legitimately takes
  // an optional id so an operator can build an unowned house creative.
  const readersWithOptionalScope = ads.match(/export async function (listAd\w+|getAdAnalytics)\([^)]*clientId\?: string/g);
  if (readersWithOptionalScope) {
    throw new Error(`optional client scope is back: ${readersWithOptionalScope.join(", ")}`);
  }
});

check("the admin console explicitly asks for the platform-wide readers", () => {
  const all = adminAds.map(({ text }) => text).join("\n");
  for (const name of ["listAllAdCreatives", "listAllAdBookings", "getAllAdAnalytics"]) {
    if (!all.includes(name)) throw new Error(`the admin ads console never uses ${name}`);
  }
  // And it must not use the scoped readers with a made-up id.
  for (const name of SCOPED) {
    if (new RegExp(`${name}\\(`).test(all)) {
      throw new Error(`the admin console calls the scoped ${name}; use the All… variant`);
    }
  }
});

check("cross-tenant writes are enforced in the data layer, not only in a form", () => {
  const ads = fs.readFileSync(path.join(ROOT, "packages/db/src/ads.ts"), "utf8");
  const booking = ads.slice(ads.indexOf("export async function createAdBooking"));
  if (!/SELECT 1 AS ok FROM ad_creatives WHERE id = \? AND client_id = \?/.test(booking)) {
    throw new Error("createAdBooking does not check the creative belongs to the client");
  }
  const update = ads.slice(ads.indexOf("export async function updateAdCreative"), ads.indexOf("export async function listAdBookings"));
  if (!/WHERE id = \? AND client_id = \?/.test(update)) {
    throw new Error("updateAdCreative must scope its UPDATE by client_id");
  }
});

check("the database isolation suite exists and covers the leaks", () => {
  const test = fs.readFileSync(path.join(ROOT, "packages/db/src/__tests__/advertiser-isolation.test.ts"), "utf8");
  for (const needle of [
    "an unknown id must return nothing, not everything",
    "B's impression must not appear in A's event list",
    "editing another advertiser's creative is refused",
    "booking another advertiser's creative is refused at the data layer",
  ]) {
    if (!test.includes(needle)) throw new Error(`missing isolation check: ${needle}`);
  }
});

console.log(`[web] advertiser isolation: ${passed} checks passed`);
process.exit(process.exitCode ?? 0);
