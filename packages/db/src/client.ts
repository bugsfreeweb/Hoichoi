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
    if (fromEnv.startsWith("file:")) {
      const p = fromEnv.slice("file:".length);
      // Absolute POSIX (`file:/...`), absolute Windows (`file:C:\...`,
      // `file:\\server\share`) or a URL the libsql client can handle itself.
      const isAbsolute =
        p.startsWith("/") ||
        p.startsWith("\\") ||
        /^[A-Za-z]:[\\/]/.test(p);
      if (isAbsolute) {
        // fileURLToPath() would read `file:C:/...` as a host name, so normalise
        // absolute Windows paths explicitly before handing them to the client.
        return pathToFileURL(path.resolve(p)).href;
      }
      // Relative `file:./data/ci-hoichoi.db` must resolve against the repo
      // root — fileURLToPath() would otherwise read it from the filesystem root.
      return pathToFileURL(path.join(findRepoRoot(), p)).href;
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
    const parent = path.dirname(dbPath);
    // Windows drive roots can't be mkdir'd; skip when parent == itself.
    if (parent !== dbPath) fs.mkdirSync(parent, { recursive: true });
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
  ["tagline", "TEXT NOT NULL DEFAULT 'ফেসবুকের হৈচৈ — এখন বাংলায়, সাত দিন পর গায়েব'"],
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

/** One-time admin login codes (desktop-issued, no-password web login). */
export async function ensureAdminLoginCodesTable(client: Client): Promise<void> {
  await client.executeMultiple(`
CREATE TABLE IF NOT EXISTS admin_login_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  label TEXT,
  code_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_codes_email ON admin_login_codes (email);
  `);
}

/** Desk/console watchlist columns added to `sources` for the desktop UI. */
const DESK_SOURCE_COLUMNS: Array<[name: string, ddl: string]> = [
  ["kind", "TEXT NOT NULL DEFAULT 'page'"],
  ["fb_id", "TEXT"],
  ["topics", "TEXT NOT NULL DEFAULT '[]'"],
  ["health", "INTEGER NOT NULL DEFAULT 100"],
];

/** Advertisement-slot columns added to `settings` (nullable raw ad HTML). */
const AD_SLOT_COLUMNS: Array<[name: string, ddl: string]> = [
  ["ad_leaderboard_html", "TEXT"],
  ["ad_rect_html", "TEXT"],
  ["ad_infeed_html", "TEXT"],
  ["ad_strip_html", "TEXT"],
];

/**
 * Upgrade helper: adds the `ad_*` columns to an existing `settings` table so the
 * admin can paste ad-network HTML for each slot. Idempotent — safe on fresh DBs.
 */
export async function ensureAdSlotColumns(client: Client): Promise<void> {
  const info = await client.execute("PRAGMA table_info(settings)");
  const existing = new Set(info.rows.map((r) => String((r as Record<string, unknown>).name)));
  for (const [name, ddl] of AD_SLOT_COLUMNS) {
    if (!existing.has(name)) {
      await client.execute(`ALTER TABLE settings ADD COLUMN ${name} ${ddl}`);
    }
  }
}

/**
 * Upgrade helper: adds the desk-watchlist columns (`kind`, `fb_id`, `topics`,
 * `health`) to an existing `sources` table. Idempotent — safe on fresh DBs
 * where the CREATE TABLE may or may not already include them.
 */
export async function ensureDeskColumns(client: Client): Promise<void> {
  const info = await client.execute("PRAGMA table_info(sources)");
  const existing = new Set(info.rows.map((r) => String((r as Record<string, unknown>).name)));
  for (const [name, ddl] of DESK_SOURCE_COLUMNS) {
    if (!existing.has(name)) {
      await client.execute(`ALTER TABLE sources ADD COLUMN ${name} ${ddl}`);
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
  await ensureAdSlotColumns(client);
  await ensureCommentsTable(client);
  await ensureAdminLoginCodesTable(client);
  await ensureDeskColumns(client);
  await seedDefaults(client, nowIso());
}

/**
 * Upgrade helper: creates the `comments` table on databases that were
 * created before the comments-moderation feature. Idempotent — safe on fresh
 * databases where `001_init.sql` already includes the table.
 */
export async function ensureCommentsTable(client: Client): Promise<void> {
  await client.executeMultiple(`
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','blocked')),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
  `);
}