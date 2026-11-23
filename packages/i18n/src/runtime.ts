/**
 * `t()` and the small amount of language logic the three apps share.
 *
 * Deliberately dependency-free: the web app renders it on the server and in the
 * client, the desktop app renders it inside a webview, and the console renders it
 * before hydration. A library that wants a React context to exist before it can
 * print a word would have had to be threaded through all three.
 */
import { DEFAULT_LOCALE, DICTIONARY, LOCALES, type Locale, type MessageKey } from "./dictionary";

export type Params = Record<string, string | number>;

/** True when `value` is one of the two supported locales. */
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Coerce a cookie, a query parameter or a `navigator.language` into a locale.
 *
 * Accepts the short tags and the ones a browser actually sends (`bn-BD`,
 * `en-GB`, `en_US`) so a Bangla reader on an English phone still gets Bangla
 * unless they choose otherwise. Anything unrecognised falls back to Bangla,
 * which is the product's first language.
 */
export function normalizeLocale(value: unknown): Locale {
  if (typeof value !== "string") return DEFAULT_LOCALE;
  const tag = value.trim().toLowerCase().replace("_", "-");
  if (!tag) return DEFAULT_LOCALE;
  if (tag === "bn" || tag.startsWith("bn-")) return "bn";
  if (tag === "en" || tag.startsWith("en-")) return "en";
  return DEFAULT_LOCALE;
}

/** The other language — what a toggle switches to. */
export function otherLocale(locale: Locale): Locale {
  return locale === "bn" ? "en" : "bn";
}

function substitute(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : whole,
  );
}

/**
 * One string, in one language.
 *
 * A missing key returns the key itself rather than an empty string: a visible
 * `admin.nav.typo` is a bug report, an empty span is a mystery. Same rule as the
 * original web dictionary — a missing translation must be impossible to miss.
 */
export function t(key: MessageKey, params?: Params, locale: Locale = DEFAULT_LOCALE): string {
  const entry = DICTIONARY[key];
  if (!entry) return String(key);
  return substitute(entry[locale], params);
}

/** Both languages, Bangla first — for a public statement an English reader must check. */
export function tBoth(key: MessageKey, params?: Params): { bn: string; en: string } {
  const entry = DICTIONARY[key];
  if (!entry) return { bn: String(key), en: String(key) };
  return { bn: substitute(entry.bn, params), en: substitute(entry.en, params) };
}

/** Type guard for a key that exists, used by the audit script. */
export function hasKey(key: string): key is MessageKey {
  return Object.prototype.hasOwnProperty.call(DICTIONARY, key);
}

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const EN_DIGITS = "0123456789";

/** Digits in the locale's script: ১,২৪৫ in Bangla, 1,245 in English. */
export function formatNumber(value: number, locale: Locale, opts?: Intl.NumberFormatOptions): string {
  const grouped = new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US", opts).format(value);
  if (locale === "en") return grouped;
  return grouped.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

/** Back to ASCII digits for anything that has to be parsed after display. */
export function parseNumber(text: string): number {
  const ascii = text.replace(/[০-৯]/g, (d) => EN_DIGITS[BN_DIGITS.indexOf(d)] ?? d);
  return Number(ascii.replace(/[^0-9.-]/g, ""));
}

/**
 * A date in the reader's language.
 *
 * Bangla months are spelled out rather than taken from `Intl`: ICU's Bangla
 * month names vary by platform build (the desk's WebView2 and Node can disagree),
 * and a masthead that prints "নভেম্বর" on one machine and "নভে" on another is a
 * printing error, not a locale.
 */
const BN_MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
] as const;

const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const BN_DAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"] as const;
const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export interface DateOptions {
  /** Include the weekday ("শনিবার, ২২ নভেম্বর ২০২৬"). */
  weekday?: boolean;
  /** Include the year. Default true. */
  year?: boolean;
  /** Long month name (default) or the numeric month. */
  numeric?: boolean;
}

/** "২২ নভেম্বর ২০২৬" / "22 November 2026". */
export function formatDate(input: Date | string, locale: Locale, opts: DateOptions = {}): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  const day = formatNumber(date.getDate(), locale, { useGrouping: false });
  // A year is never grouped: "2,026" is a number, "2026" is a year.
  const year =
    opts.year === false ? "" : ` ${formatNumber(date.getFullYear(), locale, { useGrouping: false })}`;
  const month =
    opts.numeric === true
      ? formatNumber(date.getMonth() + 1, locale)
      : locale === "bn"
        ? (BN_MONTHS[date.getMonth()] ?? "")
        : (EN_MONTHS[date.getMonth()] ?? "");
  const head = opts.weekday
    ? `${locale === "bn" ? (BN_DAYS[date.getDay()] ?? "") : (EN_DAYS[date.getDay()] ?? "")}, `
    : "";
  return `${head}${day} ${month}${year}`.trim();
}

/** "২২ নভেম্বর ২০২৬, ২:০৫ PM" / "22 November 2026, 2:05 PM". */
export function formatDateTime(input: Date | string, locale: Locale): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  const time = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `${formatDate(date, locale)}, ${time}`;
}

/**
 * A sentence that exists in exactly one place, in both languages.
 *
 * The keyed table is right for words that recur — a status, a button, a nav row —
 * because two copies of the same word drift apart. It is wrong for the prose of
 * one console screen: 1,900 invented keys for 1,900 unique sentences is a table
 * nobody reads, and a translator cannot tell which of four similar keys is which.
 *
 * So prose is written where it is used, as a pair:
 *
 *   const b = useBi();               // client
 *   <p>{b("AI-উৎপাদিত খসড়া …", "AI-written drafts …")}</p>
 *
 * and a server component builds the same function from its locale:
 *
 *   const b = biFor(await getLocale());
 *
 * The second argument is never optional: the guard test fails a pair whose
 * English is empty or still contains Bangla, which is exactly how a half-done
 * translation looks.
 */
export type Bilingual = readonly [bn: string, en: string];

/** Declare a pair (reads as `bi(bn, en)` at the call site). */
export function bi(bn: string, en: string): Bilingual {
  return [bn, en] as const;
}

/** Pick the pair's string for a language. */
export function pick(pair: Bilingual, locale: Locale): string {
  return locale === "en" ? pair[1] : pair[0];
}

/** `b("বাংলা", "English")` → the string for one language, decided once. */
export type BiFn = (bn: string, en: string) => string;

export function biFor(locale: Locale): BiFn {
  return (bn, en) => (locale === "en" ? en : bn);
}
