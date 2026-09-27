export interface CategoryInfo {
  index: number;
  id: string;
  name: string;
  color: string;
  emoji: string;
}

export interface PlatformInfo {
  index: number;
  id: string;
  name: string;
  short: string;
  color: string;
}

export interface SectorInfo {
  index: number;
  category: number;
  platform: number;
  centerAngle: number;
}

export interface LikeTier {
  index: number;
  label: string;
  name: string;
  min: number;
  max: number;
  color: string;
}

export type Sentiment = 'positive' | 'neutral' | 'negative';
export type PostStatus = 'published' | 'unpublished' | 'pending' | 'rejected';
export type ModerationState = 'flagged' | 'review' | 'cleared';
export type FlagId = 'misinfo' | 'hate' | 'child_sensitive' | 'violent' | 'unverified' | 'clickbait';

export interface NewsPost {
  id: string;
  seq: number;
  ts: number;
  category: number; // verified ground-truth category
  predicted: number; // AI predicted category (used for radar)
  confidence: number;
  platform: number;
  sectorIndex: number;
  headline: string;
  keyword: string;
  source: string;
  place: string;
  likes: number;
  shares: number;
  comments: number;
  tierIndex: number;
  sentiment: Sentiment;
  flags: FlagId[];
  risk: number;
  status: PostStatus;
  moderation: ModerationState;
  jitter: number;
  corrected?: boolean;
  manual?: boolean;
}

export type LogAction = 'auto_publish' | 'publish' | 'unpublish' | 'reject' | 'correct';

export interface PublishLog {
  id: string;
  postId: string;
  headline: string;
  category: number;
  action: LogAction;
  actor: string;
  ts: number;
  note: string;
}

export interface ModelVersion {
  id: string;
  base: string;
  accuracy: number;
  f1: number;
  samples: number;
  epochs: number;
  ts: number;
  status: 'active' | 'archived' | 'candidate';
}

export interface TrendMode {
  id: string;
  name: string;
  weights: number[];
}

export type AppTab = 'dashboard' | 'ai' | 'records' | 'moderation';

export const CATEGORIES: CategoryInfo[] = [
  { index: 0, id: 'crime', name: 'অপরাধ', color: '#F43F5E', emoji: '🚨' },
  { index: 1, id: 'child_health', name: 'শিশু স্বাস্থ্য', color: '#38BDF8', emoji: '🩺' },
  { index: 2, id: 'politics', name: 'রাজনীতি', color: '#F59E0B', emoji: '🏛️' },
  { index: 3, id: 'sports', name: 'খেলাধুলা', color: '#22C55E', emoji: '🏏' },
  { index: 4, id: 'tech', name: 'প্রযুক্তি', color: '#A78BFA', emoji: '💻' },
  { index: 5, id: 'viral', name: 'ভাইরাল', color: '#EC4899', emoji: '🔥' },
];

export const PLATFORMS: PlatformInfo[] = [
  { index: 0, id: 'facebook', name: 'ফেসবুক', short: 'ফেসবুক', color: '#3B82F6' },
  { index: 1, id: 'youtube', name: 'ইউটিউব', short: 'ইউটিউব', color: '#EF4444' },
  { index: 2, id: 'portal', name: 'নিউজ পোর্টাল', short: 'পোর্টাল', color: '#00F0FF' },
];

export const SECTOR_COUNT = CATEGORIES.length * PLATFORMS.length; // 18
export const SECTOR_SPAN = 360 / SECTOR_COUNT; // 20°

export const SECTORS: SectorInfo[] = Array.from({ length: SECTOR_COUNT }, (_, i) => ({
  index: i,
  category: Math.floor(i / PLATFORMS.length),
  platform: i % PLATFORMS.length,
  centerAngle: i * SECTOR_SPAN,
}));

export const LIKE_TIERS: LikeTier[] = [
  { index: 0, label: '< ১০০', name: 'নিম্ন সাড়া', min: 0, max: 100, color: '#38BDF8' },
  { index: 1, label: '১০০–৫০০', name: 'সাধারণ', min: 100, max: 500, color: '#2DD4BF' },
  { index: 2, label: '৫০০–১হা', name: 'মাঝারি', min: 500, max: 1000, color: '#4ADE80' },
  { index: 3, label: '১হা–৫হা', name: 'জনপ্রিয়', min: 1000, max: 5000, color: '#A3E635' },
  { index: 4, label: '৫হা–১০হা', name: 'ট্রেন্ডিং', min: 5000, max: 10000, color: '#FACC15' },
  { index: 5, label: '১০হা–৫০হা', name: 'অতি জনপ্রিয়', min: 10000, max: 50000, color: '#FB923C' },
  { index: 6, label: '> ৫০হা', name: 'ভাইরাল ঝড়', min: 50000, max: Infinity, color: '#F43F5E' },
];

export const FLAGS: Record<FlagId, { label: string; color: string }> = {
  misinfo: { label: 'ভুয়া তথ্য সন্দেহ', color: '#F43F5E' },
  hate: { label: 'ঘৃণাত্মক বক্তব্য', color: '#FB923C' },
  child_sensitive: { label: 'সংবেদনশীল শিশু কনটেন্ট', color: '#38BDF8' },
  violent: { label: 'সহিংস ছবি/ভিডিও', color: '#EF4444' },
  unverified: { label: 'অযাচাইকৃত সূত্র', color: '#FACC15' },
  clickbait: { label: 'ক্লিকবেইট/স্প্যাম', color: '#A78BFA' },
};

export const TREND_MODES: TrendMode[] = [
  { id: 'normal', name: 'স্বাভাবিক প্রবাহ', weights: [1.2, 0.8, 1.4, 1.1, 0.8, 1.0] },
  { id: 'election', name: 'নির্বাচনী মৌসুম', weights: [1.0, 0.5, 4.0, 0.8, 0.6, 1.0] },
  { id: 'sports', name: 'খেলার দিন', weights: [0.7, 0.5, 0.9, 4.0, 0.6, 1.5] },
  { id: 'crime', name: 'ব্রেকিং অপরাধ', weights: [4.0, 0.6, 1.3, 0.7, 0.5, 1.0] },
  { id: 'health', name: 'শিশু স্বাস্থ্য সতর্কতা', weights: [0.8, 4.0, 0.9, 0.7, 0.6, 0.9] },
  { id: 'viral', name: 'ভাইরাল ঝড়', weights: [0.8, 0.6, 1.0, 1.2, 1.0, 4.5] },
];

export const SENTIMENT_LABEL: Record<Sentiment, { label: string; color: string }> = {
  positive: { label: 'ইতিবাচক', color: '#22C55E' },
  neutral: { label: 'নিরপেক্ষ', color: '#8B9EB7' },
  negative: { label: 'নেতিবাচক', color: '#F43F5E' },
};

export const STATUS_LABEL: Record<PostStatus, { label: string; color: string }> = {
  published: { label: 'প্রকাশিত', color: '#22C55E' },
  unpublished: { label: 'অপ্রকাশিত', color: '#F59E0B' },
  pending: { label: 'অপেক্ষমাণ', color: '#38BDF8' },
  rejected: { label: 'প্রত্যাখ্যাত', color: '#F43F5E' },
};

export const ACTION_LABEL: Record<LogAction, { label: string; color: string }> = {
  auto_publish: { label: 'AI অটো-প্রকাশ', color: '#00F0FF' },
  publish: { label: 'প্রকাশ', color: '#22C55E' },
  unpublish: { label: 'অপ্রকাশ', color: '#F59E0B' },
  reject: { label: 'প্রত্যাখ্যান', color: '#F43F5E' },
  correct: { label: 'ক্যাটাগরি সংশোধন', color: '#A78BFA' },
};
