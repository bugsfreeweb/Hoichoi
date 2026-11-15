import type { Client } from "@libsql/client";
import { getClient } from "./client";

/**
 * Fixed-window rate limiting.
 *
 * A fixed window (rather than a sliding log) is enough here: the goal is to stop
 * brute force and floods, not to bill exact rates, and it costs one row per
 * bucket per window instead of one row per request.
 *
 * The increment and the read are a single statement, so two concurrent lambdas
 * cannot both read `count = limit - 1` and both proceed.
 */

export interface RateLimitResult {
  /** false ⇒ the caller has exceeded the budget and should be rejected. */
  allowed: boolean;
  /** Hits allowed in this window. */
  limit: number;
  /** Attempts left after this one (never negative). */
  remaining: number;
  /** Milliseconds until a fresh window starts. */
  retryAfterMs: number;
  /** The window this hit landed in, for logging. */
  windowStart: number;
}

export interface RateLimitOptions {
  /** Opaque bucket id, e.g. "login:ip:<hash>". Hash before passing. */
  key: string;
  limit: number;
  windowMs: number;
  /** Injectable clock, for tests. */
  now?: number;
  /** Injectable client, for tests. */
  client?: Client;
}

/** Start of the fixed window that contains `now`. */
export function windowStart(now: number, windowMs: number): number {
  if (!(windowMs > 0)) throw new Error("windowMs must be positive");
  return Math.floor(now / windowMs) * windowMs;
}

/** Prune rows older than this many ms; anything older cannot still be rate limiting. */
const RETENTION_MS = 24 * 60 * 60 * 1000;

export async function hitRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit, windowMs } = opts;
  if (!key) throw new Error("rate limit key required");
  if (!(limit > 0)) throw new Error("limit must be positive");
  const now = opts.now ?? Date.now();
  const start = windowStart(now, windowMs);
  const client = opts.client ?? getClient();

  const res = await client.execute({
    sql: `INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1)
          ON CONFLICT(bucket, window_start) DO UPDATE SET count = count + 1
          RETURNING count`,
    args: [key, start],
  });
  const count = Number(res.rows[0]?.count ?? 1);

  // Opportunistic cleanup: only the request that opened a window pays for it.
  if (count === 1 && Math.random() < 0.05) {
    await client
      .execute({ sql: "DELETE FROM rate_limits WHERE window_start < ?", args: [now - RETENTION_MS] })
      .catch(() => undefined);
  }

  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    retryAfterMs: Math.max(0, start + windowMs - now),
    windowStart: start,
  };
}

/** Read a bucket's current count without consuming a hit (for status displays). */
export async function peekRateLimit(opts: RateLimitOptions): Promise<number> {
  const now = opts.now ?? Date.now();
  const start = windowStart(now, opts.windowMs);
  const client = opts.client ?? getClient();
  const res = await client.execute({
    sql: "SELECT count FROM rate_limits WHERE bucket = ? AND window_start = ?",
    args: [opts.key, start],
  });
  return Number(res.rows[0]?.count ?? 0);
}
