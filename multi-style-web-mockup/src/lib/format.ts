const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** 1234 → ১২৩৪ */
export function bn(input: number | string): string {
  return String(input).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

export function bnNum(n: number, digits = 0): string {
  return bn(n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits }));
}

export function bnCompact(n: number): string {
  if (n >= 10000000) return `${bn((n / 10000000).toFixed(2))} কোটি`;
  if (n >= 100000) return `${bn((n / 100000).toFixed(2))} লক্ষ`;
  if (n >= 1000) return `${bn((n / 1000).toFixed(1))} হাজার`;
  return bn(n);
}

const BN_MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];
const BN_DAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
const EN_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Every date on the site is rendered in Asia/Dhaka. Using the machine's own
 * timezone made the server (UTC) and a Bangladeshi browser disagree, which
 * React reports as a hydration mismatch.
 */
const DHAKA = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
  weekday: "short",
});

function dhaka(input: Date | string) {
  const date = typeof input === "string" ? new Date(input) : input;
  const o: Record<string, string> = {};
  for (const part of DHAKA.formatToParts(date)) o[part.type] = part.value;
  return {
    y: Number(o.year),
    m: Number(o.month) - 1,
    d: Number(o.day),
    h: Number(o.hour) % 24,
    min: Number(o.minute),
    wd: Math.max(0, EN_DAYS.indexOf(o.weekday)),
  };
}

export function bnDate(d: Date | string): string {
  const t = dhaka(d);
  return `${bn(t.d)} ${BN_MONTHS[t.m]}, ${bn(t.y)}`;
}

export function bnDayName(d: Date | string): string {
  return BN_DAYS[dhaka(d).wd];
}

export function bnTime(d: Date | string): string {
  const t = dhaka(d);
  const suffix = t.h < 12 ? "AM" : "PM";
  const h = t.h % 12 || 12;
  return `${bn(h)}:${bn(String(t.min).padStart(2, "0"))} ${suffix}`;
}

export function bnDateTime(d: Date | string): string {
  return `${bnDate(d)} · ${bnDayName(d)} · ${bnTime(d)}`;
}

/** "N মিনিট আগে". Minute granularity so server and client render the same text. */
export function timeAgo(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const mins = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
  if (mins < 60) return `${bn(mins)} মিনিট আগে`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${bn(hrs)} ঘণ্টা আগে`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${bn(days)} দিন আগে`;
  return bnDate(date);
}

/** Deterministic pseudo-random so SSR markup matches client hydration. */
export function seeded(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
