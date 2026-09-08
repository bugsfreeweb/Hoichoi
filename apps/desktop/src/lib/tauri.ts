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