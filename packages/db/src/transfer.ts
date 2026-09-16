/**
 * @hoichoi/db — backup / restore / reset / cross-DB sync (node:crypto).
 * Used by the scraper CLI (runner), web APIs, and the desktop.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { createClient, type Client, type InValue, type Row } from "@libsql/client";
import { nowIso, ensureSchema } from "./client";
import { seedDefaults } from "./seed";

/** Content tables, parents-first so FK-friendly ordering works. */
export const CONTENT_TABLES = [
  "sources",
  "category_configs",
  "source_categories",
  "llm_providers",
  "redaction_blocklist",
  "raw_posts",
  "posts",
  "comments",
  "reader_reports",
  "submitted_pages",
  "removal_requests",
  "admin_users",
  "admin_actions",
  "settings",
] as const;

/** Full backup also carries operational logs (restore-only, not synced). */
export const BACKUP_TABLES = [...CONTENT_TABLES, "pipeline_runs"] as const;

/** Tables never copied between DBs (device-local auth sessions). */
const SKIP_TABLES = new Set(["admin_sessions"]);

export const BACKUP_VERSION = 1;

function quoteIdent(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`;
}

async function readTable(client: Client, table: string): Promise<{ columns: string[]; rows: Row[] }> {
  const res = await client.execute(`SELECT * FROM ${quoteIdent(table)}`);
  return { columns: res.columns, rows: res.rows as Row[] };
}

async function writeTable(client: Client, table: string, columns: string[], rows: Row[]): Promise<number> {
  if (rows.length === 0) return 0;
  const colList = columns.map(quoteIdent).join(", ");
  const ph = columns.map(() => "?").join(", ");
  for (const r of rows) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO ${quoteIdent(table)} (${colList}) VALUES (${ph})`,
      args: columns.map((c) => {
        const v = (r as Record<string, unknown>)[c];
        return (v === undefined ? null : v) as InValue;
      }),
    });
  }
  return rows.length;
}

async function listTables(client: Client): Promise<string[]> {
  const res = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_migrations'",
  );
  return (res.rows as Row[])
    .map((r) => String(r.name))
    .filter((n) => !SKIP_TABLES.has(n) && !n.startsWith("_"));
}

/** Copy selected tables from one libSQL client to another (e.g. local ↔ Turso). */
export async function copyTables(
  from: Client,
  to: Client,
  tables: readonly string[] = CONTENT_TABLES,
): Promise<Record<string, number>> {
  const written: Record<string, number> = {};
  for (const table of tables) {
    const { columns, rows } = await readTable(from, table);
    written[table] = await writeTable(to, table, columns, rows);
  }
  return written;
}

export interface ExportBundle {
  version: number;
  exported_at: string;
  tables: Array<{ name: string; columns: string[]; rows: Row[] }>;
  credentials: Record<string, string>;
}

/** Credential names that may ride along in a backup (from env / vault). */
export const CREDENTIAL_BACKUP_KEYS = [
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "GOOGLE_API_KEY",
  "GROQ_API_KEY",
  "OPENROUTER_API_KEY",
  "OLLAMA_BASE_URL",
  "FB_SESSION_COOKIE",
] as const;

/** Gather every content table + optional credential env values. */
export async function gatherExportBundle(
  client: Client,
  credentialsFrom: Record<string, string> = {},
): Promise<ExportBundle> {
  const tables: ExportBundle["tables"] = [];
  for (const t of BACKUP_TABLES) {
    const { columns, rows } = await readTable(client, t);
    tables.push({ name: t, columns, rows });
  }
  const credentials: Record<string, string> = {};
  for (const key of CREDENTIAL_BACKUP_KEYS) {
    if (credentialsFrom[key]) credentials[key] = credentialsFrom[key];
    else if (process.env[key]) credentials[key] = process.env[key]!;
  }
  return { version: BACKUP_VERSION, exported_at: nowIso(), tables, credentials };
}

/** Restore tables + credentials (credentials are only reflected back to env). */
export async function applyImportBundle(
  client: Client,
  bundle: ExportBundle,
): Promise<Record<string, number>> {
  if (bundle.version !== BACKUP_VERSION) throw new Error("unsupported backup version");
  const written: Record<string, number> = {};
  for (const table of bundle.tables) {
    if (!BACKUP_TABLES.includes(table.name as (typeof BACKUP_TABLES)[number])) {
      throw new Error(`unknown table in backup: ${table.name}`);
    }
    await client.execute(`DELETE FROM ${quoteIdent(table.name)}`);
    written[table.name] = await writeTable(client, table.name, table.columns, table.rows);
  }
  return written;
}

/**
 * Full reset: drop content + operational rows, clear settings/config back to
 * defaults (categories, providers, blocklist re-seeded; admin user kept).
 */
export async function resetContent(client: Client): Promise<{ wiped: string[] }> {
  const wiped = ["admin_actions", "removal_requests", "submitted_pages", "posts", "raw_posts", "pipeline_runs"];
  await client.execute("BEGIN");
  try {
    for (const t of wiped) await client.execute(`DELETE FROM ${quoteIdent(t)}`);
    await client.execute("DELETE FROM settings");
    await client.execute("DELETE FROM category_configs");
    await client.execute("DELETE FROM llm_providers");
    await client.execute("DELETE FROM redaction_blocklist");
    await client.execute("COMMIT");
  } catch (err) {
    await client.execute("ROLLBACK");
    throw err;
  }
  await seedDefaults(client, nowIso());
  return { wiped };
}

/** AES-256-GCM backup encryption (PBKDF2 via scrypt). */
export function encryptJson(obj: unknown, passphrase: string): string {
  if (!passphrase) throw new Error("passphrase required");
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(passphrase, salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(obj), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.from(
    JSON.stringify({
      v: 1,
      salt: salt.toString("base64"),
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      data: data.toString("base64"),
    }),
  ).toString("base64");
}

export function decryptJson(payload: string, passphrase: string): unknown {
  const parsed = JSON.parse(Buffer.from(payload, "base64").toString("utf8")) as {
    v?: number;
    salt: string;
    iv: string;
    tag: string;
    data: string;
  };
  if (parsed.v !== 1) throw new Error("unsupported encryption version");
  const key = scryptSync(passphrase, Buffer.from(parsed.salt, "base64"), 32);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(parsed.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
  const out = Buffer.concat([
    decipher.update(Buffer.from(parsed.data, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(out.toString("utf8"));
}

/** Create a client for an arbitrary URL (file or Turso), token from env. */
export function makeSyncClient(url: string): Client {
  const config: { url: string; authToken?: string } = { url };
  if (url.startsWith("libsql://") && process.env.TURSO_AUTH_TOKEN) {
    config.authToken = process.env.TURSO_AUTH_TOKEN;
  }
  return createClient(config);
}

/** Two-sided sync client pair (used by the runner `sync` command). */
export function makeSyncClients(fromUrl: string, toUrl: string): { from: Client; to: Client } {
  return { from: makeSyncClient(fromUrl), to: makeSyncClient(toUrl) };
}

export { ensureSchema };