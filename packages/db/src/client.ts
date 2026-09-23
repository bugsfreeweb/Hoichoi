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

/**
 * Transactional helper for multi-statement writes.
 *
 * libsql local (file://) connections honour real BEGIN/COMMIT/ROLLBACK
 * transactions, but the HTTP driver (Turso / Vercel edge) executes each
 * statement independently, so `COMMIT`/`ROLLBACK` after a failed run throw
 * `cannot rollback - no transaction is active`. Those bookkeeping statements
 * are best-effort — every write inside `fn` has already been applied — so the
 * end/abort calls swallow the no-transaction error while still surfacing the
 * real cause raised inside `fn`.
 */
export async function withTx<T>(fn: (tx: Client) => Promise<T>): Promise<T> {
  const client = getClient();
  await client.execute("BEGIN").catch(() => {});
  try {
    const out = await fn(client);
    await client.execute("COMMIT").catch(() => {});
    return out;
  } catch (err) {
    await client.execute("ROLLBACK").catch(() => {});
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

/** settings.app_config_json — web-app visibility knobs (quiet JSON blob). */
export async function ensureAppConfigColumn(client: Client): Promise<void> {
  const info = await client.execute("PRAGMA table_info(settings)");
  const existing = new Set(info.rows.map((r) => String((r as Record<string, unknown>).name)));
  if (!existing.has("app_config_json")) {
    await client.execute("ALTER TABLE settings ADD COLUMN app_config_json TEXT");
  }
}

/** Announcements/notifications shown to web visitors (bell + pinned banner). */
export async function ensureNoticesTable(client: Client): Promise<void> {
  await client.executeMultiple(`
CREATE TABLE IF NOT EXISTS notices (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  tone TEXT NOT NULL DEFAULT 'info',
  url TEXT,
  pinned INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  created_by TEXT NOT NULL DEFAULT 'web',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notices_active ON notices (is_active, pinned, updated_at DESC);
  `);
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

/** Seed dot colors for the three built-in categories (#hex, CSS-ready). */
const CATEGORY_DOT_DEFAULTS: Record<string, string> = {
  "child-sexual-abuse": "#2563eb",
  "extramarital-crime": "#d2202c",
  "missing-children": "#0d9488",
};

/**
 * Upgrade helper: adds `category_configs.dot` (category accent color). The
 * column was missing from 001_init.sql, yet every create/update path sends it,
 * so category edits on the desk AND web admin failed with "no such column:
 * dot". Idempotent — safe on databases where 005_category_dot.sql already
 * ran. Backfills seed colors and normalizes any unprefixed hex (e.g. the old
 * "2563eb" seed fallback) to CSS-ready `#hex`.
 */
export async function ensureCategoryDotColumn(client: Client): Promise<void> {
  const info = await client.execute("PRAGMA table_info(category_configs)");
  const existing = new Set(info.rows.map((r) => String((r as Record<string, unknown>).name)));
  if (!existing.has("dot")) {
    await client.execute("ALTER TABLE category_configs ADD COLUMN dot TEXT");
  }
  for (const [slug, hex] of Object.entries(CATEGORY_DOT_DEFAULTS)) {
    await client.execute({
      sql: "UPDATE category_configs SET dot = ? WHERE slug = ? AND (dot IS NULL OR dot = '' OR substr(dot, 1, 1) != '#')",
      args: [hex, slug],
    });
  }
  await client.execute(
    "UPDATE category_configs SET dot = '#' || dot WHERE dot IS NOT NULL AND dot != '' AND substr(dot, 1, 1) != '#'",
  );
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

/**
 * Upgrade helper: adds `settings.footer_about_bn` (editable footer about text)
 * and `category_configs.show_in_footer` (per-category footer visibility).
 * Both are idempotent — safe on databases that already ran migration 009.
 */
export async function ensureFooterColumns(client: Client): Promise<void> {
  const hasCol = async (table: string, col: string): Promise<boolean> => {
    const info = await client.execute(`PRAGMA table_info(${table})`);
    return new Set(info.rows.map((r) => String((r as Record<string, unknown>).name))).has(col);
  };
  if (!(await hasCol("settings", "footer_about_bn"))) {
    await client.execute("ALTER TABLE settings ADD COLUMN footer_about_bn TEXT");
  }
  if (!(await hasCol("category_configs", "show_in_footer"))) {
    await client.execute("ALTER TABLE category_configs ADD COLUMN show_in_footer INTEGER NOT NULL DEFAULT 1");
  }
}

/** Admin login attempts (web + desktop), kept for the admin login-log console. */
export async function ensureLoginLogTable(client: Client): Promise<void> {
  await client.executeMultiple(`
CREATE TABLE IF NOT EXISTS admin_login_log (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  ok INTEGER NOT NULL DEFAULT 0,
  ip TEXT,
  user_agent TEXT,
  message TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_log_created ON admin_login_log (created_at DESC);
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
  await ensureAppConfigColumn(client);
  await ensureNoticesTable(client);
  await ensureCommentsTable(client);
  await ensureCommentsEmailColumn(client);
  await ensureProviderApiKeyColumn(client);
  await ensureProviderHealthColumns(client);
  await ensureDynamicProviderKeys(client);
  await ensureRuntimeProviders(client);
  await ensureReaderReportsTable(client);
  await ensureAdminLoginCodesTable(client);
  await ensureDeskColumns(client);
  await ensureSourceCategoriesTable(client);
  await ensureCategoryDotColumn(client);
  await ensureNoStaticCategoryChecks(client);
  await ensureFooterColumns(client);
  await ensureLoginLogTable(client);
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
 * The rebuild intentionally does NOT use `PRAGMA foreign_keys` or an explicit
 * BEGIN/COMMIT/ROLLBACK: over the libsql HTTP protocol (Turso / Vercel) those
 * are unreliable and the rollback can mask the real error. Each statement
 * auto-commits, and any child rows that ON DELETE CASCADE/SET NULL removes when
 * the parent is dropped are saved to shadow tables first and restored afterwards
 * (`INSERT OR IGNORE`, so the set of rows is correct whether or not foreign keys
 * are actually enabled on the server).
 */
export async function ensureNoStaticCategoryChecks(client: Client): Promise<void> {
  const viewRes = await client.execute("SELECT name, sql FROM sqlite_master WHERE type = 'view'");
  const views = (viewRes.rows as unknown as Array<{ name: string; sql: string }>).filter((v) => v.sql);

  // Direct FK children of each rebuild target (from 001_init.sql) — their rows
  // are saved/restored so the drop never loses data.
  const cascadeChildren: Record<string, string[]> = {
    sources: ["raw_posts", "source_categories", "posts"],
    posts: ["comments", "reader_reports"],
    submitted_pages: [],
  };
  const TARGETS = ["sources", "posts", "submitted_pages"] as const;

  const colListOf = async (t: string): Promise<string> => {
    const info = await client.execute(`PRAGMA table_info(${t})`);
    const cols = info.rows as unknown as Array<{ name: string }>;
    return cols.map((r) => `"${r.name}"`).join(", ");
  };
  const shadow = async (t: string): Promise<void> => {
    const cols = await colListOf(t);
    await client.execute(`DROP TABLE IF EXISTS "__r_${t}"`);
    await client.execute(`CREATE TABLE "__r_${t}" AS SELECT ${cols} FROM ${t}`);
  };
  const unshadow = async (t: string): Promise<void> => {
    await client.execute(`DROP TABLE IF EXISTS "__r_${t}"`);
  };

  try {
    for (const table of ["sources", "posts", "submitted_pages"] as const) {
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

      const children = cascadeChildren[table] ?? [];
      // 1) snapshot the target and every FK child that could lose rows.
      await shadow(table);
      for (const c of children) {
        try {
          await shadow(c);
        } catch {
          /* child table may not exist on this schema */
        }
      }
      // 2) drop the constrained table (child rows cascade/null — restored below).
      await client.execute(`DROP TABLE ${table}`);
      // 3) re-create it without the category CHECK.
      await client.execute(createSql);
      // 4) restore row-for-row from the shadow.
      await client.execute(
        `INSERT INTO ${table} (${colList}) SELECT ${colList} FROM "__r_${table}"`,
      );
      // 5) restore CASCADE-deleted children (IGNORE keeps untouched rows intact).
      for (const c of children) {
        const childCols = await colListOf(c);
        await client.execute(
          `INSERT OR IGNORE INTO ${c} (${childCols}) SELECT ${childCols} FROM "__r_${c}"`,
        );
      }
      // A SET NULL child survives the drop but its reference column is nulled;
      // repair it from the shadow where NULL (only `posts.source_id` uses SET NULL).
      if (table === "sources" && (await hasTable(client, "posts"))) {
        await client.execute(
          `UPDATE posts SET source_id = COALESCE(
             (SELECT "__r_posts".source_id FROM "__r_posts" WHERE "__r_posts".id = posts.id),
             posts.source_id
           ) WHERE posts.source_id IS NULL AND EXISTS (
             SELECT 1 FROM "__r_posts" WHERE "__r_posts".id = posts.id
           )`,
        );
      }
      // 6) rebuild the target's indexes (child indexes were never dropped).
      if (table === "sources") {
        await client.execute("CREATE INDEX IF NOT EXISTS idx_sources_active ON sources (is_active, category)");
      } else if (table === "posts") {
        await client.execute("CREATE INDEX IF NOT EXISTS idx_posts_window ON posts (status, archived_at, published_at)");
        await client.execute("CREATE INDEX IF NOT EXISTS idx_posts_category ON posts (category, status, published_at)");
        await client.execute("CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts (slug)");
      } else if (table === "submitted_pages") {
        await client.execute("CREATE INDEX IF NOT EXISTS idx_submitted_status ON submitted_pages (status, created_at)");
      }
      // 7) drop the shadows — data has been fully restored.
      await unshadow(table);
      for (const c of children) await unshadow(c);
    }
  } finally {
    // Best-effort cleanup of any shadow left by an interrupted earlier run.
    for (const childList of Object.values(cascadeChildren)) {
      for (const t of ["sources", "posts", "submitted_pages", ...childList]) {
        try {
          await unshadow(t);
        } catch {
          /* ignore */
        }
      }
    }
  }

  for (const v of views) {
    await client.execute(`DROP VIEW IF EXISTS "${v.name}"`);
    await client.execute((v.sql as string).replace(/^CREATE\s+VIEW\s+/i, "CREATE VIEW IF NOT EXISTS "));
  }
}

async function hasTable(client: Client, table: string): Promise<boolean> {
  const got = await client.execute({
    sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
    args: [table],
  });
  return got.rows.length > 0;
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

/** Adds llm_providers runtime health columns + the provider_key uniqueness
 *  guard. The resolver persists last ok/error timestamps here so a dead
 *  provider (retired model, bad key) is skipped on the next run instead of
 *  burning the whole fallback chain. Idempotent. */
export async function ensureProviderHealthColumns(client: Client): Promise<void> {
  const info = await client.execute("PRAGMA table_info(llm_providers)");
  const existing = new Set(info.rows.map((r) => String((r as Record<string, unknown>).name)));
  if (!existing.has("last_ok_at")) await client.execute("ALTER TABLE llm_providers ADD COLUMN last_ok_at TEXT");
  if (!existing.has("last_error_at")) await client.execute("ALTER TABLE llm_providers ADD COLUMN last_error_at TEXT");
  if (!existing.has("error_count")) {
    await client.execute("ALTER TABLE llm_providers ADD COLUMN error_count INTEGER NOT NULL DEFAULT 0");
  }
  await client.execute(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_llm_providers_provider_key ON llm_providers (provider_key)",
  );
}

/**
 * Drops the legacy `provider_key IN (...)` CHECK from llm_providers so the
 * admin can register any OpenAI-compatible provider key. Mirrors the proven
 * ensureNoStaticCategoryChecks rebuild: shadow → drop → recreate → restore,
 * keeping every column/default/index intact. No table references llm_providers,
 * so no child rows to conserve.
 */
export async function ensureDynamicProviderKeys(client: Client): Promise<void> {
  const got = await client.execute(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'llm_providers'",
  );
  const sql = String(got.rows[0]?.sql ?? "");
  if (!/CHECK\s*\(\s*provider_key\s+IN\s*\(/i.test(sql)) return;

  const info = await client.execute("PRAGMA table_info(llm_providers)");
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
  const createSql = `CREATE TABLE "llm_providers" (${colDefs.join(", ")}${
    pkCols.length > 1 ? `, PRIMARY KEY (${pkCols.join(", ")})` : ""
  })`;

  await client.execute('DROP TABLE IF EXISTS "__r_llm_providers"');
  await client.execute('CREATE TABLE "__r_llm_providers" AS SELECT * FROM llm_providers');
  try {
    await client.execute("DROP TABLE llm_providers");
    await client.execute(createSql);
    await client.execute(
      `INSERT INTO llm_providers (${colList}) SELECT ${colList} FROM "__r_llm_providers"`,
    );
  } finally {
    await client.execute('DROP TABLE IF EXISTS "__r_llm_providers"');
  }
  await client.execute("CREATE INDEX IF NOT EXISTS idx_providers_active ON llm_providers (is_active, priority)");
  await client.execute(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_llm_providers_provider_key ON llm_providers (provider_key)",
  );
}

/**
 * Extends the free-first fallback chain on existing databases (seedDefaults only
 * inserts on fresh DBs). INSERT OR IGNORE is idempotent via the provider_key
 * unique index; the manifest repair only touches an obviously-broken custom row.
 */
export async function ensureRuntimeProviders(client: Client): Promise<void> {
  await client.executeMultiple(`
INSERT OR IGNORE INTO llm_providers
  (id, provider_key, display_name, base_url, model_name, api_key_env_var,
   priority, is_active, is_free_tier, supports_rewrite, supports_embeddings,
   created_at, updated_at)
VALUES
  ('prov-github-copilot', 'github', 'GitHub Copilot',
   'https://api.githubcopilot.com', 'gpt-4o-mini',
   'GITHUB_COPILOT_TOKEN', 4, 1, 1, 1, 0,
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('prov-github-models', 'github-models', 'GitHub Models',
   'https://models.github.ai/v1', 'gpt-4o-mini',
   'GITHUB_COPILOT_TOKEN', 5, 1, 1, 1, 0,
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('prov-openai-mini', 'openai', 'OpenAI GPT-4o mini',
   NULL, 'gpt-4o-mini',
   'OPENAI_API_KEY', 6, 1, 0, 1, 0,
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('prov-mistral-small', 'mistral', 'Mistral Small',
   NULL, 'mistral-small-latest',
   'MISTRAL_API_KEY', 7, 1, 1, 1, 0,
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('prov-manifest-ai', 'custom', 'Manifest AI',
   'https://app.manifest.build/v1', 'manifest/auto',
   'MANIFEST_API_KEY', 8, 1, 0, 1, 0,
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));
`);
  await client.execute(`
    UPDATE llm_providers
      SET base_url = COALESCE(NULLIF(base_url, ''), 'https://app.manifest.build/v1'),
          display_name = 'Manifest AI',
          model_name = 'manifest/auto',
          api_key_env_var = 'MANIFEST_API_KEY',
          is_free_tier = 0,
          priority = 8,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE provider_key = 'custom'
        AND model_name LIKE 'manifest%'
  `);
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