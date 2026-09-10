const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const LATIN = "0123456789";

export function toBnDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[LATIN.indexOf(d)] ?? d);
}

export function bnNum(n: number | string): string {
  return toBnDigits(n);
}

/** "৮ ঘণ্টা আগে" style relative time. */
export function relativeBn(iso: string | null, now = Date.now()): string {
  if (!iso) return "—";
  const diffMs = now - new Date(iso).getTime();
  if (diffMs < 0) return "এইমাত্র";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 2) return "এইমাত্র";
  if (mins < 60) return `${bnNum(mins)} মিনিট আগে`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${bnNum(hours)} ঘণ্টা আগে`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${bnNum(days)} দিন আগে`;
  const months = Math.floor(days / 30);
  return `${bnNum(months)} মাস আগে`;
}

/** ttl-বাকি সময় → "৫ দিন ২২ ঘণ্টা" */
export function countdownBn(ttlMs: number): string {
  if (ttlMs <= 0) return "এখনই শেষ হবে";
  const totalMin = Math.floor(ttlMs / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  if (days > 0) return `${bnNum(days)} দিন ${bnNum(hours)} ঘণ্টা`;
  if (hours > 0) return `${bnNum(hours)} ঘণ্টা ${bnNum(totalMin % 60)} মিনিট`;
  return `${bnNum(totalMin)} মিনিট`;
}

/** ISO → "সোমবার, ৭ সেপ্টেম্বর, ২০২৬" */
export function longDateBn(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const weekdays = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
  const months = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
  ];
  return `${weekdays[d.getDay()]} , ${bnNum(d.getDate())} ${months[d.getMonth()]}, ${bnNum(d.getFullYear())}`;
}

/** 읽기 시간 (~200 words/min) */
export function readMinutesBn(body: string): string {
  const words = body.trim().split(/\s+/).length;
  return bnNum(Math.max(1, Math.round(words / 200)));
}

/** ISO → "২:৪৫ অপরাহ্ণ" (Dhaka) — live graph axis/tooltip */
export function timeBn(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "—";
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(t);
}

/** ISO → "সেপ্টেম্বর ১০, ৩:২০ অপরাহ্ণ" (Dhaka) — long tooltip label */
export function fullTimeBn(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "—";
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(t);
}

export function initials(name: string): string {
  return name.slice(0, 8);
}

/** Stable-short hash-like id for cards ("a1f3c9e2"). */
export function shortId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h.toString(16).slice(0, 8);
}