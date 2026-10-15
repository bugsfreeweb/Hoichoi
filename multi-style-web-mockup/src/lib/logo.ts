/**
 * Logo animation styles.
 *
 * Every style is a composed scene (several effects layered together), not a
 * single filter. The registry lives in a plain module so server pages can
 * validate a saved choice without importing client code.
 */

export type LogoEngine =
  | "broadcast"
  | "signal"
  | "cube"
  | "depth"
  | "decode"
  | "crt"
  | "neon"
  | "hologram"
  | "boot"
  | "led"
  | "shine";

export interface LogoEngineMeta {
  id: LogoEngine;
  name: string;
  blurb: string;
  /** Short list of the layered effects, shown in the gallery. */
  effects: string[];
  /** Panel styles draw their own dark screen and read well on both themes. */
  panel: boolean;
}

export const LOGO_ENGINES: LogoEngineMeta[] = [
  {
    id: "broadcast",
    name: "লাইভ সম্প্রচার",
    blurb: "সরাসরি সম্প্রচারের কন্ট্রোল-রুম আবহ।",
    effects: ["আরজিবি চ্যানেল বিভাজন", "অনিয়মিত গ্লিচ-বার্স্ট", "স্ক্যানিং আলোরেখা", "চলমান টাইমকোড", "বাফার-বার", "স্পন্দিত রিং"],
    panel: false,
  },
  {
    id: "signal",
    name: "সিগন্যাল ওয়েভ",
    blurb: "কাচের ক্যাপসুলে অডিও-স্পেকট্রাম ও তরঙ্গ।",
    effects: ["রিয়েল-টাইম স্পেকট্রাম বার", "প্রবাহিত রঙের গ্র্যাডিয়েন্ট", "চলমান সাইন-তরঙ্গ", "কাচের উজ্জ্বল ঝলক"],
    panel: false,
  },
  {
    id: "cube",
    name: "৩ডি ঘনক",
    blurb: "ঘূর্ণায়মান ঘনক, কক্ষপথ-রিং ও উল্টে যাওয়া শব্দ।",
    effects: ["৬-পৃষ্ঠের ঘনক", "কক্ষপথ রিং ও উপগ্রহ বিন্দু", "বাংলা↔ইংরেজি ৩ডি ফ্লিপ", "মেঝের প্রতিফলন"],
    panel: false,
  },
  {
    id: "depth",
    name: "ছাপাখানার গভীরতা",
    blurb: "মাউস-অনুসারী ৩ডি, ছাপার ক্রপ-মার্ক ও কালির রেখা।",
    effects: ["মাউস-ট্র্যাকড টিল্ট", "৬ স্তরের এক্সট্রুশন", "ঝলক অনুসরণকারী আলো", "ক্রপ-মার্ক ও কালির রেখা"],
    panel: false,
  },
  {
    id: "decode",
    name: "ডিকোড ও যাচাই",
    blurb: "বাংলা যুক্তাক্ষর-নিরাপদ ডিকোড, তারপর ‘যাচাইকৃত’ সিল।",
    effects: ["যুক্তাক্ষর-নিরাপদ স্ক্র্যাম্বল", "হেক্স-ডেটা স্ট্রিম", "আঁকা ব্র্যাকেট", "যাচাই-স্ট্যাটাস সিল"],
    panel: false,
  },
  {
    id: "crt",
    name: "সম্প্রচার টিভি",
    blurb: "চ্যানেল বদলের স্ট্যাটিক, রঙিন বার ও পাওয়ার-অন সহ পুরোনো টিভি।",
    effects: ["চ্যানেল-জ্যাপ স্ট্যাটিক", "কালার-বার টেস্ট প্যাটার্ন", "সিআরটি পাওয়ার-অন", "স্ক্যানলাইন ও ভিগনেট", "ওএসডি ও নব"],
    panel: true,
  },
  {
    id: "neon",
    name: "নিয়ন সাইনবোর্ড",
    blurb: "ইট-দেয়ালে জ্বলে ওঠা নিয়ন, দুলন্ত ট্যাগ ও মেঝের প্রতিফলন।",
    effects: ["ধাপে ধাপে ইগনিশন", "আঁকা টিউব-ফ্রেম", "বাজ-ফ্লিকার", "দুলন্ত ট্যাগ", "ভেজা মেঝের প্রতিফলন"],
    panel: true,
  },
  {
    id: "hologram",
    name: "হলোগ্রাম প্রজেক্টর",
    blurb: "প্রজেক্টরের আলোয় ভাসমান, স্লাইস-গ্লিচ করা হলোগ্রাম।",
    effects: ["আলোকরশ্মি", "ভাসমান দোলন", "হলো-গ্র্যাডিয়েন্ট", "স্লাইস গ্লিচ", "ঘূর্ণায়মান বেস"],
    panel: true,
  },
  {
    id: "boot",
    name: "সিস্টেম বুট",
    blurb: "পাইপলাইনের বুট-লগ টাইপ হয়ে লোগো আনলক হয়।",
    effects: ["টাইপ হওয়া বুট-লগ", "প্রগ্রেস বার", "ডিক্রিপ্ট রিভিল", "স্বয়ংক্রিয় রিবুট"],
    panel: true,
  },
  {
    id: "led",
    name: "এলইডি ডট-ম্যাট্রিক্স",
    blurb: "ক্যানভাসে আঁকা ডট-ম্যাট্রিক্স, ঢেউ ও ঝলকানি।",
    effects: ["বাস্তব ডট-গ্রিড", "ঢেউ-তরঙ্গ", "আলোর ব্যান্ড সুইপ", "বাংলা গ্লিফ স্যাম্পলিং"],
    panel: true,
  },
  {
    id: "shine",
    name: "ক্লাসিক শাইন",
    blurb: "সংযত গ্র্যাডিয়েন্ট ঝলক — কম ঝলমলে বিকল্প।",
    effects: ["গ্র্যাডিয়েন্ট সুইপ", "শ্বাস-প্রশ্বাস হ্যালো", "কক্ষপথ ডট"],
    panel: false,
  },
];

const LEGACY: Record<string, LogoEngine> = {
  stream: "broadcast",
  cube3d: "cube",
  typewriter: "decode",
};

const IDS = new Set<string>(LOGO_ENGINES.map((e) => e.id));

/** Accepts a saved config value (or a legacy id) and returns a valid engine, or undefined. */
export function normalizeLogoEngine(value: unknown): LogoEngine | undefined {
  if (typeof value !== "string") return undefined;
  if (IDS.has(value)) return value as LogoEngine;
  return LEGACY[value];
}

export function isPanelEngine(id: LogoEngine): boolean {
  return LOGO_ENGINES.find((e) => e.id === id)?.panel ?? false;
}
