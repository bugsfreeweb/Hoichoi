/**
 * Display-name guard.
 *
 * The three anonymous forms (comments, reports, submissions) collect a display
 * name. It is a trust surface: someone can use it to pose as the publication
 * itself, as its named editor, or as a public figure, and a URL in a name is how
 * spam reaches readers. The guard is deliberately strict and silent-friendly —
 * `null` means "fine", a reason means "refused for this exact thing".
 */
const STAFF_MARKERS = [
  "হৈচৈ",
  "hoichoi",
  "হৈচৈর সম্পাদক",
  "সম্পাদক",
  "editor",
  "admin",
  "administrator",
  "মডারেটর",
  "moderator",
  "system",
  "ডেস্ক",
  "দপ্তর",
  "সাপোর্ট",
  "support",
];

const PERSONA_MARKERS = [
  "পুলিশ",
  "পুলিশের ডিএসবি",
  "ডিএমপি",
  "র্যাব",
  "যুগ্ম কমিশনার",
  "জেলা প্রশাসক",
  "ডিসি",
];

const URL_PATTERN = /(?:https?:\/\/|www\.|\.com|\.net|\.org|\.bd|\.io|\btelegram\b|\bt.me\/)/i;
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF\u2060]/;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export interface NameAssessment {
  ok: boolean;
  /** Bangla (reader-facing) reason — the UI shows it verbatim. */
  reason?: string;
}

export function assessDisplayName(name: string | null | undefined): NameAssessment {
  const raw = (name ?? "").trim();
  if (raw.length < 2) return { ok: false, reason: "নাম কমপক্ষে ২ অক্ষরের হতে হবে।" };
  if (raw.length > 60) return { ok: false, reason: "নাম ৬০ অক্ষরের বেশি হতে পারে না।" };

  if (ZERO_WIDTH.test(raw) || CONTROL.test(raw)) {
    return { ok: false, reason: "নামে লুকানো অক্ষর থাকতে পারে না।" };
  }
  if (URL_PATTERN.test(raw)) {
    return { ok: false, reason: "নামে লিংক দেওয়া যাবে না।" };
  }
  // A wall of identical characters (or digits) is a bot signature, not a name.
  if (new Set(raw.replace(/\s/g, "")).size === 1) {
    return { ok: false, reason: "নামটি বৈধ মনে হচ্ছে না।" };
  }

  // Editorial identity is refused when a staff word appears on its own: the whole
  // name, the start, or the end. "সম্পাদকিয় প্রেমিক" (a word that merely contains
  // those letters) stays allowed, because refusing ordinary comments is worse
  // than a missed joke.
  const lower = raw.toLowerCase();
  const tokens = lower.split(/[\s.,·_-]+/).filter(Boolean);
  const first = tokens[0] ?? "";
  const last = tokens[tokens.length - 1] ?? "";
  if (STAFF_MARKERS.some((marker) => lower === marker || first === marker || last === marker)) {
    return { ok: false, reason: "এ নামটি প্রশাসকের জন্য সংরক্ষিত।" };
  }
  if (PERSONA_MARKERS.some((persona) => lower.includes(persona))) {
    return { ok: false, reason: "এ রকম নামে মন্তব্য করা যায় না — ব্যক্তি ছদ্মবেশ নিষিদ্ধ।" };
  }
  // A real name is not a category, a hashtag, or a role.
  const hashtag = /^#/.test(raw);
  if (hashtag && raw.length > 3) return { ok: false, reason: "হ্যাশট্যাগ নাম হিসেবে গ্রহণযোগ্য নয়।" };

  return { ok: true };
}

/**
 * A name that contains a category's Bangla/English label is not necessarily
 * impersonation (a sports fan might name themselves by a team), so this only
 * blocks the obvious publication identity markers above.
 */
export function looksLikeEditorialIdentity(name: string): boolean {
  const lower = name.toLowerCase();
  return STAFF_MARKERS.some((marker) => lower.includes(marker)) && lower.length <= 24;
}
