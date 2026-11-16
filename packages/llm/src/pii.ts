/**
 * PII redaction before text leaves for a cloud model.
 *
 * The pipeline already redacts a configured blocklist of sensitive tokens (names,
 * addresses of victims). It did not redact the things a reader's tip routinely
 * carries: phone numbers, emails, and long digit strings that look like a NID or
 * a bank account. Those must not be pasted into a third-party model's logs, and
 * they must not come back out in a published article either.
 *
 * Pure and deterministic so it can be unit tested; the caller decides whether a
 * redaction is worth telling a human about (`flagged`).
 */

export interface RedactionResult {
  text: string;
  counts: {
    email: number;
    phone: number;
    longDigits: number;
    /** 13-17 digit runs that look like a card number. */
    cardLike: number;
  };
  flagged: boolean;
}

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/g;
// Bangladeshi mobile numbers with or without a leading +88, and international
// numbers written with separators. Word boundaries keep "50,000" out.
const PHONE = /(?:\+?88)?(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?){2,4}\d{2,4}/g;
const LONG_DIGITS = /\b\d{9,}\b/g;
const CARD_LIKE = /\b(?:\d[ -]?){13,19}\b/g;
// Dates are dates, not phone numbers: `2024-05-11`, `11/05/2024`, `2024.05.11`.
const DATE_LIKE = /^(?:\d{1,4}[\s./-]){1,3}\d{1,4}$/;

/** Digits only, so `+880 1712-345678` and `01712345678` are both phones. */
function digitCount(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}

export function redactPii(input: string): RedactionResult {
  if (!input) {
    return { text: input ?? "", counts: { email: 0, phone: 0, longDigits: 0, cardLike: 0 }, flagged: false };
  }

  let text = input;
  const counts = { email: 0, phone: 0, longDigits: 0, cardLike: 0 };

  text = text.replace(EMAIL, () => {
    counts.email += 1;
    return "[ইমেইল সরানো হয়েছে]";
  });

  // Order matters: a phone is 7-15 digits, a card is 13-19, so the phone pass
  // claims separated numbers first and the card pass only sees what is longer
  // than a phone can be.
  text = text.replace(PHONE, (match) => {
    const digits = digitCount(match);
    // A phone number has 7-15 significant digits once prefixes are counted.
    if (digits < 7 || digits > 15) return match;
    if (!/^[\d\s()+-]+$/.test(match)) return match;
    // A bare 9+ digit run with no separators is an ID/account number, not a phone
    // — hand it to the long-digit pass so it is labelled honestly.
    // A bare 11-digit run starting 01 is a Bangladeshi mobile, not an ID.
    if (/^\+?\d+$/.test(match.trim()) && digits >= 9 && !/^(?:\+?88)?01\d{9}$/.test(match.trim())) return match;
    // A date would otherwise read as a short phone number.
    if (DATE_LIKE.test(match.trim()) && /(?:19|20)\d\d/.test(match)) return match;
    counts.phone += 1;
    return "[ফোন নম্বর সরানো হয়েছে]";
  });

  text = text.replace(CARD_LIKE, (match) => {
    const digits = digitCount(match);
    if (digits < 13 || digits > 19) return match;
    // A long run with separators every 4 digits is a card. A bare 13-digit run
    // is far more likely an NID, and is handled by the long-digit pass below.
    if (digits < 15 && /^\d+$/.test(match.trim())) return match;
    counts.cardLike += 1;
    return "[কার্ড নম্বর সরানো হয়েছে]";
  });

  text = text.replace(LONG_DIGITS, () => {
    counts.longDigits += 1;
    return "[নম্বর সরানো হয়েছে]";
  });

  return {
    text,
    counts,
    flagged: counts.email + counts.phone + counts.longDigits + counts.cardLike > 0,
  };
}

/**
 * Redact a list of fields in one pass and merge the counts. Used where a post has
 * several strings that all go to the model (title, summary, body).
 */
export function redactFields(fields: Record<string, string>): {
  fields: Record<string, string>;
  counts: RedactionResult["counts"];
  flagged: boolean;
} {
  const out: Record<string, string> = {};
  const counts = { email: 0, phone: 0, longDigits: 0, cardLike: 0 };
  for (const [key, value] of Object.entries(fields)) {
    const result = redactPii(value);
    out[key] = result.text;
    counts.email += result.counts.email;
    counts.phone += result.counts.phone;
    counts.longDigits += result.counts.longDigits;
    counts.cardLike += result.counts.cardLike;
  }
  const flagged = counts.email + counts.phone + counts.longDigits + counts.cardLike > 0;
  return { fields: out, counts, flagged };
}