/**
 * Guest identity + trust.
 *
 * A "guest" is whoever fills in a public form without signing in. They are
 * identified by an opaque cookie id, not by their email: the email itself is
 * stored (an operator needs it to answer a report) but every cross-row
 * matching, and the moderation trust signal, runs on an HMAC of it and on the
 * guest id, so an attacker who dumps the DB cannot harvest addresses or link
 * rows without the secret.
 *
 * The trust score is deliberately boring: a guest who gets comments approved
 * and reports dismissed as noise has low trust; one whose reports pan out and
 * comments stay up climbs. It is a *signal for a human*, never an auto-ban.
 */
import { createHmac, randomBytes } from "node:crypto";
import { getClient } from "./client";

export type GuestIdentity = {
  guestId: string | null;
  emailHash: string | null;
  ipHash: string | null;
  trustScore: number | null;
};

/** Deterministic, non-reversible: same input, same digest, with the secret. */
function hmac(input: string): string {
  const secret = process.env.GUEST_HASH_SECRET || process.env.ADMIN_AUTH_SECRET || "";
  // No secret configured yet → still hash, just with a stable local key so the
  // column is never the raw value on disk. The secret is what makes it useful
  // across the fleet.
  const key = secret || "hoichoi-guest-hash-dev-key";
  return createHmac("sha256", key).update(input.trim().toLowerCase()).digest("hex");
}

export function hashEmail(email: string | null | undefined): string | null {
  if (!email || !email.trim()) return null;
  const normalized = email.trim().toLowerCase().replace(/\s+/g, "");
  if (!normalized.includes("@") || normalized.length > 254) return null;
  return hmac(normalized);
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip || !ip.trim()) return null;
  // Truncate after the /24 (IPv4) or /64 (IPv6) so two guests behind one NAT
  // still share nothing more than the neighbourhood noise.
  const value = ip.trim();
  if (value.includes(":")) return hmac(value.split(":").slice(0, 4).join(":"));
  return hmac(value.split(".").slice(0, 3).join("."));
}

export function newGuestId(): string {
  return randomBytes(16).toString("base64url");
}

/**
 * Pure trust model — no database, so it can be unit tested and reasoned about
 * in isolation.
 *
 * Each accepted moderation outcome adds +X, each rejected one subtracts; the
 * result is clamped to 0..100. Unknown guests sit at NULL so the UI can say
 * "no history" instead of inventing a middle number.
 */
export function computeTrustScore(input: {
  acceptedComments: number;
  rejectedComments: number;
  acceptedReports: number;
  rejectedReports: number;
}): number {
  const score =
    50 +
    input.acceptedComments * 5 -
    input.rejectedComments * 8 +
    input.acceptedReports * 3 -
    input.rejectedReports * 5;
  return Math.max(0, Math.min(100, score));
}

/** The guest's moderation history, for computeTrustScore. */
export async function guestHistory(guestId: string): Promise<{
  acceptedComments: number;
  rejectedComments: number;
  acceptedReports: number;
  rejectedReports: number;
}> {
  const client = getClient();
  const out = { acceptedComments: 0, rejectedComments: 0, acceptedReports: 0, rejectedReports: 0 };
  if (!guestId) return out;

  const comments = await client.execute({
    sql: `SELECT status, count(*) AS n FROM comments WHERE guest_id = ? GROUP BY status`,
    args: [guestId],
  });
  for (const row of comments.rows) {
    const status = String((row as Record<string, unknown>).status);
    const n = Number((row as Record<string, unknown>).n ?? 0);
    if (status === "approved") out.acceptedComments += n;
    if (status === "rejected" || status === "blocked") out.rejectedComments += n;
  }

  const reports = await client.execute({
    sql: `SELECT status, count(*) AS n FROM reader_reports WHERE guest_id = ? GROUP BY status`,
    args: [guestId],
  });
  for (const row of reports.rows) {
    const status = String((row as Record<string, unknown>).status);
    const n = Number((row as Record<string, unknown>).n ?? 0);
    // reader_reports.status is one of open | reviewed | dismissed.
    if (status === "reviewed") out.acceptedReports += n;
    if (status === "dismissed") out.rejectedReports += n;
  }

  return out;
}

/** Resolve the trust score a fresh row should carry for this guest. */
export async function trustScoreFor(guestId: string | null): Promise<number | null> {
  if (!guestId) return null;
  const history = await guestHistory(guestId);
  if (
    history.acceptedComments === 0 &&
    history.rejectedComments === 0 &&
    history.acceptedReports === 0 &&
    history.rejectedReports === 0
  ) {
    return null;
  }
  return computeTrustScore(history);
}

/** Build the four identity columns a public-form insert should store. */
export async function identityFor(input: {
  guestId?: string | null;
  email?: string | null;
  ip?: string | null;
}): Promise<GuestIdentity> {
  const raw = input.guestId ?? "";
  const guestId: string | null = raw.length >= 16 && raw.length <= 80 ? raw : null;
  const [trustScore] = await Promise.all([trustScoreFor(guestId)]);
  return {
    guestId,
    emailHash: hashEmail(input.email),
    ipHash: hashIp(input.ip),
    trustScore,
  };
}

/**
 * Expand an identifier into a WHERE clause.
 *
 * A guest id alone is not enough: some rows were written before the cookie
 * existed and carry only an email hash, and a report filed with a different
 * cookie but the same address still belongs to the same person. So a guest id
 * also pulls in every email hash that guest ever used — otherwise an erase
 * would look complete while leaving rows behind.
 */
async function identityWhere(identifier: { guestId?: string; email?: string }): Promise<{
  where: string;
  args: string[];
}> {
  const client = getClient();
  const clauses: string[] = [];
  const args: string[] = [];

  if (identifier.guestId) {
    const hashes = new Set<string>();
    for (const table of ["comments", "reader_reports", "submitted_pages", "removal_requests"]) {
      const res = await client.execute({
        sql: `SELECT DISTINCT email_hash AS h FROM ${table} WHERE guest_id = ? AND email_hash IS NOT NULL`,
        args: [identifier.guestId],
      });
      for (const row of res.rows) {
        const h = (row as Record<string, unknown>).h;
        if (typeof h === "string" && h) hashes.add(h);
      }
    }
    const parts = ["guest_id = ?"];
    args.push(identifier.guestId);
    for (const h of hashes) {
      parts.push("email_hash = ?");
      args.push(h);
    }
    clauses.push(`(${parts.join(" OR ")})`);
  }

  if (identifier.email) {
    const hash = hashEmail(identifier.email);
    if (hash) {
      clauses.push("email_hash = ?");
      args.push(hash);
    }
  }

  if (clauses.length === 0) {
    throw new TypeError("guest id বা ইমেইল — একটি দিতে হবে");
  }
  return { where: `WHERE ${clauses.join(" OR ")}`, args };
}

/**
 * Data-subject lookup: every stored row that belongs to one guest, matched by
 * guest id *or* by email hash, so a person can be exported without the operator
 * knowing which address hashes to whom.
 */
export async function exportGuestData(identifier: {
  guestId?: string;
  email?: string;
}): Promise<{
  comments: Array<Record<string, unknown>>;
  reports: Array<Record<string, unknown>>;
  submissions: Array<Record<string, unknown>>;
  removals: Array<Record<string, unknown>>;
}> {
  const client = getClient();
  const { where, args } = await identityWhere(identifier);
  const pick = (rows: unknown[]) => rows.map((r) => {
    const row = r as Record<string, unknown>;
    // Keep the human-facing bits, drop routing details: there is no reason for
    // an export file to carry our internal hashes.
    return Object.fromEntries(
      Object.entries(row).filter(([k]) => !["ip_hash", "email_hash", "guest_id"].includes(k)),
    );
  });
  const [comments, reports, submissions, removals] = await Promise.all([
    client.execute({ sql: `SELECT * FROM comments ${where}`, args }),
    client.execute({ sql: `SELECT * FROM reader_reports ${where}`, args }),
    client.execute({ sql: `SELECT * FROM submitted_pages ${where}`, args }),
    client.execute({ sql: `SELECT * FROM removal_requests ${where}`, args }),
  ]);
  return {
    comments: pick(comments.rows),
    reports: pick(reports.rows),
    submissions: pick(submissions.rows),
    removals: pick(removals.rows),
  };
}

/**
 * Data-subject erasure: deletes the guest's rows from the public tables. Runs
 * in one transaction so a partial erase can never leave a half-forgotten guest.
 */
export async function eraseGuestData(identifier: { guestId?: string; email?: string }): Promise<{
  comments: number;
  reports: number;
  submissions: number;
  removals: number;
}> {
  const client = getClient();
  const { where, args } = await identityWhere(identifier);
  const tables = ["comments", "reader_reports", "submitted_pages", "removal_requests"] as const;

  // Count *before* deleting: a delete has no memory of what it removed, and an
  // erase report that always says "0 rows" would be a lie an auditor relies on.
  const before = await Promise.all(
    tables.map(async (table) => {
      const r = await client.execute({ sql: `SELECT count(*) AS n FROM ${table} ${where}`, args });
      return Number((r.rows[0] as Record<string, unknown> | undefined)?.n ?? 0);
    }),
  );

  // One transaction: a partial erase would leave a half-forgotten guest.
  await client.batch(
    tables.map((table) => ({ sql: `DELETE FROM ${table} ${where}`, args })),
    "write",
  );

  return {
    comments: before[0]!,
    reports: before[1]!,
    submissions: before[2]!,
    removals: before[3]!,
  };
}
