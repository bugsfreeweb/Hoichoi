/**
 * Bilingual dictionary.
 *
 * The product is Bangla-first: Bangla is the primary string everywhere and
 * English is secondary. Before this file, every new screen invented its own
 * Bangla literal inline, so the two languages drifted and a translator had
 * nothing to translate — strings only existed inside JSX.
 *
 * Rules:
 * - Bangla is required; English is required too, because these are public
 *   statements and an English reader must be able to check them.
 * - `{name}` placeholders are substituted by `t()`.
 * - Keys are flat and dotted by surface, so a grep for a key finds its use.
 *
 * Existing screens are deliberately *not* rewritten here: their text is
 * unchanged by choice, and moving hundreds of strings would risk altering the UI.
 * New surfaces (media dashboard, notifications, privacy tooling, poll integrity)
 * are the ones that must go through `t()`.
 */

export type Locale = "bn" | "en";

export interface Entry {
  bn: string;
  en: string;
}

export const DICTIONARY = {
  // ── Common ────────────────────────────────────────────────────────────────
  "common.retry": { bn: "আবার চেষ্টা করুন", en: "Try again" },
  "common.cancel": { bn: "বাতিল", en: "Cancel" },
  "common.save": { bn: "সংরক্ষণ", en: "Save" },
  "common.loading": { bn: "লোড হচ্ছে…", en: "Loading…" },
  "common.none": { bn: "কিছু নেই", en: "Nothing yet" },
  "common.failed": { bn: "ব্যর্থ", en: "Failed" },

  // ── Media dashboard ───────────────────────────────────────────────────────
  "media.heading": { bn: "মিডিয়া ও কোটা", en: "Media & quota" },
  "media.bytes": { bn: "সংরক্ষিত আকার", en: "Stored bytes" },
  "media.quotaHeadroom": { bn: "কোটা বাকি", en: "Quota headroom" },
  "media.failureTrend": { bn: "ব্যর্থতার ধারা (১৪ দিন)", en: "Failure trend (14 days)" },
  "media.noQuota": { bn: "কোটা নির্ধারিত হয়নি", en: "No quota set" },
  "media.reconcile": { bn: "ফাইল পুনর্মিলন", en: "File reconciliation" },

  // ── Notifications ─────────────────────────────────────────────────────────
  "notify.empty": { bn: "কোনো ঘটনা নেই।", en: "No events." },
  "notify.markAll": { bn: "সব পড়া হয়েছে", en: "Mark all read" },
  "notify.events": { bn: "ঘটনা", en: "Events" },
  "notify.queues": { bn: "কিউ আপডেট", en: "Queue updates" },
  "notify.stale": { bn: "সংযোগ ব্যর্থ — আপডেট আনা যায়নি।", en: "Connection failed — updates unavailable." },
  "notify.desktopTitle": { bn: "হৈচৈ — {title}", en: "Hoichoi — {title}" },
  "notify.desktopCritical": { bn: "হৈচৈ · জরুরি — {title}", en: "Hoichoi · Critical — {title}" },

  // ── Privacy / data-subject ────────────────────────────────────────────────
  "privacy.heading": { bn: "ডেটা-সাবজেক্ট · এক্সপোর্ট / মুছে ফেলা", en: "Data subject · export / erase" },
  "privacy.explain": {
    bn: "পাঠকের গেস্ট আইডি দিন। শুধু ওই পাঠকের মন্তব্য, রিপোর্ট, সাবমিশন ও সরানোর অনুরোধ প্রযোজ্য।",
    en: "Enter the reader's guest id. Only that reader's comments, reports, submissions and removals are affected.",
  },
  "privacy.export": { bn: "এক্সপোর্ট (JSON)", en: "Export (JSON)" },
  "privacy.erase": { bn: "মুছে ফেলুন", en: "Erase" },
  "privacy.eraseWarn": {
    bn: "এটা ফেরানো যাবে না। নিশ্চিত করতে ERASE লিখুন।",
    en: "This cannot be undone. Type ERASE to confirm.",
  },
  "privacy.eraseConfirm": { bn: "হ্যাঁ, মুছে ফেলুন", en: "Yes, erase" },
  "privacy.erased": { bn: "{n}টি সারি মুছে ফেলা হয়েছে।", en: "{n} rows erased." },
  "privacy.exported": { bn: "{n}টি সারি পাওয়া গেছে।", en: "{n} rows found." },
  "privacy.none": { bn: "কোনো সারি পাওয়া যায়নি।", en: "No rows found." },

  // ── Poll integrity ────────────────────────────────────────────────────────
  "poll.verdict.clean": { bn: "পরিষ্কার", en: "Clean" },
  "poll.verdict.flagged": { bn: "সন্দেহজনক", en: "Flagged" },
  "poll.verdict.suspicious": { bn: "অসততা সনাক্ত", en: "Suspicious" },
  "poll.riskScore": { bn: "রিস্ক স্কোর {score}/১০০", en: "Risk score {score}/100" },
  "poll.validVotes": { bn: "বৈধ ভোট {n}", en: "{n} valid votes" },
  "poll.invalidated": { bn: "বাতিল {n}", en: "{n} invalidated" },
  "poll.networks": { bn: "নেটওয়ার্কভিত্তিক ভোট (শীর্ষ {n})", en: "Votes by network (top {n})" },
  "poll.invalidateNetwork": { bn: "এই নেটওয়ার্কের ভোট বাতিল", en: "Invalidate this network" },
  "poll.reason": { bn: "বাতিলের কারণ (অডিটে লেখা থাকবে)", en: "Reason (recorded in the audit log)" },
  "poll.reasonTooShort": {
    bn: "বাতিল করার কারণ লিখুন (কমপক্ষে ৩ অক্ষর)।",
    en: "Give a reason (at least 3 characters).",
  },
  "poll.methodHeading": { bn: "ভোট কীভাবে গোনা হয়", en: "How votes are counted" },
} as const satisfies Record<string, Entry>;

export type MessageKey = keyof typeof DICTIONARY;
