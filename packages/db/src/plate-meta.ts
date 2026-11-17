/**
 * What goes on a story plate, in Bangla.
 *
 * The plate itself lives in `@hoichoi/poster` (pure geometry + sharp). These are
 * the two facts it needs from the database's own vocabulary — the desk's Bangla
 * name and the desk's colour, plus a Bangla date — kept here so the collector and
 * the web route cannot label the same story differently.
 */
import { CATEGORY_SEED, GENERAL_CATEGORY_SEED } from "./rows";

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const BN_MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

/** 2026-11-17 → "১৭ নভেম্বর ২০২৬". */
export function banglaDate(date: Date = new Date()): string {
  const bn = (n: number) => String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]!);
  return `${bn(date.getDate())} ${BN_MONTHS[date.getMonth()] ?? ""} ${bn(date.getFullYear())}`;
}

/** The desk's Bangla name and its own colour, so a sports plate is not the news red. */
export function deskFor(category: string | null | undefined): { label: string | null; accent: string } {
  const slug = (category ?? "").trim().toLowerCase();
  // Two seed lists exist: the general desks (politics, sports, economy…) and the
  // sensitive ones (missing children, abuse…), which are seeded separately.
  const meta =
    GENERAL_CATEGORY_SEED.find((c) => c.slug === slug) ?? CATEGORY_SEED.find((c) => c.slug === slug);
  if (!meta) return { label: null, accent: "#e8552d" };
  return { label: meta.displayNameBn, accent: `#${meta.dot}` };
}

/** Just the Bangla desk name, or null when the category is unknown. */
export function deskLabel(category: string | null | undefined): string | null {
  return deskFor(category).label;
}

/** Just the desk colour, or the newsroom red. */
export function deskAccent(category: string | null | undefined): string {
  return deskFor(category).accent;
}
