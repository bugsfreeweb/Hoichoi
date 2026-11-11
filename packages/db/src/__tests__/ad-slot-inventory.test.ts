/**
 * Every platform slot the public site renders must have a seeded `ad_slots`
 * row, otherwise it cannot be booked, priced or counted — the slot key would
 * resolve to nothing and the placement would silently never show an ad.
 *
 * This guards the seed SQL, not the DB, so it runs without a database.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { migrationSql } from "../migrations";

let pass = 0;
const failures: string[] = [];

function check(name: string, fn: () => void) {
  try {
    fn();
    pass += 1;
  } catch (err) {
    failures.push(`${name}: ${(err as Error).message}`);
  }
}

/** Slot keys rendered by the web app (grep of `slotKey="…"` + dynamic keys). */
const RENDERED = [
  "home_leaderboard",
  "home_lead_sponsor",
  "home_feed_1",
  "home_feed_2",
  "home_infeed",
  "home_strip",
  "article_leaderboard",
  "article_rect",
  "post_inarticle",
  "post_endcap",
  "post_related_infeed",
  "post_sidebar_sticky",
  "category_top_leaderboard",
  "category_infeed",
  "global_footer_strip",
  "global_mobile_anchor",
];

const seedSql = [
  migrationSql("016_platform_ad_inventory"),
  migrationSql("019_ad_delivery_modes"),
  migrationSql("021_ad_slot_inventory_expansion"),
]
  .filter((s): s is string => Boolean(s))
  .join("\n");

check("seed SQL is readable from the embedded migrations", () => {
  if (!seedSql) throw new Error("no ad_slots seed migrations found");
});

check("every rendered slot key is seeded", () => {
  const missing = RENDERED.filter((key) => !seedSql.includes(`'${key}'`));
  if (missing.length) throw new Error(`missing seed rows: ${missing.join(", ")}`);
});

check("new inventory is platform-first, never an empty house box", () => {
  const sql = migrationSql("021_ad_slot_inventory_expansion");
  if (!sql) throw new Error("021_ad_slot_inventory_expansion is missing");
  const rows = sql.split("\n").filter((line) => line.trim().startsWith("('"));
  if (rows.length < 11) throw new Error(`expected 11 seeded rows, found ${rows.length}`);
  for (const row of rows) {
    if (!row.includes("'platform'")) throw new Error(`row is not platform-only: ${row.slice(0, 60)}`);
  }
});

check("slot keys are unique across the migrations directory", () => {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql"));
  const seen = new Map<string, string>();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    for (const match of sql.matchAll(/\('([a-z0-9_]+)',\s*'[^']*',/g)) {
      const key = match[1]!;
      // Only treat rows from ad_slots seeds as slot keys.
      if (!sql.includes("INSERT OR IGNORE INTO ad_slots")) continue;
      const prev = seen.get(key);
      // Re-seeding the same key in a later migration is legitimate (016 → 019
      // adds delivery_mode), so only flag duplicates inside one file.
      if (prev === file) throw new Error(`duplicate slot key ${key} in ${file}`);
      seen.set(key, file);
    }
  }
  if (seen.size < 16) throw new Error(`only ${seen.size} slot keys seeded, expected at least 16`);
});

// The runtime path matters as much as the migration: ensureSchema is what a
// deployment actually runs, and a rendered key missing from it is a dead slot.
const clientSrc = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "client.ts"),
  "utf8",
);

check("ensureSchema seeds the ad-slot inventory", () => {
  if (!clientSrc.includes("await ensureAdSlotInventory(client)")) {
    throw new Error("ensureAdSlotInventory is not called from ensureSchema");
  }
});

check("runtime inventory covers every rendered slot key", () => {
  const start = clientSrc.indexOf("const AD_SLOT_INVENTORY");
  const end = clientSrc.indexOf("];", start);
  if (start < 0 || end < 0) throw new Error("AD_SLOT_INVENTORY not found");
  const block = clientSrc.slice(start, end);
  const missing = RENDERED.filter((key) => !block.includes(`["${key}"`));
  if (missing.length) throw new Error(`missing runtime seed rows: ${missing.join(", ")}`);
});

if (failures.length) {
  for (const f of failures) console.error(`[test] FAIL ${f}`);
  process.exit(1);
}
console.log(`[test] ad slot inventory checks passed (${pass})`);
