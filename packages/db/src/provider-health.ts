/**
 * Media provider health and quotas.
 *
 * The uploader fails over between GitHub and S3 targets. Without a registry, a
 * dead target looks exactly like a healthy one from the outside: every upload
 * succeeds, just on the backup, and a bucket sitting at 98% of its quota is
 * invisible until it starts rejecting writes.
 *
 * Each provider gets one row here. The uploader reports success and failure;
 * this module decides what that means — when to stop trying a target first, and
 * when a quota has actually been reached. Nothing is estimated: `quota_bytes`
 * stays NULL until an operator sets it, and `used_bytes` only grows by bytes a
 * real upload reported.
 */
import { getClient, nowIso } from "./client";

/**
 * The shared client can be pointed at an in-memory database for the suites that
 * exercise this module against real SQL (see `__useClientForTests` in client.ts).
 */

export type ProviderKind = "github" | "s3" | "image" | "local";

export interface ProviderHealth {
  provider_key: string;
  kind: ProviderKind;
  label: string;
  enabled: boolean;
  /** NULL = unknown or unlimited. */
  quota_bytes: number | null;
  used_bytes: number;
  objects: number;
  success_count: number;
  failure_count: number;
  consecutive_failures: number;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
  last_fallback_reason: string | null;
  cooldown_until: string | null;
  created_at: string;
  updated_at: string;
}

/** Derived state, so the UI and the uploader agree on what "broken" means. */
export type ProviderState = "ok" | "degraded" | "cooldown" | "quota_exceeded" | "disabled";

export const COOLDOWN_BASE_MS = 2 * 60_000;
export const COOLDOWN_MAX_MS = 60 * 60_000;
/** Failures before a provider is taken out of the first-choice rotation. */
export const COOLDOWN_AFTER = 2;

/**
 * Exponential backoff for repeated failures: 2 min, 4, 8 … capped at an hour.
 * One failure is treated as noise (a flaky network, a GitHub 502) and does not
 * demote the primary target; two in a row do.
 */
export function backoffMs(consecutiveFailures: number): number {
  if (consecutiveFailures < COOLDOWN_AFTER) return 0;
  const exponent = Math.min(consecutiveFailures - COOLDOWN_AFTER, 6);
  return Math.min(COOLDOWN_BASE_MS * 2 ** exponent, COOLDOWN_MAX_MS);
}

export function cooldownUntil(consecutiveFailures: number, now = new Date()): string | null {
  const ms = backoffMs(consecutiveFailures);
  if (ms === 0) return null;
  return new Date(now.getTime() + ms).toISOString();
}

/** Quota reached? Only when an operator set one and real bytes crossed it. */
export function overQuota(row: Pick<ProviderHealth, "quota_bytes" | "used_bytes">): boolean {
  return row.quota_bytes !== null && row.quota_bytes > 0 && row.used_bytes >= row.quota_bytes;
}

export function providerState(
  row: Pick<
    ProviderHealth,
    "enabled" | "quota_bytes" | "used_bytes" | "consecutive_failures" | "cooldown_until"
  >,
  now = new Date(),
): ProviderState {
  if (!row.enabled) return "disabled";
  if (overQuota(row)) return "quota_exceeded";
  if (row.cooldown_until && row.cooldown_until > now.toISOString()) return "cooldown";
  if (row.consecutive_failures > 0) return "degraded";
  return "ok";
}

/** Should the uploader try this provider right now? */
export function usableNow(row: ProviderHealth, now = new Date()): boolean {
  const state = providerState(row, now);
  return state === "ok" || state === "degraded";
}

export interface ProviderIdentity {
  key: string;
  kind: ProviderKind;
  label: string;
}

/** Stable key + label for a storage adapter config, shared by uploader and UI. */
export function storageProviderIdentity(adapter: {
  kind: string;
  label: string;
  repo?: string;
  provider?: string;
  bucket?: string;
}): ProviderIdentity {
  if (adapter.kind === "github") {
    const repo = adapter.repo?.trim() || "unset";
    return { key: `github:${repo}`, kind: "github", label: adapter.label || `GitHub · ${repo}` };
  }
  const provider = adapter.provider ?? "s3";
  const bucket = adapter.bucket?.trim() || "unset";
  return { key: `s3:${provider}:${bucket}`, kind: "s3", label: adapter.label || `${provider} · ${bucket}` };
}

const clampText = (value: string | null | undefined, max = 500): string | null => {
  if (!value) return null;
  return value.replace(/[\u0000-\u001f]/g, " ").slice(0, max);
};

function mapRow(row: Record<string, unknown>): ProviderHealth {
  const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
  return {
    provider_key: String(row.provider_key),
    kind: row.kind as ProviderKind,
    label: String(row.label ?? ""),
    enabled: num(row.enabled) === 1,
    quota_bytes: row.quota_bytes === null || row.quota_bytes === undefined ? null : Number(row.quota_bytes),
    used_bytes: num(row.used_bytes),
    objects: num(row.objects),
    success_count: num(row.success_count),
    failure_count: num(row.failure_count),
    consecutive_failures: num(row.consecutive_failures),
    last_success_at: (row.last_success_at as string | null) ?? null,
    last_failure_at: (row.last_failure_at as string | null) ?? null,
    last_error: (row.last_error as string | null) ?? null,
    last_fallback_reason: (row.last_fallback_reason as string | null) ?? null,
    cooldown_until: (row.cooldown_until as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

/** Create the row on first sight; leave counters untouched on later calls. */
export async function registerProvider(identity: ProviderIdentity): Promise<void> {
  const client = getClient();
  const now = nowIso();
  await client.execute({
    sql: `INSERT INTO media_provider_health (provider_key, kind, label, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(provider_key) DO UPDATE SET label = excluded.label, updated_at = excluded.updated_at`,
    args: [identity.key, identity.kind, identity.label, now, now],
  });
}

export async function getProviderHealth(key: string): Promise<ProviderHealth | null> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM media_provider_health WHERE provider_key = ?",
    args: [key],
  });
  return res.rows.length ? mapRow(res.rows[0] as Record<string, unknown>) : null;
}

export async function listProviderHealth(kind?: ProviderKind): Promise<ProviderHealth[]> {
  const client = getClient();
  const res = kind
    ? await client.execute({
        sql: "SELECT * FROM media_provider_health WHERE kind = ? ORDER BY provider_key",
        args: [kind],
      })
    : await client.execute("SELECT * FROM media_provider_health ORDER BY kind, provider_key");
  return res.rows.map((r) => mapRow(r as Record<string, unknown>));
}

/** A real upload succeeded: clear the failure streak and the cooldown. */
export async function recordProviderSuccess(key: string, bytes = 0): Promise<void> {
  const client = getClient();
  const now = nowIso();
  await client.execute({
    sql: `UPDATE media_provider_health SET
            success_count = success_count + 1,
            consecutive_failures = 0,
            last_success_at = ?,
            last_error = NULL,
            cooldown_until = NULL,
            used_bytes = used_bytes + ?,
            objects = objects + ?,
            updated_at = ?
          WHERE provider_key = ?`,
    args: [now, Math.max(0, Math.trunc(bytes)), bytes > 0 ? 1 : 0, now, key],
  });
}

/** A real upload failed: count it, keep the message, start a cooldown if repeated. */
export async function recordProviderFailure(key: string, error: string): Promise<void> {
  const client = getClient();
  const now = nowIso();
  // Read-then-write: the cooldown depends on the new streak length, and this is
  // one upload at a time per provider in practice (a run is sequential).
  const existing = await getProviderHealth(key);
  const streak = (existing?.consecutive_failures ?? 0) + 1;
  await client.execute({
    sql: `UPDATE media_provider_health SET
            failure_count = failure_count + 1,
            consecutive_failures = ?,
            last_failure_at = ?,
            last_error = ?,
            cooldown_until = ?,
            updated_at = ?
          WHERE provider_key = ?`,
    args: [streak, now, clampText(error), cooldownUntil(streak), now, key],
  });
}

/**
 * A remote object was deleted: give the bytes back.
 *
 * Without this a provider's `used_bytes` only ever grows, so an operator-set
 * quota would eventually look full on a bucket that is nearly empty — the worst
 * kind of wrong: it silently pushes every upload onto the backup.
 */
export async function recordProviderRemoval(key: string, bytes = 0): Promise<void> {
  const client = getClient();
  const size = Math.max(0, Math.trunc(bytes));
  await client.execute({
    sql: `UPDATE media_provider_health SET
            used_bytes = CASE WHEN used_bytes >= ? THEN used_bytes - ? ELSE 0 END,
            objects = CASE WHEN objects > 0 THEN objects - 1 ELSE 0 END,
            updated_at = ?
          WHERE provider_key = ?`,
    args: [size, size, nowIso(), key],
  });
}

/** Note why the uploader skipped a provider (cooldown, quota, disabled, error). */
export async function recordProviderSkip(key: string, reason: string): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "UPDATE media_provider_health SET last_fallback_reason = ?, updated_at = ? WHERE provider_key = ?",
    args: [clampText(reason), nowIso(), key],
  });
}

/** Operator actions: quota, enable/disable, clear a cooldown by hand. */
export async function updateProviderSettings(
  key: string,
  patch: { quota_bytes?: number | null; enabled?: boolean; clear_cooldown?: boolean },
): Promise<void> {
  const client = getClient();
  const now = nowIso();
  if (patch.quota_bytes !== undefined) {
    const quota =
      patch.quota_bytes === null ? null : Math.max(0, Math.trunc(Number(patch.quota_bytes) || 0));
    await client.execute({
      sql: "UPDATE media_provider_health SET quota_bytes = ?, updated_at = ? WHERE provider_key = ?",
      args: [quota, now, key],
    });
  }
  if (patch.enabled !== undefined) {
    await client.execute({
      sql: "UPDATE media_provider_health SET enabled = ?, updated_at = ? WHERE provider_key = ?",
      args: [patch.enabled ? 1 : 0, now, key],
    });
  }
  if (patch.clear_cooldown) {
    await client.execute({
      sql: `UPDATE media_provider_health SET cooldown_until = NULL, consecutive_failures = 0,
            updated_at = ? WHERE provider_key = ?`,
      args: [now, key],
    });
  }
}

/** Register every configured storage adapter so the desk can see them all. */
export async function syncStorageProviders(
  adapters: { kind: string; label: string; repo?: string; provider?: string; bucket?: string; enabled?: boolean }[],
): Promise<void> {
  for (const adapter of adapters) {
    const identity = storageProviderIdentity(adapter);
    await registerProvider(identity);
    if (adapter.enabled !== undefined) {
      await updateProviderSettings(identity.key, { enabled: adapter.enabled });
    }
  }
}
