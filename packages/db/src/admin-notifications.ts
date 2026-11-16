/**
 * Admin notifications.
 *
 * The bell used to show only queue counts, so anything outside a queue — a
 * provider on cooldown, a credential about to expire, a reconciliation that
 * deleted files, a cron that failed closed — lived in a log nobody read.
 *
 * `notify()` is idempotent: the same condition (dedupe_key) produces one row,
 * no matter how many times the job runs. Nothing here is pushed from nothing —
 * every writer is called with a real event that happened.
 */
import { randomBytes } from "node:crypto";
import { getClient, nowIso } from "./client";

export type NotificationSeverity = "info" | "warn" | "critical";

export interface AdminNotification {
  id: string;
  kind: string;
  severity: NotificationSeverity;
  title_bn: string;
  body_bn: string | null;
  href: string | null;
  role_min: string;
  dedupe_key: string | null;
  read_at: string | null;
  emailed_at: string | null;
  created_at: string;
}

export interface NotifyInput {
  kind: string;
  severity?: NotificationSeverity;
  title_bn: string;
  body_bn?: string;
  href?: string;
  roleMin?: "moderator" | "editor" | "admin";
  /** Stable identity of the underlying event, e.g. "provider:github:owner/a:cooldown". */
  dedupeKey: string;
}

function mapRow(row: Record<string, unknown>): AdminNotification {
  return {
    id: String(row.id),
    kind: String(row.kind),
    severity: (row.severity as NotificationSeverity) ?? "info",
    title_bn: String(row.title_bn),
    body_bn: (row.body_bn as string | null) ?? null,
    href: (row.href as string | null) ?? null,
    role_min: String(row.role_min ?? "moderator"),
    dedupe_key: (row.dedupe_key as string | null) ?? null,
    read_at: (row.read_at as string | null) ?? null,
    emailed_at: (row.emailed_at as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

/**
 * Record an event. `dedupeKey` makes it a no-op when the same condition already
 * produced a row (INSERT OR IGNORE keeps whichever came first).
 */
export async function notify(input: NotifyInput): Promise<AdminNotification | null> {
  const client = getClient();
  const now = nowIso();
  const id = randomBytes(12).toString("hex");
  await client.execute({
    sql: `INSERT OR IGNORE INTO admin_notifications
            (id, kind, severity, title_bn, body_bn, href, role_min, dedupe_key, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.kind,
      input.severity ?? "info",
      input.title_bn.slice(0, 160),
      (input.body_bn ?? "").slice(0, 400) || null,
      input.href ?? null,
      input.roleMin ?? "moderator",
      input.dedupeKey.slice(0, 160),
      now,
    ],
  });
  const res = await client.execute({
    sql: "SELECT * FROM admin_notifications WHERE id = ?",
    args: [id],
  });
  return res.rows.length ? mapRow(res.rows[0] as Record<string, unknown>) : null;
}

export interface ListNotificationsOptions {
  limit?: number;
  unreadOnly?: boolean;
  /** Minimum role that may see these rows. */
  roleMin?: string;
}

export async function listNotifications(
  options: ListNotificationsOptions = {},
): Promise<AdminNotification[]> {
  const client = getClient();
  const limit = Math.min(50, Math.max(1, options.limit ?? 12));
  const clauses: string[] = [];
  const args: (string | number)[] = [];
  if (options.unreadOnly) {
    clauses.push("read_at IS NULL");
  }
  if (options.roleMin) {
    // role_min semantics: a row with role_min = 'admin' is only for admins;
    // a viewer with a higher role than the row's minimum can see it.
    const order = { moderator: 0, editor: 1, admin: 2 } as const;
    const viewer = order[options.roleMin as keyof typeof order] ?? 0;
    const allowed = (Object.keys(order) as (keyof typeof order)[]).filter(
      (r) => order[r] <= viewer,
    );
    clauses.push(`role_min IN (${allowed.map(() => "?").join(", ")})`);
    args.push(...allowed);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const res = await client.execute({
    sql: `SELECT * FROM admin_notifications ${where} ORDER BY created_at DESC LIMIT ?`,
    args: [...args, limit],
  });
  return res.rows.map((r) => mapRow(r as Record<string, unknown>));
}

export async function countUnreadNotifications(roleMin?: string): Promise<number> {
  const client = getClient();
  const clauses = ["read_at IS NULL"];
  const args: (string | number)[] = [];
  if (roleMin) {
    const order = { moderator: 0, editor: 1, admin: 2 } as const;
    const viewer = order[roleMin as keyof typeof order] ?? 0;
    const allowed = (Object.keys(order) as (keyof typeof order)[]).filter(
      (r) => order[r] <= viewer,
    );
    clauses.push(`role_min IN (${allowed.map(() => "?").join(", ")})`);
    args.push(...allowed);
  }
  const res = await client.execute({
    sql: `SELECT count(*) AS n FROM admin_notifications WHERE ${clauses.join(" AND ")}`,
    args,
  });
  return Number((res.rows[0] as Record<string, unknown> | undefined)?.n ?? 0);
}

export async function markNotificationRead(id: string, roleMin?: string): Promise<boolean> {
  const client = getClient();
  const res = await client.execute({
    sql: `UPDATE admin_notifications SET read_at = ?
          WHERE id = ? AND read_at IS NULL AND (? IS NULL OR role_min IN ('moderator','editor','admin'))`,
    args: [nowIso(), id, roleMin ?? null],
  });
  return (res.rowsAffected ?? 0) > 0;
}

export async function markAllNotificationsRead(roleMin?: string): Promise<number> {
  const client = getClient();
  const res = await client.execute({
    sql: "UPDATE admin_notifications SET read_at = ? WHERE read_at IS NULL",
    args: [nowIso()],
  });
  void roleMin;
  return res.rowsAffected ?? 0;
}

/** Not-yet-emailed warnings and criticals, for the mail cron. */
export async function pendingEmailNotifications(limit = 30): Promise<AdminNotification[]> {
  const client = getClient();
  const res = await client.execute({
    sql: `SELECT * FROM admin_notifications
          WHERE emailed_at IS NULL AND severity IN ('warn','critical')
          ORDER BY created_at ASC LIMIT ?`,
    args: [limit],
  });
  return res.rows.map((r) => mapRow(r as Record<string, unknown>));
}

export async function markNotificationsEmailed(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const client = getClient();
  await client.execute({
    sql: `UPDATE admin_notifications SET emailed_at = ?
          WHERE id IN (${ids.map(() => "?").join(", ")})`,
    args: [nowIso(), ...ids],
  });
}