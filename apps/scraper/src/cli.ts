import { Command } from "commander";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createInterface } from "node:readline";
import { runPipeline, type PipelineOptions } from "./pipeline";
import { runArchivePass } from "./archive";
import { cleanupMedia, storageRegistryCount } from "./storage";
import { backfillMissingMedia, recoverOrphanedMedia, syncExistingMediaToWeb } from "./media-backfill";
import { isVideoUrl } from "./media";
import { newResolver } from "@hoichoi/llm";
import {
  getClient,
  ensureSchema,
  getSettings,
  updateSettings,
  gatherExportBundle,
  applyImportBundle,
  encryptJson,
  decryptJson,
  resetContent,
  makeSyncClients,
  copyTables,
  getMediaStorageConfig,
  saveMediaStorageConfig,
  listSourceErrors,
  setSourceErrorStatus,
  createAdminLoginCode,
  listAdminLoginCodes,
  revokeAdminLoginCode,
  revokeAdminSessionsByEmail,
  revokeAdminLoginCodesByEmail,
  statsSnapshot,
  recentPipelineRuns,
  radarSnapshot,
  getAllComments,
  setCommentStatus,
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  listNotices,
  getNotice,
  createNotice,
  updateNotice,
  deleteNotice,
  updatePostStatus,
  getPostById,
  updatePost,
  deletePost,
  bulkModeratePosts,
  bulkDeletePosts,
  listLoginLog,
  deleteLoginLog,
  clearLoginLog,
  mapProvider,
  nowIso,
  CONTENT_TABLES,
  type ExportBundle,
  listPostMediaCandidates,
  type PostUpdateFields,
} from "@hoichoi/db";
import { PROCESSOR_ENV_DEFAULTS, type CategorySlug, type MediaStorageConfig, type NoticeTone, type ProviderKey, type SiteSettings } from "@hoichoi/shared-types";

/** Structural match for @libsql/client's InValue (avoids pulling the dep into scraper). */
type SqlValue = null | string | number | bigint | Uint8Array | ArrayBuffer;

const program = new Command();

/**
 * Read stdin, but only when something is actually piped into us. A TTY or an
 * empty/closed pipe resolves to `null` so callers can fall back to argv/env
 * without hanging.
 *
 * `allow` gates the read: in daemon mode stdin carries the JSON request
 * protocol, so draining it here would swallow the next command. Only an
 * explicit opt-in may consume it.
 */
async function readStdinIfPiped(allow: boolean): Promise<string | null> {
  if (!allow) return null;
  if (process.stdin.isTTY) return null;
  const chunks: Buffer[] = [];
  try {
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  } catch {
    return null;
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text.length > 0 ? text : null;
}

program
  .name("hoichoi-scraper")
  .description("হৈচৈ auto-curation pipeline — scrape, dedup, rewrite, archive")
  .version("1.0.0");

program
  .command("scrape")
  .description("run the full scrape → rewrite → dedup pipeline")
  .option("--mock", "generate sample posts instead of live FB scraping (offline dev/demo)")
  .option("--max-sources <n>", "limit number of sources", "30")
  .option("--max-posts <n>", "limit posts per source", "200")
  .option("--evidence", "capture full-page screenshots as moderation evidence")
  .action(async (opts: { mock?: boolean; maxSources?: string; maxPosts?: string; evidence?: boolean }) => {
    const options: PipelineOptions = {
      mock: opts.mock ?? (process.env.HOICHOI_MOCK === "1"),
      maxSources: Number(opts.maxSources),
      maxPosts: Number(opts.maxPosts),
      evidence: opts.evidence ?? false,
    };
    try {
      await ensureSchema(getClient());
      await runPipeline(options);
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command("archive")
  .description("auto-rollover the 7-day window + purge past retention")
  .action(async () => {
    try {
      await ensureSchema(getClient());
      const report = await runArchivePass();
      console.log(JSON.stringify(report, null, 2));
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command("purge")
  .description("hard-delete archived content past archive_retention_days")
  .action(async () => {
    try {
      await ensureSchema(getClient());
      const { purgeExpired } = await import("./archive");
      const report = await purgeExpired((m) => console.log(m));
      console.log(JSON.stringify(report, null, 2));
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command("settings")
  .description("print the current site settings (branding + cadence) as JSON")
  .action(async () => {
    try {
      await ensureSchema(getClient());
      console.log(JSON.stringify({ settings: await getSettings() }, null, 2));
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

const SETTING_KEYS: Array<keyof SiteSettings> = [
  "pipeline_hours",
  "site_name",
  "contact_email",
  "police_helpline",
  "child_helpline",
  "archive_visible_days",
  "archive_retention_days",
  "slogan_bn",
  "tagline",
  "logo_url",
  "favicon_url",
  "accent_color",
  "ad_leaderboard_html",
  "ad_rect_html",
  "ad_infeed_html",
  "ad_strip_html",
  "app_config_json",
];

program
  .command("settings:set <assign...>")
  .description('update site settings — e.g. settings:set "site_name=হৈচৈ" "slogan_bn=..." "accent_color=#d64541"')
  .action(async (assigns: string[]) => {
    try {
      await ensureSchema(getClient());
      const fields: Partial<SiteSettings> = {};
      for (const a of assigns) {
        const eq = a.indexOf("=");
        if (eq <= 0) throw new Error(`expected field=value, got: ${a}`);
        const k = a.slice(0, eq) as keyof SiteSettings;
        const v = a.slice(eq + 1);
        if (!SETTING_KEYS.includes(k)) throw new Error(`unknown settings field: ${k}`);
        if (k === "pipeline_hours" || k === "archive_visible_days" || k === "archive_retention_days") {
          (fields as Record<string, number>)[k] = Number(v);
        } else {
          (fields as Record<string, string>)[k] = v;
        }
      }
      await updateSettings(fields);
      console.log(JSON.stringify({ ok: true, fields: Object.keys(fields) }, null, 2));
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command("admin-code <action> [email]")
  .description("manage one-time admin login codes (desktop issues, web consumes)")
  .option("--label <label>", "short description for a created code")
  .option("--id <id>", "code id (revoke)")
  .action(async (action: string, email: string | undefined, opts: { label?: string; id?: string }) => {
    try {
      await ensureSchema(getClient());
      if (action === "create") {
        if (!email) throw new Error("email required");
        const created = await createAdminLoginCode({ email, label: opts.label });
        console.log(JSON.stringify({ ok: true, ...created }));
      } else if (action === "list") {
        console.log(JSON.stringify({ ok: true, codes: await listAdminLoginCodes() }, null, 2));
      } else if (action === "revoke") {
        if (!opts.id) throw new Error("--id required");
        await revokeAdminLoginCode(opts.id);
        console.log(JSON.stringify({ ok: true }));
      } else if (action === "logout-sessions") {
        if (!email) throw new Error("email required");
        const sessions = await revokeAdminSessionsByEmail(email);
        const codes = await revokeAdminLoginCodesByEmail(email);
        console.log(JSON.stringify({ ok: true, email, sessionsRevoked: sessions, codesRevoked: codes }));
      } else {
        throw new Error(`unknown action: ${action}`);
      }
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

function backupPass(): string {
  const pass = process.env.HOICHOI_BACKUP_PASS;
  if (!pass) throw new Error("HOICHOI_BACKUP_PASS not set");
  return pass;
}

const backup = program.command("backup").description("AES-256 encrypted backup / restore");
backup
  .command("export")
  .description("full backup (settings + content + credentials) as encrypted JSON to stdout")
  .action(async () => {
    try {
      await ensureSchema(getClient());
      const bundle = await gatherExportBundle(getClient());
      const payload = encryptJson(bundle, backupPass());
      console.log(JSON.stringify({ ok: true, payload }));
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

backup
  .command("import <file>")
  .description('restore from an encrypted backup file — e.g. "backup import hb.json"')
  .action(async (file: string) => {
    try {
      await ensureSchema(getClient());
      const pass = backupPass();
      const text = await readFile(file, "utf-8");
      const parsed = JSON.parse(text) as { payload?: string };
      const bundle = decryptJson(parsed.payload ?? text, pass) as ExportBundle;
      const written = await applyImportBundle(getClient(), bundle);
      console.log(JSON.stringify({ ok: true, written }, null, 2));
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

backup
  .command("verify <file>")
  .description('decrypt + validate a backup without writing to the database — e.g. "backup verify hb.bak"')
  .action(async (file: string) => {
    try {
      await ensureSchema(getClient());
      const pass = backupPass();
      const text = await readFile(file, "utf-8");
      const parsed = JSON.parse(text) as { payload?: string };
      const bundle = decryptJson(parsed.payload ?? text, pass) as ExportBundle;
      const checks: Record<string, string | number> = {
        version: bundle.version,
        exported_at: bundle.exported_at,
        tables: bundle.tables?.length ?? 0,
        credentials: Object.keys(bundle.credentials ?? {}).length,
      };
      for (const t of bundle.tables ?? []) checks[`rows:${t.name}`] = t.rows.length;
      console.log(JSON.stringify({ ok: true, valid: true, file, checks }, null, 2));
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

backup
  .command("auto <dir>")
  .description('write an auto-backup into a folder and keep only the newest N files (rotating)')
  .option("--keep <n>", "keep this many recent backups", "7")
  .action(async (dir: string, opts: { keep: string }) => {
    try {
      await ensureSchema(getClient());
      await import("node:fs/promises").then(({ mkdir }) => mkdir(dir, { recursive: true }));
      const payload = encryptJson(await gatherExportBundle(getClient()), backupPass());
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19).replace("T", "_");
      const file = path.join(dir, `hoichoi-backup-${stamp}.bak`);
      await writeFile(file, JSON.stringify({ payload }, null, 2), "utf-8");
      const keep = Math.max(1, Number(opts.keep) || 7);
      const list = (await readdir(dir))
        .filter((f) => f.startsWith("hoichoi-backup-") && f.endsWith(".bak"))
        .sort()
        .slice(0, -keep);
      for (const old of list) {
        await rm(path.join(dir, old), { force: true });
      }
      console.log(JSON.stringify({ ok: true, file, kept: keep, pruned: list.length }, null, 2));
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command("reset")
  .description("wipe content + reset settings/config to defaults (admin account kept)")
  .action(async () => {
    try {
      await ensureSchema(getClient());
      const { wiped } = await resetContent(getClient());
      console.log(JSON.stringify({ ok: true, wiped }));
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command("sync <direction>")
  .description("copy content between DBs: push = local file DB → Turso, pull = Turso → local file DB")
  .requiredOption("--from <url>", "source URL (file: or libsql://)")
  .requiredOption("--to <url>", "target URL (file: or libsql://)")
  .action(async (direction: string, opts: { from: string; to: string }) => {
    try {
      if (direction !== "push" && direction !== "pull") {
        throw new Error("direction must be push or pull");
      }
      const { from, to } = makeSyncClients(opts.from, opts.to);
      await ensureSchema(to, opts.to);
      const written = await copyTables(from, to, CONTENT_TABLES);
      console.log(JSON.stringify({ ok: true, direction, written }, null, 2));
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command("stats")
  .description("desk monitor — live stats + recent pipeline runs as JSON")
  .action(async () => {
    try {
      await ensureSchema(getClient());
      console.log(JSON.stringify({ ok: true, stats: await statsSnapshot(), runs: await recentPipelineRuns(8) }, null, 2));
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command("radar")
  .description("desk collector — per-category pipeline-stage radar snapshot as JSON")
  .action(async () => {
    try {
      await ensureSchema(getClient());
      console.log(JSON.stringify({ ok: true, ...(await radarSnapshot()) }, null, 2));
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

const media = program.command("media").description("remote media storage (adapter chain + retention policy)");
/**
 * The JSON policy can arrive three ways: as the positional arg, in
 * `HOICHOI_MEDIA_STORAGE_JSON`, or (legacy) on stdin. The env route exists
 * because the desktop app used to pass the policy as one argv token, and every
 * Windows shell hop (cmd.exe + C runtime) can mangle embedded quotes — the
 * runner then died with `Expected property name or '}' in JSON at position 1`.
 */
async function readMediaStorageArg(json: string | undefined, opts: { stdin?: boolean } = {}): Promise<MediaStorageConfig | null> {
  let raw = json?.trim();
  if (!raw) raw = process.env.HOICHOI_MEDIA_STORAGE_JSON?.trim();
  if (!raw) {
    // File route: the desktop writes big policies to a temp file instead of
    // squeezing JSON through argv/stdin.
    const file = process.env.HOICHOI_MEDIA_STORAGE_FILE?.trim();
    if (file) {
      const text = await readFile(file, "utf8").catch(() => {
        throw new Error(`HOICHOI_MEDIA_STORAGE_FILE unreadable: ${file}`);
      });
      raw = text.trim();
    }
  }
  if (!raw) {
    const fromStdin = await readStdinIfPiped(opts.stdin === true);
    if (fromStdin) raw = fromStdin;
  }
  if (!raw) return null;
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned) as MediaStorageConfig;
}
media
  .command("storage [json]")
  .description('print the media-storage policy (or save a new JSON policy when passed)')
  .action(async (json: string | undefined) => {
    try {
      await ensureSchema(getClient());
      const cfg = await readMediaStorageArg(json, { stdin: true });
      if (cfg) await saveMediaStorageConfig(cfg);
      console.log(JSON.stringify({ ok: true, config: await getMediaStorageConfig(), registry: await storageRegistryCount() }, null, 2));
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });
media
  .command("storage:set <json>")
  .description('save a new JSON policy (daemon-compatible)')
  .action(async (json: string) => {
    try {
      await ensureSchema(getClient());
      const cfg = await readMediaStorageArg(json, { stdin: true });
      if (cfg) await saveMediaStorageConfig(cfg);
      console.log(JSON.stringify({ ok: true, config: await getMediaStorageConfig(), registry: await storageRegistryCount() }));
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });
media
  .command("cleanup")
  .description("delete remote blobs registered older than the retention window")
  .option("--dry-run", "report only, touch nothing")
  .option("--months <n>", "override the retention window (months)")
  .action(async (opts: { dryRun?: boolean; months?: string }) => {
    try {
      await ensureSchema(getClient());
      console.log(JSON.stringify({
        ok: true,
        ...(await cleanupMedia({ dryRun: opts.dryRun ?? false, months: opts.months !== undefined ? Number(opts.months) : undefined })),
      }, null, 2));
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });
media
  .command("backfill")
  .description("re-download missing post media and mirror files into the web app's public folder")
  .option("--limit <n>", "maximum posts/permalinks to repair")
  .option("--dry-run", "only count candidates, download nothing")
  .option("--recover", "also re-visit permalinks whose raw_posts row was archived away (needs a browser)")
  .action(async (opts: { limit?: string; dryRun?: boolean; recover?: boolean }) => {
    try {
      await ensureSchema(getClient());
      const limit = opts.limit !== undefined ? Number(opts.limit) : undefined;
      const dryRun = opts.dryRun ?? false;
      const log = (m: string) => console.error(m);
      const result = await backfillMissingMedia({ limit, dryRun, log });
      // Stage 2: posts whose raw row is gone need the permalink re-visited.
      const recovered = opts.recover
        ? await recoverOrphanedMedia({ limit, dryRun, log })
        : { skipped: true, hint: "pass --recover to re-visit permalinks" };
      const sync = await syncExistingMediaToWeb();
      console.log(JSON.stringify({ ok: true, ...result, recovered, sync }, null, 2));
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

/* ------------------------------------------------------------------ *
 * Semantic vectors - SEM-1 can only match against posts that have one *
 * ------------------------------------------------------------------ */

const embeddings = program
  .command("embeddings")
  .description("semantic vectors used by SEM-1 dedup");

embeddings
  .command("backfill")
  .description("compute vectors for posts that have none")
  .option("--limit <n>", "maximum posts to embed")
  .option("--dry-run", "only count candidates, call no provider")
  .action(async (opts: { limit?: string; dryRun?: boolean }) => {
    try {
      await ensureSchema(getClient());
      const client = getClient();
      const dryRun = opts.dryRun ?? false;
      const limit = opts.limit !== undefined ? Number(opts.limit) : undefined;
      // `posts.embedding` is what findSemanticDuplicates reads; `posts_vec` is
      // vec0-only, sized for the old 1536-dimension model, and not consulted.
      const sql =
        "SELECT id, title_bn, summary_bn, body_bn FROM posts " +
        "WHERE embedding IS NULL ORDER BY created_at" +
        (limit !== undefined ? ` LIMIT ${limit}` : "");
      const rows = await client.execute(sql);

      if (dryRun) {
        console.log(JSON.stringify({ ok: true, dryRun: true, candidates: rows.rows.length }, null, 2));
        return;
      }

      const resolver = newResolver({});
      const log = (m: string) => console.error(m);
      let embedded = 0;
      let failed = 0;
      for (const row of rows.rows) {
        const r = row as Record<string, unknown>;
        // Same text rewrite.ts embeds, so backfilled vectors are comparable
        // with freshly computed ones.
        const text = `${r.title_bn ?? ""} ${r.summary_bn ?? ""} ${r.body_bn ?? ""}`.trim();
        if (!text) continue;
        try {
          const { vector } = await resolver.embedText(text);
          await client.execute({
            sql: "UPDATE posts SET embedding = ?, updated_at = ? WHERE id = ?",
            args: [JSON.stringify(vector), new Date().toISOString(), String(r.id)],
          });
          embedded++;
          log(`[embed] ${embedded}/${rows.rows.length} (${vector.length} dims)`);
        } catch (err) {
          failed++;
          log(`[embed] failed ${String(r.id)}: ${(err as Error).message}`);
        }
      }
      console.log(
        JSON.stringify({ ok: failed === 0, candidates: rows.rows.length, embedded, failed }, null, 2),
      );
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

/* ------------------------------------------------------------------ *
 * Desk watchlist / queue / moderation (desktop console reads these)   *
 * ------------------------------------------------------------------ */

function deskSourceRow(row: Record<string, unknown>) {
  const topics = (() => {
    try {
      const v = JSON.parse(String(row.topics ?? "[]"));
      return Array.isArray(v) ? v.map(String) : [];
    } catch {
      return [];
    }
  })();
  return {
    id: String(row.id),
    page_url: String(row.page_url),
    page_name: String(row.page_name),
    kind: String(row.kind) === "group" ? "group" : "page",
    fb_id: (row.fb_id as string | null) ?? null,
    topics,
    category: row.category as CategorySlug,
    categories: row.category_csv
      ? [...new Set(String(row.category_csv).split(",").map((s) => s.trim()).filter(Boolean))]
      : row.category ? [...new Set([String(row.category)])] : [],
    is_active: Boolean(row.is_active),
    last_scraped_at: (row.last_scraped_at as string | null) ?? null,
    posts_today: Number(row.posts_today ?? 0),
    health: Number(row.health ?? 100),
    created_at: String(row.created_at),
  };
}

/**
 * Collapse rows that share a page_url, unioning their categories.
 *
 * `ensureUniqueSourceUrls` merges duplicates in the DB and installs a unique
 * index, so this should normally be a no-op. It stays as a safety net: a source
 * list that renders the same page twice (Settings > Source cards, Watchlist
 * rows) is the visible symptom users report, and this guarantees one card per
 * page no matter what state the database is in.
 */
function dedupeSourceRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const byUrl = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const key = String(row.page_url ?? "").trim().toLowerCase();
    const seen = byUrl.get(key);
    if (!seen) {
      byUrl.set(key, row);
      continue;
    }
    // Union the categories, keep the most complete record, and prefer an
    // active/verified row so a stale duplicate cannot disable a live source.
    const cats = new Set(
      [...String(seen.category_csv ?? "").split(","), ...String(row.category_csv ?? "").split(",")]
        .map((s) => s.trim())
        .filter(Boolean),
    );
    const primary =
      Number(row.is_active) > Number(seen.is_active) ||
      (Number(row.is_verified) === 1 && Number(seen.is_verified) !== 1)
        ? row
        : seen;
    const other = primary === row ? seen : row;
    byUrl.set(key, {
      ...other,
      ...primary,
      id: String(seen.id),
      is_active: Number(seen.is_active) || Number(row.is_active),
      is_verified: Number(seen.is_verified) || Number(row.is_verified),
      health: Math.max(Number(seen.health ?? 100), Number(row.health ?? 100)),
      posts_today: Number(seen.posts_today ?? 0) + Number(row.posts_today ?? 0),
      last_scraped_at:
        [seen.last_scraped_at, row.last_scraped_at].filter(Boolean).sort().pop() ?? null,
      category_csv: [...cats].join(","),
    });
  }
  return [...byUrl.values()];
}

async function listDeskSources() {
  const client = getClient();
  const today = new Date().toISOString().slice(0, 10);
  const res = await client.execute({
    sql: `SELECT s.*,
            (SELECT count(*) FROM raw_posts rp WHERE rp.source_id = s.id AND rp.scraped_at LIKE ?) AS posts_today,
            (SELECT COALESCE(GROUP_CONCAT(category_slug), '') FROM source_categories sc WHERE sc.source_id = s.id) AS category_csv
          FROM sources s ORDER BY s.is_active DESC, s.created_at DESC`,
    args: [`${today}%`],
  });
  return dedupeSourceRows(res.rows as unknown as Record<string, unknown>[]).map((r) => deskSourceRow(r));
}

async function addDeskSource(opts: {
  pageUrl: string;
  pageName: string;
  kind?: string;
  category?: string;
  categories?: string;
  topics?: string;
  fbId?: string | null;
}) {
  const client = getClient();
  const created = new Date().toISOString();
  const topics = (opts.topics ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  
  // Parse categories (comma-separated)
  const categories = (opts.categories ?? opts.category ?? "missing-children")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  // One row per page. The DB now carries a unique index on page_url, but the
  // same page used to be addable repeatedly (that is what produced the
  // duplicate cards in Settings > Source / the Watchlist), so merge into the
  // existing row instead of failing the add.
  const pageUrl = opts.pageUrl.trim();
  const existing = await client.execute({
    sql: "SELECT id FROM sources WHERE page_url = ? LIMIT 1",
    args: [pageUrl],
  });
  const existingId = existing.rows[0] ? String(existing.rows[0].id) : null;

  if (existingId) {
    // Fold the new categories into the existing union rather than replacing
    // it, so re-adding a page never loses a category it was already filed under.
    if (categories.length > 0) {
      const values = categories.map(() => "(?, ?)").join(", ");
      await client.execute({
        sql: `INSERT OR IGNORE INTO source_categories (source_id, category_slug) VALUES ${values}`,
        args: categories.flatMap((c) => [existingId, c]),
      });
      await client.execute({
        sql: `UPDATE sources SET category = COALESCE(
                 (SELECT category_slug FROM source_categories WHERE source_id = ? LIMIT 1),
                 category
               ) WHERE id = ?`,
        args: [existingId, existingId],
      });
    }
    if ((opts.topics ?? "").trim() !== "") {
      await client.execute({ sql: "UPDATE sources SET topics = ? WHERE id = ?", args: [JSON.stringify(topics), existingId] });
    }
    const existingRow = await listDeskSources();
    return existingRow.find((s: { id: string }) => s.id === existingId) ?? existingRow[0];
  }

  const id = crypto.randomUUID();
  await client.execute({
    sql: `INSERT INTO sources (id, page_url, page_name, category, is_verified, is_active, kind, fb_id, topics, created_at)
          VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?, ?)`,
    args: [
      id,
      pageUrl,
      opts.pageName.trim(),
      categories[0] ?? "missing-children", // primary category for backward compat
      opts.kind === "group" ? "group" : "page",
      opts.fbId ?? null,
      JSON.stringify(topics),
      created,
    ],
  });
  
  // Insert into source_categories junction table
  if (categories.length > 0) {
    const values = categories.map(() => "(?, ?)").join(", ");
    const args = categories.flatMap(c => [id, c]);
    await client.execute({ sql: `INSERT OR IGNORE INTO source_categories (source_id, category_slug) VALUES ${values}`, args });
  }
  
  const rows = await listDeskSources();
  return rows.find((s: { id: string }) => s.id === id) ?? rows[0];
}

async function toggleDeskSource(id: string) {
  const client = getClient();
  await client.execute({
    sql: "UPDATE sources SET is_active = CASE is_active WHEN 1 THEN 0 ELSE 1 END WHERE id = ?",
    args: [id],
  });
}

async function removeDeskSource(id: string) {
  const client = getClient();
  await client.execute({ sql: "DELETE FROM sources WHERE id = ?", args: [id] });
}

async function updateDeskSource(
  id: string,
  opts: {
    pageUrl?: string;
    pageName?: string;
    kind?: string;
    category?: string;
    categories?: string;
    topics?: string;
    fbId?: string;
    isActive?: string;
  },
) {
  const client = getClient();
  const sets: string[] = [];
  const args: SqlValue[] = [];
  if (opts.pageName !== undefined) {
    sets.push("page_name = ?");
    args.push(opts.pageName.trim());
  }
  if (opts.pageUrl !== undefined) {
    sets.push("page_url = ?");
    args.push(opts.pageUrl.trim());
  }
  if (opts.fbId !== undefined) {
    sets.push("fb_id = ?");
    args.push(opts.fbId.trim() || null);
  }
  if (opts.kind !== undefined) {
    sets.push("kind = ?");
    args.push(opts.kind === "group" ? "group" : "page");
  }
  if (opts.category !== undefined) {
    sets.push("category = ?");
    args.push(opts.category.trim());
  }
  if (opts.isActive !== undefined) {
    sets.push("is_active = ?");
    args.push(opts.isActive === "true" ? 1 : 0);
  }
  if (opts.topics !== undefined) {
    const topics = opts.topics
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    sets.push("topics = ?");
    args.push(JSON.stringify(topics));
  }
  if (sets.length > 0) {
    args.push(id);
    await client.execute({
      sql: `UPDATE sources SET ${sets.join(", ")} WHERE id = ?`,
      args,
    });
  }
  if (opts.categories !== undefined) {
    const categories = opts.categories
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    await client.execute({
      sql: "DELETE FROM source_categories WHERE source_id = ?",
      args: [id],
    });
    if (categories.length > 0) {
      const values = categories.map(() => "(?, ?)").join(", ");
      await client.execute({
        sql: `INSERT INTO source_categories (source_id, category_slug) VALUES ${values}`,
        args: categories.flatMap((c) => [id, c]),
      });
    }
    // `sources.category` is the legacy single-category column that older readers
    // still use, and the pipeline falls back to it when a source has no
    // membership row (pipeline.ts). Without this, editing a source's categories
    // from the desk left the two disagreeing: the junction table said one thing,
    // the column another, so the same source rendered under different categories
    // depending on which surface asked. The web editor already syncs it.
    //
    // Empty membership is left alone on purpose, exactly as the web route does:
    // nulling the column would make the pipeline's `[s.category]` fallback
    // resolve to `[null]` for a source that simply has no categories yet.
    if (categories.length > 0) {
      const primary = categories[0];
      if (primary !== undefined) {
        await client.execute({ sql: "UPDATE sources SET category = ? WHERE id = ?", args: [primary, id] });
      }
    }
  }
  return (await listDeskSources()).find((s: { id: string }) => s.id === id) ?? null;
}

function deskQueueRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title_bn: String(row.title_bn),
    summary_bn: (row.summary_bn as string) ?? "",
    body_bn: (row.body_bn as string) ?? "",
    source_name: String(row.source_name),
    source_url: (row.source_url as string) ?? "",
    category: row.category as CategorySlug,
    status: String(row.status),
    media_kind: String(row.media_kind ?? "none"),
    media_path: (row.media_path as string) ?? "",
    created_at: String(row.created_at),
  };
}

async function listDeskQueue(status?: string) {
  const client = getClient();
  const cols = "id, slug, title_bn, summary_bn, body_bn, source_name, source_url, category, status, media_kind, media_path, created_at";
  const res = status
    ? await client.execute({
        sql: `SELECT ${cols} FROM posts WHERE status = ? ORDER BY created_at DESC LIMIT 80`,
        args: [status],
      })
    : await client.execute(
        `SELECT ${cols} FROM posts ORDER BY created_at DESC LIMIT 80`,
      );
  return res.rows.map((r) => deskQueueRow(r as Record<string, unknown>));
}

program
  .command("sources <action>")
  .description("desk watchlist: list / add / update / toggle / remove")
  .option("--page-url <url>", "page URL (add/update)")
  .option("--page-name <name>", "page name (add/update)")
  .option("--kind <kind>", "page | group (add/update)")
  .option("--category <slug>", "category slug (add/update)")
  .option("--topics <csv>", "comma-separated topics (add/update)")
  .option("--fb-id <id>", "facebook id (add/update)")
  .option("--categories <csv>", "comma-separated category slugs (add/update)")
  .option("--id <id>", "source id (update/toggle/remove)")
  .option("--is-active <bool>", "true | false (update)")
  .action(async (action: string, opts: Record<string, string | undefined>) => {
    try {
      await ensureSchema(getClient());
      if (action === "list") {
        console.log(JSON.stringify({ ok: true, sources: await listDeskSources() }, null, 2));
      } else if (action === "add") {
        if (!opts.pageUrl || !opts.pageName) throw new Error("--page-url and --page-name required");
        const source = await addDeskSource({
          pageUrl: opts.pageUrl,
          pageName: opts.pageName,
          kind: opts.kind,
          category: opts.category,
          categories: opts.categories,
          topics: opts.topics,
          fbId: opts.fbId,
        });
        console.log(JSON.stringify({ ok: true, source }, null, 2));
      } else if (action === "update") {
        if (!opts.id) throw new Error("--id required");
        const source = await updateDeskSource(opts.id, {
          pageUrl: opts.pageUrl,
          pageName: opts.pageName,
          kind: opts.kind,
          category: opts.category,
          categories: opts.categories,
          topics: opts.topics,
          fbId: opts.fbId,
          isActive: opts.isActive,
        });
        console.log(JSON.stringify({ ok: true, source }, null, 2));
      } else if (action === "toggle") {
        if (!opts.id) throw new Error("--id required");
        await toggleDeskSource(opts.id);
        console.log(JSON.stringify({ ok: true }));
      } else if (action === "remove") {
        if (!opts.id) throw new Error("--id required");
        await removeDeskSource(opts.id);
        console.log(JSON.stringify({ ok: true }));
      } else {
        throw new Error(`unknown action: ${action}`);
      }
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

const BULK_TARGETS = ["approved", "rejected", "published"] as const;
type BulkTarget = (typeof BULK_TARGETS)[number];
const BULK_ACTIONS = [...BULK_TARGETS, "remove"] as const;
type BulkAction = (typeof BULK_ACTIONS)[number];

/** Narrow a raw CLI token to a bulk action, or throw a helpful error. */
function parseBulkAction(target: string | undefined): BulkAction {
  if (!target) {
    throw new Error(`target required (queue bulk <${BULK_ACTIONS.join("|")}> --ids a,b,c)`);
  }
  if (!(BULK_ACTIONS as readonly string[]).includes(target)) {
    throw new Error(`target must be one of: ${BULK_ACTIONS.join(", ")}`);
  }
  return target as BulkAction;
}

/** Narrow a bulk action to the moderation subset that `bulkModeratePosts` takes. */
function parseBulkTarget(target: string | undefined): BulkTarget {
  const action = parseBulkAction(target);
  if (action === "remove") {
    throw new Error('target "remove" deletes posts; it is not a moderation target');
  }
  return action;
}

/** Split a `--ids a,b,c` payload into a de-duplicated id list. */
function parseBulkIds(raw: string | undefined): string[] {
  const ids = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) throw new Error("--ids required and must list at least one post id");
  return [...new Set(ids)];
}

program
  .command("queue <action> [id] [status]")
  .description(
    "desk content queue: list [--status s] / set <id> <approved|rejected|published> / bulk <target> --ids a,b,c / update <id> --title/--body/--summary/--category/--media / media <id>",
  )
  .option("--status <s>", "filter by post status")
  .option("--ids <csv>", "comma-separated post ids (bulk)")
  // `queue update` and `queue media` must be declared here, on the commander
  // command. An earlier revision added them to the raw-argv `case "queue"`
  // block further down the file, where commander never routed them: its
  // handler claimed `queue` first and rejected both with "unknown action",
  // so the desktop editor's image save silently did nothing.
  .option("--title <t>", "new title (update)")
  .option("--body <b>", "new body (update)")
  .option("--summary <s>", 'new summary; "__CLEAR__" removes it (update)')
  .option("--category <c>", "new category slug (update)")
  .option("--media <m>", 'image URL or /uploads/… path; "__CLEAR__" removes it (update)')
  .action(async (action: string, id: string | undefined, status: string | undefined, opts: { status?: string; ids?: string; title?: string; body?: string; summary?: string; category?: string; media?: string }) => {
    try {
      await ensureSchema(getClient());
      if (action === "list") {
        console.log(JSON.stringify({ ok: true, rows: await listDeskQueue(opts.status) }, null, 2));
      } else if (action === "update") {
        if (!id) throw new Error("id required (queue update <id> --title ... --body ... --summary ... --category ... --media ...)");
        const existing = await getPostById(id);
        if (!existing) throw new Error(`post not found: ${id}`);
        const fields: PostUpdateFields = {};
        if (opts.title !== undefined) fields.title_bn = opts.title;
        if (opts.body !== undefined) fields.body_bn = opts.body;
        if (opts.summary !== undefined) fields.summary_bn = opts.summary === "__CLEAR__" ? null : opts.summary;
        if (opts.category !== undefined) fields.category = opts.category as CategorySlug;
        // "__CLEAR__" removes the image. Anything else goes through
        // normalizeMediaPath inside updatePost, so a bad URL is rejected
        // before it can reach the page.
        if (opts.media !== undefined) {
          fields.media_path = opts.media === "__CLEAR__" ? null : opts.media;
        }
        if (Object.keys(fields).length === 0) {
          throw new Error("at least one field required (--title, --body, --summary, --category, --media)");
        }
        await updatePost(id, fields);
        console.log(JSON.stringify({ ok: true, post: await getPostById(id) }, null, 2));
      } else if (action === "media") {
        // Collector-seen image URLs for one post, probed with HEAD so the desk
        // editor greys out fbcdn links whose signature has expired. Mirrors the
        // web route /api/posts/[id]/media.
        if (!id) throw new Error("id required (queue media <id>)");
        const info = await listPostMediaCandidates(id);
        const candidates = info.media_urls
          .filter((u) => /^https?:\/\//i.test(u) && !isVideoUrl(u))
          .slice(0, 12);
        const probed = await Promise.all(
          candidates.map(async (url) => {
            try {
              const res = await fetch(url, {
                method: "HEAD",
                signal: AbortSignal.timeout(6000),
                headers: { "user-agent": "Mozilla/5.0 Hoichoi/1.0" },
              });
              const type = res.headers.get("content-type") ?? "";
              return { url, ok: res.ok && type.startsWith("image/"), status: res.status, contentType: type || null };
            } catch {
              return { url, ok: false, status: 0, contentType: null };
            }
          }),
        );
        console.log(JSON.stringify({ ok: true, current: info.current, candidates: probed }, null, 2));
      } else if (action === "bulk") {
        const target = parseBulkAction(id);
        const ids = parseBulkIds(opts.ids);
        if (target === "remove") {
          const res = await bulkDeletePosts(ids);
          console.log(
            JSON.stringify({ ok: res.missing.length === 0, action: target, ...res, ids }, null, 2),
          );
        } else {
          const res = await bulkModeratePosts(ids, target);
          console.log(
            JSON.stringify({ ok: res.missing.length === 0, action: target, ...res, ids }, null, 2),
          );
        }
      } else if (action === "set") {
        if (!id || !status) throw new Error("id and status required");
        const allowed = ["approved", "rejected", "published"];
        if (!allowed.includes(status)) throw new Error(`status must be one of: ${allowed.join(", ")}`);
        const post = await getPostById(id);
        if (!post) throw new Error(`post not found: ${id}`);
        if (status === "approved") {
          const cat = await getCategory(post.category);
          const needsDouble = Boolean(cat?.config.requires_double_approval) && post.status !== "approved";
          await updatePostStatus(id, needsDouble ? "approved" : "published", { publishedAt: !needsDouble });
          // eslint-disable-next-line no-console
          console.log(JSON.stringify({ ok: true, status: needsDouble ? "approved" : "published" }));
        } else if (status === "rejected") {
          await updatePostStatus(id, "rejected");
          console.log(JSON.stringify({ ok: true, status: "rejected" }));
        } else {
          await updatePostStatus(id, "published", { publishedAt: true });
          console.log(JSON.stringify({ ok: true, status: "published" }));
        }
      } else {
        throw new Error(`unknown action: ${action}`);
      }
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command("moderation <action> [id] [status]")
  .description("desk moderation: list [--status s] / set <id> <approved|blocked>")
  .option("--status <s>", "filter list by status")
  .action(async (action: string, id: string | undefined, status: string | undefined, opts: { status?: string }) => {
    try {
      await ensureSchema(getClient());
      if (action === "list") {
        const all = await getAllComments(300);
        const filtered = opts.status ? all.filter((c) => c.status === opts.status) : all;
        console.log(JSON.stringify({ ok: true, comments: filtered }, null, 2));
      } else if (action === "set") {
        if (!id || !status) throw new Error("id and status required (approved|blocked)");
        if (status !== "approved" && status !== "blocked") throw new Error("status must be approved|blocked");
        await setCommentStatus(id, status);
        console.log(JSON.stringify({ ok: true }));
      } else {
        throw new Error(`unknown action: ${action}`);
      }
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command("categories <action>")
  .description("desk categories: list / add / update / delete")
  .option("--slug <slug>", "category slug (add/update/delete)")
  .option("--name-bn <name>", "Bangla display name (add)")
  .option("--name-en <name>", "English display name (add)")
  .option("--desc-bn <text>", "Bangla description (add/update)")
  .option("--desc-en <text>", "English description (add/update)")
  .option("--dot <hex>", "dot color hex, omit to keep seed default (add/update)")
  .option("--sort <n>", "sort order (add/update)")
  .option("--footer <bool>", "true | false — show in the public site footer (add/update)")
  .action(async (action: string, opts: Record<string, string | undefined>) => {
    try {
      await ensureSchema(getClient());
      if (action === "list") {
        console.log(JSON.stringify({ ok: true, categories: await listCategories() }, null, 2));
      } else if (action === "add") {
        if (!opts.slug || !opts.nameBn || !opts.nameEn) {
          throw new Error("--slug, --name-bn and --name-en are required");
        }
        const slug = (opts.slug as string)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, "-")
          .replace(/^-+|-+$/g, "");
        if (!slug) throw new Error("invalid slug — use lowercase letters, numbers and dashes");
        await createCategory({
          slug,
          displayNameBn: opts.nameBn.trim(),
          displayNameEn: opts.nameEn.trim(),
          descriptionBn: opts.descBn?.trim() || undefined,
          descriptionEn: opts.descEn?.trim() || undefined,
          dot: opts.dot?.trim() || undefined,
          sortOrder: opts.sort !== undefined ? Number(opts.sort) : undefined,
          showInFooter: opts.footer === undefined ? undefined : opts.footer === "true" || opts.footer === "1",
        });
        console.log(JSON.stringify({ ok: true, category: await getCategory(slug) }, null, 2));
      } else if (action === "update") {
        if (!opts.slug) throw new Error("--slug is required");
        const fields: Parameters<typeof updateCategory>[1] = {};
        if (opts.nameBn !== undefined) fields.displayNameBn = opts.nameBn.trim();
        if (opts.nameEn !== undefined) fields.displayNameEn = opts.nameEn.trim();
        if (opts.descBn !== undefined) fields.descriptionBn = opts.descBn.trim();
        if (opts.descEn !== undefined) fields.descriptionEn = opts.descEn.trim();
        if (opts.dot !== undefined) fields.dot = opts.dot.trim();
        if (opts.sort !== undefined) fields.sortOrder = Number(opts.sort);
        if (opts.footer !== undefined) fields.showInFooter = opts.footer === "true" || opts.footer === "1";
        if (Object.keys(fields).length === 0) {
          throw new Error("at least one field required (--name-bn, --name-en, --desc-bn, --desc-en, --dot, --sort, --footer)");
        }
        await updateCategory(opts.slug, fields);
        console.log(JSON.stringify({ ok: true, category: await getCategory(opts.slug) }, null, 2));
      } else if (action === "delete") {
        if (!opts.slug) throw new Error("--slug is required");
        await deleteCategory(opts.slug);
        console.log(JSON.stringify({ ok: true, deleted: opts.slug }));
      } else {
        throw new Error(`unknown action: ${action}`);
      }
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

/* ------------------------------------------------------------------ *
 * LLM provider management (desktop + CLI)                             *
 * ------------------------------------------------------------------ */

const PROVIDER_KEYS: ProviderKey[] = [
  "google", "groq", "openrouter", "ollama", "anthropic", "openai",
  "mistral", "github", "github-models", "custom",
];

const PROVIDER_BASE_DEFAULTS: Record<string, string> = {
  google: "https://generativelanguage.googleapis.com",
  groq: "https://api.groq.com/openai",
  openrouter: "https://openrouter.ai/api",
  ollama: "http://localhost:11434",
  anthropic: "https://api.anthropic.com",
  openai: "https://api.openai.com",
  mistral: "https://api.mistral.ai",
  github: "https://api.githubcopilot.com",
  "github-models": "https://models.github.ai",
  custom: "",
};

// Canonical env var each provider key maps to when no --env is given. Kept in
// sync with the desktop vault + web provider route so API boxes stay filled.

async function listProviderRows() {
  const client = getClient();
  const res = await client.execute("SELECT * FROM llm_providers ORDER BY priority ASC");
  return res.rows.map((r) => mapProvider(r as Record<string, unknown>));
}

interface ProviderUpsert {
  id?: string;
  key?: string;
  name?: string;
  model?: string;
  base?: string;
  env?: string;
  apiKey?: string;
  priority?: string;
  free?: string;
  rewrite?: string;
  embed?: string;
  isActive?: string;
}

async function upsertProvider(o: ProviderUpsert) {
  const client = getClient();
  const key = o.key?.trim();
  if (o.id) {
    const sets: string[] = [];
    const args: SqlValue[] = [];
    const put = (col: string, val: SqlValue) => {
      sets.push(`${col} = ?`);
      args.push(val);
    };
    if (o.name !== undefined) put("display_name", o.name.trim());
    if (o.model !== undefined) put("model_name", o.model.trim());
    if (o.base !== undefined) put("base_url", o.base.trim() || null);
    if (o.env !== undefined) put("api_key_env_var", o.env.trim());
    if (o.apiKey !== undefined) put("api_key", o.apiKey.trim() || null);
    if (o.priority !== undefined) put("priority", Number(o.priority));
    if (o.free !== undefined) put("is_free_tier", o.free === "true" ? 1 : 0);
    if (o.rewrite !== undefined) put("supports_rewrite", o.rewrite === "true" ? 1 : 0);
    if (o.embed !== undefined) put("supports_embeddings", o.embed === "true" ? 1 : 0);
    if (o.isActive !== undefined) put("is_active", o.isActive === "true" ? 1 : 0);
    if (sets.length > 0) {
      sets.push("updated_at = ?");
      args.push(nowIso());
      args.push(o.id);
      await client.execute({ sql: `UPDATE llm_providers SET ${sets.join(", ")} WHERE id = ?`, args });
    }
    const row = await client.execute({ sql: "SELECT * FROM llm_providers WHERE id = ?", args: [o.id] });
    return mapProvider(row.rows[0] as Record<string, unknown>);
  }
  if (!key) throw new Error("--key required (or --id to edit)");
  if (!PROVIDER_KEYS.includes(key as ProviderKey)) throw new Error(`unknown provider_key: ${key}`);
  const now = nowIso();
  const existing = await client.execute({ sql: "SELECT id FROM llm_providers WHERE provider_key = ?", args: [key] });
  const rowId = existing.rows[0]?.id ?? crypto.randomUUID();
  await client.execute({
    sql: `INSERT INTO llm_providers (
      id, provider_key, display_name, base_url, model_name, api_key_env_var, api_key,
      priority, is_active, is_free_tier, supports_rewrite, supports_embeddings, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
    args: [
      rowId, key, o.name?.trim() || key, o.base?.trim() || null,
      o.model?.trim() || "", o.env?.trim() || (PROCESSOR_ENV_DEFAULTS as Record<string, string>)[key] || `${key.toUpperCase().replace(/-/g, "_")}_API_KEY`,
      o.apiKey?.trim() || null, Number(o.priority ?? 100),
      o.free === "false" ? 0 : 1, o.rewrite === "false" ? 0 : 1, o.embed === "true" ? 1 : 0, now, now,
    ],
  });
  const row = await client.execute({ sql: "SELECT * FROM llm_providers WHERE id = ?", args: [rowId] });
  return mapProvider(row.rows[0] as Record<string, unknown>);
}

/** Probe a provider's model list (mirrors the web /api/providers/models route). */
async function probeProviderModels(key: string, base?: string, apiKey?: string) {
  if (!PROVIDER_KEYS.includes(key as ProviderKey)) throw new Error(`unknown provider_key: ${key}`);
  const baseUrl = (base ?? "").trim().replace(/\/+$/, "") || PROVIDER_BASE_DEFAULTS[key] || "";
  const token = (apiKey ?? "").trim();
  interface M { id: string; label: string }
  if (key === "google") {
    if (!token) throw new Error("অটো-ফেচের জন্য API key দিন");
    const res = await fetch(`${baseUrl}/v1beta/models?key=${encodeURIComponent(token)}`, {
      cache: "no-store", signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`provider status ${res.status}`);
    const data = (await res.json()) as { models?: Array<{ name: string; displayName?: string }> };
    const models: M[] = (data.models ?? [])
      .map((m) => ({ id: m.name.split("/").slice(-1)[0] ?? m.name, label: m.displayName ?? m.name }))
      .sort((a, b) => a.id.localeCompare(b.id));
    return models;
  }
  const headers: Record<string, string> = { Accept: "application/json" };
  if (key !== "ollama" && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}/v1/models`, {
    headers, cache: "no-store", signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`provider status ${res.status}`);
  const data = (await res.json()) as { data?: Array<{ id: string; name?: string }> };
  let models: M[] = (data.data ?? [])
    .map((m) => ({ id: m.id, label: m.name ?? m.id }))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (key === "openrouter") {
    models = models.filter((m) => m.id.endsWith(":free") || m.id.includes("/free"));
  }
  return models;
}

program
  .command("providers <action>")
  .description("AI providers: list / upsert / toggle / remove / models")
  .option("--id <id>", "provider id (upsert edit / toggle / remove)")
  .option("--key <key>", "provider_key (upsert)")
  .option("--name <name>", "display name (upsert)")
  .option("--model <model>", "model name (upsert)")
  .option("--base <url>", "base url override — blank clears preset (upsert)")
  .option("--env <var>", "api key env var (upsert)")
  .option("--api-key <key>", "DB-stored api key override (upsert)")
  .option("--priority <n>", "priority order (upsert)")
  .option("--free <bool>", "true | false free tier (upsert)")
  .option("--rewrite <bool>", "true | false rewrite support (upsert)")
  .option("--embed <bool>", "true | false embeddings support (upsert)")
  .option("--is-active <bool>", "true | false active (upsert)")
  .option("--active-only", "list only active (list)")
  .action(async (action: string, opts: Record<string, string | undefined>) => {
    try {
      await ensureSchema(getClient());
      if (action === "list") {
        const providers = await listProviderRows();
        const out = opts.activeOnly ? providers.filter((p) => p.is_active) : providers;
        console.log(JSON.stringify({ ok: true, providers: out }, null, 2));
      } else if (action === "upsert") {
        const provider = await upsertProvider({ ...opts, key: opts.key, name: opts.name, model: opts.model, base: opts.base, env: opts.env, apiKey: opts.apiKey, priority: opts.priority, free: opts.free, rewrite: opts.rewrite, embed: opts.embed, isActive: opts.isActive });
        console.log(JSON.stringify({ ok: true, provider }, null, 2));
      } else if (action === "toggle") {
        if (!opts.id) throw new Error("--id required");
        const client = getClient();
        await client.execute({ sql: "UPDATE llm_providers SET is_active = CASE is_active WHEN 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?", args: [nowIso(), opts.id] });
        console.log(JSON.stringify({ ok: true }));
      } else if (action === "remove") {
        if (!opts.id) throw new Error("--id required");
        const client = getClient();
        await client.execute({ sql: "DELETE FROM llm_providers WHERE id = ?", args: [opts.id] });
        console.log(JSON.stringify({ ok: true }));
      } else if (action === "models") {
        if (!opts.key) throw new Error("--key required");
        const models = await probeProviderModels(opts.key, opts.base, opts.apiKey);
        console.log(JSON.stringify({ ok: true, models }));
      } else {
        throw new Error(`unknown action: ${action}`);
      }
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

/* ------------------------------------------------------------------ *
 * Notices / announcements (web visitors see these).                   *
 * ------------------------------------------------------------------ */

program
  .command("notice <action>")
  .description("announcements + special notice: list / add / update / toggle / remove")
  .option("--id <id>", "notice id (update/toggle/remove)")
  .option("--title <text>", "notice title (add/update)")
  .option("--body <text>", "notice body — blank to clear (add/update)")
  .option("--tone <tone>", "info | success | warn | alert (add/update)")
  .option("--url <url>", "optional link taget — blank to clear (add/update)")
  .option("--pinned <bool>", "true pins to the header 'special notice' banner (add/update)")
  .option("--active <bool>", "true | false (add/update)")
  .option("--expires-at <iso>", "auto-hide after this time — blank to clear (add/update)")
  .option("--active-only", "list only active + not expired (list)")
  .action(async (action: string, opts: Record<string, string | undefined>) => {
    try {
      await ensureSchema(getClient());
      if (action === "list") {
        const notices = await listNotices({ activeOnly: Boolean(opts.activeOnly), limit: 200 });
        console.log(JSON.stringify({ ok: true, notices }, null, 2));
      } else if (action === "add") {
        if (!opts.title) throw new Error("--title required");
        const notice = await createNotice({
          title: opts.title.trim(),
          body: opts.body ?? undefined,
          tone: opts.tone as NoticeTone | undefined,
          url: opts.url ?? undefined,
          pinned: opts.pinned === "true",
          is_active: opts.active !== "false",
          expires_at: opts.expiresAt ?? undefined,
          created_by: "desktop",
        });
        console.log(JSON.stringify({ ok: true, notice }, null, 2));
      } else if (action === "update") {
        if (!opts.id) throw new Error("--id required");
        const fields: Parameters<typeof updateNotice>[1] = {};
        if (opts.title !== undefined) fields.title = opts.title.trim();
        if (opts.body !== undefined) fields.body = opts.body.trim() || null;
        if (opts.tone !== undefined) fields.tone = opts.tone as NoticeTone;
        if (opts.url !== undefined) fields.url = opts.url.trim() || null;
        if (opts.pinned !== undefined) fields.pinned = opts.pinned === "true";
        if (opts.active !== undefined) fields.is_active = opts.active === "true";
        if (opts.expiresAt !== undefined) fields.expires_at = opts.expiresAt.trim() || null;
        if (Object.keys(fields).length === 0) throw new Error("at least one field --title/--body/--tone/--url/--pinned/--active/--expires-at required");
        const notice = await updateNotice(opts.id, fields);
        console.log(JSON.stringify({ ok: true, notice }, null, 2));
      } else if (action === "toggle") {
        if (!opts.id) throw new Error("--id required");
        const cur = await getNotice(opts.id);
        if (!cur) throw new Error("not found");
        const notice = await updateNotice(opts.id, { is_active: !cur.is_active });
        console.log(JSON.stringify({ ok: true, notice }, null, 2));
      } else if (action === "remove") {
        if (!opts.id) throw new Error("--id required");
        await deleteNotice(opts.id);
        console.log(JSON.stringify({ ok: true }));
      } else {
        throw new Error(`unknown action: ${action}`);
      }
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command("loginlog <action>")
  .description("desk admin login log: list [--page N] / delete --id / clear")
  .option("--page <n>", "page number (list)", "1")
  .option("--per-page <n>", "rows per page (list, max 100)", "10")
  .option("--id <id>", "log entry id (delete)")
  .action(async (action: string, opts: { page?: string; perPage?: string; id?: string }) => {
    try {
      await ensureSchema(getClient());
      if (action === "list") {
        const page = await listLoginLog(
          opts.page !== undefined ? Number(opts.page) : 1,
          opts.perPage !== undefined ? Number(opts.perPage) : 10,
        );
        console.log(JSON.stringify({ ok: true, ...page }, null, 2));
      } else if (action === "delete") {
        if (!opts.id) throw new Error("--id required");
        await deleteLoginLog(opts.id);
        console.log(JSON.stringify({ ok: true, deleted: opts.id }));
      } else if (action === "clear") {
        const rows = await clearLoginLog();
        console.log(JSON.stringify({ ok: true, cleared: rows }));
      } else {
        throw new Error(`unknown action: ${action}`);
      }
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command("cleanup <action>")
  .description("desk cache/temp cleaner: temp (frees app-data temp space)")
  .action(async (action: string) => {
    try {
      await ensureSchema(getClient());
      if (action !== "temp") throw new Error(`unknown action: ${action}`);
      const mediaRoot = process.env.HOICHOI_MEDIA_ROOT;
      const appData = mediaRoot ? path.dirname(mediaRoot) : null;
      const targets = appData
        ? [path.join(appData, "tmp"), path.join(appData, ".cache")]
        : [];
      let bytes = 0;
      const removed: string[] = [];
      for (const dir of targets) {
        bytes += await dirSize(dir);
        try {
          await rm(dir, { recursive: true, force: true });
          removed.push(dir);
        } catch (err) {
          console.error("[warn] could not remove", dir, (err as Error).message);
        }
      }
      const osTmp = path.join(os.tmpdir(), "hoichoi-ffmpeg");
      bytes += await dirSize(osTmp);
      await rm(osTmp, { recursive: true, force: true });
      removed.push(osTmp);
      console.log(JSON.stringify({ ok: true, bytes_freed: bytes, dirs: removed }, null, 2));
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

async function dirSize(dir: string): Promise<number> {
  const { readdir, stat } = await import("node:fs/promises");
  let total = 0;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const p = path.join(dir, entry.name);
      try {
        if (entry.isDirectory()) total += await dirSize(p);
        else total += (await stat(p)).size;
      } catch {
        /* file vanished mid-walk */
      }
    }
  } catch {
    /* dir does not exist */
  }
  return total;
}

/* ------------------------------------------------------------------ *
 * Persistent daemon mode — the desktop keeps ONE runner process alive  *
 * and sends `{"id","cmd","env"}` JSON lines on stdin; results come     *
 * back as `{"id","ok","data"}` / `{"id","ok":false,"error"}` on stdout.*
 * This removes the Node cold-start + full CLI boot per desk operation.  *
 * ------------------------------------------------------------------ */

interface DaemonRequest {
  id?: number;
  cmd?: string[];
  env?: Record<string, string>;
}

/** env keys the daemon injects per-request; stale keys are removed on the
 *  next request so a previous cloud/local mode switch can never leak a
 *  TURSO_DATABASE_URL across requests. */
const appliedEnvKeys: Record<string, string> = {};

function applyDaemonEnv(env?: Record<string, string>): void {
  const next = env ?? {};
  for (const k of Object.keys(appliedEnvKeys)) {
    if (!(k in next)) delete process.env[k];
  }
  for (const [k, v] of Object.entries(next)) {
    process.env[k] = v;
    appliedEnvKeys[k] = v;
  }
  if (!process.env.TURSO_DATABASE_URL && !process.env.DATABASE_URL) {
    const local = process.env.HOICHOI_LOCAL_DB_URL;
    if (local) process.env.TURSO_DATABASE_URL = local;
  }
}

interface ParsedArgs {
  positional: string[];
  flags: Record<string, string>;
  bools: Set<string>;
}

/** Faithful analogue of commander's `--flag value` / bare `--flag` parsing
 *  so daemon dispatch matches the one-shot CLI arg-for-arg. */
function parseArgs(args: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  const bools = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === undefined) break;
    if (a.startsWith("--")) {
      const nxt = args[i + 1];
      if (nxt !== undefined && !nxt.startsWith("--")) {
        flags[a.slice(2)] = nxt;
        i++;
      } else {
        bools.add(a.slice(2));
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags, bools };
}

/** Run `fn`, buffering everything the handler prints to stdout/stderr so the
 *  request's result can be shipped back as one JSON line. */
async function runCaptured(
  fn: () => Promise<void>,
): Promise<{ out: string; err: string }> {
  let out = "";
  let err = "";
  const ow = process.stdout.write;
  const ew = process.stderr.write;
  process.stdout.write = ((chunk: Uint8Array | string): boolean => {
    out += String(chunk);
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: Uint8Array | string): boolean => {
    err += String(chunk);
    return true;
  }) as typeof process.stderr.write;
  try {
    await fn();
  } finally {
    process.stdout.write = ow;
    process.stderr.write = ew;
  }
  return { out, err };
}

/** Mirror of the one-shot CLI handlers for every command the desktop issues,
 *  reusing the exact same helper functions so behavior can't drift. */
async function dispatchCmd(args: string[]): Promise<void> {
  const cmd = args[0];
  switch (cmd) {
    case "settings": {
      console.log(JSON.stringify({ settings: await getSettings() }, null, 2));
      return;
    }
    case "settings:set": {
      const fields: Partial<SiteSettings> = {};
      for (const a of args.slice(1)) {
        const eq = a.indexOf("=");
        if (eq <= 0) throw new Error(`expected field=value, got: ${a}`);
        const k = a.slice(0, eq) as keyof SiteSettings;
        const v = a.slice(eq + 1);
        if (!SETTING_KEYS.includes(k)) throw new Error(`unknown settings field: ${k}`);
        if (k === "pipeline_hours" || k === "archive_visible_days" || k === "archive_retention_days") {
          (fields as Record<string, number>)[k] = Number(v);
        } else {
          (fields as Record<string, string>)[k] = v;
        }
      }
      await updateSettings(fields);
      console.log(JSON.stringify({ ok: true, fields: Object.keys(fields) }, null, 2));
      return;
    }
    case "admin-code": {
      const action = args[1];
      const { positional, flags } = parseArgs(args.slice(2));
      if (action === "create") {
        const email = positional[0];
        if (!email) throw new Error("email required");
        const created = await createAdminLoginCode({ email, label: flags.label });
        console.log(JSON.stringify({ ok: true, ...created }));
      } else if (action === "list") {
        console.log(JSON.stringify({ ok: true, codes: await listAdminLoginCodes() }, null, 2));
      } else if (action === "revoke") {
        if (!flags.id) throw new Error("--id required");
        await revokeAdminLoginCode(flags.id);
        console.log(JSON.stringify({ ok: true }));
      } else if (action === "logout-sessions") {
        const email = positional[0];
        if (!email) throw new Error("email required (admin-code logout-sessions <email>)");
        const sessions = await revokeAdminSessionsByEmail(email);
        const codes = await revokeAdminLoginCodesByEmail(email);
        console.log(JSON.stringify({ ok: true, email, sessionsRevoked: sessions, codesRevoked: codes }));
      } else {
        throw new Error(`unknown action: ${action}`);
      }
      return;
    }
    case "backup": {
      const sub = args[1];
      if (sub === "export") {
        const bundle = await gatherExportBundle(getClient());
        const payload = encryptJson(bundle, backupPass());
        console.log(JSON.stringify({ ok: true, payload }));
      } else if (sub === "import") {
        const file = args[2];
        if (!file) throw new Error("file required");
        const pass = backupPass();
        const text = await readFile(file, "utf-8");
        const parsed = JSON.parse(text) as { payload?: string };
        const bundle = decryptJson(parsed.payload ?? text, pass) as ExportBundle;
        const written = await applyImportBundle(getClient(), bundle);
        console.log(JSON.stringify({ ok: true, written }, null, 2));
      } else if (sub === "verify") {
        const file = args[2];
        if (!file) throw new Error("file required");
        const pass = backupPass();
        const text = await readFile(file, "utf-8");
        const parsed = JSON.parse(text) as { payload?: string };
        const bundle = decryptJson(parsed.payload ?? text, pass) as ExportBundle;
        const checks: Record<string, string | number> = {
          version: bundle.version,
          exported_at: bundle.exported_at,
          tables: bundle.tables?.length ?? 0,
          credentials: Object.keys(bundle.credentials ?? {}).length,
        };
        for (const t of bundle.tables ?? []) checks[`rows:${t.name}`] = t.rows.length;
        console.log(JSON.stringify({ ok: true, valid: true, file, checks }, null, 2));
      } else if (sub === "auto") {
        const dir = args[2];
        if (!dir) throw new Error("dir required");
        const { flags } = parseArgs(args.slice(3));
        const { mkdir } = await import("node:fs/promises");
        await mkdir(dir, { recursive: true });
        const payload = encryptJson(await gatherExportBundle(getClient()), backupPass());
        const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19).replace("T", "_");
        const file = path.join(dir, `hoichoi-backup-${stamp}.bak`);
        await writeFile(file, JSON.stringify({ payload }, null, 2), "utf-8");
        const keep = Math.max(1, Number(flags.keep) || 7);
        const list = (await readdir(dir))
          .filter((f) => f.startsWith("hoichoi-backup-") && f.endsWith(".bak"))
          .sort()
          .slice(0, -keep);
        for (const old of list) {
          await rm(path.join(dir, old), { force: true });
        }
        console.log(JSON.stringify({ ok: true, file, kept: keep, pruned: list.length }));
      } else {
        throw new Error(`unknown backup subcommand: ${String(sub)}`);
      }
      return;
    }
    case "reset": {
      const { wiped } = await resetContent(getClient());
      console.log(JSON.stringify({ ok: true, wiped }));
      return;
    }
    case "sync": {
      const direction = args[1];
      if (direction !== "push" && direction !== "pull") throw new Error("direction must be push or pull");
      const { flags } = parseArgs(args.slice(2));
      if (!flags.from || !flags.to) throw new Error("--from and --to required");
const { from, to } = makeSyncClients(flags.from, flags.to);
      await ensureSchema(to, flags.to);
      const written = await copyTables(from, to, CONTENT_TABLES);
      console.log(JSON.stringify({ ok: true, direction, written }, null, 2));
      return;
    }
    case "stats": {
      console.log(JSON.stringify({ ok: true, stats: await statsSnapshot(), runs: await recentPipelineRuns(8) }, null, 2));
      return;
    }
    case "radar": {
      console.log(JSON.stringify({ ok: true, ...(await radarSnapshot()) }, null, 2));
      return;
    }
    case "media": {
      const sub = args[1];
      if (sub === "storage") {
        const next = args[2];
        if (next === "set") {
          const cfg = await readMediaStorageArg(args[3]);
          if (!cfg) throw new Error("json payload required (media storage set <json>)");
          await saveMediaStorageConfig(cfg);
        } else {
          const cfg = await readMediaStorageArg(next);
          if (cfg) await saveMediaStorageConfig(cfg);
        }
        const config = await getMediaStorageConfig();
        const registry = await storageRegistryCount();
        console.log(JSON.stringify({ ok: true, config, registry }, null, 2));
      } else if (sub === "cleanup") {
        const { flags, bools } = parseArgs(args.slice(2));
        const result = await cleanupMedia({
          dryRun: bools.has("dry-run"),
          months: flags.months !== undefined ? Number(flags.months) : undefined,
        });
        console.log(JSON.stringify({ ok: true, ...result }, null, 2));
      } else {
        throw new Error(`unknown media subcommand: ${String(sub)}`);
      }
      return;
    }
    case "sources": {
      const action = args[1];
      const { flags } = parseArgs(args.slice(2));
      if (action === "list") {
        console.log(JSON.stringify({ ok: true, sources: await listDeskSources() }, null, 2));
      } else if (action === "add") {
        if (!flags["page-url"] || !flags["page-name"]) throw new Error("--page-url and --page-name required");
        const source = await addDeskSource({
          pageUrl: flags["page-url"],
          pageName: flags["page-name"],
          kind: flags.kind,
          category: flags.category,
          categories: flags.categories,
          topics: flags.topics,
          fbId: flags["fb-id"],
        });
        console.log(JSON.stringify({ ok: true, source }, null, 2));
      } else if (action === "update") {
        if (!flags.id) throw new Error("--id required");
        const source = await updateDeskSource(flags.id, {
          pageUrl: flags["page-url"],
          pageName: flags["page-name"],
          kind: flags.kind,
          category: flags.category,
          categories: flags.categories,
          topics: flags.topics,
          fbId: flags["fb-id"],
          isActive: flags["is-active"],
        });
        console.log(JSON.stringify({ ok: true, source }, null, 2));
      } else if (action === "toggle") {
        if (!flags.id) throw new Error("--id required");
        await toggleDeskSource(flags.id);
        console.log(JSON.stringify({ ok: true }));
      } else if (action === "remove") {
        if (!flags.id) throw new Error("--id required");
        await removeDeskSource(flags.id);
        console.log(JSON.stringify({ ok: true }));
      } else if (action === "errors") {
        const { positional } = parseArgs(args.slice(3));
        const [sub, target] = positional;
        if (sub === "list") {
          console.log(JSON.stringify({ ok: true, errors: await listSourceErrors() }, null, 2));
        } else if (sub === "dismiss") {
          if (!target) throw new Error("error id required (sources errors dismiss <id>)");
          await setSourceErrorStatus(target, "dismissed");
          console.log(JSON.stringify({ ok: true, dismissed: target }));
        } else if (sub === "reopen") {
          if (!target) throw new Error("error id required (sources errors reopen <id>)");
          await setSourceErrorStatus(target, "open");
          console.log(JSON.stringify({ ok: true, reopened: target }));
        } else {
          throw new Error(`unknown sources errors action: ${String(sub)}`);
        }
      } else {
        throw new Error(`unknown action: ${action}`);
      }
      return;
    }
    case "queue": {
      const action = args[1];
      if (action === "list") {
        const { flags } = parseArgs(args.slice(2));
        console.log(JSON.stringify({ ok: true, rows: await listDeskQueue(flags.status) }, null, 2));
      } else if (action === "set") {
        const id = args[2];
        const status = args[3];
        if (!id || !status) throw new Error("id and status required");
        const allowed = ["approved", "rejected", "published"];
        if (!allowed.includes(status)) throw new Error(`status must be one of: ${allowed.join(", ")}`);
        const post = await getPostById(id);
        if (!post) throw new Error(`post not found: ${id}`);
        let finalStatus = status;
        if (status === "approved") {
          const cat = await getCategory(post.category);
          const needsDouble = Boolean(cat?.config.requires_double_approval) && post.status !== "approved";
          await updatePostStatus(id, needsDouble ? "approved" : "published", { publishedAt: !needsDouble });
          finalStatus = needsDouble ? "approved" : "published";
        } else if (status === "rejected") {
          await updatePostStatus(id, "rejected");
        } else {
          await updatePostStatus(id, "published", { publishedAt: true });
        }
        console.log(JSON.stringify({ ok: true, status: finalStatus }));
      } else if (action === "remove") {
        const id = args[2];
        if (!id) throw new Error("id required (queue remove <id>)");
        await deletePost(id);
        console.log(JSON.stringify({ ok: true, removed: id }));
      } else if (action === "bulk") {
        // One daemon round trip for a whole selection. The desk used to loop
        // `queue set` per row, so a 60-item bulk approve fired 60 sequential
        // calls with no feedback and read as "nothing happened".
        const target = parseBulkAction(args[2]);
        const { flags } = parseArgs(args.slice(3));
        const ids = parseBulkIds(flags.ids);
        const res =
          target === "remove"
            ? await bulkDeletePosts(ids)
            : await bulkModeratePosts(ids, target);
        console.log(
          JSON.stringify({ ok: res.missing.length === 0, action: target, ...res, ids }, null, 2),
        );
      } else {
        throw new Error(`unknown action: ${action}`);
      }
      return;
    }
    case "moderation": {
      const action = args[1];
      if (action === "list") {
        const { flags } = parseArgs(args.slice(2));
        const all = await getAllComments(300);
        const filtered = flags.status ? all.filter((c) => c.status === flags.status) : all;
        console.log(JSON.stringify({ ok: true, comments: filtered }, null, 2));
      } else if (action === "set") {
        const id = args[2];
        const status = args[3];
        if (!id || !status) throw new Error("id and status required (approved|blocked)");
        if (status !== "approved" && status !== "blocked") throw new Error("status must be approved|blocked");
        await setCommentStatus(id, status);
        console.log(JSON.stringify({ ok: true }));
      } else {
        throw new Error(`unknown action: ${action}`);
      }
      return;
    }
    case "categories": {
      const action = args[1];
      const { flags } = parseArgs(args.slice(2));
      if (action === "list") {
        console.log(JSON.stringify({ ok: true, categories: await listCategories() }, null, 2));
      } else if (action === "add") {
        if (!flags.slug || !flags["name-bn"] || !flags["name-en"]) {
          throw new Error("--slug, --name-bn and --name-en are required");
        }
        const slug = flags.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
        if (!slug) throw new Error("invalid slug — use lowercase letters, numbers and dashes");
        await createCategory({
          slug,
          displayNameBn: flags["name-bn"].trim(),
          displayNameEn: flags["name-en"].trim(),
          descriptionBn: flags["desc-bn"]?.trim() || undefined,
          descriptionEn: flags["desc-en"]?.trim() || undefined,
          dot: flags.dot?.trim() || undefined,
          sortOrder: flags.sort !== undefined ? Number(flags.sort) : undefined,
          showInFooter: flags.footer === undefined ? undefined : flags.footer === "true" || flags.footer === "1",
        });
        console.log(JSON.stringify({ ok: true, category: await getCategory(slug) }, null, 2));
      } else if (action === "update") {
        if (!flags.slug) throw new Error("--slug is required");
        const fields: Parameters<typeof updateCategory>[1] = {};
        if (flags["name-bn"] !== undefined) fields.displayNameBn = flags["name-bn"].trim();
        if (flags["name-en"] !== undefined) fields.displayNameEn = flags["name-en"].trim();
        if (flags["desc-bn"] !== undefined) fields.descriptionBn = flags["desc-bn"].trim();
        if (flags["desc-en"] !== undefined) fields.descriptionEn = flags["desc-en"].trim();
        if (flags.dot !== undefined) fields.dot = flags.dot.trim();
        if (flags.sort !== undefined) fields.sortOrder = Number(flags.sort);
        if (flags.footer !== undefined) fields.showInFooter = flags.footer === "true" || flags.footer === "1";
        if (Object.keys(fields).length === 0) {
          throw new Error("at least one field required (--name-bn, --name-en, --desc-bn, --desc-en, --dot, --sort, --footer)");
        }
        await updateCategory(flags.slug, fields);
        console.log(JSON.stringify({ ok: true, category: await getCategory(flags.slug) }, null, 2));
      } else if (action === "delete") {
        if (!flags.slug) throw new Error("--slug is required");
        await deleteCategory(flags.slug);
        console.log(JSON.stringify({ ok: true, deleted: flags.slug }));
      } else {
        throw new Error(`unknown action: ${action}`);
      }
      return;
    }
    case "providers": {
      const action = args[1];
      const { bools, flags } = parseArgs(args.slice(2));
      if (action === "list") {
        const providers = await listProviderRows();
        const out = bools.has("active-only") ? providers.filter((p) => p.is_active) : providers;
        console.log(JSON.stringify({ ok: true, providers: out }, null, 2));
      } else if (action === "upsert") {
        const provider = await upsertProvider({
          id: flags.id,
          key: flags.key,
          name: flags.name,
          model: flags.model,
          base: flags.base,
          env: flags.env,
          apiKey: flags["api-key"],
          priority: flags.priority,
          free: flags.free,
          rewrite: flags.rewrite,
          embed: flags.embed,
          isActive: flags["is-active"],
        });
        console.log(JSON.stringify({ ok: true, provider }, null, 2));
      } else if (action === "toggle") {
        if (!flags.id) throw new Error("--id required");
        const client = getClient();
        await client.execute({
          sql: "UPDATE llm_providers SET is_active = CASE is_active WHEN 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?",
          args: [nowIso(), flags.id],
        });
        console.log(JSON.stringify({ ok: true }));
      } else if (action === "remove") {
        if (!flags.id) throw new Error("--id required");
        await getClient().execute({ sql: "DELETE FROM llm_providers WHERE id = ?", args: [flags.id] });
        console.log(JSON.stringify({ ok: true }));
      } else if (action === "models") {
        if (!flags.key) throw new Error("--key required");
        const models = await probeProviderModels(flags.key, flags.base, flags["api-key"]);
        console.log(JSON.stringify({ ok: true, models }));
      } else {
        throw new Error(`unknown action: ${action}`);
      }
      return;
    }
    case "notice": {
      const action = args[1];
      const { bools, flags } = parseArgs(args.slice(2));
      if (action === "list") {
        const notices = await listNotices({ activeOnly: bools.has("active-only"), limit: 200 });
        console.log(JSON.stringify({ ok: true, notices }, null, 2));
      } else if (action === "add") {
        if (!flags.title) throw new Error("--title required");
        const notice = await createNotice({
          title: flags.title.trim(),
          body: flags.body ?? undefined,
          tone: flags.tone as NoticeTone | undefined,
          url: flags.url ?? undefined,
          pinned: flags.pinned === "true",
          is_active: flags.active !== "false",
          expires_at: flags["expires-at"] ?? undefined,
          created_by: "desktop",
        });
        console.log(JSON.stringify({ ok: true, notice }, null, 2));
      } else if (action === "update") {
        if (!flags.id) throw new Error("--id required");
        const fields: Parameters<typeof updateNotice>[1] = {};
        if (flags.title !== undefined) fields.title = flags.title.trim();
        if (flags.body !== undefined) fields.body = flags.body.trim() || null;
        if (flags.tone !== undefined) fields.tone = flags.tone as NoticeTone;
        if (flags.url !== undefined) fields.url = flags.url.trim() || null;
        if (flags.pinned !== undefined) fields.pinned = flags.pinned === "true";
        if (flags.active !== undefined) fields.is_active = flags.active === "true";
        if (flags["expires-at"] !== undefined) fields.expires_at = flags["expires-at"].trim() || null;
        if (Object.keys(fields).length === 0) throw new Error("at least one field --title/--body/--tone/--url/--pinned/--active/--expires-at required");
        const notice = await updateNotice(flags.id, fields);
        console.log(JSON.stringify({ ok: true, notice }, null, 2));
      } else if (action === "toggle") {
        if (!flags.id) throw new Error("--id required");
        const cur = await getNotice(flags.id);
        if (!cur) throw new Error("not found");
        const notice = await updateNotice(flags.id, { is_active: !cur.is_active });
        console.log(JSON.stringify({ ok: true, notice }, null, 2));
      } else if (action === "remove") {
        if (!flags.id) throw new Error("--id required");
        await deleteNotice(flags.id);
        console.log(JSON.stringify({ ok: true }));
      } else {
        throw new Error(`unknown action: ${action}`);
      }
      return;
    }
    case "loginlog": {
      const action = args[1];
      const { flags } = parseArgs(args.slice(2));
      if (action === "list") {
        const page = await listLoginLog(
          flags.page !== undefined ? Number(flags.page) : 1,
          flags["per-page"] !== undefined ? Number(flags["per-page"]) : 10,
        );
        console.log(JSON.stringify({ ok: true, ...page }, null, 2));
      } else if (action === "delete") {
        if (!flags.id) throw new Error("--id required");
        await deleteLoginLog(flags.id);
        console.log(JSON.stringify({ ok: true, deleted: flags.id }));
      } else if (action === "clear") {
        const rows = await clearLoginLog();
        console.log(JSON.stringify({ ok: true, cleared: rows }));
      } else {
        throw new Error(`unknown action: ${action}`);
      }
      return;
    }
    case "cleanup": {
      const action = args[1];
      if (action !== "temp") throw new Error(`unknown action: ${action}`);
      const mediaRoot = process.env.HOICHOI_MEDIA_ROOT;
      const appData = mediaRoot ? path.dirname(mediaRoot) : null;
      const targets = appData ? [path.join(appData, "tmp"), path.join(appData, ".cache")] : [];
      let bytes = 0;
      const removed: string[] = [];
      for (const dir of targets) {
        bytes += await dirSize(dir);
        try {
          await rm(dir, { recursive: true, force: true });
          removed.push(dir);
        } catch (err) {
          console.error("[warn] could not remove", dir, (err as Error).message);
        }
      }
      const osTmp = path.join(os.tmpdir(), "hoichoi-ffmpeg");
      bytes += await dirSize(osTmp);
      await rm(osTmp, { recursive: true, force: true });
      removed.push(osTmp);
      console.log(JSON.stringify({ ok: true, bytes_freed: bytes, dirs: removed }, null, 2));
      return;
    }
    default:
      throw new Error(`unknown runner command: ${String(cmd)}`);
  }
}

program
  .command("daemon")
  .description("persistent JSON-RPC runner — read {id,cmd,env} lines on stdin, write results on stdout")
  .action(() => {
    const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
    rl.on("line", (raw: string) => {
      const line = raw.trim();
      if (!line) return;
      void (async () => {
        let req: DaemonRequest | undefined;
        try {
          req = JSON.parse(line) as DaemonRequest;
          if (!req) throw new Error("malformed request");
          const id = req.id ?? 0;
          const cmd = req.cmd ?? [];
          const env = req.env;
          applyDaemonEnv(env);
          await ensureSchema(getClient());
          const captured = await runCaptured(() => dispatchCmd(cmd));
          if (process.exitCode && process.exitCode !== 0) {
            process.exitCode = 0;
            throw new Error(captured.err.trim() || "runner command failed");
          }
          process.stdout.write(JSON.stringify({ id, ok: true, data: captured.out }) + "\n");
        } catch (err) {
          process.stdout.write(JSON.stringify({ id: req?.id ?? 0, ok: false, error: (err as Error).message }) + "\n");
        }
      })();
    });
  });

program.parseAsync(process.argv).catch((err) => {
  console.error("[fatal]", (err as Error).message);
  process.exitCode = 1;
});