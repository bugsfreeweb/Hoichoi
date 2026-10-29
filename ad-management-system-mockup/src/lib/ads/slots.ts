import type { SlotDef } from "./types";

/**
 * Slot registry.
 *
 * `existing: true`  → the placement already exists on hoichoifeed.vercel.app
 *                     and the markup here is a 1:1 clone of it.
 * `existing: false` → new placement proposed by this mockup, built with the
 *                     same editorial language (dashed ink rule, হ chip, AD tag).
 */
export const SLOTS: SlotDef[] = [
  /* ---------------- HOME ---------------- */
  {
    key: "home_ticker_sponsor",
    page: "home",
    label: "টিকার সৌজন্য",
    labelEn: "Ticker Sponsor",
    area: "ব্রেকিং টিকার বারের ডান প্রান্ত",
    format: "native",
    size: "Native · 1 line",
    dayRate: 1800,
    heat: 96,
    existing: false,
    note: "প্রতিটি পেজে টিকার বারে দেখা যায় — সর্বোচ্চ ভিউয়েবিলিটি।",
  },
  {
    key: "home_hero_below",
    page: "home",
    label: "হিরো-নিচে বিলবোর্ড",
    labelEn: "Hero Below Billboard",
    area: "হিরো সেকশনের ঠিক নিচে, লাইভ গ্রাফের আগে",
    format: "leaderboard",
    size: "970×90 · 728×90",
    dayRate: 2400,
    heat: 94,
    existing: true,
    note: "সাইটের বর্তমান প্রধান বিজ্ঞাপন স্ট্রিপ (dashed ink frame)।",
  },
  {
    key: "home_category_rail",
    page: "home",
    label: "বিভাগ রেল স্পনসর",
    labelEn: "Category Rail Sponsor",
    area: "বিভাগসমূহ চিপ-রেলের শেষ চিপ",
    format: "native",
    size: "Native chip",
    dayRate: 950,
    heat: 71,
    existing: false,
    note: "বিভাগ ব্রাউজ করা পাঠকের চোখে পড়ে — কম দামে নেটিভ উপস্থিতি।",
  },
  {
    key: "home_lead_sponsor",
    page: "home",
    label: "প্রধান খবরের পৃষ্ঠপোষক",
    labelEn: "Lead Story Sponsor",
    area: "‘আজকের প্রধান হৈচৈ’ কার্ডের নিচে",
    format: "native",
    size: "Native · logo + line",
    dayRate: 2100,
    heat: 88,
    existing: false,
    note: "দিনের সবচেয়ে বেশি পড়া কনটেন্টের সাথে ব্র্যান্ড যুক্ত হয়।",
  },
  {
    key: "home_feed_1",
    page: "home",
    label: "ফিড কার্ড #১",
    labelEn: "In-Feed Card #1",
    area: "‘আজকের সংগ্রহ’ গ্রিডের ৫ম কার্ডের জায়গায়",
    format: "infeed",
    size: "Card · min-h 280",
    dayRate: 1600,
    heat: 85,
    existing: true,
    note: "বর্তমান সাইটের ইন-ফিড বিজ্ঞাপন কার্ড — হুবহু একই ফ্রেম।",
  },
  {
    key: "home_feed_2",
    page: "home",
    label: "ফিড কার্ড #২",
    labelEn: "In-Feed Card #2",
    area: "‘আজকের সংগ্রহ’ গ্রিডের ১০ম কার্ডের জায়গায়",
    format: "infeed",
    size: "Card · min-h 280",
    dayRate: 1300,
    heat: 76,
    existing: true,
    note: "দ্বিতীয় ইন-ফিড কার্ড — স্ক্রল গভীরতায়।",
  },
  {
    key: "home_insights_below",
    page: "home",
    label: "লাইভ গ্রাফ-নিচে",
    labelEn: "Below Live Insights",
    area: "লাইভ ইনসাইট সেকশন ও প্রধান খবরের মাঝে",
    format: "billboard",
    size: "970×250",
    dayRate: 2000,
    heat: 80,
    existing: false,
    note: "বড় ক্যানভাস — ব্র্যান্ড ক্যাম্পেইন ও প্রোডাক্ট লঞ্চের জন্য।",
  },
  {
    key: "home_prefooter_strip",
    page: "home",
    label: "প্রি-ফুটার ডার্ক স্ট্রিপ",
    labelEn: "Pre-footer Dark Strip",
    area: "পেজিনেশনের পরে, ফুটারের ঠিক আগে",
    format: "strip",
    size: "Full width · min-h 64",
    dayRate: 1100,
    heat: 64,
    existing: true,
    note: "বর্তমান সাইটের গাঢ় (bg-band) বিজ্ঞাপন স্ট্রিপ।",
  },

  /* ---------------- POST DETAIL ---------------- */
  {
    key: "post_header_leaderboard",
    page: "post",
    label: "প্রতিবেদন হেডার ব্যানার",
    labelEn: "Article Header Leaderboard",
    area: "শিরোনাম-মেটার নিচে, লেখা শুরুর আগে",
    format: "leaderboard",
    size: "970×90 · 728×90",
    dayRate: 2200,
    heat: 92,
    existing: true,
    note: "বর্তমান পোস্ট পেজের বিজ্ঞাপন — হুবহু একই।",
  },
  {
    key: "post_inarticle",
    page: "post",
    label: "ইন-আর্টিকেল নেটিভ",
    labelEn: "In-Article Native",
    area: "প্রতিবেদনের ৩য় প্যারাগ্রাফের পরে",
    format: "rect",
    size: "336×280",
    dayRate: 1900,
    heat: 89,
    existing: false,
    note: "পড়ার মাঝে — সর্বোচ্চ dwell time, সবচেয়ে বেশি ক্লিক।",
  },
  {
    key: "post_sidebar_rect",
    page: "post",
    label: "সাইডবার রেক্ট্যাঙ্গেল",
    labelEn: "Sidebar Rectangle",
    area: "সম্পাদকীয় নোটের নিচে সাইডবারে",
    format: "rect",
    size: "300×250",
    dayRate: 1500,
    heat: 79,
    existing: true,
    note: "বর্তমান সাইডবার বিজ্ঞাপন (min-h 250, dashed ink)।",
  },
  {
    key: "post_sidebar_sticky",
    page: "post",
    label: "সাইডবার স্টিকি",
    labelEn: "Sidebar Sticky Half-page",
    area: "সাইডবারের নিচে — স্ক্রলে আটকে থাকে",
    format: "sky",
    size: "300×600",
    dayRate: 2600,
    heat: 83,
    existing: false,
    note: "পুরো আর্টিকেল স্ক্রলজুড়ে দৃশ্যমান — ব্র্যান্ডিংয়ের জন্য সেরা।",
  },
  {
    key: "post_endcap",
    page: "post",
    label: "প্রতিবেদন শেষের এন্ডক্যাপ",
    labelEn: "Article Endcap",
    area: "লেখা শেষে, ‘পাঠকের কথায়’ সেকশনের আগে",
    format: "billboard",
    size: "970×250",
    dayRate: 1400,
    heat: 70,
    existing: false,
    note: "যারা পুরো লেখা পড়েছে — সবচেয়ে আগ্রহী পাঠক।",
  },
  {
    key: "post_related_infeed",
    page: "post",
    label: "সম্পর্কিত গ্রিড কার্ড",
    labelEn: "Related Grid Card",
    area: "‘একই বিভাগে আরও’ গ্রিডের ভেতরে",
    format: "infeed",
    size: "Card · min-h 280",
    dayRate: 1200,
    heat: 66,
    existing: false,
    note: "পরের খবরে যাওয়ার মুহূর্তে — উচ্চ CTR।",
  },

  /* ---------------- CATEGORY / SEARCH ---------------- */
  {
    key: "category_top_leaderboard",
    page: "category",
    label: "বিভাগ পেজ টপ ব্যানার",
    labelEn: "Category Top Leaderboard",
    area: "বিভাগ হেডারের নিচে",
    format: "leaderboard",
    size: "970×90",
    dayRate: 1500,
    heat: 74,
    existing: false,
    note: "বিষয়ভিত্তিক টার্গেটিং — যেমন ‘স্বাস্থ্য’ বিভাগে ক্লিনিক বিজ্ঞাপন।",
  },
  {
    key: "category_infeed",
    page: "category",
    label: "বিভাগ ফিড কার্ড",
    labelEn: "Category In-Feed Card",
    area: "বিভাগ গ্রিডের ভেতরে",
    format: "infeed",
    size: "Card · min-h 280",
    dayRate: 1000,
    heat: 62,
    existing: false,
    note: "নির্দিষ্ট বিভাগের পাঠকদের কাছে পৌঁছান।",
  },

  /* ---------------- GLOBAL ---------------- */
  {
    key: "global_rail_right",
    page: "global",
    label: "ডান পাশের স্টিকি রেল",
    labelEn: "Right Sticky Rail",
    area: "ডেস্কটপে কনটেন্টের ডানে, স্ক্রলে স্থির",
    format: "sky",
    size: "160×600",
    dayRate: 1700,
    heat: 68,
    existing: false,
    note: "ডেস্কটপ-অনলি, কনটেন্ট ঢাকে না।",
  },
  {
    key: "global_mobile_anchor",
    page: "global",
    label: "মোবাইল অ্যাংকর",
    labelEn: "Mobile Anchor",
    area: "মোবাইলে স্ক্রিনের নিচে আটকানো",
    format: "anchor",
    size: "320×60",
    dayRate: 2300,
    heat: 91,
    existing: false,
    note: "ট্রাফিকের ৭৮% মোবাইল — সর্বদা দৃশ্যমান, বন্ধ করা যায়।",
  },
  {
    key: "global_footer_strip",
    page: "global",
    label: "ফুটার স্ট্রিপ",
    labelEn: "Footer Strip",
    area: "সব পেজের ফুটারের উপরে",
    format: "strip",
    size: "Full width · min-h 64",
    dayRate: 800,
    heat: 52,
    existing: false,
    note: "সাশ্রয়ী — দীর্ঘমেয়াদি ব্র্যান্ড উপস্থিতির জন্য।",
  },
];

export const SLOT_MAP: Record<string, SlotDef> = Object.fromEntries(
  SLOTS.map((s) => [s.key, s])
);

export function slotsForPage(page: SlotDef["page"]) {
  return SLOTS.filter((s) => s.page === page);
}

export const FORMAT_LABEL: Record<string, string> = {
  leaderboard: "লিডারবোর্ড",
  billboard: "বিলবোর্ড",
  rect: "রেক্ট্যাঙ্গেল",
  infeed: "ইন-ফিড কার্ড",
  sky: "স্কাইস্ক্র্যাপার",
  strip: "স্ট্রিপ",
  anchor: "অ্যাংকর",
  native: "নেটিভ",
};

/** duration tiers with automatic volume discount */
export const DURATIONS = [
  { days: 1, label: "১ দিন", off: 0 },
  { days: 3, label: "৩ দিন", off: 0.05 },
  { days: 7, label: "৭ দিন", off: 0.1 },
  { days: 15, label: "১৫ দিন", off: 0.15 },
  { days: 30, label: "৩০ দিন", off: 0.22 },
  { days: 90, label: "৯০ দিন", off: 0.32 },
  { days: 180, label: "১৮০ দিন", off: 0.4 },
  { days: 365, label: "৩৬৫ দিন", off: 0.5 },
];

export function quotePrice(slotKey: string, days: number, uplift = 0) {
  const slot = SLOT_MAP[slotKey];
  if (!slot) return { gross: 0, discount: 0, net: 0, vat: 0, total: 0, off: 0 };
  const tier =
    [...DURATIONS].reverse().find((d) => days >= d.days) ?? DURATIONS[0];
  const gross = (slot.dayRate + uplift) * days;
  const discount = Math.round(gross * tier.off);
  const net = gross - discount;
  const vat = Math.round(net * 0.15);
  return { gross, discount, net, vat, total: net + vat, off: tier.off };
}
