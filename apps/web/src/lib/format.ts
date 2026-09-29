/**
 * Pure presentation helpers — safe to import from client components
 * (no database or server-only dependencies here).
 *
 * Category colours and labels live in `category-style.ts`, which resolves them
 * from the database and derives readable text from the colour's luminance.
 * The maps below are a static fallback for surfaces with no category rows
 * loaded; prefer `categoryLabel(slug, cats)` / `categoryTint(slug, cats)`.
 */

/** @deprecated Use `categoryLabel(slug, cats)` so admin renames are respected. */
export const CATEGORY_LABEL: Record<string, string> = {
  "child-sexual-abuse": "শিশু যৌন নির্যাতন",
  "extramarital-crime": "পরকীয়া অপরাধ",
  "missing-children": "নিখোঁজ শিশু",
};

/** @deprecated Use `categoryTint(slug, cats)` so admin dot colours are respected. */
export const CATEGORY_TINT: Record<string, string> = {
  "child-sexual-abuse": "#2563eb",
  "extramarital-crime": "#d2202c",
  "missing-children": "#0d9488",
};

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
export const toBn = (v: number | string) =>
  String(v).replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d);

export function timeBn(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function bnTime(d: Date | string | null | undefined) {
  return timeBn(d);
}

export function bnDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function bnFullDate(d: Date) {
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function agoBn(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const mins = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (mins < 60) return `${toBn(mins)} মিনিট আগে`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${toBn(hrs)} ঘণ্টা আগে`;
  return `${toBn(Math.round(hrs / 24))} দিন আগে`;
}