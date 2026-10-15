import type { SiteSettings, ThemeId } from "@/lib/types";

export type ThemeMeta = {
  id: ThemeId;
  name: string;
  nameBn: string;
  tagline: string;
  taglineBn: string;
  description: string;
  descriptionBn: string;
  tags: string[];
  swatch: [string, string, string];
  bestFor: SiteSettings["mode"];
};

export const THEMES: ThemeMeta[] = [
  {
    id: "editorial",
    name: "Front Page",
    nameBn: "প্রথম পাতা",
    tagline: "The Hoichoi broadsheet",
    taglineBn: "হৈচৈ ব্রডশিট",
    description:
      "The flagship: paper #f3eee1, ink rules, alizarin red accents, breaking band, hash-stamped lead story and a live pipeline footer.",
    descriptionBn:
      "ফ্ল্যাগশিপ: কাগজ #f3eee1, কালির রুল, লাল অ্যাকসেন্ট, ব্রেকিং ব্যান্ড, হ্যাশ-স্ট্যাম্প লিড স্টোরি ও লাইভ পাইপলাইন ফুটার।",
    tags: ["paper", "ticker", "flagship"],
    swatch: ["#f3eee1", "#1a140d", "#d2202c"],
    bestFor: "maintenance",
  },
  {
    id: "terminal",
    name: "Collector Terminal",
    nameBn: "কালেক্টর টার্মিনাল",
    tagline: "Tauri desk window",
    taglineBn: "তাউরি ডেস্ক উইন্ডো",
    description:
      "A faithful Hoichoi Desk window: traffic lights, Turso/API/collector status rows, typed Playwright run log and mono telemetry.",
    descriptionBn:
      "হুবহু হৈচৈ ডেস্ক উইন্ডো: ট্রাফিক লাইট, Turso/API/কালেক্টর স্ট্যাটাস, টাইপ হওয়া রান লগ ও মনো টেলিমেট্রি।",
    tags: ["tauri", "typewriter", "status"],
    swatch: ["#0a0c10", "#c8f65d", "#d2202c"],
    bestFor: "maintenance",
  },
  {
    id: "neon",
    name: "Breaking Band",
    nameBn: "ব্রেকিং ব্যান্ড",
    tagline: "On-air alert bar",
    taglineBn: "অন-এয়ার সতর্কতা বার",
    description:
      "Night-grid broadcast desk: red breaking band, glowing lime ticker, pulsing LIVE dot and countdown lower-third.",
    descriptionBn:
      "নাইট-গ্রিড সম্প্রচার ডেস্ক: লাল ব্রেকিং ব্যান্ড, জ্বলজ্বলে লাইম টিকার, পালসিং LIVE ডট ও কাউন্টডাউন লোয়ার-থার্ড।",
    tags: ["breaking", "ticker", "night"],
    swatch: ["#0a0c10", "#d2202c", "#c8f65d"],
    bestFor: "coming-soon",
  },
  {
    id: "blueprint",
    name: "Press Blueprint",
    nameBn: "প্রেস ব্লুপ্রিন্ট",
    tagline: "Pipeline schematic",
    taglineBn: "পাইপলাইন স্কিম্যাটিক",
    description:
      "The six-stage pipeline as an engineering drawing: FEED→SHOT→HASH→LLM→GIT→DEPLOY with animated dashes and gauges.",
    descriptionBn:
      "ছয় ধাপের পাইপলাইন ইঞ্জিনিয়ারিং ড্রয়িং হিসেবে: FEED→SHOT→HASH→LLM→GIT→DEPLOY, অ্যানিমেটেড ড্যাশ ও গেজসহ।",
    tags: ["pipeline", "svg", "schematic"],
    swatch: ["#10141b", "#7dd3fc", "#c8f65d"],
    bestFor: "under-construction",
  },
  {
    id: "flip",
    name: "Hash-Stamp Flip",
    nameBn: "হ্যাশ-স্ট্যাম্প ফ্লিপ",
    tagline: "Split-flap press clock",
    taglineBn: "স্প্লিট-ফ্ল্যাপ প্রেস ঘড়ি",
    description:
      "Split-flap countdown on stacked newsprint, SHA-256 stamp chips and a verified-rewrite seal for every unit.",
    descriptionBn:
      "স্তূপ করা নিউজপ্রিন্টে স্প্লিট-ফ্ল্যাপ কাউন্টডাউন, SHA-256 স্ট্যাম্প চিপ ও প্রতিটি ইউনিটে যাচাই-সিল।",
    tags: ["countdown", "3d", "stamp"],
    swatch: ["#1a140d", "#d2202c", "#ffb454"],
    bestFor: "coming-soon",
  },
  {
    id: "aurora",
    name: "Paper Morning",
    nameBn: "কাগজের সকাল",
    tagline: "Calm daylight edition",
    taglineBn: "শান্ত দিনের সংস্করণ",
    description:
      "Soft daylight paper with lime/rose washes, frosted stat cards and a gentle sync-progress ring.",
    descriptionBn:
      "নরম দিনের আলোর কাগজ, লাইম/রোজ ওয়াশ, ফ্রস্টেড স্ট্যাট কার্ড ও মৃদু সিঙ্ক-প্রোগ্রেস রিং।",
    tags: ["light", "calm", "stats"],
    swatch: ["#f3eee1", "#5f8f0e", "#d2202c"],
    bestFor: "maintenance",
  },
  {
    id: "nebula",
    name: "Night Desk",
    nameBn: "নাইট ডেস্ক",
    tagline: "Late edition glow",
    taglineBn: "শেষ সংস্করণের আলো",
    description:
      "After-hours newsroom: deep night grid, drifting dust like press-room motes, lime pin-lights and glass type.",
    descriptionBn:
      "গভীর রাতের নিউজরুম: ডিপ নাইট গ্রিড, প্রেস-রুমের ধুলোর মতো ভাসমান কণা, লাইম পিন-লাইট ও গ্লাস টাইপ।",
    tags: ["night", "particles", "glass"],
    swatch: ["#050608", "#d2202c", "#c8f65d"],
    bestFor: "coming-soon",
  },
  {
    id: "orbit",
    name: "Sync Orbit",
    nameBn: "সিঙ্ক অরবিট",
    tagline: "Pipeline in orbit",
    taglineBn: "কক্ষপথে পাইপলাইন",
    description:
      "The six pipeline stages orbit the hero card in 3D — pointer-tracked tilt with depth, glow and telemetry.",
    descriptionBn:
      "ছয়টি পাইপলাইন ধাপ হিরো কার্ডের চারপাশে 3D-তে ঘোরে — পয়েন্টার-ট্র্যাকড টিল্ট, গভীরতা ও টেলিমেট্রিসহ।",
    tags: ["parallax", "tilt", "pipeline"],
    swatch: ["#0a0c10", "#c8f65d", "#7dd3fc"],
    bestFor: "coming-soon",
  },
];

export const THEME_MAP: Record<ThemeId, ThemeMeta> = THEMES.reduce(
  (acc, t) => ({ ...acc, [t.id]: t }),
  {} as Record<ThemeId, ThemeMeta>,
);

export function themeName(t: ThemeMeta, locale: string): string {
  return locale === "bn" ? t.nameBn : t.name;
}

export function themeTagline(t: ThemeMeta, locale: string): string {
  return locale === "bn" ? t.taglineBn : t.tagline;
}

export function themeDesc(t: ThemeMeta, locale: string): string {
  return locale === "bn" ? t.descriptionBn : t.description;
}

export const MODES: {
  id: SiteSettings["mode"];
  name: string;
  nameBn: string;
  hint: string;
  hintBn: string;
}[] = [
  {
    id: "under-construction",
    name: "Under construction",
    nameBn: "নির্মাণাধীন",
    hint: "Press hall rebuild, progress bar front and centre.",
    hintBn: "প্রেস-হল পুনর্নির্মাণ, অগ্রগতি বার সামনে।",
  },
  {
    id: "maintenance",
    name: "Site maintenance",
    nameBn: "রক্ষণাবেক্ষণ",
    hint: "Short scheduled downtime with an ETA countdown.",
    hintBn: "নির্ধারিত স্বল্প বিরতি, ETA কাউন্টডাউনসহ।",
  },
  {
    id: "coming-soon",
    name: "Coming soon",
    nameBn: "শীঘ্রই আসছে",
    hint: "Pre-launch hype with notification capture.",
    hintBn: "প্রি-লঞ্চ উত্তেজনা, নোটিফিকেশন সংগ্রহসহ।",
  },
  {
    id: "live",
    name: "Site live",
    nameBn: "সাইট লাইভ",
    hint: "Maintenance page disabled — visitors see the front page.",
    hintBn: "রক্ষণাবেক্ষণ পেজ বন্ধ — ভিজিটররা প্রথম পাতা দেখবে।",
  },
];
