/**
 * Mockup dataset shapes. Every value is built from live DB rows at request time
 * by `@/lib/mv/live-data` and handed to the client tree through the
 * `MvDataProvider`. {@link EMPTY_MV_DATA} is the neutral, all-zero bundle used
 * as the offline/empty-database fallback (and the server-render default when the
 * DB is unreachable) — it contains no sample or demo numbers, only empty axes
 * so charts render an honest empty state instead of fabricated data.
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

/**
 * Descriptive copy for the six real pipeline stages (labels only — no metrics).
 * This is explanatory UI text describing what the pipeline actually does, not
 * run data, so it is the one non-empty part of the empty bundle.
 */
export const PIPELINE_STEPS: PipelineStepRow[] = [
  { n: "01", key: "FEED", title: "ফেসবুক ওয়াচলিস্ট", sub: "GRAPH READ", body: "নির্ধারিত পেজগুলোর উন্মুক্ত পোস্ট GraphQL রিড দিয়ে টেনে আনা হয়।" },
  { n: "02", key: "SHOT", title: "ডেস্কটপ কালেক্টর", sub: "PLAYWRIGHT SHOT", body: "প্রতিটি পোস্টের ফুল-স্ক্রিন আর্কাইভ স্ক্রিনশট তোলা হয়, টাইমস্ট্যাম্প সহ।" },
  { n: "03", key: "HASH", title: "ডুপ্লিকেট গেট", sub: "SHA-256 × SIMHASH", body: "একই ঘটনা দুবার ঢুকতে পারে না — কনটেন্ট হ্যাশ আর ফাজি সিমহ্যাশ দুটোই মেলে।" },
  { n: "04", key: "LLM", title: "পুনর্লিখন ডেস্ক", sub: "LLM + FACT-GATE", body: "কাঁচা ক্যাপশন থেকে সংবাদ-শৈলীর প্রতিবেদন; থ্রেশহোল্ডের নিচে স্কোর হলে আটকে যায়।" },
  { n: "05", key: "GIT", title: "AI ইঞ্জিন কমিট", sub: "CONTENT/*.JSON", body: "অনুমোদিত লেখা JSON হিসেবে রিপোজিটরিতে কমিট হয়, মানুষের রিভিউ লগ সহ।" },
  { n: "06", key: "DEPLOY", title: "ওয়েব লাইভ", sub: "ISR", body: "ইনক্রিমেন্টাল স্ট্যাটিক রিজেনারেশনে সাইটে লাইভ হয়ে যায়।" },
];

const WEEKDAY_BN = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"];

/** Empty, zero-valued bundle — the honest fallback when there is no data. */
export const EMPTY_MV_DATA: MvData = {
  syncSeries: [],
  syncSeries7: [],
  categoryMix: [],
  funnelStages: [],
  factRadar: [],
  pipelineGauges: [],
  hourlyViews: Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, "0")}:00`,
    views: 0,
    shares: 0,
    comments: 0,
  })),
  engagementMix: [],
  sentimentRadar: [],
  readHeatmap: [6, 5, 4, 3, 2, 1, 0].map((dow) =>
    Array.from({ length: 24 }, (_, h) => ({ day: WEEKDAY_BN[dow] ?? "", hour: h, value: 0 })),
  ),
  services: [],
  runLog: [],
  pipelineSteps: PIPELINE_STEPS,
  tickerItems: [],
  treemapTopics: [],
  retention: [],
  trafficSources: [],
};
