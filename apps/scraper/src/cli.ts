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
  CONTENT_TABLES,
  type ExportBundle,
} from "@hoichoi/db";
import type { SiteSettings } from "@hoichoi/shared-types";

const program = new Command();

program
  .name("hoichoi-scraper")
  .description("হইচই auto-curation pipeline — scrape, dedup, rewrite, archive")
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
];

program
  .command("settings:set <assign...>")
  .description('update site settings — e.g. settings:set "site_name=হইচই" "slogan_bn=..." "accent_color=#d64541"')
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

program.parseAsync(process.argv).catch((err) => {
  console.error("[fatal]", (err as Error).message);
  process.exitCode = 1;
});