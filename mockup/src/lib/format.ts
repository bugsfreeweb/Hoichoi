/**
 * Pure presentation helpers — safe to import from client components
 * (no database or server-only dependencies here).
 */

export const CATEGORY_LABEL: Record<string, string> = {
  crime: "অপরাধ",
  child: "শিশু সুরক্ষা",
  family: "পরিবার ও সমাজ",
  viral: "ভাইরাল ও তথ্য",
};

export const CATEGORY_TINT: Record<string, string> = {
  crime: "#d2202c",
  child: "#2563eb",
  family: "#0d9488",
  viral: "#d97706",
};

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
export const toBn = (v: number | string) =>
  String(v).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

export function bnTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function bnDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function bnFullDate(d: Date) {
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function agoBn(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const mins = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (mins < 60) return `${toBn(mins)} মিনিট আগে`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${toBn(hrs)} ঘণ্টা আগে`;
  return `${toBn(Math.round(hrs / 24))} দিন আগে`;
}
