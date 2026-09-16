/**
 * Shared domain types for হৈচৈ (Hoichoi).
 * These map 1:1 to the Turso/libSQL schema (see packages/db/migrations/).
 * Categories are now dynamic (stored in category_configs table).
 */

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
  | "custom";

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
}

export interface Source {
  id: string;
  page_url: string;
  page_name: string;
  /** @deprecated Use categories array instead. Kept for backward compatibility. */
  category: CategorySlug;
  /** Array of category slugs this source belongs to (many-to-many via source_categories). */
  categories: CategorySlug[];
  is_verified: boolean;
  is_active: boolean;
  last_scraped_at: string | null;
  created_at: string;
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
  rate_limit_rpm: number | null;
  config: Record<string, unknown> | null;
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
  /** Advertisement slots (raw ad-network HTML/JS). Empty = placeholder sponsor card. */
  ad_leaderboard_html: string | null;
  ad_rect_html: string | null;
  ad_infeed_html: string | null;
  ad_strip_html: string | null;
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
  categories: { key: string; count: number }[];
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
  status: CommentStatus;
  created_at: string;
}

/** A comment joined with its parent post (used by the moderation queue). */
export interface CommentWithPost extends Comment {
  postTitle: string | null;
  postCategory: string | null;
}