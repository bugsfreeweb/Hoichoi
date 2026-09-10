import { Command } from "commander";
import { readFile } from "node:fs/promises";
import { runPipeline, type PipelineOptions } from "./pipeline";
import { runArchivePass } from "./archive";
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
  createAdminLoginCode,
  listAdminLoginCodes,
  revokeAdminLoginCode,
  statsSnapshot,
  recentPipelineRuns,
  getAllComments,
  setCommentStatus,
  CONTENT_TABLES,
  type ExportBundle,
} from "@hoichoi/db";
import type { CategorySlug, SiteSettings } from "@hoichoi/shared-types";

const program = new Command();

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
      await ensureSchema(to);
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
    is_active: Boolean(row.is_active),
    last_scraped_at: (row.last_scraped_at as string | null) ?? null,
    posts_today: Number(row.posts_today ?? 0),
    health: Number(row.health ?? 100),
    created_at: String(row.created_at),
  };
}

async function listDeskSources() {
  const client = getClient();
  const today = new Date().toISOString().slice(0, 10);
  const res = await client.execute({
    sql: `SELECT s.*,
            (SELECT count(*) FROM raw_posts rp WHERE rp.source_id = s.id AND rp.scraped_at LIKE ?) AS posts_today
          FROM sources s ORDER BY s.is_active DESC, s.created_at DESC`,
    args: [`${today}%`],
  });
  return res.rows.map((r) => deskSourceRow(r as Record<string, unknown>));
}

async function addDeskSource(opts: {
  pageUrl: string;
  pageName: string;
  kind?: string;
  category?: string;
  topics?: string;
  fbId?: string | null;
}) {
  const client = getClient();
  const id = crypto.randomUUID();
  const created = new Date().toISOString();
  const topics = (opts.topics ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  await client.execute({
    sql: `INSERT INTO sources (id, page_url, page_name, category, is_verified, is_active, kind, fb_id, topics, created_at)
          VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?, ?)`,
    args: [
      id,
      opts.pageUrl.trim(),
      opts.pageName.trim(),
      (opts.category ?? "missing-children") as CategorySlug,
      opts.kind === "group" ? "group" : "page",
      opts.fbId ?? null,
      JSON.stringify(topics),
      created,
    ],
  });
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

function deskQueueRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title_bn: String(row.title_bn),
    source_name: String(row.source_name),
    category: row.category as CategorySlug,
    status: String(row.status),
    created_at: String(row.created_at),
  };
}

async function listDeskQueue(status?: string) {
  const client = getClient();
  const res = status
    ? await client.execute({
        sql: "SELECT id, slug, title_bn, source_name, category, status, created_at FROM posts WHERE status = ? ORDER BY created_at DESC LIMIT 80",
        args: [status],
      })
    : await client.execute(
        "SELECT id, slug, title_bn, source_name, category, status, created_at FROM posts ORDER BY created_at DESC LIMIT 80",
      );
  return res.rows.map((r) => deskQueueRow(r as Record<string, unknown>));
}

program
  .command("sources <action>")
  .description("desk watchlist: list / add / toggle / remove")
  .option("--page-url <url>", "page URL (add)")
  .option("--page-name <name>", "page name (add)")
  .option("--kind <kind>", "page | group (add)")
  .option("--category <slug>", "category slug (add)")
  .option("--topics <csv>", "comma-separated topics (add)")
  .option("--fb-id <id>", "facebook id (add)")
  .option("--id <id>", "source id (toggle/remove)")
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
          topics: opts.topics,
          fbId: opts.fbId,
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

program
  .command("queue <action>")
  .description("desk content queue: list")
  .option("--status <s>", "filter by post status")
  .action(async (action: string, opts: { status?: string }) => {
    try {
      await ensureSchema(getClient());
      if (action !== "list") throw new Error(`unknown action: ${action}`);
      console.log(JSON.stringify({ ok: true, rows: await listDeskQueue(opts.status) }, null, 2));
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

program.parseAsync(process.argv).catch((err) => {
  console.error("[fatal]", (err as Error).message);
  process.exitCode = 1;
});