import type { CategorySlug } from "@hoichoi/shared-types";

/**
 * Content-based category sniffing for scraped posts.
 *
 * Posts inherit their source's category blindly, so a violence/abuse story
 * collected from a "নিখোঁজ শিশু" page lands under the wrong section. This
 * weighted Bangla keyword scorer re-detects the category from the raw text and
 * only overrides the source category when the signal is strong enough.
 */

/**
 * Content-based category sniffing for scraped posts.
 *
 * Posts inherit their source's category blindly, so a story that clearly
 * belongs elsewhere is re-filed only when the raw text strongly matches.
 *
 * The keyword table is deliberately NOT defined here. It lives in
 * `category_configs.config.keywords`, which the operator owns and edits from
 * BOTH the web admin (`/admin/categories`) and the desktop desk
 * (`DeskCategoryManager`). A hard-coded profile would silently drift from what
 * the operator configured and could not be corrected without a deploy — every hard-coded
 * signal was a symptom of that drift. `classifyContent` is pure: give it the
 * keyword maps and it scores.
 */

const BN = "\\u0980-\\u09FF";
/**
 * Whole-word assertion that works for Bangla.
 *
 * JavaScript's `\b` and `\w` are ASCII-only, so `\bনিখোঁজ\b` never matches
 * "নিখোঁজ শিশু" — Bangla codepoints are not `\w`. Bangla boundaries have to be
 * asserted explicitly with lookaround instead.
 */
const word = (term: string) => `(?<![${BN}])${term}(?![${BN}])`;

export interface ClassifyResult {
  /** Best-matching category present in the DB, or null when the signal is weak. */
  slug: CategorySlug | null;
  /** Relative strength of the best match vs all candidates. */
  confidence: number;
  /** Terms that hit the winning category. */
  matches: string[];
}

/**
 * Score raw text against candidate categories. Only a category whose score
 * clears the threshold AND beats the runner-up by a clear margin overrides the
 * source-assigned category.
 *
 * `keywords` maps `slug -> string[]` and must come from
 * `category_configs.config.keywords` (web admin + desktop desk edit lists).
 * Unknown slugs with no keywords never match on their own, so a brand-new
 * category stays quiet until the operator teaches it terms.
 */
export function classifyContent(
  text: string,
  candidates: CategorySlug[],
  sourceCategory: CategorySlug,
  keywords: Record<string, string[]> = {},
): ClassifyResult {
  const norm = (text ?? "")
    .replace(/[\s\u200b]+/g, " ")
    // Bengali has a decomposed form in the wild; fold it to NFC so "খোঁজা"
    // matches regardless of whether the source used precomposed Nukta.
    .normalize("NFC")
    .toLowerCase();
  const scores = new Map<string, number>();
  const hits = new Map<string, string[]>();

  for (const slug of candidates) {
    const terms = keywords[slug] ?? [];
    let score = 0;
    const match: string[] = [];
    for (const t of terms) {
      const term = typeof t === "string" ? t.trim() : "";
      if (!term) continue;
      if (new RegExp(word(escapeRegExp(term)), "i").test(norm)) {
        score += 4;
        match.push(term);
      }
    }
    if (score > 0) {
      scores.set(slug, score);
      hits.set(slug, match);
    }
  }
  if (scores.size === 0) return { slug: null, confidence: 0, matches: [] };

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [best, bestScore] = ranked[0]!;
  const [, secondScore] = ranked[1] ?? [best, 0];
  const total = [...scores.values()].reduce((a, b) => a + b, 0);

  // Skip the source category entirely (we're only here to FIX a bad default),
  // unless the content strongly clears it too.
  if (best === sourceCategory) return { slug: null, confidence: 0, matches: [] };

  const confident = bestScore >= 4 && bestScore - secondScore > 1; // >= 2 margin
  if (!confident) return { slug: null, confidence: 0, matches: [] };
  return {
    slug: best as CategorySlug,
    confidence: Math.round((bestScore / total) * 100),
    matches: hits.get(best) ?? [],
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
