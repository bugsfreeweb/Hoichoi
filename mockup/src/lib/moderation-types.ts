export const COMMENT_STATUSES = ["pending", "approved", "rejected", "spam"] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];
export const COMMENT_LABELS: Record<CommentStatus, string> = {
  pending: "অপেক্ষমাণ", approved: "অনুমোদিত", rejected: "প্রত্যাখ্যাত", spam: "স্প্যাম",
};
export type PublicComment = { id: number; articleId: number; author: string; body: string; createdAt: string };
export type ModerationRow = PublicComment & {
  email: string;
  status: CommentStatus; articleTitle: string; moderatorNote: string; reviewedAt: string | null;
};
export type ModerationEvent = {
  id: number; commentId: number; author: string; fromStatus: string; toStatus: string;
  note: string; actor: string; origin: string; createdAt: string;
};
export type ModerationPayload = {
  ok: true; rows: ModerationRow[]; counts: Record<CommentStatus, number>;
  history: ModerationEvent[]; page: number; pages: number; total: number; updatedAt: string;
};
export type AdminSession = { authenticated: boolean; mode: "demo" | "protected" | "unconfigured" };

/* ------------------------------------------------------------------ */
/* reader reports (hoichoi_reports) — form + API + admin queue share    */
/* these constants so the three sites can never drift apart.            */
/* ------------------------------------------------------------------ */

/** Valid statuses stored in hoichoi_reports.status. */
export const REPORT_STATUSES = ["open", "reviewed", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  open: "নতুন", reviewed: "পর্যালোচিত", dismissed: "খারিজ",
};

/**
 * Reasons offered by the public report form. The STORED value is the canonical
 * key; the shared list keeps the form, the API validator and the admin queue in
 * lockstep (a drifted copy silently rejected every submit).
 */
export const REPORT_REASONS = [
  "ভুল তথ্য / Misinformation",
  "আপত্তিকর বিষয়বস্তু",
  "কপিরাইট লঙ্ঘন",
  "স্প্যাম / বিজ্ঞাপন",
  "অন্যান্য",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Short Bengali chip label per reason. The KEYS are derived from
 *  REPORT_REASONS itself, so this map can never drift from the values the API
 *  validates (a hand-copied key once differed by a single glyph and TypeScript
 *  could not know which spelling was intended). */
const [REASON_MISINFO, REASON_OBJECTIONABLE, REASON_COPYRIGHT, REASON_SPAM, REASON_OTHER] = REPORT_REASONS;
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  [REASON_MISINFO]: "ভুল তথ্য",
  [REASON_OBJECTIONABLE]: "আপত্তিকর",
  [REASON_COPYRIGHT]: "কপিরাইট",
  [REASON_SPAM]: "স্প্যাম",
  [REASON_OTHER]: "অন্যান্য",
};

/** Report row shape served by /api/reports and rendered in /admin/reports. */
export type ReportRow = {
  id: number; articleId: number; reporterName: string; reporterEmail: string;
  reason: string; details: string; status: ReportStatus; createdAt: string;
};
