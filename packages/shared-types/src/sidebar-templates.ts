/**
 * The admin sidebar's twelve templates — one catalogue, two surfaces.
 *
 * Ported from the design prototype (`hero-mockup/src/lib/sidebarStyle.ts`), where
 * the DOM is identical for every style and only `data-sidebar-style` changes. That
 * is what makes a template a *style* rather than twelve sidebars to maintain: the
 * navigation markup, the a11y attributes and the keyboard order stay in one place,
 * and a new template is a block of CSS variables.
 *
 * The style is an admin-owned setting (`SiteAppConfig.admin_sidebar_style`), not a
 * per-browser preference: the newsroom's console should look the same at every
 * desk, and the desktop app reads the same value from the same settings row.
 */
export type SidebarStyleId =
  | "classic"
  | "obsidian"
  | "floating"
  | "rail"
  | "editorial"
  | "dock"
  | "neon"
  | "minimal"
  | "aurora"
  | "ledger"
  | "split"
  | "cards";

export interface SidebarStyleMeta {
  id: SidebarStyleId;
  name: string;
  latin: string;
  note: string;
  tone: "light" | "dark";
  /** Swatch for the picker thumbnail only — never used as page colour. */
  swatch: { bg: string; bar: string; accent: string; radius: string };
}

export const SIDEBAR_STYLES: SidebarStyleMeta[] = [
  {
    id: "classic",
    name: "ক্লাসিক",
    latin: "CLASSIC",
    note: "পরিচিত হালকা প্যানেল ও স্পষ্ট সক্রিয় মেনু।",
    tone: "light",
    swatch: { bg: "#fdfefa", bar: "#b7c5ba", accent: "#e76642", radius: "3px" },
  },
  {
    id: "obsidian",
    name: "অবসিডিয়ান গ্লাস",
    latin: "OBSIDIAN GLASS",
    note: "অপশন বি-এর গাঢ় নিউজরুম প্যানেল, উষ্ণ অ্যাকসেন্ট ও পরিষ্কার বিভাগ।",
    tone: "dark",
    swatch: { bg: "linear-gradient(160deg,#23382d,#0b110d 72%)", bar: "#8aab96", accent: "#ef6d47", radius: "3px" },
  },
  {
    id: "floating",
    name: "ফ্লোটিং আইল্যান্ড",
    latin: "FLOATING ISLAND",
    note: "চারপাশে শ্বাস নেওয়ার জায়গাসহ ভাসমান প্যানেল।",
    tone: "light",
    swatch: { bg: "#fdfefa", bar: "#b3bdb1", accent: "#df6038", radius: "9px" },
  },
  {
    id: "rail",
    name: "আইকন রেল",
    latin: "ICON RAIL",
    note: "সরু আইকন কলাম; হভার বা ফোকাসে মেনুর নাম খুলে যায়।",
    tone: "dark",
    swatch: { bg: "#16231b", bar: "#7d9e88", accent: "#b4dcc0", radius: "6px" },
  },
  {
    id: "editorial",
    name: "এডিটোরিয়াল",
    latin: "EDITORIAL LEDGER",
    note: "সংবাদপত্রের মতো রেখা, ঘন টাইপ ও নিচে দাগ দেওয়া সক্রিয় মেনু।",
    tone: "light",
    swatch: { bg: "#f4f3ec", bar: "#69796c", accent: "#17231b", radius: "0px" },
  },
  {
    id: "dock",
    name: "কমান্ড ডক",
    latin: "COMMAND DOCK",
    note: "দ্রুত বিভাগ বদলাতে শর্টকাট ও গোল প্রান্তের মেনু।",
    tone: "dark",
    swatch: { bg: "#1c2a21", bar: "#86a594", accent: "#e8f1e8", radius: "999px" },
  },
  {
    id: "neon",
    name: "নিয়ন এজ",
    latin: "NEON EDGE",
    note: "গাঢ় প্যানেল ও সক্রিয় মেনুর পাশে উজ্জ্বল রেখা।",
    tone: "dark",
    swatch: { bg: "#07090a", bar: "#526e60", accent: "#ff6b3d", radius: "2px" },
  },
  {
    id: "minimal",
    name: "মিনিমাল লাইন",
    latin: "MINIMAL LINE",
    note: "কম রঙ, সরু রেখা ও একটি সক্রিয় বিন্দু।",
    tone: "light",
    swatch: { bg: "#ffffff", bar: "#bfc8c1", accent: "#111827", radius: "0px" },
  },
  {
    id: "aurora",
    name: "অরোরা গ্রেডিয়েন্ট",
    latin: "AURORA",
    note: "কাঁচের মতো সবুজ ও বেগুনি আলোর মিশ্রণ।",
    tone: "dark",
    swatch: { bg: "linear-gradient(160deg,#1d3a33,#2d2250)", bar: "#ffffff55", accent: "#7fe0c0", radius: "6px" },
  },
  {
    id: "ledger",
    name: "পেপার লেজার",
    latin: "PAPER LEDGER",
    note: "উষ্ণ কাগজের রঙ ও সূচকের মতো নম্বর।",
    tone: "light",
    swatch: { bg: "#f3ead9", bar: "#b9a389", accent: "#8a4b2a", radius: "2px" },
  },
  {
    id: "split",
    name: "স্প্লিট ডক",
    latin: "SPLIT DOCK",
    note: "বিভাগ বাছার গ্রিড এবং নির্বাচিত বিভাগের আলাদা তালিকা।",
    tone: "dark",
    swatch: { bg: "#121a14", bar: "#789887", accent: "#ef6d47", radius: "4px" },
  },
  {
    id: "cards",
    name: "কার্ড গ্রুপ",
    latin: "CARD GROUPS",
    note: "ঘন মেনুর জন্য আলাদা আলাদা বিভাগ গুচ্ছ।",
    tone: "light",
    swatch: { bg: "#f1f3ee", bar: "#9cad9e", accent: "#557d62", radius: "4px" },
  },
];

/** The prototype's Option B default: the dark newsroom glass panel. */
export const DEFAULT_SIDEBAR_STYLE: SidebarStyleId = "obsidian";

export const SIDEBAR_STYLE_IDS: SidebarStyleId[] = SIDEBAR_STYLES.map((s) => s.id);

export function isSidebarStyleId(value: unknown): value is SidebarStyleId {
  return typeof value === "string" && (SIDEBAR_STYLE_IDS as string[]).includes(value);
}

/** Unknown / missing values fall back to the default rather than no style. */
export function sidebarStyleOr(value: unknown): SidebarStyleId {
  return isSidebarStyleId(value) ? value : DEFAULT_SIDEBAR_STYLE;
}

export function sidebarStyleMeta(id: SidebarStyleId): SidebarStyleMeta {
  return SIDEBAR_STYLES.find((s) => s.id === id) ?? SIDEBAR_STYLES[1]!;
}
