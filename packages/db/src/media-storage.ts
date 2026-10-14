/**
 * Media-storage policy (settings.media_storage_json) — the ordered list of
 * remote adapters (GitHub / IDrive e2 / Backblaze B2) used to push scraped and
 * generated media off-box, plus the retention window for the cleanup job.
 *
 * Split out of `index.ts` so the shared uploader (`./storage`) can read the
 * policy without importing the whole data layer (which would create a cycle).
 */
import type { MediaStorageConfig } from "@hoichoi/shared-types";
import { getClient, nowIso } from "./client";

/** Fallback remote-media storage policy (settings.media_storage_json). */
export const DEFAULT_MEDIA_STORAGE: MediaStorageConfig = {
  adapters: [],
  purge_local_after_upload: false,
  retention_months: 1,
  cleanup_enabled: false,
};

export function parseMediaStorage(raw: string | null | undefined): MediaStorageConfig {
  const merged: MediaStorageConfig = { ...DEFAULT_MEDIA_STORAGE };
  if (!raw) return merged;
  try {
    const parsed = JSON.parse(raw) as Partial<MediaStorageConfig>;
    if (Array.isArray(parsed.adapters)) merged.adapters = parsed.adapters;
    if (typeof parsed.purge_local_after_upload === "boolean") merged.purge_local_after_upload = parsed.purge_local_after_upload;
    if (typeof parsed.retention_months === "number" && Number.isFinite(parsed.retention_months)) merged.retention_months = parsed.retention_months;
    if (typeof parsed.cleanup_enabled === "boolean") merged.cleanup_enabled = parsed.cleanup_enabled;
  } catch {
    /* corrupt blob → defaults */
  }
  return merged;
}

/** Read the live media-storage policy from settings (parsed + defaulted). */
export async function getMediaStorageConfig(): Promise<MediaStorageConfig> {
  const client = getClient();
  const res = await client.execute("SELECT media_storage_json FROM settings WHERE id = 1");
  if (res.rows.length === 0) return { ...DEFAULT_MEDIA_STORAGE };
  return parseMediaStorage((res.rows[0] as Record<string, unknown>).media_storage_json as string | null);
}

/** Persist the media-storage policy as settings.media_storage_json. */
export async function saveMediaStorageConfig(cfg: MediaStorageConfig): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "UPDATE settings SET media_storage_json = ?, updated_at = ? WHERE id = 1",
    args: [JSON.stringify(cfg), nowIso()],
  });
}
