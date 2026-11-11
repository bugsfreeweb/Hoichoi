/**
 * Guard: `src/migrations.generated.ts` must match `migrations/*.sql`.
 *
 * The generated module is what actually runs in production (Vercel lambdas and
 * the desktop's bundled runner have no migrations directory), so a forgotten
 * regeneration would ship stale schema silently. This test fails loudly and
 * tells you the exact command to fix it.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { EMBEDDED_MIGRATIONS } from "../migrations.generated";

const migrationsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "migrations",
);

const diskFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const diskNames = diskFiles.map((f) => f.replace(/\.sql$/, ""));
const embeddedNames = EMBEDDED_MIGRATIONS.map((m) => m.name);

assert.deepEqual(
  embeddedNames,
  diskNames,
  "migrations.generated.ts is out of date — run `pnpm --filter @hoichoi/db run migrations:embed`",
);

for (const file of diskFiles) {
  const name = file.replace(/\.sql$/, "");
  const diskSql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
  const embedded = EMBEDDED_MIGRATIONS.find((m) => m.name === name);
  assert.ok(embedded, `missing embedded migration: ${name}`);
  assert.equal(
    embedded.sql,
    diskSql,
    `embedded SQL for ${file} differs from the file — run \`pnpm --filter @hoichoi/db run migrations:embed\``,
  );
}

console.log(`migrations-sync: ${diskFiles.length} migration(s) embedded and identical`);
