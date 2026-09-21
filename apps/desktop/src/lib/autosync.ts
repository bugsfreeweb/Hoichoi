import { isCloudSync, getEnvFromVault } from "./vault";
import { syncDb } from "./tauri";

/**
 * Auto-sync between the desktop's local file DB and the shared Turso DB
 * (the same DB the web admin reads and writes).
 *
 * Cloud mode (vault `use_cloud` unset/1, the default): the desktop already
 * writes straight to the shared DB, so a push/pull is a no-op — every
 * category/source/setting change is instantly visible on the web, and vice
 * versa.
 *
 * Local-only mode (`use_cloud` = 0): desktop writes land in its own file DB.
 * To keep desktop ↔ web in sync without a manual click, `autoPush()` is called
 * after a successful write on the desk and `autoPull()` when the Settings
 * screen opens — so config changed in the web admin shows up here and config
 * changed here shows up there.
 *
 * Both are guarded: nothing happens unless a Turso URL + token are actually
 * stored in the vault, so a bare dev/local install is never auto-uploaded.
 */
async function cloudEnv(): Promise<Record<string, string> | null> {
  const env = await getEnvFromVault();
  if (!env.TURSO_DATABASE_URL?.startsWith("libsql://") || !env.TURSO_AUTH_TOKEN) {
    return null;
  }
  return env;
}

/** Local-only mode: push desktop file DB changes to the shared Turso DB. */
export async function autoPush(): Promise<void> {
  try {
    if (await isCloudSync()) return; // already on the shared DB
    const env = await cloudEnv();
    if (env) await syncDb("push", env);
  } catch {
    /* auto-sync is best-effort; manual One-Click Sync still available */
  }
}

/** Local-only mode: pull the latest shared-Turso config into the desktop DB. */
export async function autoPull(): Promise<void> {
  try {
    if (await isCloudSync()) return;
    const env = await cloudEnv();
    if (env) await syncDb("pull", env);
  } catch {
    /* best-effort */
  }
}