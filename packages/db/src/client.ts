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

/**
 * Upgrade helper: creates the `source_categories` junction (multi-category
 * sources). Only `db:migrate` applied it before, so fresh DBs created through
 * `ensureSchema` (desktop local file DB, first sync to a Turso DB) missed it.
 * Idempotent — safe on databases that already ran migration 003.
 */
export async function ensureSourceCategoriesTable(client: Client): Promise<void> {
  await client.executeMultiple(`
CREATE TABLE IF NOT EXISTS source_categories (
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL REFERENCES category_configs(slug) ON DELETE CASCADE,
  PRIMARY KEY (source_id, category_slug)
);
CREATE INDEX IF NOT EXISTS idx_source_categories_source ON source_categories (source_id);
CREATE INDEX IF NOT EXISTS idx_source_categories_category ON source_categories (category_slug);
  `);
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
  await ensureCommentsEmailColumn(client);
  await ensureProviderApiKeyColumn(client);
  await ensureReaderReportsTable(client);
  await ensureAdminLoginCodesTable(client);
  await ensureDeskColumns(client);
  await ensureSourceCategoriesTable(client);
  await ensureNoStaticCategoryChecks(client);
  await seedDefaults(client, nowIso());
}

/**
 * Drops the leftover `CHECK (category IN (...))` constraints from `sources`,
 * `posts` and `submitted_pages`. Migration 003 intended to remove them ("category
 * is now dynamic") but SQLite cannot drop column constraints, so NEW categories
 * created in the admin could never be assigned to a source/post. The rebuild
 * copies the exact original schema (PRAGMA table_info) minus the category CHECK,
 * keeping every other constraint/default/index/view intact. Idempotent.
 *
 * Views that reference the rebuilt table are re-created afterwards from the
 * canonical 003/001 definitions, since `DROP TABLE` invalidates them.
 */
export async function ensureNoStaticCategoryChecks(client: Client): Promise<void> {
const viewRes = await client.execute("SELECT name, sql FROM sqlite_master WHERE type = 'view'");
    const views = (viewRes.rows as unknown as Array<{ name: string; sql: string }>).filter((v) => v.sql);

  for (const table of ["sources", "posts", "submitted_pages"]) {
    const got = await client.execute({
      sql: "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
      args: [table],
    });
    const sql = String(got.rows[0]?.sql ?? "");
    if (!/CHECK\s*\(\s*category\s+IN\s*\(/i.test(sql)) continue;

    const info = await client.execute(`PRAGMA table_info(${table})`);
    const rows = info.rows as unknown as Array<{
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }>;
    const pkCols = rows
      .filter((r) => r.pk > 0)
      .sort((a, b) => a.pk - b.pk)
      .map((r) => `"${r.name}"`);
    const colDefs = rows.map((r) => {
      const parts = [`"${r.name}"`, r.type];
      if (r.notnull) parts.push("NOT NULL");
      if (r.dflt_value !== null) parts.push(`DEFAULT ${r.dflt_value}`);
      if (r.pk > 0 && pkCols.length === 1) parts.push("PRIMARY KEY");
      return parts.join(" ");
    });
    const colList = rows.map((r) => `"${r.name}"`).join(", ");
    const createSql = `CREATE TABLE "${table}" (${colDefs.join(", ")}${
      pkCols.length > 1 ? `, PRIMARY KEY (${pkCols.join(", ")})` : ""
    })`;

    // SQLite cannot drop a CHECK; we re-create the table without it. The rebuild
    // must NOT use ALTER RENAME (RENAME validates tokens in other objects, and
    // with the old table dropped the dependent views/foreign keys fail that
    // check), so we double-copy into the final table name.
    await client.execute("PRAGMA foreign_keys = OFF");
    await client.execute("BEGIN");
    try {
      await client.execute(`CREATE TABLE "__rebuild" AS SELECT ${colList} FROM ${table}`);
      await client.execute(`DROP TABLE ${table}`);
      await client.execute(createSql);
      await client.execute(`INSERT INTO ${table} (${colList}) SELECT ${colList} FROM "__rebuild"`);
      await client.execute(`DROP TABLE "__rebuild"`);
      await client.execute("COMMIT");
    } catch (err) {
      await client.execute("ROLLBACK");
      throw err;
    } finally {
      await client.execute("PRAGMA foreign_keys = ON");
    }

    if (table === "sources") {
      await client.execute("CREATE INDEX IF NOT EXISTS idx_sources_active ON sources (is_active, category)");
    } else if (table === "posts") {
      await client.execute("CREATE INDEX IF NOT EXISTS idx_posts_window ON posts (status, archived_at, published_at)");
      await client.execute("CREATE INDEX IF NOT EXISTS idx_posts_category ON posts (category, status, published_at)");
      await client.execute("CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts (slug)");
    } else if (table === "submitted_pages") {
      await client.execute("CREATE INDEX IF NOT EXISTS idx_submitted_status ON submitted_pages (status, created_at)");
    }
  }

  for (const v of views) {
    await client.execute(`DROP VIEW IF EXISTS "${v.name}"`);
    await client.execute((v.sql as string).replace(/^CREATE\s+VIEW\s+/i, "CREATE VIEW IF NOT EXISTS "));
  }
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

/** Adds comments.email (public form) to older databases. Idempotent. */
export async function ensureCommentsEmailColumn(client: Client): Promise<void> {
  const info = await client.execute("PRAGMA table_info(comments)");
  const existing = new Set(info.rows.map((r) => String((r as Record<string, unknown>).name)));
  if (!existing.has("email")) {
    await client.execute("ALTER TABLE comments ADD COLUMN email TEXT");
  }
}

/** Adds llm_providers.api_key (admin-entered override). Idempotent. */
export async function ensureProviderApiKeyColumn(client: Client): Promise<void> {
  const info = await client.execute("PRAGMA table_info(llm_providers)");
  const existing = new Set(info.rows.map((r) => String((r as Record<string, unknown>).name)));
  if (!existing.has("api_key")) {
    await client.execute("ALTER TABLE llm_providers ADD COLUMN api_key TEXT");
  }
}

/** Reader report queue (public form → admin). Idempotent. */
export async function ensureReaderReportsTable(client: Client): Promise<void> {
  await client.executeMultiple(`
CREATE TABLE IF NOT EXISTS reader_reports (
  id TEXT PRIMARY KEY,
  post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  reporter_name TEXT NOT NULL,
  reporter_email TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed')),
  created_at TEXT NOT NULL,
  reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_reader_reports_status ON reader_reports (status, created_at);
CREATE INDEX IF NOT EXISTS idx_reader_reports_post ON reader_reports (post_id);
  `);
}