/**
 * Which sentences in a story can actually be checked?
 *
 * The verification panel lets an editor record claims, evidence and a grade —
 * but the editor started from a blank box, and a blank box is why most posts had
 * no claims at all. The obvious shortcut is to ask a model to "extract the
 * claims", and it is the wrong one: a proposal is a *reading of the text*, not a
 * judgement about it, and a model's reading would be unauditable, un-repeatable
 * and (since it holds names and places) a second copy of the story at a third
 * party.
 *
 * So the proposal is deterministic: split the body it already has into
 * statements, keep the ones that carry something checkable (a number, a date, a
 * sum of money, a named party, a quotation), drop the ones that cannot be true or
 * false (questions, appeals, sentiment), and rank by how much there is to verify.
 * Two runs on the same text give the same list, and an editor can see why a line
 * was offered.
 *
 * Nothing here writes a row. A candidate becomes a claim only when a named editor
 * keeps it.
 */

export type ClaimKind = "figure" | "quote" | "statement";

export interface ClaimCandidate {
  /** The sentence as published, trimmed to one clause. */
  text: string;
  kind: ClaimKind;
  /** Why it was offered, in the operator's language — never a confidence score. */
  reason: string;
}

/** A sentence shorter than this is a fragment; longer than the cap is a paragraph. */
const MIN_CHARS = 24;
const MAX_CHARS = 240;
/** More than this is a list to skim, not a checklist. */
const DEFAULT_MAX = 8;

const BN_DIGITS = /[০-৯0-9]/;
const BN_MONTH =
  /(?:জানুয়ারি|ফেব্রুয়ারি|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|সেপ্টেম্বর|অক্টোবর|নভেম্বর|ডিসেম্বর|জানু|ফেব্রু|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|সেপ্ট|অক্টো|নভে|ডিসে)/;
const RELATIVE_TIME =
  /(গতকাল|আজ|গত সপ্তাহ|গত মাস|গতকাল রাতে|শুক্রবার|শনিবার|রবিবার|সোমবার|মঙ্গলবার|বুধবার|বৃহস্পতিবার)/;
const MONEY = /(টাকা|কোটি|লাখ|হাজার|শতাংশ|ভাগ|শতকরা|%|ডলার|রুপি)/;
const NAMED_PARTY =
  /(মন্ত্রী|সচিব|পুলিশ|কর্তৃপক্ষ|আদালত|মামলা|এফআইআর|সংস্থা|কমিটি|বিশ্ববিদ্যালয়|জেলা|থানা|উপজেলা|সরকার|প্রশাসন|মেয়র|চেয়ারম্যান|এমপি|সাংসদ)/;
const QUOTE_MARK = /[“"«]/;
/** Sentences that are plainly not claims: appeals, questions, mood. */
const NOT_A_CLAIM =
  /(শেয়ার করুন|মন্তব্য করুন|আপনি কী মনে করেন|কী মনে করেন|লিখুন|দেখুন|ভিডিওটি|সাবস্ক্রাইব)/;
const SPECULATION = /(হতে পারে|মনে হচ্ছে|হয়তো|সম্ভবত|যদি|ধারণা করা হচ্ছে)/;

/** Split on Bangla/English terminators and hard line breaks, keeping the text. */
export function splitSentences(body: string): string[] {
  const cleaned = body
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
  const parts: string[] = [];
  let buffer = "";
  for (const char of cleaned) {
    buffer += char;
    if ("।?!\n".includes(char)) {
      const trimmed = buffer.trim();
      if (trimmed) parts.push(trimmed);
      buffer = "";
    }
  }
  const tail = buffer.trim();
  if (tail) parts.push(tail);
  return parts;
}

function normalise(sentence: string): string {
  return sentence
    .replace(/^[\s•\-–—*·]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

const BN_DIGIT_MAP: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

/** Both digit sets become ASCII, so dedupe does not treat ১০ and 10 as different. */
export function foldDigits(text: string): string {
  return text.replace(/[০-৯]/g, (d) => BN_DIGIT_MAP[d] ?? d);
}

/**
 * The checkable statements in a body, most checkable first.
 *
 * Ranking is by *evidence surface*, not by how dramatic the line is: a sentence
 * with a figure and a named party goes above one with a figure, which goes above
 * one with only a named party, which goes above a plain statement.
 */
export function extractClaimCandidates(
  bodyBn: string,
  opts: { max?: number } = {},
): ClaimCandidate[] {
  const max = Math.max(1, Math.min(20, opts.max ?? DEFAULT_MAX));
  const seen = new Set<string>();
  const scored: Array<ClaimCandidate & { score: number }> = [];

  for (const raw of splitSentences(bodyBn)) {
    let sentence = normalise(raw);
    if (sentence.length < MIN_CHARS) continue;
    if (sentence.length > MAX_CHARS) {
      // Cut at a clause boundary rather than mid-word, then re-check the length.
      const cutAt = Math.max(
        sentence.lastIndexOf(",", MAX_CHARS),
        sentence.lastIndexOf(" এবং ", MAX_CHARS),
      );
      sentence = (
        cutAt > MIN_CHARS
          ? sentence.slice(0, cutAt)
          : sentence.slice(0, MAX_CHARS)
      ).trim();
    }
    if (sentence.length < MIN_CHARS) continue;
    if (NOT_A_CLAIM.test(sentence)) continue;

    const isQuestion = /\?\s*$/.test(sentence);
    const isQuote = QUOTE_MARK.test(sentence);
    const hasFigure = BN_DIGITS.test(sentence);
    const hasMoney = MONEY.test(sentence);
    const hasTime = BN_MONTH.test(sentence) || RELATIVE_TIME.test(sentence);
    const hasParty = NAMED_PARTY.test(sentence);
    const speculative = SPECULATION.test(sentence);

    let score = 0;
    if (hasFigure) score += 3;
    if (hasMoney) score += 2;
    if (hasTime) score += 2;
    if (hasParty) score += 2;
    if (isQuote) score += 2;
    if (isQuestion) score -= 3;
    if (speculative) score -= 3;
    if (score <= 0) continue; // nothing here an editor could check

    const kind: ClaimKind =
      hasFigure || hasMoney ? "figure" : isQuote ? "quote" : "statement";
    const reasons: string[] = [];
    if (hasFigure) reasons.push("সংখ্যা আছে");
    if (hasMoney) reasons.push("অঙ্ক আছে");
    if (hasTime) reasons.push("সময়/তারিখ আছে");
    if (hasParty) reasons.push("নামকরা পক্ষ আছে");
    if (isQuote) reasons.push("উদ্ধৃতি আছে");
    if (speculative) reasons.push("অনুমানসূচক শব্দ");

    const key = foldDigits(sentence)
      .replace(/[।?!\s]/g, "")
      .slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    scored.push({ text: sentence, kind, reason: reasons.join(" · "), score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.text.length - b.text.length)
    .slice(0, max)
    .map(({ text, kind, reason }) => ({ text, kind, reason }));
}
