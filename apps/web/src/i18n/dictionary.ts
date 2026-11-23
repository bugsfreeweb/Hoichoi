/**
 * The web app's view of the shared dictionary.
 *
 * This file used to hold its own table. Three apps now read one table
 * (`@hoichoi/i18n`), so this is a re-export: the ~40 screens that already call
 * `t("media.heading")` keep working, and the site, the console and the desk can
 * never again disagree about what a phrase says.
 *
 * New keys belong in `packages/i18n/src/dictionary.ts`, not here.
 */
export {
  DICTIONARY,
  MESSAGE_KEYS,
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
} from "@hoichoi/i18n";
export type { Entry, Locale, MessageKey } from "@hoichoi/i18n";
