import { Command } from "commander";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
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
  listLoginLog,
  deleteLoginLog,
  clearLoginLog,
  mapProvider,
  nowIso,
  CONTENT_TABLES,
  type ExportBundle,
} from "@hoichoi/db";
import type { CategorySlug, NoticeTone, ProviderKey, SiteSettings } from "@hoichoi/shared-types";

/** Structural match for @libsql/client's InValue (avoids pulling the dep into scraper). */
type SqlValue = null | string | number | bigint | Uint8Array | ArrayBuffer;

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
    categories: row.category_csv
      ? String(row.category_csv).split(",").map((s) => s.trim()).filter(Boolean)
      : row.category ? [String(row.category)] : [],
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
            (SELECT count(*) FROM raw_posts rp WHERE rp.source_id = s.id AND rp.scraped_at LIKE ?) AS posts_today,
            (SELECT COALESCE(GROUP_CONCAT(category_slug), '') FROM source_categories sc WHERE sc.source_id = s.id) AS category_csv
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
  categories?: string;
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
  
  // Parse categories (comma-separated)
  const categories = (opts.categories ?? opts.category ?? "missing-children")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  await client.execute({
    sql: `INSERT INTO sources (id, page_url, page_name, category, is_verified, is_active, kind, fb_id, topics, created_at)
          VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?, ?)`,
    args: [
      id,
      opts.pageUrl.trim(),
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
    await client.execute({ sql: `INSERT INTO source_categories (source_id, category_slug) VALUES ${values}`, args });
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

program
  .command("queue <action> [id] [status]")
  .description("desk content queue: list [--status s] / set <id> <approved|rejected|published>")
  .option("--status <s>", "filter by post status")
  .action(async (action: string, id: string | undefined, status: string | undefined, opts: { status?: string }) => {
    try {
      await ensureSchema(getClient());
      if (action === "list") {
        console.log(JSON.stringify({ ok: true, rows: await listDeskQueue(opts.status) }, null, 2));
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
      o.model?.trim() || "", o.env?.trim() || `${key.toUpperCase().replace(/-/g, "_")}_API_KEY`,
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

program.parseAsync(process.argv).catch((err) => {
  console.error("[fatal]", (err as Error).message);
  process.exitCode = 1;
});