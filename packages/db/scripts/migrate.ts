import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { applyMigration, getClient, databaseUrl, nowIso, ensureBrandingColumns, ensureCommentsTable, ensureNoStaticCategoryChecks, ensureCategoryDotColumn } from "../src/client";
import { seedDefaults } from "../src/seed";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, "..", "migrations");

async function main() {
  const client = getClient();
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const vecRows = await client.execute("SELECT name FROM pragma_module_list() WHERE name = 'vec0'");
  const vecSupported = vecRows.rows.length > 0;

  console.log(`hoichoi:db · database: ${databaseUrl()}`);
  for (const file of files) {
    if (file.includes("vec") && !vecSupported) {
      console.log(`  skipped  ${file} (vec0 module not available on this build)`);
      continue;
    }
    const sqlText = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    const applied = await applyMigration(client, file.replace(/\.sql$/, ""), sqlText);
    console.log(`  ${applied ? "applied " : "skipped "} ${file}`);
  }
  const res = await client.execute("SELECT count(*) AS n FROM _migrations");
  console.log(`hoichoi:db · ${res.rows[0]?.n} migrations recorded`);
const seeded = await seedDefaults(client, nowIso());
  console.log(seeded ? "hoichoi:db — seed applied" : "hoichoi:db — already seeded");
  await ensureBrandingColumns(client);
  console.log("hoichoi:db — branding columns ensured");
  await ensureCommentsTable(client);
  console.log("hoichoi:db — comments table ensured");
  await ensureCategoryDotColumn(client);
  console.log("hoichoi:db — category dot column ensured");
  await ensureNoStaticCategoryChecks(client);
  console.log("hoichoi:db — static category CHECKs removed (dynamic categories enabled)");
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});