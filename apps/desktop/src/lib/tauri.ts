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
export async function settingsGet(env: Record<string, string>) {
  const raw = await invoke<string>("settings_get", { env });
  const parsed = JSON.parse(raw) as { settings?: Record<string, unknown> };
  return (parsed.settings ?? parsed) as Record<string, unknown>;
}

/** Update site settings through the bundled runner. */
export async function settingsSet(
  env: Record<string, string>,
  fields: Record<string, string | number>,
): Promise<void> {
  await invoke("settings_set", { env, fields });
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

/** One-click local ↔ Turso sync; returns a short runner summary. */
export async function syncDb(
  direction: "push" | "pull",
  env: Record<string, string>,
): Promise<string> {
  return await invoke<string>("sync_db", { direction, env });
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

/** Create / list / revoke one-time admin login codes via the bundled runner. */
export async function adminCodes(
  op: "create" | "list" | "revoke",
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
    throw new Error(String(parsed.error ?? "runner error"));
  }
  return parsed;
}

export async function deskSources(env: Record<string, string>): Promise<DeskSource[]> {
  const res = await deskCall(["sources", "list"], env);
  return (res.sources as DeskSource[]) ?? [];
}

export async function deskAddSource(
  env: Record<string, string>,
  input: { pageUrl: string; pageName: string; kind?: string; category?: string; topics?: string; fbId?: string | null },
): Promise<DeskSource> {
  const args = ["sources", "add", "--page-url", input.pageUrl, "--page-name", input.pageName];
  if (input.kind) args.push("--kind", input.kind);
  if (input.category) args.push("--category", input.category);
  if (input.topics) args.push("--topics", input.topics);
  if (input.fbId) args.push("--fb-id", input.fbId);
  const res = await deskCall(args, env);
  return res.source as DeskSource;
}

export async function deskToggleSource(env: Record<string, string>, id: string): Promise<void> {
  await deskCall(["sources", "toggle", "--id", id], env);
}

export async function deskRemoveSource(env: Record<string, string>, id: string): Promise<void> {
  await deskCall(["sources", "remove", "--id", id], env);
}

export async function deskQueue(env: Record<string, string>, status?: string | null): Promise<DeskQueueRow[]> {
  const args = ["queue", "list"];
  if (status) args.push("--status", status);
  const res = await deskCall(args, env);
  return (res.rows as DeskQueueRow[]) ?? [];
}

export async function deskStats(env: Record<string, string>): Promise<DeskStats> {
  const res = await deskCall(["stats"], env);
  return res as unknown as DeskStats;
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