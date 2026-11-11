/**
 * Migration access that never requires a filesystem.
 *
 * The SQL itself is inlined into `migrations.generated.ts` (regenerate with
 * `pnpm --filter @hoichoi/db run migrations:embed`). A real migrations
 * directory is still honoured when it can be found — that keeps local
 * development working the moment a new `.sql` file is added, before the
 * generated module is refreshed, and keeps the `HOICHOI_MIGRATIONS_DIR`
 * override used by the desktop's staged runner.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { EMBEDDED_MIGRATIONS, type EmbeddedMigration } from "./migrations.generated";

export interface MigrationFile {
  /** File name without the `.sql` suffix (also the `_migrations.name` key). */
  name: string;
  sql: string;
}

/** Absolute path of the migrations directory shipped next to this module. */
export function migrationsDir(): string {
  const override = process.env.HOICHOI_MIGRATIONS_DIR?.trim();
  if (override) return override;
  try {
    return path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");
  } catch {
    return "";
  }
}

/**
 * Read every `.sql` file from `dir` (sorted). Returns `null` when the
 * directory is missing or unreadable, which is the normal case inside a Vercel
 * function or the desktop's single-file runner bundle.
 */
function readMigrationsFromDisk(dir: string): MigrationFile[] | null {
  if (!dir) return null;
  try {
    if (!fs.statSync(dir).isDirectory()) return null;
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((file) => ({
        name: file.replace(/\.sql$/, ""),
        sql: fs.readFileSync(path.join(dir, file), "utf8"),
      }));
  } catch {
    return null;
  }
}

/** Every migration, disk-first (when available) then embedded. */
export function listMigrations(): MigrationFile[] {
  const disk = readMigrationsFromDisk(migrationsDir());
  if (disk && disk.length > 0) return disk;
  return EMBEDDED_MIGRATIONS.map((m) => ({ name: m.name, sql: m.sql }));
}

/** SQL for one migration, or `null` when it does not exist. */
export function migrationSql(name: string): string | null {
  const wanted = name.replace(/\.sql$/, "");
  const disk = readMigrationsFromDisk(migrationsDir());
  const fromDisk = disk?.find((m) => m.name === wanted);
  if (fromDisk) return fromDisk.sql;
  const embedded = EMBEDDED_MIGRATIONS.find((m: EmbeddedMigration) => m.name === wanted);
  return embedded?.sql ?? null;
}

/**
 * SQL for the base schema. Throws a readable error instead of the old opaque
 * ENOENT when the generated module is somehow empty.
 */
export function baseSchemaSql(): string {
  const sql = migrationSql("001_init");
  if (!sql) {
    throw new Error(
      "001_init migration is unavailable — regenerate it with `pnpm --filter @hoichoi/db run migrations:embed`",
    );
  }
  return sql;
}
