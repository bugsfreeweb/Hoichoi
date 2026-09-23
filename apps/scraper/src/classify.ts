import type { CategorySlug } from "@hoichoi/shared-types";

/**
 * Content-based category sniffing for scraped posts.
 *
 * Posts inherit their source's category blindly; a violence/abuse story added
 * under a "নিখোঁজ শিশু" page then lands under the wrong section. This tiny
 * Bangla-aware keyword scorer re-detects the category from the raw text and
 * only overrides the source category when the signal is strong enough.
 */

interface KeyTerm {
  re: RegExp;
  weight: number;
}

const KW: Record<string, KeyTerm[]> = {};

function def(slug: string, terms: Array<[string | RegExp, number]>) {
  KW[slug] = terms.map(([t, weight]) => ({
    re: typeof t === "string" ? new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : t,
    weight,
  }));
}

def("missing-children", [
  [/\bনিখোঁজ\b|\bনিখোজ\b|\bনিখোঁজ\b/, 4],
  ["হারিয়ে গেছে", 3],
  ["হারিয়ে যাওয়া", 3],
  ["উধাও", 3],
  ["খুঁজে পাওয়া যাচ্ছে না", 3],
  ["সন্ধান চাই", 3],
  ["কোথায় আছে?", 2],
  [/\bছেলেটি\b/, 1],
]);

def("child-sexual-abuse", [
  ["ধর্ষণ", 4],
  ["ধর্ষকের", 4],
  ["যৌন নির্যাতন", 4],
  ["যৌন হয়রানি", 4],
  ["শ্লীলতাহানি", 3],
  ["ইভটিজিং", 3],
  ["পর্নো", 3],
  ["পর্নোগ্রাফি", 3],
  ["নাবালক", 3],
  ["নাবালিকা", 3],
  ["মাদ্রাসা ছাত্রী", 3],
  ["স্কুলছাত্রী", 3],
  ["শিশুকে ধর্ষণ", 4],
  ["গণধর্ষণ", 5],
  ["অসভ্যতা", 2],
]);

def("extramarital-crime", [
  ["পরকীয়া", 4],
  ["ব্যভিচার", 4],
  ["অবৈধ সম্পর্ক", 3],
  ["স্বামীর প্রেমিকা", 3],
  ["স্ত্রীর প্রেমিক", 3],
  ["উপপত্নী", 3],
  ["পরকীয়া প্রেম", 4],
  ["বৈবাহিক বে-ইমানি", 3],
]);

def("crime", [
  ["হত্যা", 3],
  [/\bখুন\b/, 3],
  ["মৃতদেহ", 3],
  ["ছুরিকাঘাত", 3],
  ["গুলিবিদ্ধ", 3],
  ["ডাকাতি", 3],
  ["ছিনতাই", 3],
  ["মাদক", 2],
  ["আটক", 2],
  ["গ্রেপ্তার", 2],
  ["অভিযোগ", 2],
]);

def("child", [
  ["শিশু সুরক্ষা", 3],
  ["বাল্যবিবাহ", 3],
  ["শিশুশ্রম", 3],
  ["শিশু নির্যাতন", 3],
  ["স্কুলে যেতে চায় না", 2],
]);

def("family", [
  ["পারিবারিক কলহ", 3],
  ["স্ত্রী-স্বামীর ঝগড়া", 3],
  ["তালাক", 2],
  ["যৌতুক", 3],
  ["স্ত্রী নির্যাতন", 3],
]);

def("viral", [
  ["ভাইরাল", 3],
  ["সোশ্যাল মিডিয়ায় ছড়িয়ে", 2],
  ["নেটদুনিয়ায়", 2],
  ["ব্যাপক আলোচনা", 2],
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
  const norm = (text ?? "").replace(/[\s\u200b]+/g, " ").toLowerCase();
  const scores = new Map<string, number>();
  const hits = new Map<string, string[]>();

  for (const slug of candidates) {
    if (!KW[slug]) continue;
    let score = 0;
    const match: string[] = [];
    for (const t of KW[slug]!) {
      if (t.re.test(norm)) {
        score += t.weight;
        match.push(t.re.source.slice(0, 40));
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
  const [second, secondScore] = ranked[1] ?? [best, 0];
  const total = [...scores.values()].reduce((a, b) => a + b, 0);

  // Skip the source category entirely (we're only here to FIX a bad default),
  // unless the content strongly clears it too.
  if (best === sourceCategory) return { slug: null, confidence: 0, matches: [] };

  const confident = bestScore >= 3 && bestScore - secondScore >= 2;
  if (!confident) return { slug: null, confidence: 0, matches: [] };
  return {
    slug: best as CategorySlug,
    confidence: Math.round((bestScore / total) * 100),
    matches: hits.get(best) ?? [],
  };
}