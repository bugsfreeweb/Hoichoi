export type AdFormat =
  | "leaderboard" // 970x90 / 728x90 editorial band  (home hero-below, post header)
  | "billboard" // 970x250 big band
  | "rect" // 300x250 / 336x280 sidebar rectangle
  | "infeed" // in-grid card, matches post card (min-h 280)
  | "sky" // 300x600 sticky skyscraper rail
  | "strip" // dark pre-footer strip (min-h 64)
  | "anchor" // mobile sticky bottom anchor
  | "native"; // inline sponsor line (ticker / lead story / category rail)

export type AdPage = "home" | "post" | "category" | "search" | "global";

export interface SlotDef {
  key: string;
  page: AdPage;
  /** Bengali label shown in portals */
  label: string;
  labelEn: string;
  /** Where exactly it sits — mirrors the live DOM */
  area: string;
  format: AdFormat;
  /** IAB-ish size shown to clients */
  size: string;
  /** daily rate in BDT */
  dayRate: number;
  /** relative audience strength 0-100, drives the heat bar in portals */
  heat: number;
  /** true for slots that exist on the live site today */
  existing: boolean;
  note: string;
}

export type PaletteKey =
  | "newsprint"
  | "ink"
  | "alizarin"
  | "lime"
  | "amber"
  | "teal"
  | "royal"
  | "midnight"
  | "rose"
  | "sand";

export interface Palette {
  key: PaletteKey;
  name: string;
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  accentFg: string;
  border: string;
}

export type CreativeKind =
  | "classic-banner"
  | "split-image"
  | "poster"
  | "alert-missing"
  | "candidate"
  | "sponsor-bar"
  | "product-price"
  | "offer-coupon"
  | "event-date"
  | "job-card"
  | "property"
  | "course"
  | "clinic"
  | "finance-rate"
  | "auto-spec"
  | "donation"
  | "govt-notice"
  | "obituary"
  | "countdown-launch"
  | "custom-html";

export type AdCategory =
  | "product"
  | "missing_child"
  | "election"
  | "sponsor"
  | "custom"
  | "public_service"
  | "event"
  | "job"
  | "real_estate"
  | "education"
  | "health"
  | "finance"
  | "automotive"
  | "ngo"
  | "government"
  | "obituary"
  | "technology";

export interface CreativeData {
  brand?: string;
  logoText?: string;
  headline?: string;
  sub?: string;
  body?: string;
  cta?: string;
  url?: string;
  imageUrl?: string;
  badge?: string;
  price?: string;
  strikePrice?: string;
  discount?: string;
  code?: string;
  date?: string;
  time?: string;
  place?: string;
  phone?: string;
  rows?: { k: string; v: string }[];
  bullets?: string[];
  footnote?: string;
  rating?: string;
  html?: string;
  css?: string;
}

export interface TemplateDef {
  id: string;
  name: string;
  nameBn: string;
  category: AdCategory;
  kind: CreativeKind;
  palette: PaletteKey;
  formats: AdFormat[];
  premium: boolean;
  tags: string[];
  /** extra BDT added on top of the slot price */
  uplift: number;
  data: CreativeData;
}

export type BookingStatus =
  | "draft"
  | "pending_payment"
  | "in_review"
  | "scheduled"
  | "active"
  | "paused"
  | "expired"
  | "rejected";

export type PayMethod =
  | "bkash"
  | "nagad"
  | "rocket"
  | "card"
  | "paypal"
  | "crypto"
  | "bank"
  | "manual";

export type LangCode = "bn" | "en" | "hi" | "ar" | "ur" | "ms";
