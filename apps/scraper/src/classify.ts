import type { CategorySlug } from "@hoichoi/shared-types";

/**
 * Content-based category sniffing for scraped posts.
 *
 * Posts inherit their source's category blindly, so a violence/abuse story
 * collected from a "নিখোঁজ শিশু" page lands under the wrong section. This
 * weighted Bangla keyword scorer re-detects the category from the raw text and
 * only overrides the source category when the signal is strong enough.
 */

interface KeyTerm {
  re: RegExp;
  weight: number;
}

const KW: Record<string, KeyTerm[]> = {};

/**
 * Bangla letter range used for word boundaries.
 *
 * JavaScript's `\b` and `\w` are ASCII-only, so `\bনিখোঁজ\b` never matches
 * "নিখোঁজ শিশু" — Bangla codepoints are not `\w`. The two strongest
 * missing-children and homicide signals were silently dead because of this,
 * which is why so many posts were filed under the wrong category. Bangla
 * boundaries have to be asserted explicitly with lookaround instead.
 */
const BN = "\\u0980-\\u09FF";
/** Whole-word assertion that works for Bangla. */
const word = (term: string) => `(?<![${BN}])${term}(?![${BN}])`;

function def(slug: string, terms: Array<[string, number]>) {
  KW[slug] = terms.map(([t, weight]) => ({
    re: new RegExp(word(t), "i"),
    weight,
  }));
}

def("missing-children", [
  [word("নিখোঁজ"), 5],
  [word("নিখোজ"), 5],
  [word("নিখুঁজ"), 5],
  [word("খোঁজা"), 2],
  [word("খুঁজছে"), 2],
  ["হারিয়ে গেছে", 4],
  ["হারিয়ে যাওয়া", 4],
  ["হারিয়ে যায়", 4],
  ["উধাও", 3],
  ["উধাও হয়েছে", 4],
  ["খুঁজে পাওয়া যাচ্ছে না", 4],
  ["খুঁজে পাওয়া যায়নি", 4],
  ["সন্ধান চাই", 3],
  ["সন্ধান চলছে", 3],
  ["অভিযোগ দায়ের", 2],
  [word("বেলঘরিয়া"), 2],
  ["এলাকা ছেড়ে", 2],
  ["নিজ বাড়ি থেকে", 2],
  ["ছবি থেকে", 1],
  [word("ছেলেটি"), 2],
  [word("মেয়েটি"), 2],
]);

def("child-sexual-abuse", [
  ["ধর্ষণ", 5],
  ["ধর্ষণের", 5],
  ["ধর্ষকের", 5],
  ["ধর্ষিত", 5],
  ["যৌন নির্যাতন", 5],
  ["যৌন নির্যাতনে", 5],
  ["যৌন হয়রানি", 4],
  ["অভিসারে", 4],
  ["অভিসারের", 4],
  ["শ্লীলতাহানি", 4],
  ["ইভটিজিং", 4],
  ["ইভি", 3],
  ["অশ্লীল", 3],
  ["পর্নো", 4],
  ["পর্নোগ্রাফি", 4],
  ["পর্নো ভিডিও", 5],
  ["নাবালক", 3],
  ["নাবালিকা", 4],
  ["মাদ্রাসা ছাত্রী", 4],
  ["স্কুলছাত্রী", 4],
  ["ছাত্রীকে", 2],
  ["শিশুকে ধর্ষণ", 5],
  ["শিশু নির্যাতন", 5],
  ["গণধর্ষণ", 5],
  ["অসভ্যতা", 2],
  ["অপ্রাপ্তবয়স্ক", 3],
  ["সঙ্গে জড়িত", 2],
]);

def("extramarital-crime", [
  ["পরকীয়া", 5],
  ["পরকীয়ায়", 5],
  ["পরকীয়া প্রেম", 5],
  ["ব্যভিচার", 5],
  ["ব্যভিচারে", 5],
  ["অবৈধ সম্পর্ক", 4],
  ["অবৈধ সম্পর্কে", 4],
  ["শারীরিক সম্পর্ক", 3],
  ["স্বামীর প্রেমিকা", 4],
  ["স্বামীর প্রেমিকার", 4],
  ["স্ত্রীর প্রেমিক", 4],
  ["স্ত্রীর সাথে প্রেম", 4],
  ["উপপত্নী", 3],
  ["বৈবাহিক বে-ইমানি", 4],
  ["বিয়ে করে", 2],
  ["অন্য পুরুষের সাথে", 3],
]);

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
 * source-assigned category — everything uncertain keeps the source's choice.
 */
export function classifyContent(
  text: string,
  candidates: CategorySlug[],
  sourceCategory: CategorySlug,
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
    const terms = KW[slug];
    if (!terms) continue;
    let score = 0;
    const match: string[] = [];
    for (const t of terms) {
      if (t.re.test(norm)) {
        score += t.weight;
        match.push(t.re.source);
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

  const confident = bestScore >= 4 && bestScore - secondScore >= 2;
  if (!confident) return { slug: null, confidence: 0, matches: [] };
  return {
    slug: best as CategorySlug,
    confidence: Math.round((bestScore / total) * 100),
    matches: hits.get(best) ?? [],
  };
}
