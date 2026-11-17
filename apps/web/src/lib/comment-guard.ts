/**
 * Comment body guard — link spam, padding and number walls.
 *
 * The name field has `name-guard.ts`; the body had only a length check, so a
 * three-link "খবর দেখুন" comment and a 200-character padding block cost the
 * moderator the same click as a real reply. These three rules are deliberately
 * narrow — each one has a clear benign explanation *not* to match, and a comment
 * refused here is refused with a reason the reader can act on.
 *
 * What this is not: a classifier, and not a judgement about tone. Nothing here
 * blocks an opinion. A refusal is a signal for the queue, not a verdict.
 */

export const COMMENT_LIMITS = {
  /** A reply may cite one or two sources; three is an advert. */
  maxLinks: 2,
  /** "aaaaaaaa" for twenty characters is not Bangladeshi emphasis. */
  maxSameCharRun: 12,
  /** A wall of phone numbers is a scam post, not a comment. */
  maxPhones: 2,
} as const;

const URL_RE = /(?:https?:\/\/|www\.)\S+/gi;
const BARE_DOMAIN_RE = /(?:^|\s)(?:[a-z0-9-]+\.)+(?:com|net|org|xyz|info|site|online|shop|top|link|biz|tk|ml|ga|cf|gq)(?:\/\S*)?(?=\s|$)/gi;
const PHONE_RE = /(?:\+?88)?01[3-9]\d{8}|\+?\d{10,14}/g;

export interface CommentVerdict {
  ok: boolean;
  reason?: string;
  /** What tripped, for the audit/metadata side — never shown to the commenter. */
  signal?: "links" | "padding" | "numbers";
}

function sameCharRun(text: string): number {
  let best = 0;
  let run = 1;
  for (let i = 1; i < text.length; i += 1) {
    run = text[i] === text[i - 1] ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

export function assessCommentBody(body: string): CommentVerdict {
  const text = body.trim();
  if (!text) return { ok: false, reason: "মন্তব্য খালি।", signal: "padding" };

  const links = [...text.matchAll(URL_RE), ...text.matchAll(BARE_DOMAIN_RE)].length;
  if (links > COMMENT_LIMITS.maxLinks) {
    return {
      ok: false,
      reason: "একটি মন্তব্যে দুটির বেশি লিংক দেওয়া যায় না — সম্পাদককে আলাদা করে জানান।",
      signal: "links",
    };
  }

  if (sameCharRun(text) > COMMENT_LIMITS.maxSameCharRun) {
    return { ok: false, reason: "একই অক্ষর বারবার লেখা মন্তব্য হিসেবে গ্রহণ করা যায় না।", signal: "padding" };
  }

  const phones = [...text.matchAll(PHONE_RE)].length;
  if (phones > COMMENT_LIMITS.maxPhones) {
    return {
      ok: false,
      reason: "অনেকগুলো ফোন নম্বর একটি মন্তব্যে দেওয়া যায় না — ব্যক্তিগত তথ্য প্রকাশ এড়িয়ে চলুন।",
      signal: "numbers",
    };
  }

  return { ok: true };
}

/** Count links, for the moderation card's summary line. */
export function linkCount(body: string): number {
  return [...body.matchAll(URL_RE), ...body.matchAll(BARE_DOMAIN_RE)].length;
}