/**
 * Session lifetime policy — pure functions, no IO, so it can be unit-tested.
 *
 * Why this exists: the previous policy was a single 365-day sliding window that
 * was renewed on *every* authenticated request (`lib/auth.ts` used to write a
 * fresh `expires_at` each time). A session that was used daily therefore never
 * aged out, which made "admin credentials expire after 30 days" impossible to
 * honour and meant a stolen cookie stayed useful indefinitely.
 *
 * The policy is now:
 *   absolute — a session dies 30 days after it was created, whatever happens;
 *   idle     — a session dies 7 days after its last use;
 *   touch    — `last_used_at` is written at most every 5 minutes, so a polling
 *              dashboard does not turn every request into a database write.
 */

export const SESSION_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_IDLE_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_TOUCH_MS = 5 * 60 * 1000;

export type SessionState = "active" | "revoked" | "expired" | "idle";

export interface SessionTimestamps {
  created_at: string;
  last_used_at?: string | null;
  revoked_at?: string | null;
}

function ms(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

/** Absolute deadline: created_at + 30 days. */
export function absoluteDeadline(createdAt: number): number {
  return createdAt + SESSION_ABSOLUTE_MS;
}

/** The next `expires_at` value: never later than the absolute deadline. */
export function nextExpiry(createdAt: number, now: number): number {
  return Math.min(absoluteDeadline(createdAt), now + SESSION_IDLE_MS);
}

/** Classify a stored session row. `now` is epoch ms. */
export function sessionState(row: SessionTimestamps, now: number): SessionState {
  if (row.revoked_at) return "revoked";
  const created = ms(row.created_at);
  if (created === null) return "expired";
  const lastUsed = ms(row.last_used_at) ?? created;
  if (now >= absoluteDeadline(created)) return "expired";
  if (now >= lastUsed + SESSION_IDLE_MS) return "idle";
  return "active";
}

/** Should `last_used_at` be refreshed for this request? */
export function shouldTouch(lastUsedAt: string | null | undefined, now: number): boolean {
  const last = ms(lastUsedAt);
  if (last === null) return true;
  return now - last >= SESSION_TOUCH_MS;
}

/** Remaining lifetime in ms, floored at zero — used for the console countdown. */
export function msRemaining(expiresAt: string | null | undefined, now: number): number {
  const at = ms(expiresAt);
  if (at === null) return 0;
  return Math.max(0, at - now);
}
