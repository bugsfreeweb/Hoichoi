import type { StreamKind } from "@/lib/live-types";

/* Client + server safe helpers. Everything is rendered in Asia/Dhaka. */

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
export const TZ = "Asia/Dhaka";

export function bn(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

export function bnNum(n: number): string {
  return bn(new Intl.NumberFormat("en-IN").format(Math.round(n)));
}

/** Accept Bengali as well as Latin digits in live data editors. */
export function parseNumber(value: unknown, fallback = 0): number {
  const text = String(value ?? "").replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d))).replace(/[,\s]/g, "");
  const number = Number(text);
  return text && Number.isFinite(number) ? number : fallback;
}

/** ১৮.৪ হাজার · ২.১ লাখ — the way Bangla newsrooms abbreviate. */
export function bnCompact(n: number): string {
  if (n >= 10_000_000) return `${bn((n / 10_000_000).toFixed(1))} কোটি`;
  if (n >= 100_000) return `${bn((n / 100_000).toFixed(1))} লাখ`;
  if (n >= 10_000) return `${bn((n / 1000).toFixed(1))} হাজার`;
  return bnNum(n);
}

export function bnPercent(part: number, total: number, digits = 0): string {
  if (!total) return "০%";
  return `${bn(((part / total) * 100).toFixed(digits))}%`;
}

const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "১১:৪৫ AM" — mirrors the hoichoi masthead style. */
export function bnTime(iso: string | Date): string {
  // ICU 72+ inserts U+202F before AM/PM; normalise so server & browser markup match.
  return bn(timeFmt.format(new Date(iso)).replace(/\s/g, " "));
}

const dateFmt = new Intl.DateTimeFormat("bn-BD", {
  timeZone: TZ,
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function bnDate(iso: string | Date): string {
  return dateFmt.format(new Date(iso));
}

const shortDateFmt = new Intl.DateTimeFormat("bn-BD", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
});

export function bnShortDate(iso: string | Date): string {
  return shortDateFmt.format(new Date(iso));
}

export function bnDateTime(iso: string | Date): string {
  return `${bnShortDate(iso)}, ${bnTime(iso)}`;
}

const hourFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hour: "numeric",
  hour12: true,
});

export function bnHour(iso: string | Date): string {
  return bn(hourFmt.format(new Date(iso)).replace(/\s/g, ""));
}

export function timeAgo(iso: string | Date, now: number = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 45) return "এইমাত্র";
  const m = Math.floor(s / 60);
  if (m < 60) return `${bn(Math.max(1, m))} মিনিট আগে`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${bn(h)} ঘণ্টা আগে`;
  const d = Math.floor(h / 24);
  return `${bn(d)} দিন আগে`;
}

export function durationBn(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return `${bn(h)} ঘণ্টা ${bn(m)} মিনিট`;
  if (h) return `${bn(h)} ঘণ্টা`;
  return `${bn(m)} মিনিট`;
}

export function countdownParts(target: string | Date, now: number = Date.now()) {
  const diff = Math.max(0, new Date(target).getTime() - now);
  const s = Math.floor(diff / 1000);
  return {
    done: diff <= 0,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

/* ------------------------------------------------------------------ */
/*  Stream helpers — YouTube / TV (HLS) / generic iframe / MP4         */
/* ------------------------------------------------------------------ */

export function detectStreamType(url: string): StreamKind {
  const u = url.trim().toLowerCase();
  if (/(youtube\.com|youtu\.be)/.test(u) || /^[\w-]{11}$/.test(url.trim())) return "youtube";
  if (u.includes(".m3u8")) return "hls";
  if (/\.(mp4|webm|ogv|mov)(\?|#|$)/.test(u)) return "mp4";
  return "iframe";
}

export function youtubeId(url: string): string | null {
  const trimmed = url.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/live\/|\/shorts\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

export function youtubeChannel(url: string): string | null {
  const m = url.match(/(?:channel\/|channel=)(UC[\w-]{22})/);
  return m?.[1] ?? null;
}

export function youtubeEmbed(url: string, autoplay = true): string | null {
  const params = `autoplay=${autoplay ? 1 : 0}&mute=1&playsinline=1&rel=0&modestbranding=1`;
  const channel = youtubeChannel(url);
  if (channel) return `https://www.youtube.com/embed/live_stream?channel=${channel}&${params}`;
  const id = youtubeId(url);
  if (id) return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
  return null;
}

export function youtubeThumb(url: string): string | null {
  const id = youtubeChannel(url) ? null : youtubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export function iframeEmbed(url: string): string {
  if (/facebook\.com|fb\.watch/.test(url)) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true&mute=1`;
  }
  return url;
}

export function streamLabel(type: StreamKind): string {
  switch (type) {
    case "youtube":
      return "YouTube";
    case "hls":
      return "TV · HLS";
    case "mp4":
      return "ভিডিও ফাইল";
    default:
      return "এমবেড";
  }
}

export function clsx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return base || `live-${Date.now().toString(36)}`;
}
