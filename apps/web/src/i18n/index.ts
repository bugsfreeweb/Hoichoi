/**
 * `t()` — the only way new user-facing text should be written.
 *
 * Bangla is the default because the product is Bangla-first. `tBoth()` exists for
 * the few places that show both lines (a policy statement where an English
 * reader must be able to verify the Bangla), not as a general habit.
 *
 * Missing keys return the key itself rather than an empty string: a visible
 * `poll.verdict.clean` in the UI is a bug report, an empty span is a mystery.
 */
import { DICTIONARY, type Locale, type MessageKey } from "./dictionary";

export { DICTIONARY } from "./dictionary";
export type { Locale, MessageKey } from "./dictionary";

function substitute(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

/** Bangla by default; pass `"en"` for the secondary line. */
export function t(key: MessageKey, params?: Record<string, string | number>, locale: Locale = "bn"): string {
  const entry = DICTIONARY[key];
  if (!entry) return String(key);
  return substitute(entry[locale], params);
}

/** Both languages, Bangla first — for public statements only. */
export function tBoth(key: MessageKey, params?: Record<string, string | number>): { bn: string; en: string } {
  const entry = DICTIONARY[key];
  if (!entry) return { bn: String(key), en: String(key) };
  return { bn: substitute(entry.bn, params), en: substitute(entry.en, params) };
}

export function hasKey(key: string): key is MessageKey {
  return key in DICTIONARY;
}
