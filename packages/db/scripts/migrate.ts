import {
  applyMigration,
  getClient,
  databaseUrl,
  nowIso,
  ensureBrandingColumns,
  ensureCommentsTable,
  ensureNoStaticCategoryChecks,
  ensureCategoryDotColumn,
  ensureProviderApiKeyColumn,
  ensureProviderPurposeColumn,
  ensureProviderMultiKey,
  ensureProviderHealthColumns,
  ensureDynamicProviderKeys,
  ensureRuntimeProviders,
  ensureSectionsTable,
  ensureDefaultVariantColumn,
  ensureLiveEventTables,
} from "../src/client";
import { seedDefaults } from "../src/seed";
import { listMigrations } from "../src/migrations";

async function main() {
  const client = getClient();
  // Migrations come from the embedded module (see src/migrations.ts), so this
  // works from a Vercel build step, a bundled desktop runner, or a checkout
  // with no `packages/db/migrations` directory on disk.
  const files = listMigrations();

  const vecRows = await client.execute("SELECT name FROM pragma_module_list() WHERE name = 'vec0'");
  const vecSupported = vecRows.rows.length > 0;

  console.log(`hoichoi:db · database: ${databaseUrl()}`);
  for (const file of files) {
    if (file.name.includes("vec") && !vecSupported) {
      console.log(`  skipped  ${file.name}.sql (vec0 module not available on this build)`);
      continue;
    }
    const applied = await applyMigration(client, file.name, file.sql);
    console.log(`  ${applied ? "applied " : "skipped "} ${file.name}.sql`);
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
  await ensureProviderApiKeyColumn(client);
  await ensureProviderPurposeColumn(client);
  await ensureProviderMultiKey(client);
  await ensureProviderHealthColumns(client);
  console.log("hoichoi:db — provider health columns ensured");
  await ensureDynamicProviderKeys(client);
  console.log("hoichoi:db — provider_key CHECK removed (custom providers enabled)");
  await ensureRuntimeProviders(client);
  console.log("hoichoi:db — free-first provider chain ensured");
  await ensureSectionsTable(client);
  await ensureDefaultVariantColumn(client);
  console.log("hoichoi:db — section variant engine ensured");
  await ensureLiveEventTables(client);
  console.log("hoichoi:db — live-event tables ensured");
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});