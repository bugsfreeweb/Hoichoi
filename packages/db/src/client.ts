import { createClient, type Client, type Config } from "@libsql/client";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { seedDefaults } from "./seed";
import { CATEGORY_SEED, GENERAL_CATEGORY_SEED, pickCategoryDot } from "./rows";

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

/**
 * Section variant engine (scaffold). `sections` holds the per-section variant
 * choice for the public site; the shipped design is always `variant = 'default'`,
 * and the field is reserved for the optional mockup variants. `settings.default_variant`
 * records the site-wide default. Purely additive — nothing reads it unless the
 * admin switches a section away from `default`.
 */
export async function ensureSectionsTable(client: Client): Promise<void> {
  await client.executeMultiple(`
CREATE TABLE IF NOT EXISTS sections (
  key TEXT PRIMARY KEY,
  variant TEXT NOT NULL DEFAULT 'default',
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  config_json TEXT,
  updated_at TEXT
);
  `);
}

/** Upgrade helper: adds `settings.default_variant` on existing databases. */
export async function ensureDefaultVariantColumn(client: Client): Promise<void> {
  const info = await client.execute("PRAGMA table_info(settings)");
  const existing = new Set(info.rows.map((r) => String((r as Record<string, unknown>).name)));
  if (!existing.has("default_variant")) {
    await client.execute("ALTER TABLE settings ADD COLUMN default_variant TEXT NOT NULL DEFAULT 'default'");
  }
}

/** Desk/console watchlist columns added to `sources` for the desktop UI. */
const DESK_SOURCE_COLUMNS: Array<[name: string, ddl: string]> = [
  ["kind", "TEXT NOT NULL DEFAULT 'page'"],
  ["fb_id", "TEXT"],
  ["topics", "TEXT NOT NULL DEFAULT '[]'"],
  ["health", "INTEGER NOT NULL DEFAULT 100"],
  // Source platform: facebook | x | news | magazine | social | other. Pages and
  // groups keep `kind`; everything non-Facebook is fetched by URL/feed.
  ["platform", "TEXT NOT NULL DEFAULT 'facebook'"],
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

/**
 * Idempotently seed the general editorial categories.
 *
 * `seedDefaults` only writes category rows on a FRESH database, so existing
 * (production, synced, or desktop) databases would never gain the general
 * categories — and without them the classifier has no target slugs for the
 * helping/inspiration/etc. posts it keeps detecting. `INSERT OR IGNORE` keeps
 * this safe to run on every `ensureSchema`/startup/deploy.
 */
export async function ensureGeneralCategories(client: Client): Promise<void> {
  const now = new Date().toISOString();
  for (const cat of GENERAL_CATEGORY_SEED) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO category_configs
        (slug, display_name_bn, display_name_en, description_bn, description_en,
         is_active, sort_order, dot, config, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
      args: [
        cat.slug,
        cat.displayNameBn,
        cat.displayNameEn,
        cat.descriptionBn,
        cat.descriptionEn,
        cat.sortOrder,
        `#${cat.dot}`,
        JSON.stringify({
          requires_double_approval: false,
          show_content_warning: false,
          auto_pending_review: false,
          redaction_strict: "standard",
          allow_identifying_details: true,
          use_allegation_language: false,
          keywords: cat.keywords,
        }),
        now,
        now,
      ],
    });
  }
}

/** Seed dot colors for the three built-in categories (#hex, CSS-ready). */
const CATEGORY_DOT_DEFAULTS: Record<string, string> = {
  "child-sexual-abuse": "#2563eb",
  "extramarital-crime": "#d2202c",
  "missing-children": "#0d9488",
};

/**
 * Keyword seed defaults for the three built-in categories. These mirror
 * `CATEGORY_SEED.config.keywords` for FRESH databases created through (001
 * migrations run in `ensureSchema` on empty DBs).
 *
 * Holder for the upgrade backfill: the classifier reads keywords ONLY from
 * `category_configs.config.keywords`, and both the web admin and the desktop
 * desk edit that field, so a hard-coded profile in the runner could never be
 * tuned without a deploy. Existing databases stored configs without the field,
 * so the seed list must be written into the row ONCE; afterwards operator edits
 * win and this never runs again for a filled list.
 */
export async function ensureCategoryKeywords(client: Client): Promise<void> {
  const now = new Date().toISOString();
  const defaults = new Map<string, string[]>();
  for (const c of CATEGORY_SEED) {
    const kw = (c.config as { keywords?: string[] }).keywords;
    if (kw && kw.length) defaults.set(c.slug, kw);
  }
  for (const c of GENERAL_CATEGORY_SEED) {
    if (c.keywords && c.keywords.length) defaults.set(c.slug, c.keywords);
  }
  const rows = await client.execute("SELECT slug, config FROM category_configs");
  for (const row of rows.rows) {
    const slug = String(row.slug);
    const kw = defaults.get(slug);
    if (!kw || kw.length === 0) continue;
    let cfg: Record<string, unknown> = {};
    try {
      cfg = JSON.parse(String((row as Record<string, unknown>).config ?? "{}")) as Record<string, unknown>;
    } catch {
      cfg = {};
    }
    const existing = Array.isArray(cfg.keywords) ? (cfg.keywords as unknown[]) : [];
    if (existing.some((k) => typeof k === "string" && (k as string).trim())) continue;
    cfg.keywords = kw;
    await client.execute({
      sql: "UPDATE category_configs SET config = ?, updated_at = ? WHERE slug = ?",
      args: [JSON.stringify(cfg), now, slug],
    });
  }
}

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
  // Admin-created categories from before the color era have no `dot`. Give each
  // a deterministic palette pick (least-used first) so no section renders with
  // a dead dark chip. Idempotent: empty dots only, operator colors untouched.
  const colorlessRes = await client.execute("SELECT slug FROM category_configs WHERE dot IS NULL OR dot = ''");
  const colorless = colorlessRes.rows.map((r) => String(r.slug));
  if (colorless.length > 0) {
    const takenRes = await client.execute("SELECT dot FROM category_configs WHERE dot IS NOT NULL AND dot <> ''");
    const taken = takenRes.rows.map((r) => String(r.dot));
    for (const [i, slug] of colorless.entries()) {
      await client.execute({
        sql: "UPDATE category_configs SET dot = ? WHERE slug = ?",
        args: [pickCategoryDot([...taken, ...colorless.slice(0, i)]), slug],
      });
    }
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

/** Scrape/upload failures per source — the error-inbox backing table. */
export async function ensureSourceErrorsTable(client: Client): Promise<void> {
  await client.executeMultiple(`
CREATE TABLE IF NOT EXISTS source_errors (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  err_kind TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_source_errors_status ON source_errors (status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_source_errors_source ON source_errors (source_id);
  `);
}

/** Settings column holding the serialized media-storage policy (JSON). */
export async function ensureMediaStorageColumn(client: Client): Promise<void> {
  const info = await client.execute("PRAGMA table_info(settings)");
  const existing = new Set(info.rows.map((r) => String((r as Record<string, unknown>).name)));
  if (!existing.has("media_storage_json")) {
    await client.execute("ALTER TABLE settings ADD COLUMN media_storage_json TEXT");
  }
}

/**
 * Remote media object registry — one row per uploaded blob so the monthly
 * retention job can delete old objects even after their `posts` row is gone.
 */
export async function ensureMediaObjectsTable(client: Client): Promise<void> {
  await client.executeMultiple(`
CREATE TABLE IF NOT EXISTS media_objects (
  id TEXT PRIMARY KEY,
  adapter TEXT NOT NULL,
  key TEXT NOT NULL,
  url TEXT NOT NULL,
  post_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_objects_adapter ON media_objects (adapter, created_at);
CREATE INDEX IF NOT EXISTS idx_media_objects_url ON media_objects (url);
  `);
}

/**
 * First-party, cookie-less traffic telemetry: one row per page view plus ad
 * slot view/click rows. No raw IP is ever stored — the route hashes IP+UA+day
 * into `visitor_id` before insert, and `session_id` is a per-tab random id.
 * Aggregated by `trafficSnapshot` for the admin analytics groups.
 */
export async function ensureTrafficTables(client: Client): Promise<void> {
  await client.executeMultiple(`
CREATE TABLE IF NOT EXISTS page_views (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  post_id TEXT,
  post_slug TEXT,
  session_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  country TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  os TEXT,
  browser TEXT,
  device TEXT,
  referrer TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views (created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_post ON page_views (post_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views (session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views (visitor_id);

CREATE TABLE IF NOT EXISTS ad_events (
  id TEXT PRIMARY KEY,
  slot TEXT NOT NULL,
  event TEXT NOT NULL DEFAULT 'view' CHECK (event IN ('view','click')),
  post_id TEXT,
  path TEXT,
  session_id TEXT,
  visitor_id TEXT,
  country TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ad_events_created ON ad_events (created_at);
CREATE INDEX IF NOT EXISTS idx_ad_events_slot ON ad_events (slot);
CREATE INDEX IF NOT EXISTS idx_ad_events_post ON ad_events (post_id);
  `);
}

let lastSchemaSig: string | null = null;

/**
 * Ensure schema exists, then seed base config on a fresh database.
 *
 * Memoized: the full migration set is only re-run when the target database
 * (URL) or the migrations directory changes. The desktop keeps ONE runner
 * process alive and calls this before every desk action, so skipping the
 * idempotent PRAGMA/ALTER/INSERT storm (many HTTP round-trips over libsql)
 * turns the hot path from ~100s of network calls into a single local compare.
 *
 * `externalUrl` lets callers vouch for a DIFFERENT database than the one
 * `process.env` currently points at (e.g. the `sync` target client); without
 * it the signature would be computed from the live env and wrongly skip/fire
 * against the local database.
 */
export async function ensureSchema(client: Client, externalUrl?: string): Promise<void> {
  const override = process.env.HOICHOI_MIGRATIONS_DIR;
  const sig = `${externalUrl ?? resolveDatabaseUrl()}::${override ?? ""}`;
  if (lastSchemaSig === sig) return;
  const resolvedDir = override
    ? override
    : path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");
  const sqlText = fs.readFileSync(path.join(resolvedDir, "001_init.sql"), "utf-8");
  await applyMigration(client, "001_init", sqlText);
  await ensureBrandingColumns(client);
  await ensureAdSlotColumns(client);
  await ensureAppConfigColumn(client);
  await ensureNoticesTable(client);
  await ensureCommentsTable(client);
  await ensureCommentsEmailColumn(client);
  await ensureCommentsDislikesColumn(client);
  await ensureProviderApiKeyColumn(client);
  await ensureProviderPurposeColumn(client);
  await ensureProviderMultiKey(client);
  await ensureProviderHealthColumns(client);
  await ensureDynamicProviderKeys(client);
  await ensureRuntimeProviders(client);
  await ensureReaderReportsTable(client);
  await ensureMaintenanceTables(client);
  await ensureAdminLoginCodesTable(client);
  await ensureDeskColumns(client);
  await ensureSourceCategoriesTable(client);
  await ensureCategoryDotColumn(client);
  await ensureNoStaticCategoryChecks(client);
  await ensureFooterColumns(client);
  await ensureLoginLogTable(client);
  await ensureSourceErrorsTable(client);
  await ensureMediaStorageColumn(client);
  await ensureMediaObjectsTable(client);
  await ensureTrafficTables(client);
  await ensureSectionsTable(client);
  await ensureDefaultVariantColumn(client);
  await seedDefaults(client, nowIso());
  await ensureGeneralCategories(client);
  await ensureCategoryKeywords(client);
  lastSchemaSig = sig;
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

  // The rebuild above reconstructs column definitions from PRAGMA table_info,
  // which cannot express UNIQUE — so `sources.page_url` silently lost its
  // uniqueness and the same page could be added again under a new id, showing
  // up as a duplicate row in Settings > Source and in the Watchlist. Re-assert
  // it as a unique index (works on already-rebuilt tables too) and merge any
  // duplicates that slipped in before the index existed.
  await ensureUniqueSourceUrls(client);

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
 * One row per Facebook page.
 *
 * `sources.page_url` used to be `UNIQUE`, but the legacy-schema rebuild in
 * `ensureNoStaticCategoryChecks` rebuilds the table from `PRAGMA table_info`
 * and cannot carry a UNIQUE clause, and the insert path had no existence check
 * either. The result was the same page stored 2-3 times under different ids —
 * visible as duplicate cards in Settings > Source and duplicate rows in the
 * Watchlist, and it fanned posts across several source records.
 *
 * This merges the extras into the oldest row (repointing children and folding
 * the multi-valued `source_categories` junction together) and then installs a
 * unique index so it cannot happen again.
 */
export async function ensureUniqueSourceUrls(client: Client): Promise<{ merged: number }> {
  if (!(await hasTable(client, "sources"))) return { merged: 0 };

  const dupes = await client.execute(
    `SELECT page_url FROM sources GROUP BY page_url HAVING COUNT(*) > 1`,
  );
  let merged = 0;

  for (const row of dupes.rows) {
    const pageUrl = String(row.page_url);
    // Keep the oldest row as the survivor so created_at ordering stays stable.
    const group = await client.execute({
      sql: `SELECT id, is_active, is_verified FROM sources
            WHERE page_url = ? ORDER BY created_at ASC, rowid ASC`,
      args: [pageUrl],
    });
    const ids = group.rows.map((r) => String(r.id));
    const keep = ids[0];
    if (!keep) continue;
    const drop = ids.slice(1);
    if (drop.length === 0) continue;

    const active = group.rows.some((r) => Number(r.is_active) === 1);
    const verified = group.rows.some((r) => Number(r.is_verified) === 1);
    await client.execute({
      sql: `UPDATE sources SET is_active = ?, is_verified = ? WHERE id = ?`,
      args: [active ? 1 : 0, verified ? 1 : 0, keep],
    });

    for (const dead of drop) {
      // source_categories is keyed (source_id, category_slug), so its rows
      // cannot simply be re-pointed: the survivor may already hold that slug
      // and the UPDATE would trip the PK. Fold them into the union first,
      // then drop what the duplicate owned.
      if (await hasTable(client, "source_categories")) {
        await client.execute({
          sql: `INSERT OR IGNORE INTO source_categories (source_id, category_slug)
                SELECT ?, category_slug FROM source_categories WHERE source_id = ?`,
          args: [keep, dead],
        });
        await client.execute({ sql: `DELETE FROM source_categories WHERE source_id = ?`, args: [dead] });
      }
      // Repoint the remaining children so no post/raw row is lost.
      for (const child of ["raw_posts", "posts", "source_errors"] as const) {
        if (!(await hasTable(client, child))) continue;
        try {
          await client.execute({ sql: `UPDATE ${child} SET source_id = ? WHERE source_id = ?`, args: [keep, dead] });
        } catch {
          /* child without a source_id column */
        }
      }
      await client.execute({ sql: `DELETE FROM sources WHERE id = ?`, args: [dead] });
      merged += 1;
    }
  }

  await client.execute(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_sources_page_url ON sources (page_url)",
  );
  return { merged };
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
  dislikes INTEGER NOT NULL DEFAULT 0,
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

/** Adds comments.dislikes (reader vote) to older databases. Idempotent. */
export async function ensureCommentsDislikesColumn(client: Client): Promise<void> {
  const info = await client.execute("PRAGMA table_info(comments)");
  const existing = new Set(info.rows.map((r) => String((r as Record<string, unknown>).name)));
  if (!existing.has("dislikes")) {
    await client.execute("ALTER TABLE comments ADD COLUMN dislikes INTEGER NOT NULL DEFAULT 0");
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

/** Adds llm_providers.purpose (text | image). Idempotent. */
export async function ensureProviderPurposeColumn(client: Client): Promise<void> {
  const info = await client.execute("PRAGMA table_info(llm_providers)");
  const existing = new Set(info.rows.map((r) => String((r as Record<string, unknown>).name)));
  if (!existing.has("purpose")) {
    await client.execute("ALTER TABLE llm_providers ADD COLUMN purpose TEXT NOT NULL DEFAULT 'text'");
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
}

/** Drop unique constraint on provider_key to allow multiple keys per provider_key (multi-key mode). */
export async function ensureProviderMultiKey(client: Client): Promise<void> {
  await client.execute("DROP INDEX IF EXISTS idx_llm_providers_provider_key");
  await client.execute(
    "CREATE INDEX IF NOT EXISTS idx_llm_providers_provider_key_purpose ON llm_providers (provider_key, purpose)",
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

/**
 * Maintenance-screen inbox: `maintenance_subscribers` (newsletter drops) and
 * `maintenance_messages` (contact submits while the press is down). Idempotent.
 */
export async function ensureMaintenanceTables(client: Client): Promise<void> {
  await client.executeMultiple(`
CREATE TABLE IF NOT EXISTS maintenance_subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  locale TEXT NOT NULL DEFAULT 'bn',
  via TEXT NOT NULL DEFAULT 'maintenance',
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_maintenance_subscribers_email
  ON maintenance_subscribers (email);

CREATE TABLE IF NOT EXISTS maintenance_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  topic TEXT,
  body TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'bn',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','archived')),
  created_at TEXT NOT NULL,
  reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_maintenance_messages_status ON maintenance_messages (status, created_at);
  `);
}