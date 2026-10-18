import { seeded } from "./format";

/** Dhaka calendar day as [month, day] for a given instant (UTC+6, no DST). */
function dhakaMD(t: number): [number, number] {
  const x = new Date(t + 6 * 3600_000);
  return [x.getUTCMonth() + 1, x.getUTCDate()];
}

/**
 * Mockup dataset shapes. Every value here has a real-DB counterpart built at
 * request time by `@/lib/mv/live-data` and handed to the client tree through
 * the `MvDataProvider`; the deterministic samples below are only the offline
 * fallback (and the server-render default when the DB is unreachable).
 */

export interface SyncPoint {
  label: string;
  date: string;
  collected: number;
  published: number;
  dupes: number;
  comments: number;
}
export interface CategoryMixRow {
  name: string;
  slug: string;
  value: number;
  color: string;
  tone: string;
}
export interface FunnelStageRow {
  stage: string;
  key: string;
  count: number;
  pct: number;
  note: string;
}
export interface FactRadarAxis {
  axis: string;
  A: number;
  B: number;
  fullMark: number;
}
export interface PipelineGaugeRow {
  label: string;
  value: number;
  color: string;
  sub: string;
}
export interface HourlyViewRow {
  hour: string;
  views: number;
  shares: number;
  comments: number;
}
export interface EngagementSlice {
  name: string;
  value: number;
  color: string;
}
export interface SentimentAxis {
  axis: string;
  value: number;
}
export interface HeatCell {
  day: string;
  hour: number;
  value: number;
}
export interface ServiceRow {
  name: string;
  status: string;
  latency: number;
  uptime: number;
  note: string;
}
export interface RunLogRow {
  id: string;
  at: string;
  step: string;
  items: number;
  ok: boolean;
  dur: string;
}
export interface PipelineStepRow {
  n: string;
  key: string;
  title: string;
  sub: string;
  body: string;
}
export interface TickerItemRow {
  flag: string;
  tone: string;
  text: string;
}
export interface TreemapTopicRow {
  name: string;
  size: number;
  color: string;
}
export interface RetentionRow {
  bucket: string;
  value: number;
}
export interface TrafficSourceRow {
  name: string;
  value: number;
}

export interface MvData {
  syncSeries: SyncPoint[];
  syncSeries7: SyncPoint[];
  categoryMix: CategoryMixRow[];
  funnelStages: FunnelStageRow[];
  factRadar: FactRadarAxis[];
  pipelineGauges: PipelineGaugeRow[];
  hourlyViews: HourlyViewRow[];
  engagementMix: EngagementSlice[];
  sentimentRadar: SentimentAxis[];
  readHeatmap: HeatCell[][];
  services: ServiceRow[];
  runLog: RunLogRow[];
  pipelineSteps: PipelineStepRow[];
  tickerItems: TickerItemRow[];
  treemapTopics: TreemapTopicRow[];
  retention: RetentionRow[];
  trafficSources: TrafficSourceRow[];
}

/* ─────────── deterministic offline samples (server + client identical) ─────────── */

const rnd = seeded(20260214);

function series(days: number): SyncPoint[] {
  const out: SyncPoint[] = [];
  let collected = 220;
  let published = 96;
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const wave = Math.sin((days - i) / 3.1) * 7 + Math.cos((days - i) / 5.4) * 5;
    const cDelta = Math.round(8 + wave + rnd() * 11);
    const pDelta = Math.round(cDelta * (0.36 + rnd() * 0.16));
    collected += Math.max(2, cDelta);
    published += Math.max(1, pDelta);
    out.push({
      label: `${dhakaMD(d.getTime())[1]}/${dhakaMD(d.getTime())[0]}`,
      date: new Date(d.getTime() + 6 * 3600_000).toISOString().slice(0, 10),
      collected,
      published,
      dupes: Math.round((collected - published) * 0.42),
      comments: Math.round(published * (0.18 + rnd() * 0.12)),
    });
  }
  return out;
}

export const SYNC_SERIES: SyncPoint[] = series(30);
export const SYNC_SERIES_7: SyncPoint[] = SYNC_SERIES.slice(-7);

export const CATEGORY_MIX: CategoryMixRow[] = [
  { name: "শিশু যৌন নির্যাতন", slug: "child-abuse", value: 42, color: "#ff5c38", tone: "ক্রিটিকাল" },
  { name: "পরকীয়া অপরাধ", slug: "affair-crime", value: 35, color: "#f5a524", tone: "হাই" },
  { name: "নিখোঁজ শিশু", slug: "missing-child", value: 31, color: "#56c8ff", tone: "হাই" },
  { name: "পারিবারিক সহিংসতা", slug: "family-violence", value: 24, color: "#a78bfa", tone: "মিডিয়াম" },
  { name: "অর্থ প্রতারণা", slug: "fraud", value: 19, color: "#4ade80", tone: "মিডিয়াম" },
  { name: "সড়ক দুর্ঘটনা", slug: "road-accident", value: 14, color: "#fb7185", tone: "লো" },
];

export const FUNNEL_STAGES: FunnelStageRow[] = [
  { stage: "ফিড সংগ্রহ", key: "FEED", count: 412, pct: 100, note: "১০টি ওয়াচলিস্ট পেজ" },
  { stage: "স্ক্রিনশট শট", key: "SHOT", count: 386, pct: 94, note: "Playwright হেডলেস" },
  { stage: "হ্যাশ গেট", key: "HASH", count: 291, pct: 71, note: "SHA-256 × SimHash" },
  { stage: "LLM রিরাইট", key: "LLM", count: 184, pct: 45, note: "ফ্যাক্ট-গেট ০.৯০" },
  { stage: "মানুষের রিভিউ", key: "HUMAN", count: 122, pct: 30, note: "সম্পাদকীয় ডেস্ক" },
  { stage: "প্রকাশিত", key: "DEPLOY", count: 86, pct: 21, note: "ISR ~৮ সেকেন্ড" },
];

export const FACT_RADAR: FactRadarAxis[] = [
  { axis: "সূত্র যাচাই", A: 92, B: 74, fullMark: 100 },
  { axis: "সংখ্যা নির্ভুলতা", A: 88, B: 61, fullMark: 100 },
  { axis: "উদ্ধৃতি", A: 95, B: 70, fullMark: 100 },
  { axis: "নিরপেক্ষতা", A: 84, B: 66, fullMark: 100 },
  { axis: "প্রসঙ্গ", A: 79, B: 58, fullMark: 100 },
  { axis: "ভাষা শৈলী", A: 96, B: 52, fullMark: 100 },
];

export const PIPELINE_GAUGES: PipelineGaugeRow[] = [
  { label: "ফ্যাক্ট-গেট পাস", value: 91, color: "#4ade80", sub: "০.৯০ থ্রেশহোল্ড" },
  { label: "ডুপ্লিকেট ব্লক", value: 78, color: "#f5a524", sub: "SimHash হ্যামিং ৩" },
  { label: "কালেক্টর আপটাইম", value: 97, color: "#56c8ff", sub: "শেষ ৩০ দিন" },
  { label: "ডিপ্লয় সফলতা", value: 99, color: "#a78bfa", sub: "ISR বিল্ড" },
];

export const HOURLY_VIEWS: HourlyViewRow[] = Array.from({ length: 24 }, (_, h) => {
  const peak = Math.exp(-Math.pow(h - 20, 2) / 16) * 820;
  const noon = Math.exp(-Math.pow(h - 13, 2) / 10) * 430;
  const base = 60 + rnd() * 90;
  const views = Math.round(base + peak + noon);
  return {
    hour: `${String(h).padStart(2, "0")}:00`,
    views,
    shares: Math.round(views * (0.06 + rnd() * 0.07)),
    comments: Math.round(views * (0.03 + rnd() * 0.05)),
  };
});

export const ENGAGEMENT_MIX: EngagementSlice[] = [
  { name: "রিঅ্যাক্ট", value: 4180, color: "#ff5c38" },
  { name: "কমেন্ট", value: 1264, color: "#f5a524" },
  { name: "শেয়ার", value: 932, color: "#56c8ff" },
  { name: "সেভ", value: 418, color: "#a78bfa" },
];

export const SENTIMENT_RADAR: SentimentAxis[] = [
  { axis: "উদ্বেগ", value: 84 },
  { axis: "সহানুভূতি", value: 71 },
  { axis: "রাগ", value: 46 },
  { axis: "আশা", value: 38 },
  { axis: "নিরপেক্ষ", value: 62 },
];

export const READ_HEATMAP: HeatCell[][] = (() => {
  const days = ["শনি", "শুক্র", "বৃহ", "বুধ", "মঙ্গল", "সোম", "রবি"];
  return days.map((d, di) =>
    Array.from({ length: 24 }, (_, h) => {
      const weekend = di < 2 ? 1.25 : 1;
      const peak = Math.exp(-Math.pow(h - 20, 2) / 18) * 100;
      return { day: d, hour: h, value: Math.round((peak + rnd() * 34) * weekend) };
    }),
  );
})();

export const SERVICES: ServiceRow[] = [
  { name: "Turso ডাটাবেস", status: "operational", latency: 42, uptime: 99.98, note: "libSQL edge replica" },
  { name: "পাবলিক ডেটা API", status: "operational", latency: 118, uptime: 99.91, note: "GET /api/stats · 10s" },
  { name: "ডেস্কটপ কালেক্টর", status: "degraded", latency: 640, uptime: 96.4, note: "Heartbeat ৩ মিনিট আগে" },
  { name: "LLM রিরাইট ইঞ্জিন", status: "operational", latency: 2140, uptime: 99.74, note: "Bangla style guide v2.4" },
  { name: "Git কমিট বট", status: "operational", latency: 880, uptime: 99.99, note: "content/*.json" },
  { name: "ISR ডিপ্লয়", status: "maintenance", latency: 8200, uptime: 98.12, note: "রিভ্যালিডেশন উইন্ডো" },
];

export const RUN_LOG: RunLogRow[] = [
  { id: "run_2f91ab", at: "১১:৫৮ AM", step: "COLLECT", items: 14, ok: true, dur: "৪২ সে" },
  { id: "run_2f91aa", at: "১১:৪৬ AM", step: "HASH", items: 14, ok: true, dur: "০.৮ সে" },
  { id: "run_2f91a9", at: "১১:৩১ AM", step: "REWRITE", items: 9, ok: true, dur: "১৮ সে" },
  { id: "run_2f91a8", at: "১১:১২ AM", step: "FACT-GATE", items: 9, ok: false, dur: "২২ সে" },
  { id: "run_2f91a7", at: "১০:৫৮ AM", step: "COMMIT", items: 7, ok: true, dur: "৩ সে" },
  { id: "run_2f91a6", at: "১০:৪৪ AM", step: "DEPLOY", items: 7, ok: true, dur: "৮ সে" },
  { id: "run_2f91a5", at: "১০:২০ AM", step: "COLLECT", items: 21, ok: true, dur: "৫১ সে" },
  { id: "run_2f91a4", at: "১০:০২ AM", step: "REVIEW", items: 5, ok: true, dur: "৬ মিনিট" },
];

export const PIPELINE_STEPS: PipelineStepRow[] = [
  { n: "01", key: "FEED", title: "ফেসবুক ওয়াচলিস্ট", sub: "১০ সোর্স · GRAPH READ", body: "নির্ধারিত পেজগুলোর উন্মুক্ত পোস্ট GraphQL রিড দিয়ে টেনে আনা হয়।" },
  { n: "02", key: "SHOT", title: "ডেস্কটপ কালেক্টর", sub: "PLAYWRIGHT SHOT", body: "প্রতিটি পোস্টের ফুল-স্ক্রিন আর্কাইভ স্ক্রিনশট তোলা হয়, টাইমস্ট্যাম্প সহ।" },
  { n: "03", key: "HASH", title: "ডুপ্লিকেট গেট", sub: "SHA-256 × SIMHASH", body: "একই ঘটনা দুবার ঢুকতে পারে না — কনটেন্ট হ্যাশ আর ফাজি সিমহ্যাশ দুটোই মেলে।" },
  { n: "04", key: "LLM", title: "পুনর্লিখন ডেস্ক", sub: "LLM + FACT-GATE ০.৯০", body: "কাঁচা ক্যাপশন থেকে সংবাদ-শৈলীর প্রতিবেদন; ০.৯০-এর নিচে স্কোর হলে আটকে যায়।" },
  { n: "05", key: "GIT", title: "AI ইঞ্জিন কমিট", sub: "CONTENT/*.JSON", body: "অনুমোদিত লেখা JSON হিসেবে রিপোজিটরিতে কমিট হয়, মানুষের রিভিউ লগ সহ।" },
  { n: "06", key: "DEPLOY", title: "ওয়েব লাইভ", sub: "ISR · ~৮ সে", body: "ইনক্রিমেন্টাল স্ট্যাটিক রিজেনারেশনে প্রায় আট সেকেন্ডে সাইটে লাইভ হয়ে যায়।" },
];

export const TICKER_ITEMS: TickerItemRow[] = [
  { flag: "ব্রেকিং", tone: "hot", text: "মেক্সিকোর নির্মাণ কর্মী MrBeast চ্যালেঞ্জে ৪ মিলিয়ন পেসো জিতেছেন" },
  { flag: "যাচাই", tone: "ok", text: "ফ্যাক্ট-গেট ০.৯২ — পুনর্লিখিত প্রতিবেদন অনুমোদিত" },
  { flag: "ডুপ্লিকেট", tone: "warn", text: "SimHash হ্যামিং দূরত্ব ২ — একই ঘটনার ৩টি পোস্ট আটকানো হয়েছে" },
  { flag: "সংগ্রহ", tone: "cool", text: "শেষ রানে ১৪টি নতুন রেকর্ড, ৯টি রিরাইট পাইপলাইনে" },
  { flag: "লাইভ", tone: "ok", text: "ডেস্কটপ কালেক্টর heartbeat সক্রিয় · আপটাইম ৯৬.৪%" },
  { flag: "প্রকাশ", tone: "hot", text: "নিখোঁজ শিশু প্রতিবেদন ৮ সেকেন্ডে ISR-এ লাইভ" },
];

export const TREEMAP_TOPICS: TreemapTopicRow[] = CATEGORY_MIX.flatMap((c) => [
  { name: `${c.name} · যাচাইকৃত`, size: Math.round(c.value * 0.62), color: c.color },
  { name: `${c.name} · অপেক্ষমাণ`, size: Math.round(c.value * 0.38), color: c.color },
]);

export const RETENTION: RetentionRow[] = [
  { bucket: "০–১৫ সে", value: 100 },
  { bucket: "১৫–৩০ সে", value: 82 },
  { bucket: "৩০–৬০ সে", value: 64 },
  { bucket: "১–২ মি", value: 47 },
  { bucket: "২–৩ মি", value: 33 },
  { bucket: "৩ মি+", value: 21 },
];

export const TRAFFIC_SOURCES: TrafficSourceRow[] = [
  { name: "ফেসবুক", value: 46 },
  { name: "সরাসরি", value: 24 },
  { name: "সার্চ", value: 18 },
  { name: "রিফারেল", value: 8 },
  { name: "অন্যান্য", value: 4 },
];

/** Offline fallback bundle — used when the DB bundle is unavailable. */
export const DEFAULT_MV_DATA: MvData = {
  syncSeries: SYNC_SERIES,
  syncSeries7: SYNC_SERIES_7,
  categoryMix: CATEGORY_MIX,
  funnelStages: FUNNEL_STAGES,
  factRadar: FACT_RADAR,
  pipelineGauges: PIPELINE_GAUGES,
  hourlyViews: HOURLY_VIEWS,
  engagementMix: ENGAGEMENT_MIX,
  sentimentRadar: SENTIMENT_RADAR,
  readHeatmap: READ_HEATMAP,
  services: SERVICES,
  runLog: RUN_LOG,
  pipelineSteps: PIPELINE_STEPS,
  tickerItems: TICKER_ITEMS,
  treemapTopics: TREEMAP_TOPICS,
  retention: RETENTION,
  trafficSources: TRAFFIC_SOURCES,
};
