/**
 * `@hoichoi/i18n` — the one table and the one `t()` for the site, the console and
 * the desk.
 *
 *   import { t, formatDate, normalizeLocale } from "@hoichoi/i18n";
 *
 * Each app owns only two things: how it *stores* the choice (a cookie for the
 * web, localStorage for the desk) and where the toggle sits. The strings, the
 * fallback and the date/number formatting are shared, so the same screen reads
 * the same way in all three.
 */
export {
  DICTIONARY,
  MESSAGE_KEYS,
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
} from "./dictionary";
export type { Entry, Locale, MessageKey } from "./dictionary";

export {
  formatDate,
  formatDateTime,
  formatNumber,
  hasKey,
  isLocale,
  normalizeLocale,
  otherLocale,
  parseNumber,
  t,
  tBoth,
} from "./runtime";
export type { DateOptions, Params } from "./runtime";
