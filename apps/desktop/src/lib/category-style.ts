/**
 * Category presentation, driven by the database.
 *
 * The desk previously carried its own hardcoded label/colour maps that only
 * knew the three seeded slugs. An admin who renamed a category or changed its
 * dot in the web UI saw the new name on the site and the old one in the app,
 * and any category added later rendered as a blank chip.
 *
 * The built-in maps below are now only a fallback for when the category row
 * cannot be loaded, so the desk still renders something sensible offline.
 */

export interface CatMeta {
  slug: string;
  displayNameBn?: string | null;
  displayNameEn?: string | null;
  dot?: string | null;
  sortOrder?: number | null;
}

const FALLBACK_LABEL: Record<string, string> = {
  "child-sexual-abuse": "শিশু যৌন নির্যাতন",
  "extramarital-crime": "পরকীয়া অপরাধ",
  "missing-children": "নিখোঁজ শিশু",
};

const FALLBACK_TINT: Record<string, string> = {
  "child-sexual-abuse": "#60a5fa",
  "extramarital-crime": "#f87171",
  "missing-children": "#2dd4bf",
};

/** Stable colour for a slug with no configured dot, so it is never blank. */
const PALETTE = [
  "#60a5fa",
  "#f87171",
  "#2dd4bf",
  "#fbbf24",
  "#a78bfa",
  "#34d399",
  "#fb923c",
  "#38bdf8",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function normalizeHex(v: string | null | undefined): string | null {
  if (!v) return null;
  let hex = v.trim();
  if (!hex.startsWith("#")) hex = `#${hex}`;
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
  if (hex.length === 4) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex;
}

/** DB name wins; fall back to the built-in map, then to the raw slug. */
export function categoryLabel(
  slug: string,
  cats?: readonly CatMeta[] | null,
): string {
  const hit = cats?.find((c) => c.slug === slug);
  return (
    hit?.displayNameBn?.trim() ||
    FALLBACK_LABEL[slug] ||
    slug
  );
}

/** DB dot wins; a malformed dot is ignored rather than breaking the chip. */
export function categoryTint(
  slug: string,
  cats?: readonly CatMeta[] | null,
): string {
  const hit = cats?.find((c) => c.slug === slug);
  const fromDb = normalizeHex(hit?.dot);
  if (fromDb) return fromDb;
  return FALLBACK_TINT[slug] ?? PALETTE[hash(slug) % PALETTE.length]!;
}

/**
 * Relative luminance per WCAG 2.1, used to pick readable text over a tint.
 * The threshold is the standard 0.179 cut-off where black starts to win.
 */
export function luminance(hex: string): number {
  const full = normalizeHex(hex) ?? "#000000";
  const channels = [0, 2, 4].map((i) => {
    const s = parseInt(full.slice(i + 1, i + 3), 16) / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Black or white, whichever reads better on the given background. */
export function readableOn(hex: string): string {
  return luminance(hex) > 0.179 ? "#000000" : "#ffffff";
}

/** Admin sort order first, then Bengali name, then slug for stability. */
export function bySortOrder<T extends CatMeta>(cats: readonly T[]): T[] {
  return [...cats].sort((a, b) => {
    const sa = a.sortOrder ?? 999;
    const sb = b.sortOrder ?? 999;
    if (sa !== sb) return sa - sb;
    const na = a.displayNameBn ?? a.slug;
    const nb = b.displayNameBn ?? b.slug;
    return na.localeCompare(nb, "bn");
  });
}

/** Backwards-compatible static maps, now used only as offline fallback. */
export const CATEGORY_LABEL = FALLBACK_LABEL;
export const CATEGORY_TINT = FALLBACK_TINT;
