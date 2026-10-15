/** Deterministic pseudo-random so the mock looks alive but stable per seed. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const palette = {
  amber: "#f5a524",
  flame: "#ff6b1a",
  cyan: "#22d3ee",
  violet: "#a855f7",
  emerald: "#34d399",
  rose: "#fb7185",
  sky: "#60a5fa",
  lime: "#a3e635",
  slate: "#64748b",
};

export type Range = "24H" | "7D" | "30D" | "90D";

export const rangeMeta: Record<Range, { points: number; label: (i: number, n: number) => string }> = {
  "24H": { points: 24, label: (i) => `${String(i).padStart(2, "0")}:00` },
  "7D": { points: 7, label: (i) => ["সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি", "রবি"][i % 7] },
  "30D": { points: 30, label: (i) => `D${i + 1}` },
  "90D": { points: 90, label: (i) => `W${Math.floor(i / 7) + 1}` },
};

export type Series = { name: string; color: string; values: number[] };

export function buildTimeseries(range: Range, seed = 7): { labels: string[]; series: Series[] } {
  const { points, label } = rangeMeta[range];
  const r = rng(seed + points * 13);
  const labels = Array.from({ length: points }, (_, i) => label(i, points));
  const base = range === "24H" ? 12 : range === "7D" ? 70 : range === "30D" ? 58 : 46;

  const collected: number[] = [];
  const published: number[] = [];
  const duplicates: number[] = [];
  for (let i = 0; i < points; i++) {
    const wave = Math.sin((i / points) * Math.PI * 2.4) * 0.28 + Math.sin(i / 2.2) * 0.12;
    const c = Math.max(3, Math.round(base * (1 + wave) * (0.78 + r() * 0.5)));
    const p = Math.max(1, Math.round(c * (0.52 + r() * 0.22)));
    const d = Math.max(0, Math.round(c * (0.1 + r() * 0.14)));
    collected.push(c);
    published.push(p);
    duplicates.push(d);
  }
  return {
    labels,
    series: [
      { name: "সংগৃহীত", color: palette.amber, values: collected },
      { name: "প্রকাশিত", color: palette.cyan, values: published },
      { name: "ডুপ্লিকেট", color: palette.rose, values: duplicates },
    ],
  };
}

export const kpis = [
  {
    key: "collected",
    bn: "সংগৃহীত রেকর্ড",
    en: "Records collected",
    value: 5842,
    delta: 12.4,
    color: palette.amber,
    spark: [22, 28, 24, 36, 31, 44, 39, 52, 48, 61, 58, 72],
  },
  {
    key: "published",
    bn: "প্রকাশিত প্রতিবেদন",
    en: "Published stories",
    value: 2514,
    delta: 8.1,
    color: palette.cyan,
    spark: [14, 18, 17, 22, 26, 24, 31, 29, 36, 41, 38, 46],
  },
  {
    key: "dupes",
    bn: "ডুপ্লিকেট চিহ্নিত",
    en: "Duplicates blocked",
    value: 738,
    delta: -4.7,
    color: palette.rose,
    spark: [18, 16, 19, 14, 15, 12, 13, 11, 12, 9, 10, 8],
  },
  {
    key: "comments",
    bn: "অনুমোদিত মন্তব্য",
    en: "Approved comments",
    value: 1296,
    delta: 21.9,
    color: palette.violet,
    spark: [6, 9, 8, 12, 15, 14, 19, 23, 21, 28, 33, 37],
  },
];

export const pipelineStages = [
  { id: "01", bn: "ফেসবুক ওয়াচলিস্ট", en: "GRAPH READ · 10 sources", value: 1000, color: palette.amber, ms: 820 },
  { id: "02", bn: "ডেস্কটপ কালেক্টর", en: "PLAYWRIGHT SHOT", value: 912, color: palette.flame, ms: 2140 },
  { id: "03", bn: "ডুপ্লিকেট গেট", en: "SHA-256 × SIMHASH", value: 764, color: palette.rose, ms: 310 },
  { id: "04", bn: "পুনর্লিখন ডেস্ক", en: "LLM + FACT-GATE 0.90", value: 612, color: palette.violet, ms: 4380 },
  { id: "05", bn: "AI ইঞ্জিন কমিট", en: "CONTENT/*.JSON", value: 588, color: palette.cyan, ms: 640 },
  { id: "06", bn: "Web লাইভ", en: "ISR · ~8s", value: 574, color: palette.emerald, ms: 8010 },
];

export const categories = [
  { bn: "অপরাধ", en: "Crime", value: 1284, color: palette.rose },
  { bn: "রাজনীতি", en: "Politics", value: 962, color: palette.amber },
  { bn: "শিক্ষা", en: "Education", value: 614, color: palette.cyan },
  { bn: "স্বাস্থ্য", en: "Health", value: 488, color: palette.emerald },
  { bn: "খেলা", en: "Sports", value: 352, color: palette.violet },
  { bn: "আবহাওয়া", en: "Weather", value: 214, color: palette.sky },
];

export const sources = [
  { name: "Kolkata City Watch", handle: "@kolkatacitywatch", posts: 1482, ok: 98.2, latency: 1.8, status: "live", trend: [12, 18, 15, 24, 22, 31, 29, 38] },
  { name: "উত্তরবঙ্গ বার্তা", handle: "@uttarbangabarta", posts: 1134, ok: 95.4, latency: 2.4, status: "live", trend: [20, 16, 22, 19, 26, 24, 30, 27] },
  { name: "Howrah Pulse", handle: "@howrahpulse", posts: 876, ok: 91.0, latency: 3.1, status: "live", trend: [9, 14, 11, 17, 14, 20, 18, 23] },
  { name: "জেলা সংবাদ ডেস্ক", handle: "@jelasangbad", posts: 742, ok: 88.6, latency: 4.6, status: "degraded", trend: [18, 15, 17, 12, 14, 10, 12, 9] },
  { name: "Sundarban Live", handle: "@sundarbanlive", posts: 538, ok: 99.1, latency: 1.4, status: "live", trend: [6, 8, 9, 12, 14, 16, 19, 24] },
  { name: "Metro Rail Alerts", handle: "@metroalerts", posts: 402, ok: 72.3, latency: 9.2, status: "paused", trend: [14, 12, 10, 9, 7, 5, 4, 2] },
];

export const stories = [
  { title: "শহরের চার নম্বর ওয়ার্ডে রাতভর জল জমে দুর্ভোগ", cat: "আবহাওয়া", score: 0.94, state: "published", hash: "9f3ac1", time: "১১:৫৮", views: 8421 },
  { title: "নিখোঁজ কিশোরীর সন্ধান মিলল ৩৬ ঘণ্টা পরে", cat: "অপরাধ", score: 0.91, state: "published", hash: "41bd77", time: "১১:৩২", views: 12984 },
  { title: "পুরসভার বাজেট বৈঠকে বিরোধীদের ওয়াকআউট", cat: "রাজনীতি", score: 0.88, state: "review", hash: "c70e2a", time: "১০:৫৫", views: 3310 },
  { title: "স্কুলে মিড-ডে মিলে অনিয়মের অভিযোগ, তদন্তের নির্দেশ", cat: "শিক্ষা", score: 0.86, state: "review", hash: "22fa90", time: "১০:১২", views: 2240 },
  { title: "জেলা হাসপাতালে নতুন ডায়ালিসিস ইউনিট চালু", cat: "স্বাস্থ্য", score: 0.93, state: "published", hash: "7ee013", time: "০৯:৪৭", views: 5618 },
  { title: "ময়দানে প্রস্তুতি ম্যাচে তরুণ গোলরক্ষকের নজরকাড়া সেভ", cat: "খেলা", score: 0.79, state: "queued", hash: "b1c884", time: "০৯:০৩", views: 1472 },
  { title: "ফুটপাত দখলমুক্ত অভিযানে উত্তেজনা, আটক ৪", cat: "অপরাধ", score: 0.9, state: "published", hash: "5a2d61", time: "০৮:৩৯", views: 9075 },
];

export const moderation = [
  { user: "দীপ্তি স. ", text: "এই রিপোর্টে সোর্স লিংক যোগ করলে ভালো হতো।", risk: 0.08, state: "approved" },
  { user: "Arnab R.", text: "ছবিটা অন্য ঘটনার মনে হচ্ছে, যাচাই করুন।", risk: 0.31, state: "pending" },
  { user: "anon_4471", text: "এই চ্যানেল সব সময় ভুল খবর দেয়!!!", risk: 0.74, state: "flagged" },
  { user: "মিতালি ব.", text: "ধন্যবাদ, দ্রুত আপডেট পেলাম।", risk: 0.04, state: "approved" },
  { user: "Sayan D.", text: "কমেন্টে ফোন নম্বর শেয়ার করা হয়েছে।", risk: 0.88, state: "flagged" },
];

export const activity = [
  { t: "১১:৫৮", bn: "ডিপ্লয় সফল — ISR রিফ্রেশ ৮.২ সে", tag: "DEPLOY", color: palette.emerald },
  { t: "১১:৫৬", bn: "১৪টি নতুন রেকর্ড Turso-তে লেখা হয়েছে", tag: "DB", color: palette.cyan },
  { t: "১১:৫৪", bn: "ফ্যাক্ট-গেট স্কোর ০.৬৮ — পুনর্লিখন ফেরত", tag: "LLM", color: palette.amber },
  { t: "১১:৫১", bn: "SimHash মিল ৯৪% — ডুপ্লিকেট ব্লক", tag: "DEDUPE", color: palette.rose },
  { t: "১১:৪৮", bn: "Playwright শট নেওয়া হয়েছে ১২টি পোস্টের", tag: "SHOT", color: palette.violet },
  { t: "১১:৪৫", bn: "নতুন সোর্স যুক্ত — Sundarban Live", tag: "SOURCE", color: palette.sky },
];

export const heatmapDays = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];
export function buildHeatmap(seed = 42) {
  const r = rng(seed);
  return heatmapDays.map((_, d) =>
    Array.from({ length: 24 }, (_, h) => {
      const peak = Math.exp(-Math.pow(h - 10, 2) / 26) + Math.exp(-Math.pow(h - 19, 2) / 20) * 0.9;
      const weekend = d === 0 || d === 6 ? 0.68 : 1;
      return Math.round(peak * weekend * (55 + r() * 45));
    }),
  );
}

export const radarAxes = [
  { bn: "নির্ভুলতা", en: "Accuracy", a: 92, b: 74 },
  { bn: "গতি", en: "Speed", a: 86, b: 62 },
  { bn: "কভারেজ", en: "Coverage", a: 78, b: 81 },
  { bn: "ভাষা মান", en: "Language", a: 95, b: 58 },
  { bn: "ডিডুপ", en: "Dedupe", a: 89, b: 44 },
  { bn: "উৎস বৈচিত্র্য", en: "Diversity", a: 71, b: 69 },
];

export const bubbleData = [
  { x: 1.8, y: 98.2, r: 1482, label: "Kolkata City Watch", color: palette.amber },
  { x: 2.4, y: 95.4, r: 1134, label: "উত্তরবঙ্গ বার্তা", color: palette.cyan },
  { x: 3.1, y: 91.0, r: 876, label: "Howrah Pulse", color: palette.violet },
  { x: 4.6, y: 88.6, r: 742, label: "জেলা সংবাদ", color: palette.rose },
  { x: 1.4, y: 99.1, r: 538, label: "Sundarban Live", color: palette.emerald },
  { x: 9.2, y: 72.3, r: 402, label: "Metro Alerts", color: palette.slate },
];

export const costWaterfall = [
  { label: "LLM টোকেন", value: 184, color: palette.violet },
  { label: "স্টোরেজ", value: 46, color: palette.cyan },
  { label: "কম্পিউট", value: 92, color: palette.amber },
  { label: "ক্রেডিট ফেরত", value: -38, color: palette.emerald },
  { label: "CDN", value: 27, color: palette.sky },
];

export const treemapData = [
  { label: "অপরাধ", value: 1284, color: palette.rose },
  { label: "রাজনীতি", value: 962, color: palette.amber },
  { label: "শিক্ষা", value: 614, color: palette.cyan },
  { label: "স্বাস্থ্য", value: 488, color: palette.emerald },
  { label: "খেলা", value: 352, color: palette.violet },
  { label: "আবহাওয়া", value: 214, color: palette.sky },
  { label: "অন্যান্য", value: 158, color: palette.slate },
];
