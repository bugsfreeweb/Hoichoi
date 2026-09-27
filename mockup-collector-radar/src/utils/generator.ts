import {
  CATEGORIES,
  FlagId,
  NewsPost,
  PLATFORMS,
  PostStatus,
  ModerationState,
  Sentiment,
  TrendMode,
} from '../types/news';
import { likesToTier } from './polar';
import { toBn } from './bn';

const PLACES = ['ঢাকা', 'চট্টগ্রাম', 'রাজশাহী', 'খুলনা', 'সিলেট', 'বরিশাল', 'রংপুর', 'ময়মনসিংহ', 'কুমিল্লা', 'গাজীপুর', 'নারায়ণগঞ্জ', 'কক্সবাজার'];

const TEMPLATES: { t: string; k: string }[][] = [
  // অপরাধ
  [
    { t: '{p}-এ ছিনতাইকারী চক্রের {n} সদস্য গ্রেপ্তার', k: 'ছিনতাই' },
    { t: '{p}-এ মাদকবিরোধী অভিযানে বিপুল ইয়াবা উদ্ধার', k: 'মাদক' },
    { t: 'অনলাইন প্রতারণায় লাখ টাকা হাতিয়ে নেওয়ার অভিযোগ, {p}-এ মামলা', k: 'সাইবার প্রতারণা' },
    { t: '{p}-এ ডাকাতির ঘটনায় {n} জনকে আটক করেছে পুলিশ', k: 'ডাকাতি' },
    { t: '{p}-এ চাঁদাবাজির অভিযোগে ব্যবসায়ীদের মানববন্ধন', k: 'চাঁদাবাজি' },
  ],
  // শিশু স্বাস্থ্য
  [
    { t: '{p}-এ শিশুদের মধ্যে ডেঙ্গুর প্রকোপ বাড়ছে, হাসপাতালে ভিড়', k: 'ডেঙ্গু' },
    { t: 'সারাদেশে হাম-রুবেলা টিকা ক্যাম্পেইন শুরু', k: 'টিকা' },
    { t: 'শিশুর অপুষ্টি রোধে {p}-এ নতুন কমিউনিটি উদ্যোগ', k: 'অপুষ্টি' },
    { t: 'শীতে শিশুদের নিউমোনিয়া: বিশেষজ্ঞদের জরুরি পরামর্শ', k: 'নিউমোনিয়া' },
    { t: '{p}-এ ডায়রিয়ায় আক্রান্ত {n}০ শিশু হাসপাতালে ভর্তি', k: 'ডায়রিয়া' },
  ],
  // রাজনীতি
  [
    { t: 'সংসদে বাজেট নিয়ে উত্তপ্ত বিতর্ক', k: 'বাজেট' },
    { t: '{p}-এ স্থানীয় সরকার নির্বাচনের প্রস্তুতি জোরদার', k: 'নির্বাচন' },
    { t: 'নির্বাচন কমিশনের নতুন রোডম্যাপ ঘোষণা', k: 'নির্বাচন' },
    { t: '{p}-এ বিরোধী দলের সমাবেশে ব্যাপক জনসমাগম', k: 'সমাবেশ' },
    { t: 'মন্ত্রিসভায় {n}টি নতুন আইনের খসড়া অনুমোদন', k: 'আইন' },
  ],
  // খেলাধুলা
  [
    { t: 'শেষ ওভারের নাটকীয়তায় বাংলাদেশের দুর্দান্ত জয়', k: 'ক্রিকেট' },
    { t: 'সাফ চ্যাম্পিয়নশিপে জাতীয় ফুটবল দলের প্রস্তুতি শুরু', k: 'ফুটবল' },
    { t: 'বিপিএল নিলামে রেকর্ড দামে বিক্রি তারকা ক্রিকেটার', k: 'বিপিএল' },
    { t: '{p}-এ জাতীয় অ্যাথলেটিক্স প্রতিযোগিতায় {n}টি নতুন রেকর্ড', k: 'অ্যাথলেটিক্স' },
    { t: 'নারী ক্রিকেট দলের ঐতিহাসিক সিরিজ জয়', k: 'ক্রিকেট' },
  ],
  // প্রযুক্তি
  [
    { t: '{p}-এ ৫জি সেবার পরিধি বাড়ছে', k: '৫জি' },
    { t: 'বাংলা ভাষার নতুন এআই চ্যাটবট উন্মোচন', k: 'এআই' },
    { t: 'দেশীয় স্টার্টআপে রেকর্ড বিদেশি বিনিয়োগ', k: 'স্টার্টআপ' },
    { t: 'সাইবার নিরাপত্তায় সরকারের নতুন নির্দেশিকা', k: 'সাইবার নিরাপত্তা' },
    { t: '{p}-এ তরুণদের জন্য ফ্রিল্যান্সিং প্রশিক্ষণ কেন্দ্র চালু', k: 'ফ্রিল্যান্সিং' },
  ],
  // ভাইরাল
  [
    { t: '{p}-এর তরুণের গাওয়া গান মুহূর্তেই ভাইরাল', k: 'গান' },
    { t: 'রিকশাচালকের সততার ভিডিও লাখো মানুষের মন ছুঁয়েছে', k: 'সততা' },
    { t: 'বৃষ্টিতে শিশুদের ফুটবল খেলার ছবি সামাজিক মাধ্যমে ভাইরাল', k: 'ছবি' },
    { t: 'অনলাইনে ঝড় তোলা {p}-এর ঐতিহ্যবাহী রান্নার রেসিপি', k: 'রান্না' },
    { t: 'বৃদ্ধ মায়ের জন্য ছেলের উপহার — আবেগঘন ভিডিও ভাইরাল', k: 'আবেগ' },
  ],
];

const SOURCES: string[][] = [
  ['বাংলা নিউজ পেজ', 'ঢাকা আপডেট', 'সিটিজেন রিপোর্টার', 'দেশ টুডে পেজ', 'আমাদের এলাকা'],
  ['খবর লাইভ চ্যানেল', 'বাংলা ভিশন ক্লিপ', 'নিউজ ২৪ ঘণ্টা', 'টক শো বাংলা', 'দেশ টিভি অনলাইন'],
  ['দৈনিক বার্তা', 'প্রথম সংবাদ', 'বাংলা ট্রিবিউন ডেস্ক', 'অনলাইন খবর', 'সময়ের কণ্ঠ'],
];

const LIKE_MU = [6.8, 6.0, 7.0, 7.3, 6.2, 8.4];

const FLAG_PROB: Partial<Record<FlagId, number>>[] = [
  { violent: 0.16, unverified: 0.08 },
  { child_sensitive: 0.18, misinfo: 0.07 },
  { hate: 0.12, misinfo: 0.14 },
  { clickbait: 0.05 },
  { clickbait: 0.05, misinfo: 0.04 },
  { misinfo: 0.14, clickbait: 0.15 },
];

const SENTIMENT_PROB: [number, number][] = [
  // [positive, negative]
  [0.08, 0.68],
  [0.3, 0.35],
  [0.18, 0.45],
  [0.62, 0.12],
  [0.52, 0.12],
  [0.56, 0.14],
];

function gauss(mean = 0, sd = 1) {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sd + mean;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedIndex(weights: number[]): number {
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function generatePost(
  seq: number,
  trend: TrendMode,
  modelAccuracy: number,
  forced?: { category?: number; platform?: number }
): NewsPost {
  const category = forced?.category ?? weightedIndex(trend.weights);
  const platform = forced?.platform ?? weightedIndex([0.5, 0.25, 0.25]);
  const tpl = pick(TEMPLATES[category]);
  const place = pick(PLACES);
  const headline = tpl.t
    .replace('{p}', place)
    .replace('{n}', toBn(2 + Math.floor(Math.random() * 9)));

  const likes = Math.max(3, Math.round(Math.exp(gauss(LIKE_MU[category], 1.35))));
  const shares = Math.round(likes * (0.05 + Math.random() * 0.25));
  const comments = Math.round(likes * (0.03 + Math.random() * 0.15));

  // AI classification
  const correct = Math.random() < modelAccuracy;
  let predicted = category;
  if (!correct) {
    const others = CATEGORIES.map((c) => c.index).filter((i) => i !== category);
    predicted = pick(others);
  }
  const confidence = correct
    ? clamp(gauss(0.88, 0.07), 0.55, 0.995)
    : clamp(gauss(0.66, 0.1), 0.4, 0.93);

  // Sentiment
  const [pp, pn] = SENTIMENT_PROB[category];
  const r = Math.random();
  const sentiment: Sentiment = r < pp ? 'positive' : r < pp + pn ? 'negative' : 'neutral';

  // Moderation flags
  const flags: FlagId[] = [];
  const probs = FLAG_PROB[category];
  (Object.keys(probs) as FlagId[]).forEach((f) => {
    if (Math.random() < (probs[f] ?? 0)) flags.push(f);
  });
  if (platform === 0 && Math.random() < 0.05) flags.push('unverified');

  const risk = flags.length
    ? clamp(0.45 + flags.length * 0.12 + Math.random() * 0.35, 0, 0.99)
    : clamp(Math.random() * 0.35, 0, 1);

  let status: PostStatus = 'pending';
  let moderation: ModerationState = 'review';
  if (flags.length) {
    moderation = 'flagged';
  } else if (confidence >= 0.8) {
    status = 'published';
    moderation = 'cleared';
  }

  return {
    id: `পোস্ট-${toBn(String(seq).padStart(5, '0'))}`,
    seq,
    ts: Date.now(),
    category,
    predicted,
    confidence,
    platform,
    sectorIndex: predicted * PLATFORMS.length + platform,
    headline,
    keyword: tpl.k,
    source: pick(SOURCES[platform]),
    place,
    likes,
    shares,
    comments,
    tierIndex: likesToTier(likes),
    sentiment,
    flags: Array.from(new Set(flags)),
    risk,
    status,
    moderation,
    jitter: (Math.random() - 0.5) * 14,
  };
}
