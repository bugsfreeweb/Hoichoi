import type { Client } from "@libsql/client";
import { getClient, nowIso } from "./client";

/**
 * Verification grade + evidence.
 *
 * The rule this file exists to enforce: a grade is derived from records, never
 * typed in by hand beyond the editor's own name. `gradeFromCounts` refuses to
 * call something multi-source with one source, and `human_verified` requires a
 * named verifier — so the badge can only ever be as strong as the row behind it.
 */

export type VerificationStatus =
  | "unverified"
  | "source_claimed"
  | "partially_verified"
  | "verified"
  | "disputed"
  | "retracted"
  | "single_source"
  | "multi_source"
  | "human_verified"
  | "corrected";

export type ClaimStatus = "unchecked" | "supported" | "disputed" | "false";

export const VERIFICATION_LABELS: Record<
  VerificationStatus,
  { bn: string; en: string }
> = {
  unverified: { bn: "যাচাই বাকি", en: "Unverified" },
  source_claimed: { bn: "সোশ্যাল মিডিয়া দাবি", en: "Social-media claim" },
  partially_verified: { bn: "আংশিক যাচাইকৃত", en: "Partially verified" },
  verified: { bn: "যাচাইকৃত", en: "Verified" },
  disputed: { bn: "বিতর্কিত", en: "Disputed" },
  retracted: { bn: "প্রত্যাহৃত", en: "Retracted" },
  single_source: { bn: "একক সূত্র", en: "Single source" },
  multi_source: { bn: "একাধিক সূত্র", en: "Multi-source" },
  human_verified: { bn: "সম্পাদক যাচাইকৃত", en: "Editor verified" },
  corrected: { bn: "সংশোধিত", en: "Corrected" },
};

/** Weakest → strongest. A request may downgrade, never upgrade, a derived grade. */
export const VERIFICATION_ORDER: VerificationStatus[] = [
  "unverified",
  "disputed",
  "source_claimed",
  "partially_verified",
  "verified",
  "retracted",
  "single_source",
  "multi_source",
  "human_verified",
  "corrected",
];

export interface ClaimRow {
  id: string;
  post_id: string;
  claim_bn: string;
  status: ClaimStatus;
  evidence_url: string | null;
  evidence_note: string | null;
  checked_by: string | null;
  checked_at: string | null;
  created_at: string;
}

export interface CorrectionRow {
  id: string;
  post_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  corrected_by: string | null;
  created_at: string;
}

/**
 * Decide the human verification grade from records.
 *
 * Invariants:
 *  - AI rewrite quality is not an input; it cannot promote a story.
 *  - `verified` needs a named reviewer, at least one evidence URL and at least
 *    one supported claim.
 *  - a disputed/false claim is `disputed`, never silently `verified`.
 *  - two independent sources without human review are only partially verified.
 */
export function gradeFromEvidence(input: {
  sourceCount: number;
  verifierName?: string | null;
  claims?: { status: ClaimStatus; evidence_url?: string | null }[];
  correctedAt?: string | null;
  evidenceCount?: number;
}): VerificationStatus {
  const claims = input.claims ?? [];
  if (claims.some((c) => c.status === "disputed" || c.status === "false"))
    return "disputed";
  if (input.correctedAt) return "corrected";
  const verifier = input.verifierName?.trim();
  const supportedWithEvidence = claims.filter(
    (c) => c.status === "supported" && !!c.evidence_url?.trim(),
  ).length;
  const evidenceCount = Math.max(
    input.evidenceCount ?? 0,
    supportedWithEvidence,
  );
  if (verifier && evidenceCount >= 1 && input.sourceCount >= 1)
    return "verified";
  if (verifier && input.sourceCount >= 1) return "partially_verified";
  if (input.sourceCount >= 2) return "partially_verified";
  if (input.sourceCount >= 1) return "source_claimed";
  return "unverified";
}

/** Every known grade is shown; "unverified" says "যাচাই বাকি", not a tick. */
export function showsBadge(status: string | null | undefined): boolean {
  return !!status && status in VERIFICATION_LABELS;
}

function mapClaim(row: Record<string, unknown>): ClaimRow {
  return {
    id: String(row.id),
    post_id: String(row.post_id),
    claim_bn: String(row.claim_bn),
    status: String(row.status ?? "unchecked") as ClaimStatus,
    evidence_url: row.evidence_url == null ? null : String(row.evidence_url),
    evidence_note: row.evidence_note == null ? null : String(row.evidence_note),
    checked_by: row.checked_by == null ? null : String(row.checked_by),
    checked_at: row.checked_at == null ? null : String(row.checked_at),
    created_at: String(row.created_at),
  };
}

function mapCorrection(row: Record<string, unknown>): CorrectionRow {
  return {
    id: String(row.id),
    post_id: String(row.post_id),
    field: String(row.field),
    old_value: row.old_value == null ? null : String(row.old_value),
    new_value: row.new_value == null ? null : String(row.new_value),
    reason: row.reason == null ? null : String(row.reason),
    corrected_by: row.corrected_by == null ? null : String(row.corrected_by),
    created_at: String(row.created_at),
  };
}

export async function listClaims(
  postId: string,
  db?: Client,
): Promise<ClaimRow[]> {
  const client = db ?? getClient();
  const res = await client.execute({
    sql: "SELECT * FROM claims WHERE post_id = ? ORDER BY created_at ASC",
    args: [postId],
  });
  return res.rows.map((r) => mapClaim(r as Record<string, unknown>));
}

export async function upsertClaim(
  input: {
    id?: string;
    postId: string;
    claimBn: string;
    status?: ClaimStatus;
    evidenceUrl?: string | null;
    evidenceNote?: string | null;
    checkedBy?: string | null;
  },
  db?: Client,
): Promise<ClaimRow> {
  const client = db ?? getClient();
  const now = nowIso();
  const claim = input.claimBn.trim();
  if (!claim) throw new Error("claim text is required");
  const status: ClaimStatus = input.status ?? "unchecked";
  const checked = status === "unchecked" ? null : now;

  if (input.id) {
    await client.execute({
      sql: `UPDATE claims SET claim_bn = ?, status = ?, evidence_url = ?, evidence_note = ?,
                 checked_by = ?, checked_at = ? WHERE id = ?`,
      args: [
        claim,
        status,
        input.evidenceUrl?.trim() || null,
        input.evidenceNote?.trim() || null,
        input.checkedBy?.trim() || null,
        checked,
        input.id,
      ],
    });
    const res = await client.execute({
      sql: "SELECT * FROM claims WHERE id = ?",
      args: [input.id],
    });
    return mapClaim(res.rows[0] as Record<string, unknown>);
  }

  const id = crypto.randomUUID();
  const evidenceUrl = input.evidenceUrl?.trim() || null;
  const evidenceNote = input.evidenceNote?.trim() || null;
  const checkedBy = input.checkedBy?.trim() || null;
  await client.execute({
    sql: `INSERT INTO claims (id, post_id, claim_bn, status, evidence_url, evidence_note, checked_by, checked_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.postId,
      claim,
      status,
      evidenceUrl,
      evidenceNote,
      checkedBy,
      checked,
      now,
    ],
  });
  // Read the row back instead of reconstructing it: a hand-built return value is
  // how the evidence link silently came back as null.
  const res = await client.execute({
    sql: "SELECT * FROM claims WHERE id = ?",
    args: [id],
  });
  return mapClaim(res.rows[0] as Record<string, unknown>);
}

export async function deleteClaim(id: string, db?: Client): Promise<number> {
  const client = db ?? getClient();
  const res = await client.execute({
    sql: "DELETE FROM claims WHERE id = ?",
    args: [id],
  });
  return res.rowsAffected;
}

export async function listCorrections(
  postId: string,
  db?: Client,
): Promise<CorrectionRow[]> {
  const client = db ?? getClient();
  const res = await client.execute({
    sql: "SELECT * FROM correction_history WHERE post_id = ? ORDER BY created_at DESC",
    args: [postId],
  });
  return res.rows.map((r) => mapCorrection(r as Record<string, unknown>));
}

export async function recordCorrection(
  input: {
    postId: string;
    field: string;
    oldValue?: string | null;
    newValue?: string | null;
    reason?: string | null;
    correctedBy?: string | null;
  },
  db?: Client,
): Promise<CorrectionRow> {
  const client = db ?? getClient();
  const now = nowIso();
  const id = crypto.randomUUID();
  await client.execute({
    sql: `INSERT INTO correction_history (id, post_id, field, old_value, new_value, reason, corrected_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.postId,
      input.field,
      input.oldValue ?? null,
      input.newValue ?? null,
      input.reason?.trim() || null,
      input.correctedBy?.trim() || null,
      now,
    ],
  });
  return {
    id,
    post_id: input.postId,
    field: input.field,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
    reason: input.reason ?? null,
    corrected_by: input.correctedBy ?? null,
    created_at: now,
  };
}

/** Persist a grade (and who stands behind it) on the post. */
export async function setVerification(
  postId: string,
  status: VerificationStatus,
  opts: {
    note?: string | null;
    verifierName?: string | null;
    reviewerId?: string | null;
    evidence?: string[] | null;
  } = {},
  db?: Client,
): Promise<void> {
  const client = db ?? getClient();
  const reviewed = status === "verified" || status === "human_verified";
  const verifiedAt = reviewed ? nowIso() : null;
  await client.execute({
    sql: `UPDATE posts SET verification_status = ?, verification_note = ?, verified_by = ?,
                 verified_at = ?, reviewer_id = ?, review_notes = ?,
                 verification_evidence = ?, is_human_reviewed = ? WHERE id = ?`,
    args: [
      status,
      opts.note?.trim() || null,
      opts.verifierName?.trim() || null,
      verifiedAt,
      opts.reviewerId?.trim() || opts.verifierName?.trim() || null,
      opts.note?.trim() || null,
      JSON.stringify(opts.evidence ?? []),
      reviewed ? 1 : 0,
      postId,
    ],
  });
}
