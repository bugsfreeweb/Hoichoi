import type { LiveThemeKey } from "@hoichoi/shared-types";

export interface LiveThemeMeta {
  key: LiveThemeKey;
  no: string;
  bn: string;
  en: string;
  hint: string;
  features: string;
  accent: string;
}

export const LIVE_THEMES: LiveThemeMeta[] = [
  { key: "stage", no: "০১", bn: "মঞ্চ", en: "Stage Takeover", hint: "বড় ঘটনার জন্য পূর্ণাঙ্গ লাইভ মঞ্চ", features: "ভিডিও · স্কোর · আপডেট · রিঅ্যাকশন", accent: "#d2202c" },
  { key: "broadsheet", no: "০২", bn: "ব্রডশিট", en: "Editorial Broadsheet", hint: "সম্পাদকীয়, সংবাদ ও পাঠকের মতামত", features: "সম্পাদকীয় লেআউট · পোল · পাঠকের মত", accent: "#0b7c72" },
  { key: "scoreboard", no: "০৩", bn: "স্কোরবোর্ড", en: "Data-first Scoreboard", hint: "ফলাফল ও লাইভ ডেটাকে সামনে রাখে", features: "স্কোর · মেট্রিক · আপডেট · এনগেজমেন্ট", accent: "#5f8f0e" },
  { key: "timeline", no: "০৪", bn: "টাইমলাইন", en: "Live Blog Timeline", hint: "সময়ের ধারায় যাচাইকৃত ঘটনাপ্রবাহ", features: "স্টিকি ভিডিও · গুরুত্বপূর্ণ মুহূর্ত · আপডেট", accent: "#2563eb" },
  { key: "compact", no: "০৫", bn: "স্ট্রিপ", en: "Compact Strip", hint: "হোমপেজের জন্য সংক্ষিপ্ত লাইভ কার্ড", features: "কম্প্যাক্ট ভিডিও · স্কোর · সর্বশেষ আপডেট", accent: "#b45309" },
  { key: "studio", no: "০৬", bn: "স্টুডিও", en: "TV Studio", hint: "একাধিক সম্প্রচার-চ্যানেলের ডার্ক স্টুডিও", features: "চ্যানেল সুইচার · লাইভ চ্যাট · স্কোর ব্যান্ড", accent: "#111827" },
];

export function liveThemeName(value: string): string {
  return value === "auto"
    ? "সাইটের ডিফল্ট"
    : LIVE_THEMES.find((theme) => theme.key === value)?.bn ?? "সাইটের ডিফল্ট";
}
