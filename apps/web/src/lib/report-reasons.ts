/**
 * Reader-report reasons (mirrors mockup/src/lib/moderation-types.ts).
 * The STORED value is the canonical key; form, API validator and admin queue
 * share this list so they can never drift.
 */
export const REPORT_REASONS = [
  "ভুল তথ্য / Misinformation",
  "আপত্তিকর বিষয়বস্তু",
  "কপিরাইট লঙ্ঘন",
  "স্প্যাম / বিজ্ঞাপন",
  "অন্যান্য",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUS_LABELS: Record<string, string> = {
  open: "নতুন",
  reviewed: "পর্যালোচিত",
  dismissed: "খারিজ",
};

const [REASON_MISINFO, REASON_OBJECTIONABLE, REASON_COPYRIGHT, REASON_SPAM, REASON_OTHER] = REPORT_REASONS;
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  [REASON_MISINFO]: "ভুল তথ্য",
  [REASON_OBJECTIONABLE]: "আপত্তিকর",
  [REASON_COPYRIGHT]: "কপিরাইট",
  [REASON_SPAM]: "স্প্যাম",
  [REASON_OTHER]: "অন্যান্য",
};