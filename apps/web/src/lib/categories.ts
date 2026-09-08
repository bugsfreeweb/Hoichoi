import type { CategoryMeta, CategorySlug } from "@hoichoi/shared-types";

/** ≡ ধ্রুবক; live config বরাবরই category_configs. */
export const CATEGORY_DEFAULT_COLORS: Record<CategorySlug, string> = {
  "child-sexual-abuse": "#2563eb",
  "extramarital-crime": "#d2202c",
  "missing-children": "#0d9488",
};

export function categoryColor(cat: CategoryMeta | CategorySlug): string {
  const slug = typeof cat === "string" ? cat : cat.slug;
  return CATEGORY_DEFAULT_COLORS[slug] ?? "#4a4a4a";
}