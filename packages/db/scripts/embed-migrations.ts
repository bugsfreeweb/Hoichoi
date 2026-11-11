/**
 * Generate `packages/db/src/migrations.generated.ts` from the .sql files.
 *
 * Why embed the SQL at all? `ensureSchema` used to read `001_init.sql` from
 * disk with a path relative to the *module* (`packages/db/src/../migrations`).
 * That works in a checkout, but breaks wherever only the built JavaScript is
 * shipped:
 *
 *   - Vercel serverless functions only include files Next traced into the
 *     function bundle, so `/vercel/path0/packages/db/migrations/001_init.sql`
 *     did not exist at request time and the web admin answered
 *     "ENOENT: no such file or directory" when adding an AI provider;
 *   - the desktop's staged runner is an esbuild bundle (`cli.cjs`), and any
 *     stray file copy miss has the same effect.
 *
 * Turning the migrations into a TypeScript module makes schema setup pure
 * code — it works from a lambda, a bundled CLI, or a plain checkout, with no
 * filesystem assumptions. `scripts/migrate.ts` still prefers a real directory
 * when one is present, so adding a new `.sql` never requires regenerating this
 * first (CI's `migrations-sync` test does flag the drift).
 *
 * Usage:
 *   pnpm --filter @hoichoi/db run migrations:embed
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, "..", "migrations");
const outFile = path.resolve(here, "..", "src", "migrations.generated.ts");

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const entries = files.map((file) => {
  const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
  const name = file.replace(/\.sql$/, "");
  return `  {\n    name: ${JSON.stringify(name)},\n    sql: ${JSON.stringify(sql)},\n  },`;
});

const body = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Regenerate with: pnpm --filter @hoichoi/db run migrations:embed
 *
 * Every migration in \`packages/db/migrations\` is inlined here so schema setup
 * never depends on the filesystem (Vercel lambdas, the desktop's bundled
 * runner, and CI all run the same SQL). The \`migrations-sync\` test fails if
 * this file drifts from the .sql sources.
 */
export interface EmbeddedMigration {
  /** File name without the \`.sql\` suffix — also the \`_migrations.name\` key. */
  name: string;
  sql: string;
}

export const EMBEDDED_MIGRATIONS: readonly EmbeddedMigration[] = [
${entries.join("\n")}
];
`;

fs.writeFileSync(outFile, body, "utf8");
console.log(`[db] embedded ${files.length} migration(s) -> ${path.relative(process.cwd(), outFile)}`);
