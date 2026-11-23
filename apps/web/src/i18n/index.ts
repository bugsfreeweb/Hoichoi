/**
 * `t()` for the web app.
 *
 * The implementation lives in `@hoichoi/i18n` so the site, the console and the
 * desk print the same phrase in the same language. This module keeps the old
 * import path working (`@/i18n`) and nothing else.
 *
 * Bangla is the default because the product is Bangla-first. `tBoth()` exists for
 * the few places that show both lines (a policy statement where an English
 * reader must be able to verify the Bangla), not as a general habit.
 */
export {
  t,
  tBoth,
  hasKey,
  isLocale,
  normalizeLocale,
  otherLocale,
  formatDate,
  formatDateTime,
  formatNumber,
  parseNumber,
  DICTIONARY,
  MESSAGE_KEYS,
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
} from "@hoichoi/i18n";
export type { DateOptions, Entry, Locale, MessageKey, Params } from "@hoichoi/i18n";
