/**
 * Category presentation helpers — safe to import from client components.
 *
 * Colours, labels and order are owned by the database (`category_configs`).
 * These helpers only provide a *fallback* for the brief window before the DB
 * rows load, and the two rules that must be identical on every surface:
 *
 *  - a label comes from the DB, never from a hardcoded slug map, so renaming a
 *    category in /admin/categories actually changes the site;
 *  - text drawn on a category colour is chosen from that colour's luminance, so
 *    a pale admin-chosen dot stays readable instead of rendering white-on-white.
 *
 * Previously every surface carried its own hardcoded `CATEGORY_TINT` and
 * `CATEGORY_LABEL`, so a colour change in admin updated the post page and the
 * cards but silently did nothing on the homepage or the admin content queue.
 */

import type { CategoryMeta } from "@hoichoi/shared-types";

/** Fallback hues for the three built-in categories, used only pre-load. */
const FALLBACK_TINT: Record<string, string> = {
  "child-sexual-abuse": "#2563eb",
  "extramarital-crime": "#d2202c",
  "missing-children": "#0d9488",
};

const FALLBACK_LABEL: Record<string, string> = {
  "child-sexual-abuse": "শিশু যৌন নির্যাতন",
  "extramarital-crime": "পরকীয়া অপরাধ",
  "missing-children": "নিখোঁজ শিশু",
};

const NEUTRAL_TINT = "#0a0c10";

export const CATEGORY_TINT = FALLBACK_TINT;

/**
 * Pick black or white text for a category background using WCAG relative
 * luminance. Admin-chosen colours are not guaranteed to be dark, so a fixed
 * `text-white` is unreadable as soon as someone picks a light hue.
 */
export function readableOn(hex: string | null | undefined): "#000000" | "#ffffff" {
  const rgb = parseHex(hex);
  if (!rgb) return "#ffffff";
  // sRGB -> linear, then Rec. 709 relative luminance.
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  })!;
  const L = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  // Contrast against white is (1.05)/(L+0.05); against black is (L+0.05)/0.05.
  return L > 0.179 ? "#000000" : "#ffffff";
}

function parseHex(hex: string | null | undefined): [number, number, number] | null {
  if (!hex) return null;
  const m = hex.trim().replace(/^#/, "").match(/^([\da-f]{3}|[\da-f]{6})$/i);
  if (!m) return null;
  let h = m[1]!;
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Resolve a category's dot colour from loaded DB rows, with a slug fallback. */
export function categoryTint(
  category: string,
  cats: Array<Pick<CategoryMeta, "slug" | "dot">> | null | undefined,
): string {
  const found = cats?.find((c) => c.slug === category);
  if (found?.dot) return `#${found.dot.replace(/^#/, "")}`;
  return FALLBACK_TINT[category] ?? NEUTRAL_TINT;
}

/** Resolve a category's Bengali label, preferring the DB name over any map. */
export function categoryLabel(
  category: string,
  cats?: Array<Pick<CategoryMeta, "slug" | "displayNameBn" | "displayNameEn">> | null,
): string {
  const found = cats?.find((c) => c.slug === category);
  return found?.displayNameBn || found?.displayNameEn || FALLBACK_LABEL[category] || category;
}

/** Sort categories by the admin-defined order, then name, for stable display. */
export function bySortOrder<
  T extends { sortOrder?: number; slug: string; displayNameBn?: string | null },
>(list: T[]): T[] {
  return [...list].sort(
    (a, b) =>
      (a.sortOrder ?? 999) - (b.sortOrder ?? 999) ||
      (a.displayNameBn ?? a.slug).localeCompare(b.displayNameBn ?? b.slug, "bn"),
  );
}
