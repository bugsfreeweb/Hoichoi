/**
 * Shared domain types for হৈচৈ (Hoichoi).
 * These map 1:1 to the Turso/libSQL schema (see packages/db/migrations/).
 * Categories are now dynamic (stored in category_configs table).
 */

export * from "./secrets";

export type CategorySlug = string; // Dynamic - managed via category_configs table

export const DEFAULT_CATEGORIES: CategorySlug[] = [
  "child-sexual-abuse",
  "extramarital-crime",
  "missing-children",
];

export type PostStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "published"
  | "removed";

export type SafetyFlag =
  | "minor_involved"
  | "unverified_claim"
  | "graphic_content"
  | "bengali_script_missing"
  | "needs_double_approval"
  | "redacted";

export type CaseStatus =
  | "active"
  | "found"
  | "unresolved"
  | "false-alarm"
  | "unknown";

export type MediaKind = "image" | "video" | "none";

export type ArchiveReason = "auto_rollover" | "manual" | "retention_purge";

export type ProviderKey =
  | "google"
  | "groq"
  | "openrouter"
  | "ollama"
  | "anthropic"
  | "openai"
  | "mistral"
  | "github"
  | "github-models"
  | "custom";

/** Canonical env var each provider key maps to when no explicit env is set. */
export const PROCESSOR_ENV_DEFAULTS: Record<ProviderKey, string> = {
  google: "GOOGLE_API_KEY",
  groq: "GROQ_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  ollama: "OLLAMA_BASE_URL",
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  mistral: "MISTRAL_API_KEY",
  github: "GITHUB_COPILOT_TOKEN",
  "github-models": "GITHUB_COPILOT_TOKEN",
  custom: "MANIFEST_API_KEY",
};

/** Per-category behavior flags stored in category_configs.config (JSON). */
export interface CategoryConfig {
  requires_double_approval: boolean;
  show_content_warning: boolean;
  content_warning_text_bn?: string;
  auto_pending_review: boolean;
  redaction_strict: "maximum" | "standard" | "child_minimal" | "none";
  allow_identifying_details: boolean;
  publish_age_gate?: boolean;
  use_allegation_language?: boolean;
  supports_case_status?: boolean;
  share_widely_cta?: boolean;
  include_helpline_numbers?: boolean;
  /**
   * Bangla signal words the content classifier uses to decide whether a scraped
   * post belongs here. Admin-addable; empty falls back to the built-in topic
   * profiles (inspiration, health, crime, sports, ...). Words are matched
   * whole-word against the normalized Bangla text.
   */
  keywords?: string[];
}

export interface CategoryMeta {
  slug: CategorySlug;
  displayNameBn: string;
  displayNameEn: string;
  descriptionBn: string;
  descriptionEn: string;
  isActive: boolean;
  sortOrder: number;
  /** Tailwind-friendly rgb used across the UI + watermark color. */
  dot: string;
  config: CategoryConfig;
  createdAt: string;
  updatedAt: string;
  /** Whether this category appears in the public site footer nav. */
  showInFooter: boolean;
}

export interface Source {
  id: string;
  page_url: string;
  page_name: string;
  /** @deprecated Use categories array instead. Kept for backward compatibility. */
  category: CategorySlug;
  /** Array of category slugs this source belongs to (many-to-many via source_categories). */
  categories: CategorySlug[];
  /**
   * Where the content comes from. Facebook keeps page/group in `kind`; every
   * other platform is fetched from its URL or feed and translated on rewrite.
   */
  platform: SourcePlatform;
  /** Facebook page or group (only meaningful when platform = "facebook"). */
  kind: SourceKind;
  is_verified: boolean;
  is_active: boolean;
  last_scraped_at: string | null;
  created_at: string;
}

export type SourcePlatform = "facebook" | "x" | "news" | "magazine" | "social" | "other";
export type SourceKind = "page" | "group";

/** Normalize a free-form platform string to the canonical {@link SourcePlatform}. */
export function normalizePlatform(value: string | null | undefined): SourcePlatform {
  const v = (value ?? "").trim().toLowerCase();
  const aliases: Record<string, SourcePlatform> = {
    facebook: "facebook",
    fb: "facebook",
    page: "facebook",
    group: "facebook",
    x: "x",
    twitter: "x",
    news: "news",
    newspaper: "news",
    magazine: "magazine",
    social: "social",
    instagram: "social",
    youtube: "social",
    tiktok: "social",
    other: "other",
  };
  return aliases[v] ?? (v ? (v as SourcePlatform) : "facebook");
}

export interface RawPost {
  id: string;
  source_id: string;
  fb_post_id: string;
  fb_post_url: string;
  raw_text: string | null;
  media_urls: string[];
  screenshot_path: string | null;
  phash: string | null;
  scraped_at: string;
  raw_meta: Record<string, unknown> | null;
}

export interface Post {
  id: string;
  raw_post_id: string | null;
  source_id: string | null;
  category: CategorySlug;
  title_bn: string;
  body_bn: string;
  summary_bn: string | null;
  media_path: string | null;
  media_kind: MediaKind;
  source_url: string;
  source_name: string;
  slug: string;
  status: PostStatus;
  safety_flags: SafetyFlag[];
  embedding: number[] | null;
  case_status: CaseStatus | null;
  case_updated_at: string | null;
  original_author_name: string | null;
  original_author_url: string | null;
  published_at: string | null;
  archived_at: string | null;
  archive_reason: ArchiveReason | null;
  legal_hold: boolean;
  created_at: string;
  updated_at: string;
}

/** The public 7-day window — exactly what posts_current_window exposes. */
export interface CurrentWindowPost extends Post {
  /** time left until archive, in millis */
  ttl_ms: number;
}

export interface SubmittedPage {
  id: string;
  page_url: string;
  page_name: string | null;
  submitter_email: string | null;
  submitter_name: string | null;
  category: CategorySlug | null;
  notes: string | null;
  status: "new" | "reviewing" | "accepted" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type ProviderPurpose = "text" | "image";

export interface LLMProviderRow {
  id: string;
  provider_key: ProviderKey;
  display_name: string;
  base_url: string | null;
  model_name: string;
  api_key_env_var: string;
  /** Optional admin-entered key stored in the DB row. When set it takes
   *  precedence over the Stronghold/env resolution (edit-time override). */
  api_key?: string | null;
  priority: number;
  is_active: boolean;
  is_free_tier: boolean;
  supports_rewrite: boolean;
  supports_embeddings: boolean;
  /** Provider purpose: `text` for content generation/rewrite (default),
   *  `image` for image generation. Allows same provider_key with multiple keys. */
  purpose?: ProviderPurpose;
  rate_limit_rpm: number | null;
  config: Record<string, unknown> | null;
  /** Runtime health: set by the resolver on every attempt (free-first picking). */
  last_ok_at?: string | null;
  last_error_at?: string | null;
  error_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PipelineRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "completed" | "failed";
  stats: Record<string, unknown> | null;
  provider_used: string | null;
  error: string | null;
}

export interface RemovalRequest {
  id: string;
  post_id: string;
  post_slug?: string;
  reason: string | null;
  reporter_email: string | null;
  status: "open" | "reviewed" | "actioned";
  created_at: string;
}

/** Reader report on a published post (reports table = hoichoi_reports in mockup). */
export type ReaderReportStatus = "open" | "reviewed" | "dismissed";

export interface ReaderReport {
  id: string;
  post_id: string;
  reporter_name: string;
  reporter_email: string | null;
  reason: string;
  details: string | null;
  status: ReaderReportStatus;
  created_at: string;
  reviewed_at: string | null;
}

/** A report joined with its parent post (admin queue). */
export interface ReaderReportWithPost extends ReaderReport {
  postTitle: string | null;
  postSlug: string | null;
  postCategory: string | null;
}

export type AdminRole = "admin" | "editor" | "moderator";

export interface AdminUser {
  user_id: string;
  email: string;
  display_name: string | null;
  role: AdminRole;
  created_at: string;
}

export interface AdminAction {
  id: string;
  admin_user_id: string | null;
  admin_email?: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

/** Output of an LLM rewrite (parsed from the strict format). */
export interface RewriteOutput {
  title_bn: string;
  summary_bn: string;
  body_bn: string;
  safety_flag: "none" | "minor_involved" | "unverified_claim" | "graphic_content";
  case_status?: CaseStatus;
}

/** What the LLM-provider abstraction exposes. */
export interface RewriteInput {
  rawText: string;
  sourceName: string;
  sourcePageName: string;
  category: CategorySlug;
  originalAuthorName?: string | null;
}

/** Provider health-check result. */
export interface HealthCheckResult {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

/** Blocklist entries for the redaction pass. */
export interface RedactionBlocklistEntry {
  value: string;
  kind: "name" | "school" | "institution" | "thana" | "phone" | "pii";
}

export interface SiteSettings {
  id: number;
  pipeline_hours: number;
  /**
   * Sampling temperature used for LLM rewrites, in [0, 1]. Shared by the desktop
   * slider, the web admin, and the scheduled pipeline so all three agree.
   * Undefined means "not set", which resolves to the provider default of 0.3.
   */
  llm_temperature?: number | null;
  /**
   * Classifier confidence, as a whole percent, under which a post whose category
   * was re-detected (not inherited from its source) is held for human review.
   * Undefined means "not set", which resolves to 90.
   */
  fact_gate?: number | null;
  site_name: string;
  contact_email: string;
  police_helpline: string;
  child_helpline: string;
  archive_visible_days: number;
  archive_retention_days: number;
  /** Branding — the masthead slogan under the site name. */
  slogan_bn: string;
  /** Branding — the fine-print tagline under the slogan. */
  tagline: string;
  /** Branding — optional logo image URL (falls back to the site_name wordmark). */
  logo_url: string | null;
  /** Branding — favicon/icon URL used by the web app. */
  favicon_url: string | null;
  /** Branding — accent color (hex) for masthead/footer brand elements. */
  accent_color: string;
  /** Branding — footer "about this site" paragraph (blank = site default). */
  footer_about_bn: string | null;
  /** Advertisement slots (raw ad-network HTML/JS). Empty = placeholder sponsor card. */
  ad_leaderboard_html: string | null;
  ad_rect_html: string | null;
  ad_infeed_html: string | null;
  ad_strip_html: string | null;
  /**
   * Web-app visibility + behaviour knobs, serialized as JSON
   * (see `SiteAppConfig`). Edited from the desktop app and the web admin.
   */
  app_config_json: string | null;
  /**
   * Remote media storage configuration (multiprovider fallback chain +
   * retention), serialized as JSON (see `MediaStorageConfig`). Driven by the
   * desktop "মিডিয়া স্টোরেজ" settings panel; consumed by the runner pipeline.
   */
  media_storage_json: string | null;
  /**
   * Site-wide default section variant. Always `"default"` (the shipped design);
   * reserved for the optional mockup variant engine — see {@link SectionMeta}.
   */
  default_variant: string;
}

/* ------------------------- section variant engine ------------------------- */

/**
 * Section variant engine. Each entry maps a public-site section to the variants
 * that can render it. The `"default"` variant is always present and available —
 * it renders the production design that is live today. The remaining variants
 * are the `multi-style-web-mockup` designs ported into this app; they become
 * selectable once `available` is true (per ported phase).
 */
export type SectionScope = "global" | "home" | "post";
export type SectionZone = "header" | "hero" | "main" | "major" | "footer";

/** Presentation skin a variant belongs to (drives `.section-template[data-skin]`). */
export type DesignSkin = "editorial" | "glass" | "mosaic" | "spotlight" | "print";

/** Thumbnail motif shown in the admin appearance panel. */
export type Thumb =
  | "dock" | "split" | "grid" | "stack" | "bars" | "wave" | "cards" | "table"
  | "rail" | "donut" | "radar" | "gauge" | "funnel" | "doc" | "cover" | "log";

/** The one variant that is guaranteed to exist for every section. */
export const DEFAULT_VARIANT = "default";

export interface SectionVariant {
  id: string;
  /** Bengali display label. */
  label: string;
  blurb: string;
  /** `false` = catalogued from the mockup but not yet ported into this app. */
  available: boolean;
  /** Presentation skin this variant belongs to (mirrors the mockup registry). */
  skin: DesignSkin;
  /** Thumbnail motif shown in the admin appearance panel. */
  thumb: Thumb;
}

export interface SectionMeta {
  key: string;
  scope: SectionScope;
  zone: SectionZone;
  label: string;
  /** Internal/admin-only English label; the public UI uses `label`. */
  labelEn: string;
  description: string;
  /** The shipped design; always present and always available. */
  defaultVariant: string;
  defaultVisible: boolean;
  variants: SectionVariant[];
}

/** A persisted per-section row (see the `sections` table). */
export interface SectionRow {
  key: string;
  variant: string;
  enabled: boolean;
  sort_order: number;
  config_json: Record<string, unknown> | null;
  updated_at: string | null;
}

export interface SectionState {
  meta: SectionMeta;
  /** Convenience alias for `meta.key`. */
  key: string;
  variant: string;
  enabled: boolean;
  sort_order: number;
}

/** Whole-site look: a variant id for every section (see `PRESETS` below). */
export interface Preset {
  id: string;
  name: string;
  nameEn: string;
  blurb: string;
  accent: string;
  values: Record<string, string>;
}

export interface AccentPreset {
  id: string;
  hex: string;
  name: string;
}

const variant = (
  id: string,
  label: string,
  blurb: string,
  thumb: Thumb,
  skin: DesignSkin,
  available = false,
): SectionVariant => ({
  id,
  label,
  blurb,
  thumb,
  skin,
  available,
});

const section = (
  key: string,
  scope: SectionScope,
  zone: SectionZone,
  label: string,
  description: string,
  variants: SectionVariant[],
  defaultVisible = true,
): SectionMeta => ({
  key,
  scope,
  zone,
  label,
  labelEn: key,
  description,
  defaultVariant: DEFAULT_VARIANT,
  defaultVisible,
  variants: [
    { id: DEFAULT_VARIANT, label, blurb: description, thumb: "stack", skin: "editorial", available: true },
    ...variants,
  ],
});

/**
 * Registry of every configurable public-site section, keyed to match the
 * `multi-style-web-mockup` section slugs. All sections currently resolve to the
 * `"default"` variant (the shipped design).
 */
export const SECTION_REGISTRY: SectionMeta[] = [
  section("ticker", "global", "header", "জরুরি সংবাদ ও তথ্যপট্টি", "শীর্ষে চলমান সংবাদ, সংগ্রহের অবস্থা এবং জরুরি ঘোষণার নকশা।", [
    variant("breaking", "ব্রেকিং সংবাদপট্টি", "রঙিন চিহ্নসহ চলমান জরুরি শিরোনাম।", "rail", "editorial", true),
    variant("pulse", "লাইভ অবস্থা ফিতা", "লাইভ চিহ্ন ও ছোট অবস্থা-কার্ড।", "dock", "glass", true),
    variant("datafeed", "তথ্যপ্রবাহ ফিতা", "সংগ্রহ ও যাচাইয়ের সংক্ষিপ্ত চলমান খবর।", "log", "mosaic", true),
    variant("bulletin", "সংবাদ বুলেটিন", "স্থির শিরোনাম ও পাশে সর্বশেষ আপডেট।", "split", "spotlight", true),
    variant("notice", "সরল ঘোষণা বার", "কম শব্দে পরিষ্কার ঘোষণা ও সময়।", "stack", "print", true),
  ], true),
  section("navbar", "global", "header", "প্রধান শিরোনাম ও নেভিগেশন", "পরিষ্কার বাংলা মেনু, ডেস্কে যাওয়ার পথ এবং আলো-অন্ধকারের সুইচ।", [
    variant("newsroom", "সংবাদকক্ষ নেভিগেশন", "লোগো, বিভাগ, থিম সুইচ ও ডেস্ক বোতাম।", "dock", "editorial", true),
    variant("glass", "ভাসমান কাচের বার", "গোলাকার স্বচ্ছ নেভিগেশন প্যানেল।", "dock", "glass", true),
    variant("split", "দুই-সারি বিভাগ মেনু", "উপরের তথ্যবার ও নিচে বিভাগ নেভিগেশন।", "split", "mosaic", true),
    variant("mono", "সম্পাদকীয় সরল বার", "প্রচুর ফাঁকা জায়গাসহ টাইপভিত্তিক নেভিগেশন।", "stack", "spotlight", true),
    variant("stacked", "মোবাইল-প্রথম বার", "ছোট পর্দায় প্রসারিত ড্রয়ারসহ সংক্ষিপ্ত শিরোনাম।", "cards", "print", true),
  ], true),
  section("footer", "global", "footer", "সাইটের শেষাংশ", "সাইট-মানচিত্র, সম্পাদকীয় পরিচয়, যোগাযোগ ও প্রকাশনা তথ্য।", [
    variant("mega", "বিস্তারিত সংবাদকক্ষ", "বড় পরিচিতি, বিভাগ ও সাইট-তথ্য একসঙ্গে।", "grid", "editorial", true),
    variant("slab", "এক-সারি সংক্ষিপ্ত", "লোগো, দরকারি লিংক ও কপিরাইট।", "stack", "glass", true),
    variant("linkgrid", "বিভাগ-ঘর গ্রিড", "বিভিন্ন পাতায় যাওয়ার জন্য স্পষ্ট ঘর।", "grid", "mosaic", true),
    variant("terminal", "প্রকাশনা কার্যবিবরণী", "সর্বশেষ প্রকাশনা ও সার্ভিসের অবস্থা।", "log", "spotlight", true),
    variant("compact", "পাঠক সহায়তা ফুটার", "যোগাযোগ, নীতি ও সামাজিক মাধ্যমের সংক্ষিপ্ত অংশ।", "cards", "print", true),
  ], true),
  section("hero", "home", "hero", "হোমের প্রধান পরিচিতি", "প্রথম দেখায় হৈচৈয়ের কাজ, যাচাই নীতি ও সর্বশেষ অবস্থার পরিচয়।", [
    variant("split", "লাইভ সংবাদকক্ষ", "বামে পরিচিতি, ডানে চলমান তথ্য ও পরিসংখ্যান।", "split", "editorial", true),
    variant("cinema", "শহরের সিনেম্যাটিক প্রচ্ছদ", "শহুরে ছবি ও বড় শিরোনামভিত্তিক প্রচ্ছদ।", "cover", "glass", true),
    variant("bento", "তথ্যঘর বেন্টো", "অসম আকারের কার্ডে পরিচিতি, খবর ও সূচক।", "grid", "mosaic", true),
    variant("terminal", "পাইপলাইন কনসোল", "সংগ্রহ থেকে প্রকাশের ধাপকে সচল পাঠে দেখায়।", "log", "spotlight", true),
    variant("center", "কেন্দ্রিত সম্পাদকীয় প্রচ্ছদ", "মাঝখানে বাংলা শিরোনাম, পাশে মূল সূচক।", "doc", "print", true),
  ], true),
  section("kpi", "home", "hero", "সংবাদ-সংগ্রহের মূল সংখ্যা", "সংগৃহীত, প্রকাশিত, পুনরাবৃত্তি ও পাঠকের অংশগ্রহণ।", [
    variant("counters", "উঠতি সংখ্যা কার্ড", "কাউন্ট-আপ, পরিবর্তনের চিহ্ন ও ছোট রেখাচিত্র।", "cards", "editorial", true),
    variant("glass", "কাচের বৃত্তাকার সূচক", "চারটি গোল সূচকে কাজের অগ্রগতি।", "gauge", "glass", true),
    variant("ledger", "হিসাবের সারি", "টেবিলের মতো পরিষ্কার সংখ্যা ও পরিবর্তন।", "table", "mosaic", true),
    variant("strip", "এক লাইনের সংখ্যাপট্টি", "পাতার প্রস্থজুড়ে চারটি কমপ্যাক্ট সূচক।", "rail", "spotlight", true),
    variant("rings", "রঙিন প্রগতি বৃত্ত", "বৃত্তাকার সূচক ও নিচে বিবরণ।", "donut", "print", true),
  ], true),
  section("insights", "home", "main", "লাইভ তথ্যচিত্র", "সময়ের সঙ্গে প্রতিবেদন, বিষয়ভিত্তিক বণ্টন ও প্রকাশের অগ্রগতি।", [
    variant("dashboard", "বহু-চার্ট বোর্ড", "রেখা, বার, ডোনাট ও বিষয়ভিত্তিক স্কোর।", "grid", "editorial", true),
    variant("area", "সময়ের ঢেউরেখা", "তারিখ অনুযায়ী সংগ্রহ ও প্রকাশের প্রবণতা।", "wave", "glass", true),
    variant("gauges", "পাইপলাইন সূচক", "কার্যকারিতা, গতি ও নির্ভরযোগ্যতার বৃত্ত।", "gauge", "mosaic", true),
    variant("treemap", "বিষয় মানচিত্র ও ফানেল", "বিষয়ের ঘনত্বের সঙ্গে প্রকাশের ধাপ।", "funnel", "spotlight", true),
    variant("matrix", "ডেটা সারণি ও মিনি-চার্ট", "এক নজরে সংখ্যার তুলনা ও ছোট প্রবণতা-চিত্র।", "table", "print", true),
  ], true),
  section("pipeline", "home", "main", "সংবাদ যাচাই ও প্রকাশের ধাপ", "উৎস সংগ্রহ, ছবি সংরক্ষণ, পুনরাবৃত্তি যাচাই, পুনর্লিখন ও প্রকাশ।", [
    variant("flow", "ছয় ধাপের চলমান রেখা", "একটি আলোকবিন্দু প্রতিটি কাজের ধাপ অতিক্রম করে।", "rail", "editorial", true),
    variant("blueprint", "ধাপভিত্তিক তথ্যকার্ড", "প্রতিটি ধাপের কাজ আলাদা কার্ডে।", "cards", "glass", true),
    variant("funnel", "প্রকাশ-রূপান্তর ফানেল", "শুরু থেকে প্রকাশ পর্যন্ত কমতে থাকা রেকর্ড।", "funnel", "mosaic", true),
    variant("steps", "উল্লম্ব সম্পাদকীয় পথ", "মোবাইলে সহজপাঠ্য পর্যায়ভিত্তিক বিন্যাস।", "stack", "spotlight", true),
    variant("terminal", "রান-লগ পর্দা", "প্রতিটি ধাপের অবস্থা ও সময়ক্রমের দৃশ্য।", "log", "print", true),
  ], true),
  section("wire", "home", "main", "নিউজরুম লাইভ ওয়্যার", "সংগ্রহ, হ্যাশ-যাচাই, পুনর্লিখন ও প্রকাশের চলমান পাইপলাইন ঘটনা।", [
    variant("stream", "চলমান ঘটনা প্রবাহ", "নতুন ঘটনা উপরে যোগ হয়, লাইভ প্রবাহ বন্ধ/চালু করা যায়।", "log", "editorial", true),
    variant("ledger", "হিসাব-নথি সারি", "টেবিলের মতো সাজানো ধাপ, সময় ও ফলাফল।", "table", "glass", true),
    variant("cards", "ঘটনা কার্ড গ্রিড", "প্রতিটি ধাপ আলাদা কার্ডে সাজানো।", "cards", "mosaic", true),
    variant("console", "টার্মিনাল কনসোল", "মোনো টাইপে পাইপলাইন লগ, ডেভ-ঘরানা।", "log", "spotlight", true),
    variant("compact", "সংক্ষিপ্ত অবস্থা বার", "কম জায়গায় শেষ কয়েকটি ধাপের সারসংক্ষেপ।", "rail", "print", true),
  ], true),
  section("briefing", "home", "main", "সকালের সংক্ষিপ্ত ব্রিফিং", "দিনের সবচেয়ে গুরুত্বপূর্ণ যাচাইকৃত প্রতিবেদনের সারসংক্ষেপ ও শোনার সুবিধা।", [
    variant("accordion", "প্রসারণযোগ্য তালিকা", "প্রতিটি খবরে চাপ দিলে সারাংশ খুলে যায়।", "stack", "editorial", true),
    variant("cards", "ব্রিফিং কার্ড গ্রিড", "প্রতিটি খবর আলাদা ছবিসহ কার্ডে।", "cards", "glass", true),
    variant("rail", "আড়াআড়ি ব্রিফিং রেল", "পাশে সরিয়ে দিনের খবর দেখুন।", "rail", "mosaic", true),
    variant("numbered", "নম্বরযুক্ত সারসংক্ষেপ", "ক্রমানুসারে নম্বর দেওয়া সংক্ষিপ্ত তালিকা।", "stack", "spotlight", true),
    variant("minimal", "সরল ব্রিফিং প্যানেল", "শুধু শিরোনাম ও পড়ার সময়ের সংক্ষিপ্ত রূপ।", "doc", "print", true),
  ], true),
  section("lead", "home", "main", "আজকের প্রধান প্রতিবেদন", "পাঠকের জন্য বাছাই করা প্রধান প্রতিবেদন ও উৎস-যাচাই।", [
    variant("compare", "মূল পোস্ট বনাম প্রতিবেদন", "টেনে মূল পোস্টের সঙ্গে সম্পাদিত খবর মেলান।", "split", "editorial", true),
    variant("magazine", "ম্যাগাজিন স্প্রেড", "বড় শিরোনাম, পুল-কোট ও সম্পাদিত অনুচ্ছেদ।", "doc", "glass", true),
    variant("spotlight", "আলোকিত প্রতিবেদন কার্ড", "মাউস নড়লে আলো অনুসরণ করে এমন ফিচার কার্ড।", "cover", "mosaic", true),
    variant("cover", "চিত্রসহ সংবাদ প্রচ্ছদ", "প্রচ্ছদ ছবি, শিরোনাম ও পড়ার আহ্বান।", "cover", "spotlight", true),
    variant("minimal", "সংক্ষিপ্ত সংবাদ টিজার", "মূল শিরোনাম, উৎস ও যাচাই স্কোরের সংক্ষিপ্ত রূপ।", "stack", "print", true),
  ], true),
  section("latest", "home", "main", "সর্বশেষ প্রতিবেদন", "প্রকাশিত প্রতিবেদন তারিখ, বিষয়, উৎস ও যাচাই-চিহ্নসহ।", [
    variant("grid", "তিন-কলামের সংবাদকার্ড", "সমান কার্ডে শিরোনাম, সারাংশ ও পাঠকসংখ্যা।", "grid", "editorial", true),
    variant("list", "সম্পাদকীয় তালিকা", "নম্বরসহ বড় শিরোনামের পাঠযোগ্য তালিকা।", "stack", "glass", true),
    variant("masonry", "অসম উচ্চতার মোজাইক", "প্রধান খবর বড়, অন্য খবর ছোট কার্ডে।", "grid", "mosaic", true),
    variant("rail", "আড়াআড়ি সংবাদ রেল", "আঙুলে সরানো যায়, প্রতিটি কার্ডে স্ন্যাপ।", "rail", "spotlight", true),
    variant("featured", "একটি প্রধান ও পাশের তালিকা", "একটি বড় প্রতিবেদন, পাশে বাছাই করা শিরোনাম।", "split", "print", true),
  ], true),
  section("home-ad", "home", "major", "হোম পৃষ্ঠার বিজ্ঞাপন", "বিজ্ঞাপনদাতার পরিচয়, লেখা ও লিংক প্রশাসক বদলাতে পারবেন।", [
    variant("banner", "পাতাজোড়া ব্যানার", "পাতার প্রস্থে স্পষ্টভাবে চিহ্নিত বিজ্ঞাপন ব্যানার।", "cover", "editorial", true),
    variant("native", "সংবাদ-ঘেঁষা কার্ড", "প্রতিবেদন-কার্ডের মাঝে আলাদা স্পনসর চিহ্ন।", "cards", "glass", true),
    variant("billboard", "বড় প্রচ্ছদ বিজ্ঞাপন", "বড় বার্তা ও বোতামসহ নজরকাড়া বিজ্ঞাপন।", "cover", "mosaic", true),
    variant("inline", "সংক্ষিপ্ত বিজ্ঞাপন সারি", "সংবাদ-প্রবাহের সঙ্গে মানানসই এক-সারি বিজ্ঞাপন।", "rail", "spotlight", true),
    variant("sponsored", "স্পনসর পরিচিতি প্যানেল", "বিজ্ঞাপনদাতা, বার্তা ও কল-টু-অ্যাকশন এক কার্ডে।", "split", "print", true),
  ], true),
  section("academy", "home", "major", "যাচাই একাডেমি", "হৈচৈর সম্পাদকীয় পদ্ধতি অনুসরণ করে পাঠক নিজেই খবর যাচাই শিখবেন।", [
    variant("checklist", "পাঁচ ধাপের শিক্ষা তালিকা", "ধাপ ধরে টিক দিয়ে অগ্রগতি দেখা যায়, সঙ্গে কুইজ।", "stack", "editorial", true),
    variant("cards", "শিক্ষা কার্ড গ্রিড", "প্রতিটি ধাপ আলাদা কার্ডে বর্ণনা।", "cards", "glass", true),
    variant("quiz", "শুধু কুইজ মোড", "প্রশ্ন-উত্তরে নিজের দক্ষতা যাচাই।", "table", "mosaic", true),
    variant("timeline", "ধাপে ধাপে পথনির্দেশ", "সময়রেখার মতো সাজানো শেখার ধাপ।", "rail", "spotlight", true),
    variant("compact", "সংক্ষিপ্ত সহায়িকা", "এক নজরে যাচাইয়ের নিয়ম।", "doc", "print", true),
  ], true),
  section("categories", "home", "major", "বিষয়ভিত্তিক সংবাদ", "কোন বিষয়ে কত প্রতিবেদন এবং তার অগ্রাধিকার।", [
    variant("donut", "বিষয়-বণ্টন বৃত্ত", "বৃত্তে বিষয়ভিত্তিক অনুপাত ও মোট সংখ্যা।", "donut", "editorial", true),
    variant("chips", "বিষয় ট্যাগ মেঘ", "ট্যাগের আকারে প্রকাশের পরিমাণ বোঝা যায়।", "cards", "glass", true),
    variant("rank", "র‍্যাংক করা বার", "সবচেয়ে বেশি প্রতিবেদন থেকে ক্রমানুসার।", "bars", "mosaic", true),
    variant("tiles", "বিষয়ভিত্তিক রঙিন ঘর", "প্রতিটি বিষয়ের জন্য আলাদা আকারের ঘর।", "grid", "spotlight", true),
    variant("map", "রঙিন পরিসংখ্যান তালিকা", "বিষয়, সংখ্যা ও যাচাই-অগ্রগতির সংক্ষিপ্ত তালিকা।", "table", "print", true),
  ], true),
  section("health", "home", "major", "সাইট ও পাইপলাইনের অবস্থা", "ডেটাবেস, সংগ্রাহক, প্রকাশনা ও পাঠকসংক্রান্ত স্বাস্থ্য।", [
    variant("monitor", "সার্ভিস মনিটর গ্রিড", "প্রতিটি সেবার অবস্থা, গতি ও সক্রিয়তা।", "grid", "editorial", true),
    variant("log", "সাম্প্রতিক রান-লগ", "সময়, কাজ, রেকর্ড ও ফলাফলের তালিকা।", "table", "glass", true),
    variant("service", "সার্ভিস কার্ডের সারি", "মূল সেবাগুলোকে হরাইজন্টাল কার্ডে দেখায়।", "cards", "mosaic", true),
    variant("heatmap", "সাপ্তাহিক সচলতা মানচিত্র", "ঘণ্টা ধরে সাইটের পাঠ ও কার্যকলাপ।", "wave", "spotlight", true),
    variant("uptime", "আপটাইম সূচক", "আপটাইম, প্রতিক্রিয়া ও সতর্কতার সংক্ষিপ্ত বোর্ড।", "gauge", "print", true),
  ], true),
  section("newsletter", "home", "major", "পাঠক বার্তা ও সাবস্ক্রিপশন", "নিয়মিত সম্পাদকীয় সংক্ষিপ্তসার পাওয়ার আমন্ত্রণ।", [
    variant("band", "রঙিন আহ্বান ব্যান্ড", "প্রশস্ত বার্তা ও ইমেইল ফর্ম।", "cover", "editorial", true),
    variant("terminal", "কমান্ড-ধাঁচের ফর্ম", "সাবস্ক্রিপশন ফর্মকে পাঠযোগ্য কনসোল হিসেবে দেখায়।", "log", "glass", true),
    variant("split", "দুই-কলামের আমন্ত্রণ", "বামে উপকারিতা, ডানে ইমেইল ফর্ম।", "split", "mosaic", true),
    variant("editorial", "সম্পাদকীয় চিঠি", "নিউজলেটারকে ব্যক্তিগত চিঠির আবহে দেখায়।", "doc", "spotlight", true),
    variant("minimal", "সংক্ষিপ্ত ইমেইল নিবন্ধন", "কম লেখা, পরিষ্কার ইনপুট ও বোতাম।", "stack", "print", true),
  ], true),
  section("post-hero", "post", "hero", "প্রতিবেদনের শিরোনাম", "প্রতিবেদনের নাম, সারাংশ, বিষয়, সময় ও উৎস।", [
    variant("editorial", "সম্পাদকীয় শিরোনাম", "মধ্যস্থ শিরোনাম ও পরিপাটি প্রকাশ-তথ্য।", "doc", "editorial", true),
    variant("cinema", "ছবিসহ প্রচ্ছদ", "পূর্ণ প্রস্থের ছবি ও নিচে শিরোনাম।", "cover", "glass", true),
    variant("compact", "সংক্ষিপ্ত তথ্য-কার্ড", "হ্যাশ, বিভাগ ও শিরোনামের সংক্ষিপ্ত বিন্যাস।", "log", "mosaic", true),
    variant("cover", "বড় সংবাদ প্রচ্ছদ", "শিরোনাম, সারাংশ ও পাঠ-পরিসংখ্যান একসঙ্গে।", "split", "spotlight", true),
    variant("center", "কেন্দ্রিত শিরোনাম", "সাদা-জায়গাসহ বড় বাংলা শিরোনাম ও লেখক-তথ্য।", "doc", "print", true),
  ], true),
  section("post-factbar", "post", "hero", "যাচাইয়ের আস্থা ও উৎস", "ফ্যাক্ট-গেট, মূল উৎস, লেখক এবং প্রতিবেদন-পরিচিতি।", [
    variant("trust", "আস্থার বৃত্ত", "স্কোর, যাচাইয়ের ধাপ ও উৎস লিংক।", "gauge", "editorial", true),
    variant("card", "তথ্য-পরিচয় কার্ড", "উৎস, লেখক, হ্যাশ ও যাচাই স্কোর আলাদা কার্ডে।", "cards", "glass", true),
    variant("chips", "তথ্য-পরিচয় চিপ", "লেখক, সময়, উৎস ও পড়ার সময় ছোট চিপে।", "rail", "mosaic", true),
    variant("bar", "যাচাই অগ্রগতি বার", "প্রতিটি যাচাই ধাপের অগ্রগতি ধারাবাহিক বারে।", "bars", "spotlight", true),
    variant("audit", "সম্পাদকীয় যাচাই নথি", "স্কোরের সঙ্গে যাচাইয়ের নথিভিত্তিক সারাংশ।", "table", "print", true),
  ], true),
  section("post-tools", "post", "hero", "পাঠকের পড়ার সরঞ্জাম", "প্রতিবেদন শোনা, লেখা বড়-ছোট করা, সংরক্ষণ, উদ্ধৃতি কপি ও প্রিন্ট।", [
    variant("bar", "সম্পূর্ণ সরঞ্জাম বার", "শোনা, লেখার মাপ, সংরক্ষণ, উদ্ধৃতি, লিংক, ভাগ ও প্রিন্ট।", "dock", "editorial", true),
    variant("floating", "ভাসমান সরঞ্জাম", "পাঠের পাশে ভাসমান ছোট সরঞ্জাম প্যানেল।", "dock", "glass", true),
    variant("inline", "সংক্ষিপ্ত সরঞ্জাম সারি", "শুধু প্রয়োজনীয় বোতামগুলো এক সারিতে।", "rail", "mosaic", true),
    variant("sidebar", "পাশের সরঞ্জাম কলাম", "উল্লম্ব সরঞ্জাম, বাম পাশে স্থির।", "stack", "spotlight", true),
    variant("compact", "ন্যূনতম নিয়ন্ত্রণ", "শুধু শোনা ও লেখার মাপ — কম বিভ্রান্তি।", "cards", "print", true),
  ], true),
  section("post-glance", "post", "main", "এক নজরে মূল তথ্য", "প্রতিবেদনের গুরুত্বপূর্ণ বিষয় পাঠকের সামনে সহজভাবে তুলে ধরে।", [
    variant("glance", "নম্বরযুক্ত মূল পয়েন্ট", "প্রতিটি তথ্য আলাদা পাঠযোগ্য কার্ডে।", "cards", "editorial", true),
    variant("callout", "উদ্ধৃতি ও সারাংশ", "প্রধান উদ্ধৃতির পাশে সংক্ষিপ্ত সারাংশ।", "doc", "glass", true),
    variant("accordion", "খুলে দেখার তালিকা", "প্রশ্নে চাপ দিলে উত্তর খুলবে।", "stack", "mosaic", true),
    variant("checklist", "যাচাইযোগ্য তথ্য তালিকা", "প্রতিটি তথ্যের পাশে সম্পন্ন চিহ্ন।", "table", "spotlight", true),
    variant("summary", "এক প্যারার সারাংশ", "সংক্ষিপ্ত অনুচ্ছেদ ও তিনটি হাইলাইট।", "split", "print", true),
  ], true),
  section("post-body", "post", "main", "সম্পূর্ণ প্রতিবেদন", "পুনর্লিখিত প্রতিবেদন, উদ্ধৃতি, দলিল ও অনুচ্ছেদ।", [
    variant("toc", "বিষয়সূচিসহ পাঠ", "পাশে স্টিকি বিষয়সূচি ও পড়ার অগ্রগতি।", "split", "editorial", true),
    variant("longform", "দীর্ঘ সম্পাদকীয় পাঠ", "এক-কলাম, বড় বাংলা টাইপ ও সূচনায় ড্রপ-ক্যাপ।", "doc", "glass", true),
    variant("blocks", "তথ্য-খণ্ড বিন্যাস", "প্রতিটি অনুচ্ছেদ ও উদ্ধৃতি আলাদা ব্লকে।", "cards", "mosaic", true),
    variant("magazine", "ম্যাগাজিন পাঠরূপ", "শিরোনাম, উপ-শিরোনাম ও উদ্ধৃতির দৃশ্যমান বিরতি।", "cover", "spotlight", true),
    variant("focus", "বিক্ষেপহীন পাঠ", "সরল প্রশস্ত কলাম, বড় অক্ষর ও পড়ার সূচক।", "stack", "print", true),
  ], true),
  section("post-lesson", "post", "major", "পড়া শেষে শেখার উপকরণ", "সম্পূর্ণ পড়ার পর মূল শিক্ষা, ভাবনার প্রশ্ন ও করণীয় দেখাবে।", [
    variant("cards", "শিক্ষার কার্ড", "তিনটি শিক্ষা ও শেষে ভাবনার প্রশ্ন।", "cards", "editorial", true),
    variant("quiz", "নিজেকে যাচাই করুন", "ছোট প্রশ্ন ও উত্তর মিলিয়ে শেখা মনে রাখুন।", "table", "glass", true),
    variant("checklist", "করণীয় তালিকা", "খবর থেকে শেখার ব্যবহারিক পদক্ষেপ।", "stack", "mosaic", true),
    variant("journal", "ভাবনার ডায়েরি", "প্রতিফলনমূলক প্রশ্ন ও নিজস্ব নোটের জায়গা।", "doc", "spotlight", true),
    variant("fieldguide", "পাঠকের সহায়িকা", "মূল শিক্ষা, সতর্কতা ও দায়িত্বরত সূত্র।", "cover", "print", true),
  ], true),
  section("post-ad", "post", "major", "প্রতিবেদনের মাঝের বিজ্ঞাপন", "প্রতিবেদনের পরে বা মাঝখানে আলাদা করে চিহ্নিত স্পনসর বিজ্ঞাপন।", [
    variant("banner", "পাতাজোড়া ব্যানার", "সম্পাদিত প্রতিবেদনের মাঝে পূর্ণ প্রস্থ বিজ্ঞাপন।", "cover", "editorial", true),
    variant("native", "সংবাদ-ঘেঁষা কার্ড", "প্রতিবেদন কার্ডের সঙ্গে সামঞ্জস্যপূর্ণ স্পনসর বাক্স।", "cards", "glass", true),
    variant("billboard", "বড় প্রচ্ছদ বিজ্ঞাপন", "শিরোনাম ও বোতামসহ আলাদা বড় প্রচারপ্যানেল।", "cover", "mosaic", true),
    variant("inline", "সংক্ষিপ্ত অনুচ্ছেদ বিজ্ঞাপন", "পাঠের প্রবাহের পাশে ছোট বিজ্ঞাপন।", "rail", "spotlight", true),
    variant("sponsored", "স্পনসর পরিচিতি প্যানেল", "বিজ্ঞাপনদাতার পরিচয় ও বার্তাকে স্পষ্ট করে।", "split", "print", true),
  ], true),
  section("post-timeline", "post", "main", "ঘটনার সময়রেখা", "ঘটনার গুরুত্বপূর্ণ মুহূর্তগুলো সময়ক্রমে দেখায়।", [
    variant("vertical", "উল্লম্ব ঘটনাপথ", "বাম পাশের সময়রেখায় ধাপে ধাপে ঘটনা।", "rail", "editorial", true),
    variant("horizontal", "আড়াআড়ি সময়রেখা", "পাশে সরিয়ে সময় ও ঘটনা পড়ুন।", "stack", "glass", true),
    variant("cards", "ঘটনা-কার্ড গ্রিড", "প্রতিটি সময়কে আলাদা বড় কার্ডে দেখায়।", "cards", "mosaic", true),
    variant("table", "তারিখভিত্তিক সারণি", "ঘটনা, সময় ও ব্যাখ্যা পরিষ্কার সারিতে।", "table", "spotlight", true),
    variant("process", "সংখ্যাযুক্ত ধাপ", "প্রতিটি ঘটনাকে অগ্রগতির ধাপ হিসেবে দেখায়।", "funnel", "print", true),
  ], true),
  section("post-verify", "post", "major", "সূত্র ও দাবি যাচাই", "যে তথ্যগুলো যাচাই, আংশিক যাচাই বা বাতিল হয়েছে তার বিবরণ।", [
    variant("panel", "যাচাইয়ের পূর্ণ প্যানেল", "দাবি, সিদ্ধান্ত, ব্যাখ্যা ও মূল উৎস।", "grid", "editorial", true),
    variant("inline", "সংক্ষিপ্ত উৎস-টীকা", "লেখার শেষে সূত্র ও হ্যাশের এক লাইনের তথ্য।", "stack", "glass", true),
    variant("audit", "সম্পাদকীয় নিরীক্ষা সারণি", "প্রতিটি দাবির পাশে যাচাইয়ের ফল ও কারণ।", "table", "mosaic", true),
    variant("source", "উৎস-নথি কার্ড", "মূল উৎস, প্রকাশক ও সংরক্ষিত স্ক্রিনশটের পরিচয়।", "doc", "spotlight", true),
    variant("timeline", "যাচাইয়ের ধাপপথ", "উৎস শনাক্ত থেকে প্রকাশ পর্যন্ত পর্যালোচনা।", "rail", "print", true),
  ], true),
  section("post-analytics", "post", "main", "প্রতিবেদনের পাঠক-পরিসংখ্যান", "ভিউ, প্রতিক্রিয়া, পাঠ-সময় ও পাঠকের আগ্রহের চার্ট।", [
    variant("dashboard", "এনগেজমেন্ট ড্যাশবোর্ড", "ভিউরেখা, প্রতিক্রিয়া ও পাঠ-সময়ের চার্ট।", "grid", "editorial", true),
    variant("spark", "সংক্ষিপ্ত প্রবণতা টাইল", "চারটি সংখ্যা ও ছোট স্পার্কলাইন।", "bars", "glass", true),
    variant("radar", "টোন ও অনুভূতি চার্ট", "লেখার টোন এবং পাঠকের প্রতিক্রিয়ার রাডার।", "radar", "mosaic", true),
    variant("trend", "সময়ভিত্তিক প্রবণতা", "প্রকাশের পর পাঠকসংখ্যার পরিবর্তন।", "wave", "spotlight", true),
    variant("scorecards", "সম্পৃক্ততার সূচক কার্ড", "পাঠ, ভাগ, মন্তব্য ও সম্পূর্ণ পড়ার হার।", "cards", "print", true),
  ], true),
  section("post-comments", "post", "major", "পাঠকের মন্তব্য", "পাঠক নামসহ মন্তব্য করতে পারবেন; নতুন মন্তব্য সরাসরি তালিকায় দেখা যাবে।", [
    variant("thread", "সম্পাদকীয় আলোচনা", "নাম, সময় ও মন্তব্যের সরল তালিকা।", "stack", "editorial", true),
    variant("cards", "মন্তব্য কার্ড", "প্রতিটি মন্তব্য আলাদা সীমারেখার কার্ডে।", "cards", "glass", true),
    variant("bubbles", "কথোপকথন বুদ্‌বুদ", "আলাপের মতো বাম-ডান বুদ্‌বুদ বিন্যাস।", "rail", "mosaic", true),
    variant("compact", "সংক্ষিপ্ত মন্তব্য বাক্স", "কম জায়গায় মন্তব্য ও ফর্ম পাশাপাশি।", "split", "spotlight", true),
    variant("editorial", "পাঠকের মতামত", "প্রধান পাঠক-মতকে বড় টাইপে তুলে ধরে।", "doc", "print", true),
  ], true),
  section("post-report", "post", "major", "প্রতিবেদনে ভুল জানান", "ভুল তথ্য, সূত্র বা উপস্থাপনা থাকলে পাঠক সম্পাদককে জানাতে পারবেন।", [
    variant("panel", "সম্পাদককে জানান কার্ড", "বিষয় নির্বাচন ও ব্যাখ্যার ফর্ম।", "cards", "editorial", true),
    variant("inline", "সংক্ষিপ্ত ভুল-জানানো বার", "পাঠ শেষে ছোট ফর্ম খোলার বোতাম।", "rail", "glass", true),
    variant("steps", "ধাপে ধাপে প্রতিবেদন", "কারণ, বিবরণ ও যোগাযোগের ধাপে ফর্ম।", "funnel", "mosaic", true),
    variant("drawer", "পাশ থেকে খোলা ফর্ম", "বোতামে চাপলে সহায়তা প্যানেল খোলে।", "split", "spotlight", true),
    variant("checklist", "যাচাই প্রতিবেদন ফর্ম", "সমস্যার ধরন চিহ্নিত করে পাঠানোর বিন্যাস।", "table", "print", true),
  ], true),
  section("post-share", "post", "major", "ভাগ করুন ও প্রতিক্রিয়া দিন", "প্রতিবেদন ভাগ করা, লিংক কপি ও পাঠকের প্রতিক্রিয়া।", [
    variant("rail", "ভাসমান ভাগ-বার", "বড় পর্দায় পাশের ভাসমান বোতাম।", "rail", "editorial", true),
    variant("bar", "লেখার নিচে ভাগ-বার", "প্রতিক্রিয়া, কপি ও সামাজিক ভাগের সারি।", "dock", "glass", true),
    variant("floating", "গোল ভাসমান বোতাম", "পর্দার প্রান্তে কমপ্যাক্ট শেয়ার নিয়ন্ত্রণ।", "dock", "mosaic", true),
    variant("compact", "ছোট প্রতিক্রিয়া কার্ড", "কম জায়গায় প্রতিক্রিয়া ও লিংক কপি।", "cards", "spotlight", true),
    variant("sticky", "নিচের স্থির ভাগ-বার", "মোবাইল পাঠকের জন্য নিচে স্থির ভাগ-নিয়ন্ত্রণ।", "split", "print", true),
  ], true),
  section("post-related", "post", "major", "আরও পড়ুন", "একই বিষয় বা সম্পাদকীয় বিভাগের সম্পর্কিত প্রতিবেদন।", [
    variant("grid", "সম্পর্কিত প্রতিবেদন গ্রিড", "তিনটি সমান কার্ডে সম্পর্কিত খবর।", "grid", "editorial", true),
    variant("rail", "আড়াআড়ি সংবাদ রেল", "পাশে সরিয়ে সম্পর্কিত প্রতিবেদন দেখুন।", "rail", "glass", true),
    variant("stack", "শিরোনামের তালিকা", "বড় নম্বরসহ পরের প্রতিবেদনগুলো।", "stack", "mosaic", true),
    variant("carousel", "একটি প্রধান কার্ড ও রেল", "প্রথম খবরকে বড় করে, পাশে বাকিগুলো।", "split", "spotlight", true),
    variant("feature", "সম্পাদকীয় সুপারিশ", "বাছাই করা প্রতিবেদনের বড় সুপারিশ বাক্স।", "cover", "print", true),
  ], true),
];

export const ZONE_LABELS: Record<SectionZone, { bn: string; en: string }> = {
  header: { bn: "শিরোনাম ও নেভিগেশন", en: "Header" },
  hero: { bn: "প্রধান পরিচিতি", en: "Hero" },
  main: { bn: "প্রধান বিষয়বস্তু", en: "Main content" },
  major: { bn: "বিশেষ অংশ", en: "Featured sections" },
  footer: { bn: "সাইটের শেষাংশ", en: "Footer" },
};

export const SCOPE_LABELS: Record<SectionScope, { bn: string; en: string }> = {
  global: { bn: "সব পৃষ্ঠা", en: "Global" },
  home: { bn: "হোম পৃষ্ঠা", en: "Home" },
  post: { bn: "প্রতিবেদন পৃষ্ঠা", en: "Post" },
};

export function getSectionMeta(key: string): SectionMeta | undefined {
  return SECTION_REGISTRY.find((s) => s.key === key);
}

export function sectionsForScope(scope: SectionScope): SectionMeta[] {
  return SECTION_REGISTRY.filter((s) => s.scope === scope || s.scope === "global");
}

/** Presentation skin for a (section key, variant id) pair; default `"editorial"`. */
export function getVariantSkin(sectionKey: string, variant: string): DesignSkin {
  return getSectionMeta(sectionKey)?.variants.find((v) => v.id === variant)?.skin ?? "editorial";
}

/**
 * Whole-site looks (from the multi-style-web-mockup). Each preset assigns a
 * variant id to every section so the entire page can be restyled in one action.
 */
export const PRESETS: Preset[] = [
  {
    id: "newsroom",
    name: "সংবাদকক্ষের উষ্ণ অন্ধকার",
    nameEn: "Newsroom dark",
    blurb: "জরুরি সংবাদ, লাইভ তথ্যচিত্র ও সম্পাদকীয় কার্ডের সুষম বিন্যাস।",
    accent: "#ff5c38",
    values: {
      ticker: "breaking", navbar: "newsroom", footer: "mega", hero: "split", kpi: "counters",
      insights: "matrix", wire: "stream", briefing: "accordion", academy: "checklist",
      pipeline: "flow", lead: "compare", latest: "grid", "home-ad": "native",
      categories: "donut", health: "monitor", newsletter: "band", "post-hero": "editorial",
      "post-tools": "bar",
      "post-factbar": "trust", "post-glance": "glance", "post-body": "toc", "post-lesson": "cards",
      "post-ad": "native", "post-timeline": "vertical", "post-verify": "panel",
      "post-analytics": "dashboard", "post-comments": "thread", "post-report": "panel",
      "post-share": "rail", "post-related": "grid",
    },
  },
  {
    id: "editorial",
    name: "বাংলা সম্পাদকীয়",
    nameEn: "Bangla editorial",
    blurb: "বাংলা টাইপ, দীর্ঘপাঠ, শিরোনামভিত্তিক তালিকা ও শান্ত রঙ।",
    accent: "#f5a524",
    values: {
      ticker: "notice", navbar: "mono", footer: "slab", hero: "center", kpi: "ledger",
      insights: "area", wire: "ledger", briefing: "numbered", academy: "timeline",
      pipeline: "blueprint", lead: "magazine", latest: "list", "home-ad": "banner",
      categories: "rank", health: "log", newsletter: "editorial", "post-hero": "center",
      "post-tools": "inline",
      "post-factbar": "audit", "post-glance": "callout", "post-body": "longform", "post-lesson": "journal",
      "post-ad": "inline", "post-timeline": "horizontal", "post-verify": "inline",
      "post-analytics": "trend", "post-comments": "editorial", "post-report": "inline",
      "post-share": "bar", "post-related": "stack",
    },
  },
  {
    id: "data",
    name: "তথ্য ও পরিসংখ্যান",
    nameEn: "Data visualisation",
    blurb: "চার্ট, পরিসংখ্যান, পাইপলাইন ও যাচাই-নথিকে সামনে আনে।",
    accent: "#22a7e6",
    values: {
      ticker: "datafeed", navbar: "glass", footer: "terminal", hero: "terminal", kpi: "rings",
      insights: "dashboard", wire: "console", briefing: "minimal", academy: "quiz",
      pipeline: "terminal", lead: "minimal", latest: "featured", "home-ad": "sponsored",
      categories: "map", health: "uptime", newsletter: "minimal", "post-hero": "compact",
      "post-tools": "compact",
      "post-factbar": "bar", "post-glance": "checklist", "post-body": "focus", "post-lesson": "checklist",
      "post-ad": "sponsored", "post-timeline": "table", "post-verify": "audit",
      "post-analytics": "scorecards", "post-comments": "compact", "post-report": "checklist",
      "post-share": "compact", "post-related": "feature",
    },
  },
  {
    id: "cinema",
    name: "সিনেম্যাটিক প্রচ্ছদ",
    nameEn: "Cinematic",
    blurb: "বড় ছবি, আলোকিত প্রচ্ছদ, মোজাইক আর ফিচার-ধাঁচের প্রতিবেদন।",
    accent: "#a78bfa",
    values: {
      ticker: "bulletin", navbar: "split", footer: "linkgrid", hero: "cinema", kpi: "glass",
      insights: "treemap", wire: "cards", briefing: "cards", academy: "cards",
      pipeline: "funnel", lead: "cover", latest: "masonry", "home-ad": "billboard",
      categories: "tiles", health: "heatmap", newsletter: "split", "post-hero": "cinema",
      "post-tools": "floating",
      "post-factbar": "chips", "post-glance": "summary", "post-body": "magazine", "post-lesson": "fieldguide",
      "post-ad": "billboard", "post-timeline": "cards", "post-verify": "source",
      "post-analytics": "radar", "post-comments": "bubbles", "post-report": "drawer",
      "post-share": "floating", "post-related": "carousel",
    },
  },
];

/** Accent colours offered in the appearance panel. */
export const ACCENTS: AccentPreset[] = [
  { id: "ember", hex: "#ff5c38", name: "কমলা-লাল" },
  { id: "gold", hex: "#f5a524", name: "সোনালি" },
  { id: "mint", hex: "#4ade80", name: "সবুজ" },
  { id: "azure", hex: "#22a7e6", name: "নীল" },
  { id: "violet", hex: "#a78bfa", name: "বেগুনি" },
  { id: "rose", hex: "#fb7185", name: "গোলাপি" },
];

/* ------------------------- media storage config ------------------------- */

/** Provider kinds supported by the media uploader. */
export type MediaStorageKind = "github" | "s3";

/** One entry in the uploader's fallback chain. */
export interface MediaStorageAdapterConfig {
  kind: MediaStorageKind;
  /** `false` = excluded from the upload/cleanup chain. */
  enabled: boolean;
  /** Human label shown in settings (e.g. "GitHub", "IDrive e2", "Backblaze B2"). */
  label: string;
  /** S3-compatible providers. */
  provider?: "idrivee2" | "backblaze";
  /** S3 endpoint (e.g. https://idrivee2.com / https://s3.us-west-004.backblazeb2.com). */
  endpoint?: string;
  /** S3 bucket name. */
  bucket?: string;
  /** S3 signing region (default auto-us-east-1 for both providers). */
  region?: string;
  /** Object key prefix inside the bucket (default `media/`). */
  prefix?: string;
  /** GitHub-only: branch to push to (default `main`). */
  branch?: string;
  /** GitHub-only: repo path prefix (default `media/`). */
  mediaPath?: string;
}

/** Full remote-media storage policy (stored in settings.media_storage_json). */
export interface MediaStorageConfig {
  /** Adapters in priority order — index 0 is the primary upload target. */
  adapters: MediaStorageAdapterConfig[];
  /** Delete local copies after a successful remote upload. */
  purge_local_after_upload: boolean;
  /** Delete remote objects older than this many months during cleanup. */
  retention_months: number;
  /** Whether scheduled cleanup is enabled (monthly pass in the runner). */
  cleanup_enabled: boolean;
}

/** One scrape/upload failure row surfaced by the error inbox. */
export interface SourceError {
  id: string;
  source_id: string;
  err_kind: string;
  message: string;
  status: "open" | "dismissed";
  count: number;
  first_seen_at: string;
  last_seen_at: string;
}

/* ------------------------- maintenance page ------------------------ */

/** Visual theme for the public maintenance screen. */
export type MaintenanceThemeId = "editorial" | "newsprint" | "midnight" | "aurora";

/** Locale the maintenance screen renders in (bn default). */
export type MaintenanceLocale = "bn" | "en";

/** The four hero-copy slots of the maintenance screen (badge/headline/sub/body). */
export interface MaintenanceCopy {
  badge: string;
  headline: string;
  subheadline: string;
  body: string;
}

export interface MaintenanceCountdown {
  enabled: boolean;
  /** ISO timestamp the countdown counts down to. */
  target: string;
}

export interface MaintenanceProgress {
  enabled: boolean;
  /** 0..100 sync-progress readout. */
  value: number;
}

export interface MaintenanceSchedule {
  enabled: boolean;
  start: string;
  end: string;
  /** Show the live front page once the window passes, regardless of mode. */
  autoLive: boolean;
}

export interface MaintenanceSocials {
  facebook: string;
  x: string;
  instagram: string;
  youtube: string;
  github: string;
  linkedin: string;
}

export interface MaintenanceEffects {
  grain: boolean;
  particles: boolean;
  marquee: boolean;
}

interface MaintenanceColors {
  bg: string;
  surface: string;
  text: string;
  primary: string;
  accent: string;
}

export interface MaintenanceSeo {
  title: string;
  description: string;
  noIndex: boolean;
}

/**
 * Design + copy configuration for the public maintenance screen. Nested under
 * `SiteAppConfig.maintenance` inside `settings.app_config_json` (no schema
 * change) and edited from the web admin "রক্ষণাবেক্ষণ" tab.
 */
export interface MaintenanceSiteConfig {
  theme: MaintenanceThemeId;
  language: MaintenanceLocale;
  brand: {
    mark: string;
    name: string;
    nameBn: string;
  };
  copyBn: MaintenanceCopy;
  copyEn: MaintenanceCopy;
  footerNoteBn: string;
  footerNoteEn: string;
  countdown: MaintenanceCountdown;
  progress: MaintenanceProgress;
  showPipeline: boolean;
  showStats: boolean;
  showTicker: boolean;
  tickerBn: string[];
  tickerEn: string[];
  showNewsletter: boolean;
  newsletterNoteBn: string;
  newsletterNoteEn: string;
  showContact: boolean;
  contactEmail: string;
  contactPhone: string;
  socialsEnabled: boolean;
  socials: MaintenanceSocials;
  schedule: MaintenanceSchedule;
  effects: MaintenanceEffects;
  colors: MaintenanceColors;
  seo: MaintenanceSeo;
}

/** Default maintenance-screen blueprint (editorial theme, Bengali first). */
export function defaultMaintenanceConfig(): MaintenanceSiteConfig {
  return {
    theme: "editorial",
    language: "bn",
    brand: { mark: "হ", name: "HOICHOI।", nameBn: "হৈচৈ।" },
    copyBn: {
      badge: "জরুরি আপডেট",
      headline: "ছাপাখানা থামেনি — কালি বদলাচ্ছে",
      subheadline: "হৈচৈ পাইপলাইন যাচাই করছে — একটু পরেই ফিরছি",
      body: "কালেক্টর সিঙ্ক হচ্ছে, Turso-তে হ্যাশ মিলিয়ে দেখা হচ্ছে আর এজ ক্যাশ গরম হচ্ছে। আপনার পড়ার তালিকা নিরাপদে আছে। ইমেইল রেখে যান — প্রথম পাতা লাইভ হওয়ামাত্র জানিয়ে দেব।",
    },
    copyEn: {
      badge: "Scheduled maintenance",
      headline: "The newsroom is reloading the press",
      subheadline: "Hoichoi is verifying the pipeline — back in a moment",
      body: "We are syncing the collector, re-checking hashes and warming the edge cache. Your reading list is safe. Leave your email and we will ping you the second the front page is live again.",
    },
    footerNoteBn: "© ২০২৬ হৈচৈ · BUGSFREE STUDIO · ASIA/UTC+6 · EDGE CACHE ON",
    footerNoteEn: "© 2026 Hoichoi · BUGSFREE STUDIO · ASIA/UTC+6 · EDGE CACHE ON",
    countdown: { enabled: false, target: "" },
    progress: { enabled: true, value: 68 },
    showPipeline: true,
    showStats: true,
    showTicker: true,
    tickerBn: ["ডেটা যাচাই চলছে", "হৈচৈ নিউজরুম", "মানব পর্যালোচনা", "ফিড → শট → হ্যাশ → LLM → গিট → ডিপ্লয়"],
    tickerEn: ["DATA VERIFICATION IN PROGRESS", "HOICHOI NEWSROOM", "HUMAN REVIEW", "FEED → SHOT → HASH → LLM → GIT → DEPLOY"],
    showNewsletter: true,
    newsletterNoteBn: "ফিরে এলে জানিয়ে দেব — স্প্যাম নয়, এক ক্লিকে আনসাবস্ক্রাইব।",
    newsletterNoteEn: "Get notified when we're back. No spam, unsubscribe in a click.",
    showContact: true,
    contactEmail: "contact@hoichoi.local",
    contactPhone: "",
    socialsEnabled: true,
    socials: {
      facebook: "",
      x: "",
      instagram: "",
      youtube: "",
      github: "",
      linkedin: "",
    },
    schedule: { enabled: false, start: "", end: "", autoLive: true },
    effects: { grain: true, particles: true, marquee: true },
    colors: {
      bg: "#f3eee1",
      surface: "#ffffff",
      text: "#1a140d",
      primary: "#d2202c",
      accent: "#c8f65d",
    },
    seo: {
      title: "হৈচৈ · রক্ষণাবেক্ষণ চলছে — শীঘ্রই ফিরছি",
      description: "হৈচৈ নিউজরুম এখন পাইপলাইন যাচাই করছে। প্রথম পাতা লাইভ হওয়ামাত্র জানতে ইমেইল রেখে যান।",
      noIndex: true,
    },
  };
}

/**
 * One admin-managed footer social/contact link. Rendered below the footer's
 * about paragraph; icon is a short key the web/desktop map to an inline SVG.
 */
export interface FooterSocialLink {
  /** Accessible label + tooltip. */
  label: string;
  /** Absolute URL (opened in a new tab). */
  url: string;
  /** Icon key: facebook | x | youtube | instagram | tiktok | linkedin | whatsapp | telegram | github | rss | mail | link. */
  icon: string;
}

/** Web-app visibility + behaviour knobs (stored in settings.app_config_json). */
export interface SiteAppConfig {  /** Masthead "newsroom in numbers" hero section. */
  show_hero: boolean;
  /** Live analytics graph strip. */
  show_live_graph: boolean;
  /** Category chips row under the hero. */
  show_categories: boolean;
  /** Ad slots (`false` = fully hide, not placeholder). */
  show_ads: boolean;
  /** Rewrite-engine showcase block. */
  show_rewrite_engine: boolean;
  /** Site footer. */
  show_footer: boolean;
  /** When true the public site shows a maintenance screen; signed-in admins
   *  keep full access (admin bypass), and the site is de-indexed meanwhile. */
  maintenance_mode: boolean;
  /** When true (and a Gemini GOOGLE_API_KEY is present) the collector
   *  generates an AI hero image for posts that have no media at all. */
  ai_hero_images: boolean;
  /** Default theme seeded before hydration (`light` | `dark`). */
  theme_default: "light" | "dark";
  /** New-posts surge threshold used by the live graph. */
  surge_threshold: number;
  /** How many posts the home page list shows per page (12/14/16/20/custom). */
  home_post_count: number;
  /** How many same-category posts the article page shows under it. */
  detail_similar_count: number;
  /** How many approved comments a post page shows at once. */
  comments_show_count: number;
  /** Nested maintenance-screen design + copy. */
  maintenance: MaintenanceSiteConfig;
  /** Admin-managed footer social/contact links (empty = none shown). */
  footer_socials: FooterSocialLink[];
}

/** App-config defaults (shared by the DB, the web admin and the desktop). */
export const DEFAULT_APP_CONFIG: SiteAppConfig = {
  show_hero: true,
  show_live_graph: true,
  show_categories: true,
  show_ads: true,
  show_rewrite_engine: true,
  show_footer: true,
  maintenance_mode: false,
  ai_hero_images: true,
  theme_default: "light",
  surge_threshold: 12,
  home_post_count: 12,
  detail_similar_count: 3,
  comments_show_count: 10,
  maintenance: defaultMaintenanceConfig(),
  footer_socials: [],
};

/** Tone of an announcement. `alert` is the most urgent (used by the special
 * notice); all map to the same tone tokens as the safety/status chips.
 */
export type NoticeTone = "info" | "success" | "warn" | "alert";

/** A single admin sign-in attempt (web code login). */
export interface AdminLoginLog {
  id: string;
  email: string;
  ok: boolean;
  ip: string | null;
  user_agent: string | null;
  message: string | null;
  created_at: string;
}

/** Paginated slice of the admin login log. */
export interface LoginLogPage {
  rows: AdminLoginLog[];
  total: number;
  page: number;
  pages: number;
}

/** An announcement/notification shown to web visitors (bell + banner). */
export interface Notice {
  id: string;
  title: string;
  body: string | null;
  tone: NoticeTone;
  /** Optional link opened when the visitor taps the notice. */
  url: string | null;
  /** Pinned notices promote to the header "special notice" banner. */
  pinned: boolean;
  is_active: boolean;
  /** Auto-hide after this ISO time (null = no expiry). */
  expires_at: string | null;
  /** creator: "desktop" | "web". */
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface StatsSnapshot {
  collectedToday: number;
  duplicatesBlocked: number;
  dedupRate: number;
  lastRunStatus: "success" | "failed" | "never";
  published: number;
  pendingReview: number;
  avgRunDurationSec: number;
  byCategory: Record<CategorySlug, number>;
}

/* ---------- live analytics (home "newsroom in numbers" graph) ---------- */

export type AnalyticsRange = "24h" | "7d" | "all";

export interface AnalyticsPoint {
  at: string;
  collected: number;
  published: number;
}

/** Public aggregate snapshot served by GET /api/stats and the live home graph. */
export interface AnalyticsSnapshot {
  ok: true;
  generatedAt: string;
  range: AnalyticsRange;
  from: string;
  to: string;
  database: { driver: string; mode: "local" | "cloud"; latencyMs: number };
  totals: {
    collected: number;
    published: number;
    duplicates: number;
    approvedComments: number;
    pendingArticles: number;
  };
  allArticles: { published: number; pending: number; duplicate: number };
  /** Published-post distribution by active category — labelled from `category_configs`. */
  categories: { key: string; name: string; dot: string; count: number }[];
  series: AnalyticsPoint[];
  sources: { watching: number; paused: number; error: number; total: number };
  collector: {
    status: "working" | "ready" | "error" | "offline" | "not_connected";
    lastSeenAt: string | null;
  };
  latestPublication: string | null;
  activity: {
    id: string;
    kind: "article" | "comment";
    text: string;
    at: string;
    href: string;
  }[];
  runSummary: { count: number; durationSec: number | null; lastAt: string | null };
}

/* ---------- first-party traffic telemetry (admin analytics groups) ---------- */

/** Period selector for the traffic analytics groups (day / week / month). */
export type TrafficRange = "24h" | "7d" | "30d";

/** A country bucket with an ISO-2 code and a flag emoji. */
export interface TrafficCountry {
  country: string;
  countryCode: string;
  flag: string;
  count: number;
}

/** One most-read content row with its top countries. */
export interface TrafficTopContent {
  postId: string | null;
  title: string;
  slug: string;
  href: string;
  views: number;
  countries: TrafficCountry[];
}

/** A comment row with its parent post resolved for linking. */
export interface TrafficCommentRow {
  id: string;
  author: string;
  body: string;
  postTitle: string;
  postSlug: string;
  href: string;
  likes: number;
  createdAt: string;
}

/** Ranked breakdown bucket (OS / browser / device). */
export interface TrafficBucket {
  key: string;
  count: number;
}

/**
 * Cookie-less traffic snapshot powering the five admin analytics groups:
 * live visitors, most-read content, comments, page-view/OS/browser breakdown,
 * and ad views.
 */
export interface TrafficSnapshot {
  ok: true;
  generatedAt: string;
  range: TrafficRange;
  from: string;
  to: string;
  /** Group 1 — visitors online right now (last N minutes). */
  online: {
    visitors: number;
    windowMin: number;
    countries: TrafficCountry[];
  };
  /** Group 1b — unique visitors + page views over the selected range. */
  visitors: {
    total: number;
    pageViews: number;
    countries: TrafficCountry[];
  };
  /** Group 2 — hottest / most-read content with counters + countries. */
  topContent: TrafficTopContent[];
  /** Group 3 — comment totals, recent, and most popular. */
  comments: {
    total: number;
    recent: TrafficCommentRow[];
    popular: TrafficCommentRow[];
  };
  /** Group 4 — page views, bounce, and OS / browser / device mix. */
  traffic: {
    pageViews: number;
    sessions: number;
    bounced: number;
    bounceRate: number;
    os: TrafficBucket[];
    browser: TrafficBucket[];
    devices: TrafficBucket[];
  };
  /** Group 5 — ad slot views / clicks / CTR. */
  ads: {
    views: number;
    clicks: number;
    ctr: number;
    bySlot: { slot: string; views: number; clicks: number; ctr: number }[];
    byPost: {
      postId: string | null;
      title: string;
      slug: string;
      href: string;
      views: number;
      clicks: number;
    }[];
  };
}

export type CommentStatus = "pending" | "approved" | "blocked";

export interface Comment {
  id: string;
  post_id: string;
  author: string;
  body: string;
  /** Optional — collected on the public form, never shown publicly. */
  email?: string | null;
  likes: number;
  dislikes: number;
  status: CommentStatus;
  created_at: string;
}

/** A comment joined with its parent post (used by the moderation queue). */
export interface CommentWithPost extends Comment {
  postTitle: string | null;
  postCategory: string | null;
}