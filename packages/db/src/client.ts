import { createClient, type Client, type Config } from "@libsql/client";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { seedDefaults } from "./seed";

let cached: Client | null = null;
let cachedUrl: string | null = null;

/**
 * Repo root finder: walk up from cwd until pnpm-workspace.yaml is found,
 * so local `file:` databases land at `<repo>/data/hoichoi.db` regardless of
 * where a script runs (apps/web, packages/db, apps/scraper).
 */
export function findRepoRoot(start = process.cwd()): string {
  let dir = start;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

export function resolveDatabaseUrl(): string {
  const fromEnv = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  if (fromEnv) {
    // Relative `file:` URLs (e.g. `file:./data/ci-hoichoi.db`) must be resolved
    // against the repo root — fileURLToPath() would treat them as absolute
    // paths from the filesystem root (`/data/...` → EACCES in CI).
    if (fromEnv.startsWith("file:") && !fromEnv.startsWith("file:/")) {
      const abs = path.join(findRepoRoot(), fromEnv.slice("file:".length));
      return pathToFileURL(abs).href;
    }
    return fromEnv;
  }
  return pathToFileURL(path.join(findRepoRoot(), "data", "hoichoi.db")).href;
}

export function databaseUrl(): string {
  return resolveDatabaseUrl();
}

export function getClient(): Client {
  const url = resolveDatabaseUrl();
  if (cached && cachedUrl === url) return cached;
  if (url.startsWith("file:")) {
    const dbPath = fileURLToPath(url);
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const config: Config = { url };
  const token = process.env.TURSO_AUTH_TOKEN;
  if (url.startsWith("libsql://") && token) config.authToken = token;
  cached = createClient(config);
  cachedUrl = url;
  return cached;
}

/** Transactional helper for multi-statement writes. */
export async function withTx<T>(fn: (tx: Client) => Promise<T>): Promise<T> {
  const client = getClient();
  await client.execute("BEGIN");
  try {
    const out = await fn(client);
    await client.execute("COMMIT");
    return out;
  } catch (err) {
    await client.execute("ROLLBACK");
    throw err;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Run a migration SQL file and record it in _migrations so it only runs once.
 */
export async function applyMigration(
  client: Client,
  name: string,
  sqlText: string,
): Promise<boolean> {
  await client.execute(
    "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
  );
  const existing = await client.execute({
    sql: "SELECT 1 FROM _migrations WHERE name = ?",
    args: [name],
  });
  if (existing.rows.length > 0) return false;
  await client.executeMultiple(sqlText);
  await client.execute({
    sql: "INSERT INTO _migrations (name, applied_at) VALUES (?, ?)",
    args: [name, new Date().toISOString()],
  });
  return true;
}

/** Branding columns added in the centralized-settings pass; idempotent on existing DBs. */
const BRANDING_COLUMNS: Array<[name: string, ddl: string]> = [
  ["slogan_bn", "TEXT NOT NULL DEFAULT 'ভাইরাল বাংলা, সপ্তাহখানেক'"],
  ["tagline", "TEXT NOT NULL DEFAULT 'ফেসবুকের হইচই — এখন বাংলায়, সাত দিন পর উবে যায়'"],
  ["logo_url", "TEXT"],
  ["favicon_url", "TEXT"],
  ["accent_color", "TEXT NOT NULL DEFAULT '#d64541'"],
];

/**
 * Upgrade helper: adds the branding columns to an already-existing `settings`
 * table (SQLite auto-backfills rows with the column DEFAULTs). Safe on fresh
 * databases where CREATE TABLE already includes them.
 */
export async function ensureBrandingColumns(client: Client): Promise<void> {
  const info = await client.execute("PRAGMA table_info(settings)");
  const existing = new Set(info.rows.map((r) => String((r as Record<string, unknown>).name)));
  for (const [name, ddl] of BRANDING_COLUMNS) {
    if (!existing.has(name)) {
      await client.execute(`ALTER TABLE settings ADD COLUMN ${name} ${ddl}`);
    }
  }
}

/** Ensure schema exists, then seed base config on a fresh database. */
export async function ensureSchema(client: Client): Promise<void> {
  // Desktop runtime: migrations live next to the bundled console (env override).
  const override = process.env.HOICHOI_MIGRATIONS_DIR;
  let dir: string;
  if (override) {
    dir = override;
  } else {
    const here = path.dirname(fileURLToPath(import.meta.url));
    dir = path.join(here, "..", "migrations");
  }
  const sqlText = fs.readFileSync(path.join(dir, "001_init.sql"), "utf-8");
  await applyMigration(client, "001_init", sqlText);
  await ensureBrandingColumns(client);
  await seedDefaults(client, nowIso());
}