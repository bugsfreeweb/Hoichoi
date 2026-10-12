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
 * Section variant engine (scaffold). Each entry maps a public-site section to
 * the variants that can render it. The current implementation ships only the
 * `"default"` variant — the design that is live today — so switching a section
 * never changes the rendered output until a mockup variant is ported.
 */
export type SectionScope = "global" | "home" | "post";
export type SectionZone = "header" | "hero" | "main" | "major" | "footer";

/** The one variant that is guaranteed to exist for every section. */
export const DEFAULT_VARIANT = "default";

export interface SectionVariant {
  id: string;
  /** Bengali display label. */
  label: string;
  blurb: string;
  /** `false` = catalogued from the mockup but not yet ported into this app. */
  available: boolean;
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

const variant = (id: string, label: string, blurb: string, available: boolean): SectionVariant => ({
  id,
  label,
  blurb,
  available,
});

/** Only the shipped design is available; mockup variant ids are catalogued in the blurb. */
const withDefault = (label: string, description: string): SectionVariant[] => [
  variant(DEFAULT_VARIANT, label, description, true),
];

const section = (
  key: string,
  scope: SectionScope,
  zone: SectionZone,
  label: string,
  description: string,
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
  variants: withDefault(label, description),
});

/**
 * Registry of every configurable public-site section, keyed to match the
 * `multi-style-web-mockup` section slugs. All sections currently resolve to the
 * `"default"` variant (the shipped design).
 */
export const SECTION_REGISTRY: SectionMeta[] = [
  section("ticker", "global", "header", "জরুরি সংবাদ ও তথ্যপট্টি", "শীর্ষে চলমান সংবাদ, সংগ্রহের অবস্থা ও জরুরি ঘোষণার নকশা।"),
  section("navbar", "global", "header", "প্রধান শিরোনাম ও নেভিগেশন", "বাংলা মেনু, ডেস্কে যাওয়ার পথ ও আলো-অন্ধকারের সুইচ।"),
  section("footer", "global", "footer", "সাইটের শেষাংশ", "সাইট-মানচিত্র, সম্পাদকীয় পরিচয়, যোগাযোগ ও প্রকাশনা তথ্য।"),
  section("hero", "home", "hero", "হোমের প্রধান পরিচিতি", "প্রথম দেখায় হৈচৈয়ের কাজ, যাচাই নীতি ও সর্বশেষ অবস্থার পরিচয়।"),
  section("kpi", "home", "hero", "সংবাদ-সংগ্রহের মূল সংখ্যা", "সংগৃহীত, প্রকাশিত, পুনরাবৃত্তি ও পাঠকের অংশগ্রহণ।"),
  section("insights", "home", "main", "লাইভ তথ্যচিত্র", "সময়ের সঙ্গে প্রতিবেদন, বিষয়ভিত্তিক বণ্টন ও প্রকাশের অগ্রগতি।"),
  section("pipeline", "home", "main", "সংবাদ যাচাই ও প্রকাশের ধাপ", "উৎস সংগ্রহ, ছবি সংরক্ষণ, পুনরাবৃত্তি যাচাই, পুনর্লিখন ও প্রকাশ।"),
  section("wire", "home", "main", "নিউজরুম লাইভ ওয়্যার", "সংগ্রহ, হ্যাশ-যাচাই, পুনর্লিখন ও প্রকাশের চলমান ঘটনা।"),
  section("briefing", "home", "main", "সকালের সংক্ষিপ্ত ব্রিফিং", "দিনের সবচেয়ে গুরুত্বপূর্ণ যাচাইকৃত প্রতিবেদনের সারসংক্ষেপ।"),
  section("lead", "home", "main", "আজকের প্রধান প্রতিবেদন", "পাঠকের জন্য বাছাই করা প্রধান প্রতিবেদন ও উৎস-যাচাই।"),
  section("latest", "home", "main", "সর্বশেষ প্রতিবেদন", "প্রকাশিত প্রতিবেদন তারিখ, বিষয়, উৎস ও যাচাই-চিহ্নসহ।"),
  section("home-ad", "home", "major", "হোম পৃষ্ঠার বিজ্ঞাপন", "বিজ্ঞাপনদাতার পরিচয়, লেখা ও লিংক।"),
  section("academy", "home", "major", "যাচাই একাডেমি", "সম্পাদকীয় পদ্ধতি অনুসরণ করে পাঠক নিজেই খবর যাচাই শিখবেন।"),
  section("categories", "home", "major", "বিষয়ভিত্তিক সংবাদ", "কোন বিষয়ে কত প্রতিবেদন এবং তার অগ্রাধিকার।"),
  section("health", "home", "major", "সাইট ও পাইপলাইনের অবস্থা", "ডেটাবেস, সংগ্রাহক, প্রকাশনা ও পাঠকসংক্রান্ত স্বাস্থ্য।"),
  section("newsletter", "home", "major", "পাঠক বার্তা ও সাবস্ক্রিপশন", "নিয়মিত সম্পাদকীয় সংক্ষিপ্তসার পাওয়ার আমন্ত্রণ।"),
  section("post-hero", "post", "hero", "প্রতিবেদনের শিরোনাম", "প্রতিবেদনের নাম, সারাংশ, বিষয়, সময় ও উৎস।"),
  section("post-factbar", "post", "hero", "যাচাইয়ের আস্থা ও উৎস", "ফ্যাক্ট-গেট, মূল উৎস, লেখক এবং প্রতিবেদন-পরিচিতি।"),
  section("post-tools", "post", "hero", "পাঠকের পড়ার সরঞ্জাম", "প্রতিবেদন শোনা, লেখা বড়-ছোট করা, সংরক্ষণ, উদ্ধৃতি কপি ও প্রিন্ট।"),
  section("post-glance", "post", "main", "এক নজরে মূল তথ্য", "প্রতিবেদনের গুরুত্বপূর্ণ বিষয় সহজভাবে তুলে ধরে।"),
  section("post-body", "post", "main", "সম্পূর্ণ প্রতিবেদন", "পুনর্লিখিত প্রতিবেদন, উদ্ধৃতি, দলিল ও অনুচ্ছেদ।"),
  section("post-lesson", "post", "major", "পড়া শেষে শেখার উপকরণ", "পড়ার পর মূল শিক্ষা, ভাবনার প্রশ্ন ও করণীয়।"),
  section("post-ad", "post", "major", "প্রতিবেদনের মাঝের বিজ্ঞাপন", "আলাদা করে চিহ্নিত স্পনসর বিজ্ঞাপন।"),
  section("post-timeline", "post", "main", "ঘটনার সময়রেখা", "ঘটনার গুরুত্বপূর্ণ মুহূর্তগুলো সময়ক্রমে দেখায়।"),
  section("post-verify", "post", "major", "সূত্র ও দাবি যাচাই", "যাচাই, আংশিক যাচাই বা বাতিল হওয়া তথ্যের বিবরণ।"),
  section("post-analytics", "post", "main", "প্রতিবেদনের পাঠক-পরিসংখ্যান", "ভিউ, প্রতিক্রিয়া, পাঠ-সময় ও পাঠকের আগ্রহের চার্ট।"),
  section("post-comments", "post", "major", "পাঠকের মন্তব্য", "পাঠক নামসহ মন্তব্য করতে পারবেন।"),
  section("post-report", "post", "major", "প্রতিবেদনে ভুল জানান", "ভুল তথ্য, সূত্র বা উপস্থাপনা সম্পাদককে জানানোর ফর্ম।"),
  section("post-share", "post", "major", "ভাগ করুন ও প্রতিক্রিয়া দিন", "প্রতিবেদন ভাগ করা, লিংক কপি ও পাঠকের প্রতিক্রিয়া।"),
  section("post-related", "post", "major", "আরও পড়ুন", "একই বিষয় বা সম্পাদকীয় বিভাগের সম্পর্কিত প্রতিবেদন।"),
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

/** Web-app visibility + behaviour knobs (stored in settings.app_config_json). */
export interface SiteAppConfig {
  /** Masthead "newsroom in numbers" hero section. */
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