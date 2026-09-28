import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

/** True when running inside the Tauri webview (not a plain browser tab). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export { invoke, listen };

export async function repoRoot(): Promise<string> {
  return invoke<string>("repo_root");
}

export async function startPipeline(env: Record<string, string>): Promise<void> {
  await invoke("run_pipeline", { env });
}

/** Abort the running collector pipeline from the desk UI. */
export async function stopPipeline(): Promise<void> {
  await invoke("stop_pipeline");
}

export async function openAdmin(url: string): Promise<void> {
  await invoke("open_admin", { url });
}

/** Read site settings through the bundled runner (branding + cadence). */
const settingsCache = new Map<string, { at: number; value: Record<string, unknown> }>();
const SETTINGS_TTL_MS = 2000;

export async function settingsGet(env: Record<string, string>) {
  const key = JSON.stringify(env);
  const cached = settingsCache.get(key);
  if (cached && Date.now() - cached.at < SETTINGS_TTL_MS) return cached.value;
  const raw = await invoke<string>("settings_get", { env });
  const parsed = JSON.parse(raw) as { settings?: Record<string, unknown> };
  const value = (parsed.settings ?? parsed) as Record<string, unknown>;
  settingsCache.set(key, { at: Date.now(), value });
  return value;
}

/** Update site settings through the bundled runner. */
export async function settingsSet(
  env: Record<string, string>,
  fields: Record<string, string | number>,
): Promise<void> {
  await invoke("settings_set", { env, fields });
  settingsCache.clear();
}

/** Encrypted full backup → returns the written backup file path. */
export async function backupExport(pass: string, env: Record<string, string>): Promise<string> {
  return await invoke<string>("backup_export", { pass, env });
}

/** Restore from a backup file path (omit path to use the latest backup). */
export async function backupImport(
  pass: string,
  env: Record<string, string>,
  path?: string,
): Promise<void> {
  await invoke("backup_import", { pass, env, path: path ?? null });
}

/** Wipe content + reset settings/config to defaults (admin account kept). */
export async function resetDb(env: Record<string, string>): Promise<void> {
  await invoke("reset_db", { env });
}

/** One-click local ↔ Turso sync; returns structured result. */
export async function syncDb(
  direction: "push" | "pull",
  env: Record<string, string>,
): Promise<SyncResult> {
  return await invoke<SyncResult>("sync_db", { direction, env });
}

export interface SyncResult {
  ok: true;
  direction: "push" | "pull";
  /** Content tables that were copied. */
  tablesSynced: number;
  /** Alias kept for older callers. */
  syncedTables: number;
  rowsAffected: number;
  conflicts: number;
  /** Per-table row counts as reported by the runner. */
  detail?: Record<string, number>;
}

export interface AdminLoginCode {
  id: string;
  email: string;
  label: string | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
}

export interface CreatedAdminLoginCode {
  ok: boolean;
  id: string;
  code: string;
  email: string;
  expires_at: string;
}

export interface AdminCodeList {
  ok: boolean;
  codes: AdminLoginCode[];
}

/** Create / list / revoke one-time admin login codes via the bundled runner.
 *  `logout-sessions` boots every active web-admin session + pending codes for
 *  `email` (desktop-controlled remote logout). */
export async function adminCodes(
  op: "create" | "list" | "revoke" | "logout-sessions",
  env: Record<string, string>,
  opts?: { email?: string; label?: string | null; id?: string | null },
): Promise<CreatedAdminLoginCode | AdminCodeList | { ok: boolean }> {
  const raw = await invoke<string>("admin_codes", {
    op,
    email: opts?.email ?? null,
    label: opts?.label ?? null,
    id: opts?.id ?? null,
    env,
  });
  return JSON.parse(raw);
}

/* ------------------------------------------------------------------ *
 * Desk console — watchlist / queue / moderation / stats (runner JSON) *
 * ------------------------------------------------------------------ */

export interface DeskSource {
  id: string;
  page_url: string;
  page_name: string;
  kind: "page" | "group";
  fb_id: string | null;
  topics: string[];
  category: string;
  /** Multi-category membership via source_categories (authoritative). */
  categories: string[];
  is_active: boolean;
  last_scraped_at: string | null;
  posts_today: number;
  health: number;
  created_at: string;
}

export interface DeskQueueRow {
  id: string;
  slug: string;
  title_bn: string;
  source_name: string;
  category: string;
  status: string;
  created_at: string;
  summary_bn: string | null;
  body_bn: string | null;
}

export interface DeskComment {
  id: string;
  post_id: string;
  author: string;
  body: string;
  likes: number;
  status: "pending" | "approved" | "blocked";
  created_at: string;
  postTitle: string | null;
  postCategory: string | null;
}

export interface DeskRunLite {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  stats: Record<string, unknown> | null;
  provider_used: string | null;
  error: string | null;
}

export interface DeskStats {
  stats: {
    collectedToday: number;
    duplicatesBlocked: number;
    dedupRate: number;
    lastRunStatus: "never" | "success" | "failed" | string;
    published: number;
    pendingReview: number;
    avgRunDurationSec: number;
    byCategory: Record<string, number>;
  };
  runs: DeskRunLite[];
}

/**
 * Thrown when a runner subcommand reports `ok: false`.
 *
 * The payload is retained because several commands are *partially* successful:
 * a bulk approve that skipped a deleted ID still updated every other row, and
 * losing the payload reduced that to an opaque "runner error" in the UI.
 */
export class DeskCallError extends Error {
  readonly payload: Record<string, unknown>;
  constructor(payload: Record<string, unknown>) {
    super(String(payload.error ?? "runner error"));
    this.name = "DeskCallError";
    this.payload = payload;
  }
}

/**
 * Run a desk-console runner subcommand and parse its JSON stdout. `args` are
 * the raw CLI tokens — e.g. ["sources", "list"] or ["queue", "list"].
 */
export async function deskCall(
  args: string[],
  env: Record<string, string>,
): Promise<Record<string, unknown>> {
  const raw = await invoke<string>("desk_call", { args, env });
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if (parsed && typeof parsed === "object" && "ok" in parsed && parsed.ok === false) {
    throw new DeskCallError(parsed);
  }
  return parsed;
}

export async function deskSources(env: Record<string, string>): Promise<DeskSource[]> {
  const res = await deskCall(["sources", "list"], env);
  return (res.sources as DeskSource[]) ?? [];
}

export async function deskAddSource(
  env: Record<string, string>,
  input: { pageUrl: string; pageName: string; kind?: string; category?: string; categories?: string[]; topics?: string; fbId?: string | null },
): Promise<DeskSource> {
  const args = ["sources", "add", "--page-url", input.pageUrl, "--page-name", input.pageName];
  if (input.kind) args.push("--kind", input.kind);
  if (input.category) args.push("--category", input.category);
  if (input.categories && input.categories.length > 0) args.push("--categories", input.categories.join(","));
  if (input.topics) args.push("--topics", input.topics);
  if (input.fbId) args.push("--fb-id", input.fbId);
  const res = await deskCall(args, env);
  return res.source as DeskSource;
}

export async function deskToggleSource(env: Record<string, string>, id: string): Promise<void> {
  await deskCall(["sources", "toggle", "--id", id], env);
}

export async function deskUpdateSource(
  env: Record<string, string>,
  id: string,
  fields: {
    pageUrl?: string;
    pageName?: string;
    kind?: string;
    category?: string;
    categories?: string[];
    topics?: string;
    fbId?: string | null;
    isActive?: boolean;
  },
): Promise<DeskSource | null> {
  const args = ["sources", "update", "--id", id];
  if (fields.pageUrl !== undefined) args.push("--page-url", fields.pageUrl);
  if (fields.pageName !== undefined) args.push("--page-name", fields.pageName);
  if (fields.kind !== undefined) args.push("--kind", fields.kind);
  if (fields.category !== undefined) args.push("--category", fields.category);
  if (fields.categories !== undefined) args.push("--categories", fields.categories.join(","));
  if (fields.topics !== undefined) args.push("--topics", fields.topics);
  if (fields.fbId !== undefined) args.push("--fb-id", fields.fbId ?? "");
  if (fields.isActive !== undefined) args.push("--is-active", fields.isActive ? "true" : "false");
  const res = await deskCall(args, env);
  return (res.source as DeskSource | null) ?? null;
}

export async function deskRemoveSource(env: Record<string, string>, id: string): Promise<void> {
  await deskCall(["sources", "remove", "--id", id], env);
}

export interface DeskCategory {
  slug: string;
  displayNameBn: string;
  displayNameEn: string;
  descriptionBn: string;
  descriptionEn: string;
  dot: string;
  sortOrder: number;
  /** Whether this category appears in the public site footer nav. */
  showInFooter: boolean;
}

export async function deskCategories(env: Record<string, string>): Promise<DeskCategory[]> {
  const res = await deskCall(["categories", "list"], env);
  return (res.categories as DeskCategory[]) ?? [];
}

export async function deskAddCategory(
  env: Record<string, string>,
  input: {
    slug: string;
    displayNameBn: string;
    displayNameEn: string;
    descriptionBn?: string;
    descriptionEn?: string;
    dot?: string;
    showInFooter?: boolean;
  },
): Promise<DeskCategory | null> {
  const args = [
    "categories", "add",
    "--slug", input.slug,
    "--name-bn", input.displayNameBn,
    "--name-en", input.displayNameEn,
  ];
  if (input.descriptionBn) args.push("--desc-bn", input.descriptionBn);
  if (input.descriptionEn) args.push("--desc-en", input.descriptionEn);
  if (input.dot) args.push("--dot", input.dot);
  if (input.showInFooter !== undefined) args.push("--footer", input.showInFooter ? "true" : "false");
  const res = await deskCall(args, env);
  return (res.category as DeskCategory | null) ?? null;
}

export async function deskUpdateCategory(
  env: Record<string, string>,
  slug: string,
  fields: {
    displayNameBn?: string;
    displayNameEn?: string;
    descriptionBn?: string;
    descriptionEn?: string;
    dot?: string;
    sortOrder?: number;
    showInFooter?: boolean;
  },
): Promise<DeskCategory | null> {
  const args = ["categories", "update", "--slug", slug];
  if (fields.displayNameBn !== undefined) args.push("--name-bn", fields.displayNameBn);
  if (fields.displayNameEn !== undefined) args.push("--name-en", fields.displayNameEn);
  if (fields.descriptionBn !== undefined) args.push("--desc-bn", fields.descriptionBn);
  if (fields.descriptionEn !== undefined) args.push("--desc-en", fields.descriptionEn);
  if (fields.dot !== undefined) args.push("--dot", fields.dot);
  if (fields.sortOrder !== undefined) args.push("--sort", String(fields.sortOrder));
  if (fields.showInFooter !== undefined) args.push("--footer", fields.showInFooter ? "true" : "false");
  const res = await deskCall(args, env);
  return (res.category as DeskCategory | null) ?? null;
}

export async function deskDeleteCategory(env: Record<string, string>, slug: string): Promise<void> {
  await deskCall(["categories", "delete", "--slug", slug], env);
}

export async function deskQueue(env: Record<string, string>, status?: string | null): Promise<DeskQueueRow[]> {
  const args = ["queue", "list"];
  if (status) args.push("--status", status);
  const res = await deskCall(args, env);
  return (res.rows as DeskQueueRow[]) ?? [];
}

export async function deskQueueUpdate(
  env: Record<string, string>,
  id: string,
  fields: { title?: string; body?: string; summary?: string | null; category?: string },
): Promise<void> {
  const args = ["queue", "update", id];
  if (fields.title !== undefined) args.push("--title", fields.title);
  if (fields.body !== undefined) args.push("--body", fields.body);
  if (fields.summary !== undefined) args.push("--summary", fields.summary === null ? "__CLEAR__" : fields.summary);
  if (fields.category !== undefined) args.push("--category", fields.category);
  await deskCall(args, env);
}

export async function deskQueueRemove(env: Record<string, string>, id: string): Promise<void> {
  await deskCall(["queue", "remove", id], env);
}

export async function deskQueueSet(
  env: Record<string, string>,
  id: string,
  status: "approved" | "rejected" | "published",
): Promise<void> {
  await deskCall(["queue", "set", id, status], env);
}

export interface DeskBulkResult {
  requested: number;
  updated: string[];
  missing: string[];
  /** Held at `approved` because the category requires a second approval. */
  needsSecondApproval: string[];
  published: string[];
  rejected: string[];
  removed: string[];
  deleted?: string[];
}

/**
 * Approve/reject/publish/delete a whole selection in ONE runner call.
 *
 * The per-row loop this replaces fired one daemon request per item, so a
 * 60-row bulk approve sat silent for a minute and any single failure aborted
 * the rest with the error swallowed — indistinguishable from "not working".
 */
export async function deskQueueBulk(
  env: Record<string, string>,
  ids: string[],
  target: "approved" | "rejected" | "published" | "remove",
): Promise<DeskBulkResult> {
  // A bulk run reports `ok: false` whenever *any* id is missing, even though
  // the rest were updated. Recover the payload so the UI can show exactly which
  // rows changed and which were skipped, instead of a blanket failure.
  let res: Record<string, unknown>;
  try {
    res = await deskCall(["queue", "bulk", target, "--ids", ids.join(",")], env);
  } catch (e) {
    if (e instanceof DeskCallError && Array.isArray(e.payload.updated)) {
      res = e.payload;
    } else {
      throw e;
    }
  }
  return {
    requested: Number(res.requested ?? ids.length),
    updated: (res.updated as string[]) ?? [],
    missing: (res.missing as string[]) ?? [],
    needsSecondApproval: (res.needsSecondApproval as string[]) ?? [],
    published: (res.published as string[]) ?? [],
    rejected: (res.rejected as string[]) ?? [],
    removed: (res.removed as string[]) ?? [],
    deleted: res.deleted as string[] | undefined,
  };
}

export async function deskStats(env: Record<string, string>): Promise<DeskStats> {
  const res = await deskCall(["stats"], env);
  return res as unknown as DeskStats;
}

export interface DeskRadarCategory {
  slug: string;
  name: string;
  dot: string;
}

export interface DeskRadarSnapshot {
  categories: DeskRadarCategory[];
  stages: {
    collected: Record<string, number>;
    queued: Record<string, number>;
    published: Record<string, number>;
    duplicate: Record<string, number>;
  };
  totals: { collected: number; queued: number; published: number; duplicate: number };
  generatedAt: string;
}

/** Per-category pipeline-stage snapshot feeding the Collector polar radar. */
export async function deskRadarStats(env: Record<string, string>): Promise<DeskRadarSnapshot> {
  const res = await deskCall(["radar"], env);
  return res as unknown as DeskRadarSnapshot;
}

export async function deskModeration(
  env: Record<string, string>,
  status?: string | null,
): Promise<DeskComment[]> {
  const args = ["moderation", "list"];
  if (status) args.push("--status", status);
  const res = await deskCall(args, env);
  return (res.comments as DeskComment[]) ?? [];
}

export async function deskModerationSet(
  env: Record<string, string>,
  id: string,
  status: "approved" | "blocked",
): Promise<void> {
  await deskCall(["moderation", "set", id, status], env);
}

/* ------------------------------------------------------------------ *
 * Remote media storage (adapter chain, retention cleanup)             *
 * ------------------------------------------------------------------ */

export interface DeskMediaStorage {
  config: MediaStorageConfig;
  registry: number;
}

export interface MediaStorageAdapterConfig {
  kind: "github" | "s3";
  enabled: boolean;
  label: string;
  provider?: "idrivee2" | "backblaze";
  endpoint?: string;
  bucket?: string;
  region?: string;
  prefix?: string;
  branch?: string;
  mediaPath?: string;
}

export interface MediaStorageConfig {
  adapters: MediaStorageAdapterConfig[];
  purge_local_after_upload: boolean;
  retention_months: number;
  cleanup_enabled: boolean;
}

export async function deskMediaStorage(
  env: Record<string, string>,
  cfgJson?: string,
): Promise<DeskMediaStorage> {
  const args = ["media", "storage"];
  // Hand the policy over as an env var, never as an argv token: JSON contains
  // double quotes and every shell hop (cmd.exe + C runtime) on the dev path
  // used to strip them, which made the runner fail JSON.parse. The runner
  // still accepts the positional form for CLI users.
  const callEnv = cfgJson ? { ...env, HOICHOI_MEDIA_STORAGE_JSON: cfgJson } : env;
  const res = await deskCall(args, callEnv);
  return res as unknown as DeskMediaStorage;
}

export async function deskMediaCleanup(
  env: Record<string, string>,
  opts?: { dryRun?: boolean; months?: number },
): Promise<{ dryRun: boolean; considered: number; removed: number; skipped: number; cutoff: string }> {
  const args = ["media", "cleanup"];
  if (opts?.dryRun) args.push("--dry-run");
  if (opts?.months !== undefined) args.push("--months", String(opts.months));
  const res = await deskCall(args, env);
  return res as unknown as { dryRun: boolean; considered: number; removed: number; skipped: number; cutoff: string };
}

/* ------------------------------------------------------------------ *
 * Source error inbox (scrape health)                                  *
 * ------------------------------------------------------------------ */

export interface DeskSourceError {
  id: string;
  source_id: string;
  source_name: string | null;
  err_kind: string;
  message: string;
  status: "open" | "dismissed";
  count: number;
  first_seen_at: string;
  last_seen_at: string;
}

export async function deskSourceErrors(env: Record<string, string>): Promise<DeskSourceError[]> {
  const res = await deskCall(["sources", "errors", "list"], env);
  return (res.errors as DeskSourceError[]) ?? [];
}

export async function deskSourceErrorSet(
  env: Record<string, string>,
  id: string,
  status: "dismiss" | "reopen",
): Promise<void> {
  await deskCall(["sources", "errors", status, id], env);
}

/* ------------------------------------------------------------------ *
 * Backup: verify (dry-run) + auto (rotating folder)                   *
 * ------------------------------------------------------------------ */

export async function deskBackupVerify(
  pass: string,
  file: string,
  env: Record<string, string>,
): Promise<Record<string, unknown>> {
  return deskCall(["backup", "verify", file], { ...env, HOICHOI_BACKUP_PASS: pass });
}

export async function deskBackupAuto(
  pass: string,
  dir: string,
  keep: number,
  env: Record<string, string>,
): Promise<{ file: string; kept: number; pruned: number }> {
  const res = await deskCall(["backup", "auto", dir, "--keep", String(keep)], {
    ...env,
    HOICHOI_BACKUP_PASS: pass,
  });
  return res as unknown as { file: string; kept: number; pruned: number };
}

/* ------------------------------------------------------------------ *
 * LLM provider management (desktop → runner `providers`)              *
 * ------------------------------------------------------------------ */

export interface DeskProvider {
  id: string;
  provider_key: string;
  display_name: string;
  base_url: string | null;
  model_name: string;
  api_key_env_var: string;
  api_key: string | null;
  priority: number;
  is_active: boolean;
  is_free_tier: boolean;
  supports_rewrite: boolean;
  supports_embeddings: boolean;
  last_ok_at: string | null;
  last_error_at: string | null;
  error_count: number;
  created_at: string;
  updated_at: string;
}

export async function deskProviders(env: Record<string, string>): Promise<DeskProvider[]> {
  const res = await deskCall(["providers", "list"], env);
  return (res.providers as DeskProvider[]) ?? [];
}

export interface DeskProviderInput {
  id?: string;
  providerKey?: string;
  displayName?: string;
  baseUrl?: string;
  modelName?: string;
  envVar?: string;
  apiKey?: string;
  priority?: number;
  free?: boolean;
  rewrite?: boolean;
  embed?: boolean;
  isActive?: boolean;
}

export async function deskUpsertProvider(
  env: Record<string, string>,
  input: DeskProviderInput,
): Promise<DeskProvider> {
  const args = ["providers", "upsert"];
  if (input.id) args.push("--id", input.id);
  if (input.providerKey) args.push("--key", input.providerKey);
  if (input.displayName !== undefined) args.push("--name", input.displayName);
  if (input.baseUrl !== undefined) args.push("--base", input.baseUrl);
  if (input.modelName !== undefined) args.push("--model", input.modelName);
  if (input.envVar !== undefined) args.push("--env", input.envVar);
  if (input.apiKey !== undefined) args.push("--api-key", input.apiKey);
  if (input.priority !== undefined) args.push("--priority", String(input.priority));
  if (input.free !== undefined) args.push("--free", input.free ? "true" : "false");
  if (input.rewrite !== undefined) args.push("--rewrite", input.rewrite ? "true" : "false");
  if (input.embed !== undefined) args.push("--embed", input.embed ? "true" : "false");
  if (input.isActive !== undefined) args.push("--is-active", input.isActive ? "true" : "false");
  const res = await deskCall(args, env);
  return res.provider as DeskProvider;
}

export async function deskToggleProvider(env: Record<string, string>, id: string): Promise<void> {
  await deskCall(["providers", "toggle", "--id", id], env);
}

export async function deskRemoveProvider(env: Record<string, string>, id: string): Promise<void> {
  await deskCall(["providers", "remove", "--id", id], env);
}

export interface DeskProviderModel {
  id: string;
  label: string;
}

export async function deskProviderModels(
  env: Record<string, string>,
  input: { providerKey: string; baseUrl?: string; apiKey?: string },
): Promise<DeskProviderModel[]> {
  const args = ["providers", "models", "--key", input.providerKey];
  if (input.baseUrl) args.push("--base", input.baseUrl);
  if (input.apiKey) args.push("--api-key", input.apiKey);
  const res = await deskCall(args, env);
  return (res.models as DeskProviderModel[]) ?? [];
}

/* ------------------------------------------------------------------ *
 * Notices / announcements (desktop → runner `notice`)                 *
 * ------------------------------------------------------------------ */

export type DeskNoticeTone = "info" | "success" | "warn" | "alert";

export interface DeskNotice {
  id: string;
  title: string;
  body: string | null;
  tone: DeskNoticeTone;
  url: string | null;
  pinned: boolean;
  is_active: boolean;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export async function deskNotices(
  env: Record<string, string>,
  activeOnly = false,
): Promise<DeskNotice[]> {
  const args = ["notice", "list"];
  if (activeOnly) args.push("--active-only");
  const res = await deskCall(args, env);
  return (res.notices as DeskNotice[]) ?? [];
}

export interface DeskNoticeInput {
  id?: string;
  title?: string;
  body?: string | null;
  tone?: DeskNoticeTone;
  url?: string | null;
  pinned?: boolean;
  active?: boolean;
  expiresAt?: string | null;
}

export async function deskAddNotice(
  env: Record<string, string>,
  input: DeskNoticeInput,
): Promise<DeskNotice> {
  const args = ["notice", "add", "--title", input.title ?? ""];
  if (input.body !== undefined) args.push("--body", input.body ?? "");
  if (input.tone) args.push("--tone", input.tone);
  if (input.url !== undefined) args.push("--url", input.url ?? "");
  if (input.pinned !== undefined) args.push("--pinned", input.pinned ? "true" : "false");
  if (input.active !== undefined) args.push("--active", input.active ? "true" : "false");
  if (input.expiresAt !== undefined) args.push("--expires-at", input.expiresAt ?? "");
  const res = await deskCall(args, env);
  return res.notice as DeskNotice;
}

export async function deskUpdateNotice(
  env: Record<string, string>,
  id: string,
  fields: DeskNoticeInput,
): Promise<DeskNotice | null> {
  const args = ["notice", "update", "--id", id];
  if (fields.title !== undefined) args.push("--title", fields.title);
  if (fields.body !== undefined) args.push("--body", fields.body ?? "");
  if (fields.tone !== undefined) args.push("--tone", fields.tone);
  if (fields.url !== undefined) args.push("--url", fields.url ?? "");
  if (fields.pinned !== undefined) args.push("--pinned", fields.pinned ? "true" : "false");
  if (fields.active !== undefined) args.push("--active", fields.active ? "true" : "false");
  if (fields.expiresAt !== undefined) args.push("--expires-at", fields.expiresAt ?? "");
  const res = await deskCall(args, env);
  return (res.notice as DeskNotice | null) ?? null;
}

export async function deskToggleNotice(env: Record<string, string>, id: string): Promise<DeskNotice | null> {
  const res = await deskCall(["notice", "toggle", "--id", id], env);
  return (res.notice as DeskNotice | null) ?? null;
}

export async function deskRemoveNotice(env: Record<string, string>, id: string): Promise<void> {
  await deskCall(["notice", "remove", "--id", id], env);
}

/* ------------------------------------------------------------------ *
 * Admin login log (desktop → runner `loginlog`)                       *
 * ------------------------------------------------------------------ */

export interface DeskLoginLogRow {
  id: string;
  email: string;
  ok: boolean;
  ip: string | null;
  user_agent: string | null;
  message: string | null;
  created_at: string;
}

export interface DeskLoginLogPage {
  rows: DeskLoginLogRow[];
  total: number;
  page: number;
  pages: number;
}

/** List admin sign-in attempts (newest first) through the bundled runner. */
export async function deskLoginLog(
  env: Record<string, string>,
  page = 1,
  perPage = 100,
): Promise<DeskLoginLogPage> {
  const args = ["loginlog", "list", "--page", String(page), "--per-page", String(perPage)];
  const res = await deskCall(args, env);
  return res as unknown as DeskLoginLogPage;
}

/** Delete one login-log entry. */
export async function deskLoginLogDelete(env: Record<string, string>, id: string): Promise<void> {
  await deskCall(["loginlog", "delete", "--id", id], env);
}

/** Clear the whole login log; returns the number of removed rows. */
export async function deskLoginLogClear(env: Record<string, string>): Promise<number> {
  const res = await deskCall(["loginlog", "clear"], env);
  return Number((res as { cleared?: unknown }).cleared ?? 0);
}