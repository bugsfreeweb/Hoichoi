import type { CreativeData, CreativeKind } from "./types";
import { TEMPLATE_MAP } from "./templates";

/* ==================================================================
 * BLOCK-BASED LAYOUT ENGINE
 * Any template can be exploded into an editable block layout, which
 * the studio then lets the advertiser drag, drop, restyle and save
 * as their own custom template.
 * ================================================================== */

export type BlockKind =
  | "badge"
  | "headline"
  | "sub"
  | "body"
  | "image"
  | "logo"
  | "price"
  | "strikethrough"
  | "discount"
  | "coupon"
  | "cta"
  | "phone"
  | "divider"
  | "bullets"
  | "rows"
  | "countdown"
  | "stats"
  | "ribbon"
  | "quote"
  | "tags"
  | "progress"
  | "spacer"
  | "html";

/** Text treatments — each maps to a CSS class in globals.css */
export type TextVariant =
  | "plain"
  | "typewriter"
  | "marquee"
  | "glitch"
  | "neon"
  | "stamp"
  | "karaoke"
  | "highlight"
  | "draw-underline"
  | "letter-in"
  | "flip-in"
  | "outline"
  | "hard-shadow"
  | "gradient-text"
  | "ticker-loop"
  | "wavy";

export const TEXT_VARIANTS: { key: TextVariant; name: string; group: "static" | "motion" }[] = [
  { key: "plain", name: "সাধারণ", group: "static" },
  { key: "outline", name: "আউটলাইন", group: "static" },
  { key: "hard-shadow", name: "হার্ড শ্যাডো", group: "static" },
  { key: "gradient-text", name: "গ্রেডিয়েন্ট", group: "static" },
  { key: "stamp", name: "স্ট্যাম্প", group: "static" },
  { key: "highlight", name: "হাইলাইটার", group: "static" },
  { key: "typewriter", name: "টাইপরাইটার", group: "motion" },
  { key: "marquee", name: "মার্কি স্ক্রল", group: "motion" },
  { key: "ticker-loop", name: "টিকার লুপ", group: "motion" },
  { key: "glitch", name: "গ্লিচ", group: "motion" },
  { key: "neon", name: "নিয়ন ফ্লিকার", group: "motion" },
  { key: "karaoke", name: "ক্যারাওকে", group: "motion" },
  { key: "draw-underline", name: "আন্ডারলাইন ড্র", group: "motion" },
  { key: "letter-in", name: "অক্ষরে অক্ষরে", group: "motion" },
  { key: "flip-in", name: "ফ্লিপ", group: "motion" },
  { key: "wavy", name: "ওয়েভ", group: "motion" },
];

export const BLOCK_LIBRARY: {
  kind: BlockKind;
  name: string;
  hint: string;
  icon: string;
  fields: { key: string; label: string; type: "text" | "area" | "url" | "number" | "list" | "kv" }[];
}[] = [
  { kind: "badge", name: "ব্যাজ", hint: "ছোট লেবেল/ট্যাগ", icon: "◈", fields: [{ key: "text", label: "লেখা", type: "text" }] },
  { kind: "headline", name: "হেডলাইন", hint: "প্রধান শিরোনাম", icon: "H", fields: [{ key: "text", label: "লেখা", type: "area" }] },
  { kind: "sub", name: "সাব-হেডলাইন", hint: "শিরোনামের নিচের লাইন", icon: "h", fields: [{ key: "text", label: "লেখা", type: "area" }] },
  { kind: "body", name: "বডি টেক্সট", hint: "বিস্তারিত বিবরণ", icon: "¶", fields: [{ key: "text", label: "লেখা", type: "area" }] },
  { kind: "image", name: "ছবি", hint: "ব্যানার বা প্রোডাক্ট ছবি", icon: "▣", fields: [{ key: "url", label: "ছবির URL", type: "url" }] },
  { kind: "logo", name: "লোগো/আইকন", hint: "ব্র্যান্ড মার্ক", icon: "◎", fields: [{ key: "text", label: "অক্ষর", type: "text" }, { key: "url", label: "ছবির URL", type: "url" }] },
  { kind: "price", name: "মূল্য", hint: "প্রধান দাম", icon: "৳", fields: [{ key: "text", label: "মূল্য", type: "text" }] },
  { kind: "strikethrough", name: "কাটা দাম", hint: "আগের দাম", icon: "৳̶", fields: [{ key: "text", label: "দাম", type: "text" }] },
  { kind: "discount", name: "ছাড়", hint: "শতাংশ বা অফার", icon: "%", fields: [{ key: "text", label: "ছাড়", type: "text" }] },
  { kind: "coupon", name: "কুপন কোড", hint: "ড্যাশড বক্স", icon: "⌗", fields: [{ key: "text", label: "কোড", type: "text" }] },
  { kind: "cta", name: "বাটন (CTA)", hint: "ক্লিক করার বাটন", icon: "▸", fields: [{ key: "text", label: "লেখা", type: "text" }, { key: "url", label: "লিংক", type: "url" }] },
  { kind: "phone", name: "ফোন নম্বর", hint: "কল করার নম্বর", icon: "☎", fields: [{ key: "text", label: "নম্বর", type: "text" }] },
  { kind: "divider", name: "ডিভাইডার", hint: "লাইন/ফাঁকা বিভাজক", icon: "—", fields: [] },
  { kind: "bullets", name: "বুলেট তালিকা", hint: "একাধিক পয়েন্ট", icon: "≡", fields: [{ key: "items", label: "পয়েন্ট", type: "list" }] },
  { kind: "rows", name: "তথ্যের সারি", hint: "লেবেল: মান জোড়া", icon: "⊞", fields: [{ key: "items", label: "সারি", type: "kv" }] },
  { kind: "countdown", name: "কাউন্টডাউন", hint: "দিন/ঘণ্টা/মিনিট", icon: "⏱", fields: [{ key: "items", label: "মান", type: "list" }] },
  { kind: "stats", name: "পরিসংখ্যান", hint: "সংখ্যা + লেবেল", icon: "▲", fields: [{ key: "items", label: "সংখ্যা", type: "kv" }] },
  { kind: "ribbon", name: "রিবন", hint: "কোণে ব্যান্ড", icon: "◤", fields: [{ key: "text", label: "লেখা", type: "text" }] },
  { kind: "quote", name: "উদ্ধৃতি", hint: "স্লোগান/উক্তি", icon: "❝", fields: [{ key: "text", label: "লেখা", type: "area" }] },
  { kind: "tags", name: "ট্যাগ চিপ", hint: "ছোট ছোট ট্যাগ", icon: "▤", fields: [{ key: "items", label: "ট্যাগ", type: "list" }] },
  { kind: "progress", name: "প্রগ্রেস বার", hint: "লক্ষ্য অর্জন", icon: "▰", fields: [{ key: "text", label: "শতাংশ", type: "number" }] },
  { kind: "spacer", name: "ফাঁকা জায়গা", hint: "উচ্চতা নিয়ন্ত্রণ", icon: "↕", fields: [{ key: "text", label: "উচ্চতা px", type: "number" }] },
  { kind: "html", name: "কাস্টম HTML", hint: "নিজের কোড", icon: "</>", fields: [{ key: "text", label: "HTML", type: "area" }] },
];

export const BLOCK_META = Object.fromEntries(BLOCK_LIBRARY.map((b) => [b.kind, b])) as Record<
  BlockKind,
  (typeof BLOCK_LIBRARY)[number]
>;

export interface Block {
  id: string;
  kind: BlockKind;
  /** primary text / url / number payload */
  text?: string;
  url?: string;
  items?: { k: string; v: string }[];
  /** how many grid columns this block occupies (1..layout.cols) */
  span?: number;
  align?: "left" | "center" | "right";
  variant?: TextVariant;
  /** per-block overrides */
  size?: number;
  weight?: number;
  color?: string;
  bg?: string;
  pad?: number;
  radius?: number;
  hidden?: boolean;
}

export interface BlockLayout {
  cols: 1 | 2 | 3 | 4;
  gap: number;
  padding: number;
  align: "left" | "center" | "right";
  valign: "top" | "center" | "bottom";
  direction: "row" | "column";
  blocks: Block[];
  /** auto-translated copies of this layout, keyed by language code */
  i18n?: Record<string, BlockLayout>;
}

export const DEFAULT_LAYOUT: BlockLayout = {
  cols: 2,
  gap: 10,
  padding: 16,
  align: "left",
  valign: "center",
  direction: "row",
  blocks: [],
};

let counter = 0;
export function blockId(kind: BlockKind) {
  counter += 1;
  return `${kind}-${Date.now().toString(36)}-${counter}`;
}

export function newBlock(kind: BlockKind, text = ""): Block {
  const meta = BLOCK_META[kind];
  const b: Block = { id: blockId(kind), kind, text };
  if (meta.fields.some((f) => f.type === "kv" || f.type === "list")) b.items = [];
  if (meta.fields.some((f) => f.type === "url")) b.url = "";
  if (kind === "spacer") b.text = "16";
  if (kind === "progress") b.text = "62";
  if (kind === "image") b.url = "";
  return b;
}

/* ------------------------------------------------------------------ *
 * TEMPLATE → LAYOUT conversion ("customize any template")
 * ------------------------------------------------------------------ */

function items(strs?: string[]) {
  return (strs ?? []).map((v) => ({ k: v, v: "" }));
}
function kv(rows?: { k: string; v: string }[]) {
  return (rows ?? []).map((r) => ({ k: r.k, v: r.v }));
}

/** Explodes a saved creative into an editable block layout. */
export function templateToLayout(kind: CreativeKind, d: CreativeData): BlockLayout {
  const blocks: Block[] = [];
  const push = (b: Partial<Block> & { kind: BlockKind }) =>
    blocks.push({ id: blockId(b.kind), span: 2, ...b } as Block);

  if (d.badge) push({ kind: "badge", text: d.badge, variant: "stamp", span: 2 });
  if (d.brand) push({ kind: "logo", text: (d.logoText || d.brand).slice(0, 1), span: 1 });

  switch (kind) {
    case "alert-missing":
      push({ kind: "headline", text: d.headline ?? "", variant: "glitch", size: 20, weight: 900, span: 2 });
      push({ kind: "sub", text: d.sub ?? "", span: 2 });
      push({ kind: "rows", items: kv(d.rows), span: 2 });
      push({ kind: "phone", text: d.phone ?? "", variant: "neon", span: 1 });
      push({ kind: "cta", text: d.cta ?? "", url: d.url ?? "", span: 1 });
      if (d.footnote) push({ kind: "body", text: d.footnote, size: 10, span: 2 });
      break;

    case "candidate":
      push({ kind: "headline", text: d.headline ?? "", variant: "letter-in", size: 21, weight: 900, span: 2 });
      push({ kind: "sub", text: d.sub ?? "", span: 2 });
      push({ kind: "bullets", items: items(d.bullets), span: 2 });
      push({ kind: "cta", text: d.cta ?? "", url: d.url ?? "", span: 2 });
      break;

    case "product-price":
      if (d.imageUrl) push({ kind: "image", url: d.imageUrl, span: 2 });
      push({ kind: "headline", text: d.headline ?? "", variant: "typewriter", span: 2 });
      push({ kind: "sub", text: d.sub ?? "", span: 2 });
      push({ kind: "price", text: d.price ?? "", variant: "karaoke", size: 24, weight: 900, span: 1 });
      push({ kind: "strikethrough", text: d.strikePrice ?? "", span: 1 });
      if (d.discount) push({ kind: "discount", text: d.discount, span: 1 });
      push({ kind: "cta", text: d.cta ?? "", url: d.url ?? "", span: 2 });
      break;

    case "offer-coupon":
      push({ kind: "headline", text: d.headline ?? "", variant: "wavy", span: 2 });
      push({ kind: "sub", text: d.sub ?? "", span: 2 });
      push({ kind: "coupon", text: d.code ?? "", variant: "flip-in", span: 1 });
      push({ kind: "cta", text: d.cta ?? "", url: d.url ?? "", span: 1 });
      break;

    case "event-date":
      push({ kind: "headline", text: d.headline ?? "", variant: "draw-underline", span: 2 });
      push({ kind: "rows", items: [{ k: "তারিখ", v: d.date ?? "" }, { k: "সময়", v: d.time ?? "" }, { k: "স্থান", v: d.place ?? "" }], span: 2 });
      if (d.price) push({ kind: "price", text: d.price, span: 1 });
      push({ kind: "cta", text: d.cta ?? "", url: d.url ?? "", span: 1 });
      break;

    case "job-card":
    case "property":
    case "auto-spec":
    case "clinic":
    case "finance-rate":
      if (d.imageUrl) push({ kind: "image", url: d.imageUrl, span: 2 });
      push({ kind: "headline", text: d.headline ?? "", variant: "letter-in", span: 2 });
      if (d.sub) push({ kind: "sub", text: d.sub, span: 2 });
      if (d.price) push({ kind: "price", text: d.price, variant: "karaoke", span: 2 });
      if (d.rows?.length) push({ kind: "rows", items: kv(d.rows), span: 2 });
      if (d.bullets?.length) push({ kind: "bullets", items: items(d.bullets), span: 2 });
      if (d.phone) push({ kind: "phone", text: d.phone, span: 1 });
      push({ kind: "cta", text: d.cta ?? "", url: d.url ?? "", span: 1 });
      if (d.footnote) push({ kind: "body", text: d.footnote, size: 10, span: 2 });
      break;

    case "course":
      push({ kind: "headline", text: d.headline ?? "", variant: "highlight", span: 2 });
      push({ kind: "sub", text: d.sub ?? "", span: 2 });
      push({ kind: "bullets", items: items(d.bullets), span: 2 });
      push({ kind: "price", text: d.price ?? "", span: 1 });
      push({ kind: "cta", text: d.cta ?? "", url: d.url ?? "", span: 1 });
      break;

    case "donation":
      push({ kind: "headline", text: d.headline ?? "", variant: "wavy", span: 2 });
      push({ kind: "sub", text: d.sub ?? "", span: 2 });
      push({ kind: "progress", text: "62", span: 2 });
      push({ kind: "stats", items: kv(d.rows), span: 2 });
      push({ kind: "cta", text: d.cta ?? "", url: d.url ?? "", span: 2 });
      break;

    case "govt-notice":
      push({ kind: "divider", span: 2 });
      push({ kind: "headline", text: d.headline ?? "", variant: "stamp", size: 18, span: 2 });
      if (d.body) push({ kind: "body", text: d.body, span: 2 });
      if (d.bullets?.length) push({ kind: "bullets", items: items(d.bullets), span: 2 });
      if (d.rows?.length) push({ kind: "rows", items: kv(d.rows), span: 2 });
      push({ kind: "cta", text: d.cta ?? "", url: d.url ?? "", span: 2 });
      break;

    case "obituary":
      push({ kind: "quote", text: d.badge ?? "", variant: "plain", span: 2 });
      push({ kind: "divider", span: 2 });
      push({ kind: "headline", text: d.headline ?? "", variant: "letter-in", size: 22, span: 2 });
      push({ kind: "sub", text: d.sub ?? "", span: 2 });
      if (d.body) push({ kind: "body", text: d.body, span: 2 });
      if (d.footnote) push({ kind: "body", text: d.footnote, size: 10, span: 2 });
      break;

    case "countdown-launch":
      push({ kind: "headline", text: d.headline ?? "", variant: "neon", span: 2 });
      push({ kind: "sub", text: d.sub ?? "", span: 2 });
      push({ kind: "countdown", items: kv(d.rows), variant: "flip-in", span: 2 });
      push({ kind: "cta", text: d.cta ?? "", url: d.url ?? "", span: 2 });
      break;

    case "poster":
      if (d.imageUrl) push({ kind: "image", url: d.imageUrl, span: 2 });
      push({ kind: "headline", text: d.headline ?? "", variant: "gradient-text", size: 26, span: 2 });
      push({ kind: "sub", text: d.sub ?? "", span: 2 });
      push({ kind: "cta", text: d.cta ?? "", url: d.url ?? "", span: 2 });
      break;

    case "split-image":
      if (d.imageUrl) push({ kind: "image", url: d.imageUrl, span: 1 });
      push({ kind: "headline", text: d.headline ?? "", variant: "draw-underline", span: 1 });
      if (d.price) push({ kind: "price", text: d.price, span: 1 });
      push({ kind: "sub", text: d.sub ?? "", span: 2 });
      push({ kind: "cta", text: d.cta ?? "", url: d.url ?? "", span: 2 });
      break;

    case "sponsor-bar":
      push({ kind: "logo", text: (d.logoText || d.brand || "হ").slice(0, 1), span: 1 });
      push({ kind: "headline", text: d.headline ?? "", variant: "marquee", size: 14, span: 1 });
      push({ kind: "sub", text: d.sub ?? d.brand ?? "", span: 2 });
      push({ kind: "cta", text: d.cta ?? "", url: d.url ?? "", span: 2 });
      break;

    case "custom-html":
      if (d.html) push({ kind: "html", text: d.html, span: 2 });
      else push({ kind: "headline", text: d.headline ?? "", span: 2 });
      break;

    default: // classic-banner
      push({ kind: "logo", text: (d.logoText || d.brand || "হ").slice(0, 1), span: 1 });
      push({ kind: "headline", text: d.headline ?? "", variant: "typewriter", span: 1 });
      push({ kind: "sub", text: d.sub ?? "", span: 2 });
      push({ kind: "cta", text: d.cta ?? "", url: d.url ?? "", span: 2 });
      break;
  }

  return { ...DEFAULT_LAYOUT, blocks };
}

/** Convenience: build a layout straight from a template id. */
export function layoutFromTemplate(templateId: string, data?: CreativeData): BlockLayout {
  const tpl = TEMPLATE_MAP[templateId];
  if (!tpl) return { ...DEFAULT_LAYOUT };
  return templateToLayout(tpl.kind, { ...tpl.data, ...(data ?? {}) });
}

/** Starter canvases offered in the builder palette. */
export const LAYOUT_PRESETS: { key: string; name: string; hint: string; build: () => BlockLayout }[] = [
  {
    key: "blank",
    name: "খালি ক্যানভাস",
    hint: "একদম শুরু থেকে",
    build: () => ({ ...DEFAULT_LAYOUT, cols: 2, blocks: [] }),
  },
  {
    key: "hero",
    name: "হিরো ব্যানার",
    hint: "বড় ছবি + শিরোনাম + বাটন",
    build: () => ({
      ...DEFAULT_LAYOUT,
      cols: 2,
      direction: "column",
      blocks: [
        { ...newBlock("ribbon", "ফ্ল্যাশ সেল"), span: 2 },
        { ...newBlock("image"), span: 2, url: "https://picsum.photos/seed/hoichoi1/900/500" },
        { ...newBlock("headline", "আপনার প্রধান বার্তা এখানে"), span: 2, variant: "typewriter", size: 24, weight: 900 },
        { ...newBlock("sub", "সহায়ক এক লাইনের বিবরণ"), span: 2 },
        { ...newBlock("cta", "এখনই দেখুন"), span: 2, url: "https://example.com" },
      ],
    }),
  },
  {
    key: "split",
    name: "স্প্লিট কার্ড",
    hint: "বামে ছবি, ডানে লেখা",
    build: () => ({
      ...DEFAULT_LAYOUT,
      cols: 2,
      blocks: [
        { ...newBlock("image"), span: 1, url: "https://picsum.photos/seed/hoichoi2/600/600" },
        { ...newBlock("headline", "পণ্যের নাম"), span: 1, variant: "draw-underline", size: 19 },
        { ...newBlock("price", "৳১,৪৯০"), span: 1, variant: "karaoke", size: 20 },
        { ...newBlock("cta", "কিনুন"), span: 1 },
      ],
    }),
  },
  {
    key: "alert",
    name: "জরুরি সতর্কতা",
    hint: "নিখোঁজ/জরুরি ঘোষণা",
    build: () => ({
      ...DEFAULT_LAYOUT,
      cols: 2,
      blocks: [
        { ...newBlock("badge", "জরুরি সংবাদ"), span: 2, variant: "stamp" },
        { ...newBlock("headline", "শিরোনাম"), span: 2, variant: "glitch", size: 21, weight: 900 },
        { ...newBlock("rows"), span: 2, items: [{ k: "বয়স", v: "৮" }, { k: "স্থান", v: "মিরপুর" }] },
        { ...newBlock("phone", "০১৭১১-০০০০০০"), span: 1, variant: "neon" },
        { ...newBlock("cta", "কল করুন"), span: 1 },
      ],
    }),
  },
  {
    key: "offer",
    name: "অফার/কুপন",
    hint: "ছাড় + প্রোমো কোড",
    build: () => ({
      ...DEFAULT_LAYOUT,
      cols: 3,
      blocks: [
        { ...newBlock("badge", "সীমিত সময়"), span: 3 },
        { ...newBlock("headline", "৪০% পর্যন্ত ছাড়"), span: 3, variant: "wavy", size: 22 },
        { ...newBlock("discount", "৪০%"), span: 1 },
        { ...newBlock("coupon", "HOICHOI40"), span: 1, variant: "flip-in" },
        { ...newBlock("cta", "কোড নিন"), span: 1 },
      ],
    }),
  },
  {
    key: "stats",
    name: "পরিসংখ্যান কার্ড",
    hint: "সংখ্যা + প্রগ্রেস",
    build: () => ({
      ...DEFAULT_LAYOUT,
      cols: 3,
      direction: "column",
      blocks: [
        { ...newBlock("headline", "ক্যাম্পেইন অগ্রগতি"), span: 3, size: 18 },
        { ...newBlock("stats"), span: 3, items: [{ k: "১২,৪০০", v: "সংগৃহীত" }, { k: "২০,০০০", v: "লক্ষ্য" }, { k: "৬২%", v: "অর্জিত" }] },
        { ...newBlock("progress", "62"), span: 3 },
        { ...newBlock("cta", "অংশ নিন"), span: 3 },
      ],
    }),
  },
];

export function isBlockLayout(x: unknown): x is BlockLayout {
  return !!x && typeof x === "object" && Array.isArray((x as BlockLayout).blocks);
}
