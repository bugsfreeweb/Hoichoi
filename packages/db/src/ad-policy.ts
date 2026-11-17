import crypto from "node:crypto";
import { getClient, nowIso } from "./client";

/**
 * Advertising policy review.
 *
 * `setAdBookingStatus(id, "active")` used to be one UPDATE: whoever could click a
 * button could put any creative in front of readers, with nothing on record
 * saying anyone had looked at it. The gate here is deliberately small and
 * specific — five questions with fixed keys, all of which must be answered
 * affirmatively, and the answers are stored against the booking with the
 * reviewer's name.
 *
 * What this is not: it is not a scanner. It records a human decision and makes
 * "who let this through, and what did they confirm?" answerable months later,
 * which is the part an audit actually asks for.
 */

/** The checklist. Keys are stable — a stored review is read back against these. */
export const AD_POLICY_CHECKS = {
  creative_rights: "ক্রিয়েটিভের ব্যবহারের অধিকার নিশ্চিত",
  landing_ok: "ল্যান্ডিং পেজ কাজ করে, অটো-ডাউনলোড বা পপআপ নেই",
  no_misleading: "পণ্য/সেবার দাবি অতিরঞ্জিত বা বিভ্রান্তিকর নয়",
  no_prohibited: "নিষিদ্ধ শ্রেণি নেই (তামাক, মদ, জুয়া, ঋণ-সুবিধা)",
  disclosure: "বিজ্ঞাপন হিসেবে স্পষ্টভাবে চিহ্নিত হবে",
} as const;

export type AdPolicyCheckKey = keyof typeof AD_POLICY_CHECKS;
export const AD_POLICY_KEYS = Object.keys(AD_POLICY_CHECKS) as AdPolicyCheckKey[];

export interface AdPolicyReview {
  id: string;
  bookingId: string;
  decision: "approved" | "rejected";
  checks: Partial<Record<AdPolicyCheckKey, boolean>>;
  notes: string | null;
  reviewer: string;
  createdAt: string;
}

/** Throws the operator's own words when the checklist is incomplete. */
export function assertPolicyComplete(checks: Partial<Record<AdPolicyCheckKey, boolean>> | undefined): void {
  const missing = AD_POLICY_KEYS.filter((k) => checks?.[k] !== true);
  if (missing.length > 0) {
    throw new Error(
      `সবগুলো নীতি-যাচাই নিশ্চিত করুন — বাকি: ${missing.map((k) => AD_POLICY_CHECKS[k]).join("; ")}`,
    );
  }
}

export async function recordAdPolicyReview(input: {
  bookingId: string;
  decision: "approved" | "rejected";
  checks?: Partial<Record<AdPolicyCheckKey, boolean>>;
  notes?: string | null;
  reviewer: string;
}): Promise<AdPolicyReview> {
  const client = getClient();
  const checks = input.checks ?? {};
  if (input.decision === "approved") assertPolicyComplete(checks);
  const id = crypto.randomUUID();
  const now = nowIso();
  await client.execute({
    sql: `INSERT INTO ad_policy_reviews (id, booking_id, decision, checks_json, notes, reviewer, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.bookingId,
      input.decision,
      JSON.stringify(checks),
      (input.notes ?? "").trim().slice(0, 1000) || null,
      input.reviewer.slice(0, 120),
      now,
    ],
  });
  return {
    id,
    bookingId: input.bookingId,
    decision: input.decision,
    checks,
    notes: (input.notes ?? "").trim() || null,
    reviewer: input.reviewer,
    createdAt: now,
  };
}

export async function listAdPolicyReviews(bookingId: string): Promise<AdPolicyReview[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM ad_policy_reviews WHERE booking_id = ? ORDER BY created_at DESC",
    args: [bookingId],
  });
  return res.rows.map((raw) => {
    const row = raw as Record<string, unknown>;
    let checks: Partial<Record<AdPolicyCheckKey, boolean>> = {};
    try {
      checks = JSON.parse(String(row.checks_json ?? "{}")) as Partial<Record<AdPolicyCheckKey, boolean>>;
    } catch {
      checks = {};
    }
    return {
      id: String(row.id),
      bookingId: String(row.booking_id),
      decision: String(row.decision) === "rejected" ? "rejected" : "approved",
      checks,
      notes: row.notes ? String(row.notes) : null,
      reviewer: String(row.reviewer ?? ""),
      createdAt: String(row.created_at ?? ""),
    };
  });
}

/** The most recent approval for a booking, or null when there is none. */
export async function latestApproval(bookingId: string): Promise<AdPolicyReview | null> {
  const all = await listAdPolicyReviews(bookingId);
  return all.find((r) => r.decision === "approved") ?? null;
}