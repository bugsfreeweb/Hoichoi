/**
 * @hoichoi/db — Turso/libSQL data layer for হৈচৈ.
 * Exports the client plus typed helpers used by the web app and the scraper.
 */
export * from "./client";
export * from "./rows";
export * from "./archive";
export * from "./media";
export * from "./media-storage";
export * from "./transfer";
export * from "./admin-auth";
export * from "./source-errors";
export * from "./media-objects";
export * from "./post-images";
export * from "./traffic";
export * from "./storage-report";
export * from "./live-events";
export * from "./polls";

import {
  DEFAULT_APP_CONFIG,
  DEFAULT_VARIANT,
  SECTION_REGISTRY,
  type MaintenanceSiteConfig,
  type SectionRow,
  type SectionState,
  type SiteAppConfig,
} from "@hoichoi/shared-types";
import type {
  AnalyticsRange,
  AnalyticsSnapshot,
  CaseStatus,
  CategoryConfig,
  CategoryMeta,
  CategorySlug,
  Comment,
  CommentStatus,
  CommentWithPost,
  CurrentWindowPost,
  Notice,
  NoticeTone,
  Post,
  PostStatus,
  ReaderReport,
  ReaderReportStatus,
  ReaderReportWithPost,
  SiteSettings,
  StatsSnapshot,
  HeroEffects,
} from "@hoichoi/shared-types";
import type { InValue } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { getClient, isRemoteDatabaseUrl, nowIso } from "./client";
import { mapCategory, mapNotice, mapPost, parseJson, pickCategoryDot } from "./rows";
import { DEFAULT_MEDIA_STORAGE } from "./media-storage";

/** Deep-merge a raw nested `maintenance` value over the blueprint. */
export function parseMaintenanceConfig(
  value: unknown,
): MaintenanceSiteConfig {
  const merged: MaintenanceSiteConfig = JSON.parse(JSON.stringify(DEFAULT_APP_CONFIG.maintenance));
  if (!value || typeof value !== "object" || Array.isArray(value)) return merged;
  const p = value as Record<string, unknown>;

  if (typeof p.theme === "string") merged.theme = p.theme as MaintenanceSiteConfig["theme"];
  if (typeof p.language === "string") merged.language = p.language as MaintenanceSiteConfig["language"];
  if (p.brand && typeof p.brand === "object") {
    const b = p.brand as Record<string, unknown>;
    if (typeof b.mark === "string" && b.mark) merged.brand.mark = b.mark;
    if (typeof b.name === "string" && b.name) merged.brand.name = b.name;
    if (typeof b.nameBn === "string" && b.nameBn) merged.brand.nameBn = b.nameBn;
  }
  const copy = (key: "copyBn" | "copyEn") => {
    const c = p[key] as Record<string, unknown> | undefined;
    if (!c || typeof c !== "object") return;
    for (const slot of ["badge", "headline", "subheadline", "body"] as const) {
      if (typeof c[slot] === "string" && c[slot]) merged[key][slot] = c[slot];
    }
  };
  copy("copyBn");
  copy("copyEn");
  for (const key of ["footerNoteBn", "footerNoteEn", "contactEmail", "contactPhone"] as const) {
    if (typeof p[key] === "string") (merged as unknown as Record<string, string>)[key] = p[key];
  }
  for (const key of ["showPipeline", "showStats", "showTicker", "showNewsletter", "showContact", "socialsEnabled"] as const) {
    if (typeof p[key] === "boolean") (merged as unknown as Record<string, boolean>)[key] = p[key];
  }
  if (p.countdown && typeof p.countdown === "object") {
    const c = p.countdown as Record<string, unknown>;
    if (typeof c.enabled === "boolean") merged.countdown.enabled = c.enabled;
    if (typeof c.target === "string") merged.countdown.target = c.target;
  }
  if (p.progress && typeof p.progress === "object") {
    const c = p.progress as Record<string, unknown>;
    if (typeof c.enabled === "boolean") merged.progress.enabled = c.enabled;
    if (typeof c.value === "number" && Number.isFinite(c.value)) merged.progress.value = Math.max(0, Math.min(100, c.value));
  }
  if (p.schedule && typeof p.schedule === "object") {
    const c = p.schedule as Record<string, unknown>;
    if (typeof c.enabled === "boolean") merged.schedule.enabled = c.enabled;
    if (typeof c.start === "string") merged.schedule.start = c.start;
    if (typeof c.end === "string") merged.schedule.end = c.end;
    if (typeof c.autoLive === "boolean") merged.schedule.autoLive = c.autoLive;
  }
  for (const lang of ["tickerBn", "tickerEn"] as const) {
    if (Array.isArray(p[lang])) merged[lang] = (p[lang] as unknown[]).filter((x) => typeof x === "string").map(String);
  }
  if (p.socials && typeof p.socials === "object") {
    const s = p.socials as Record<string, unknown>;
    for (const key of ["facebook", "x", "instagram", "youtube", "github", "linkedin"] as const) {
      if (typeof s[key] === "string") merged.socials[key] = s[key];
    }
  }
  if (p.effects && typeof p.effects === "object") {
    const e = p.effects as Record<string, unknown>;
    for (const key of ["grain", "particles", "marquee"] as const) {
      if (typeof e[key] === "boolean") merged.effects[key] = e[key];
    }
  }
  if (p.colors && typeof p.colors === "object") {
    const c = p.colors as Record<string, unknown>;
    for (const key of ["bg", "surface", "text", "primary", "accent"] as const) {
      if (typeof c[key] === "string" && c[key]) merged.colors[key] = c[key];
    }
  }
  if (p.seo && typeof p.seo === "object") {
    const s = p.seo as Record<string, unknown>;
    if (typeof s.title === "string") merged.seo.title = s.title;
    if (typeof s.description === "string") merged.seo.description = s.description;
    if (typeof s.noIndex === "boolean") merged.seo.noIndex = s.noIndex;
  }
  return merged;
}

/**
 * Default web-app visibility knobs. Stored serialized on the settings row
 * (`app_config_json`) so the desktop app and the web admin share one source.
 * `DEFAULT_APP_CONFIG` lives in shared-types so client components (web admin,
 * desktop settings) can construct full objects without bundling the DB.
 */
export { DEFAULT_APP_CONFIG };

export function parseAppConfig(raw: string | null | undefined): SiteAppConfig {
  const merged: SiteAppConfig = JSON.parse(JSON.stringify(DEFAULT_APP_CONFIG));
  if (!raw) return merged;
  try {
    const parsed = JSON.parse(raw) as Partial<SiteAppConfig>;
    for (const k of Object.keys(merged) as Array<keyof SiteAppConfig>) {
      const v = parsed[k];
      if (v === undefined || v === null) continue;
      if (k === "maintenance") {
        merged.maintenance = parseMaintenanceConfig(v);
      } else if (k === "footer_socials") {
        if (Array.isArray(v)) {
          merged.footer_socials = (v as unknown[])
            .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
            .map((x) => ({
              label: String(x.label ?? "").slice(0, 60),
              url: String(x.url ?? "").slice(0, 500),
              icon: String(x.icon ?? "link").slice(0, 24),
            }))
            .filter((x) => x.url.length > 0);
        }
      } else if (k === "brand_animation") {
        const allowed = ["none", "fade", "typewriter", "shimmer", "slide"];
        if (typeof v === "string" && allowed.includes(v)) {
          merged.brand_animation = v as SiteAppConfig["brand_animation"];
        }
      } else if (k === "hero_effects") {
        if (v && typeof v === "object") {
          const he = v as Partial<HeroEffects>;
          for (const key of Object.keys(merged.hero_effects) as Array<keyof HeroEffects>) {
            if (typeof he[key] === "boolean") merged.hero_effects[key] = he[key] as boolean;
          }
        }
      } else if (k === "live_events") {
        if (v && typeof v === "object" && !Array.isArray(v)) {
          const live = v as Partial<SiteAppConfig["live_events"]>;
          const themes = ["stage", "broadsheet", "scoreboard", "timeline", "compact", "studio"];
          if (typeof live.default_theme === "string" && themes.includes(live.default_theme)) {
            merged.live_events.default_theme = live.default_theme as SiteAppConfig["live_events"]["default_theme"];
          }
          if (typeof live.refresh_seconds === "number" && Number.isFinite(live.refresh_seconds)) {
            merged.live_events.refresh_seconds = Math.min(60, Math.max(4, Math.trunc(live.refresh_seconds)));
          }
          if (typeof live.floating_player === "boolean") merged.live_events.floating_player = live.floating_player;
          if (typeof live.auto_moderation === "boolean") merged.live_events.auto_moderation = live.auto_moderation;
          if (typeof live.ticker_label === "string") merged.live_events.ticker_label = live.ticker_label.slice(0, 60);
          if (Array.isArray(live.banned_words)) {
            merged.live_events.banned_words = live.banned_words
              .filter((word): word is string => typeof word === "string")
              .map((word) => word.trim().slice(0, 40))
              .filter(Boolean)
              .slice(0, 100);
          }
        }
      } else if (typeof v === "boolean") {
        (merged as unknown as Record<string, boolean>)[k] = v;
      } else if (typeof v === "string" || typeof v === "number") {
        (merged as unknown as Record<string, string | number>)[k] = v;
      }
    }
  } catch {
    /* corrupt blob → defaults */
  }
  return merged;
}

/** Fallback branding used when no settings row exists / columns are absent. */
export const DEFAULT_SETTINGS: SiteSettings = {
  id: 1,
  pipeline_hours: 8,
  llm_temperature: 0.3,
  fact_gate: 90,
  site_name: "হৈচৈ",
  contact_email: "contact@hoichoi.local",
  police_helpline: "999",
  child_helpline: "109",
  archive_visible_days: 7,
  archive_retention_days: 30,
  slogan_bn: "ভাইরাল বাংলা, সপ্তাহখানেক",
  tagline: "ফেসবুকের হৈচৈ — এখন বাংলায়, সাত দিন পর গায়েব",
  logo_url: null,
  favicon_url: null,
  accent_color: "#d64541",
  footer_about_bn: null,
  ad_leaderboard_html: null,
  ad_rect_html: null,
  ad_infeed_html: null,
  ad_strip_html: null,
  app_config_json: JSON.stringify(DEFAULT_APP_CONFIG),
  media_storage_json: JSON.stringify(DEFAULT_MEDIA_STORAGE),
  default_variant: DEFAULT_VARIANT,
};

export function mapSettings(row: Record<string, unknown>): SiteSettings {
  const str = (v: unknown, fallback = "") => String(v ?? fallback);
  return {
    id: 1,
    pipeline_hours: Number(row.pipeline_hours ?? DEFAULT_SETTINGS.pipeline_hours),
    // Guard the range here rather than trusting a hand-edited row: a stored 90
    // would be sent straight to the provider and rejected mid-run.
    llm_temperature: Math.min(1, Math.max(0, Number(row.llm_temperature ?? 0.3))),
    fact_gate: Math.min(100, Math.max(0, Number(row.fact_gate ?? 90))),
    site_name: str(row.site_name, DEFAULT_SETTINGS.site_name),
    contact_email: str(row.contact_email),
    police_helpline: str(row.police_helpline, DEFAULT_SETTINGS.police_helpline),
    child_helpline: str(row.child_helpline, DEFAULT_SETTINGS.child_helpline),
    archive_visible_days: Number(row.archive_visible_days ?? DEFAULT_SETTINGS.archive_visible_days),
    archive_retention_days: Number(row.archive_retention_days ?? DEFAULT_SETTINGS.archive_retention_days),
    slogan_bn: str(row.slogan_bn, DEFAULT_SETTINGS.slogan_bn),
    tagline: str(row.tagline, DEFAULT_SETTINGS.tagline),
    logo_url: (row.logo_url as string | null) ?? null,
    favicon_url: (row.favicon_url as string | null) ?? null,
    accent_color: str(row.accent_color, DEFAULT_SETTINGS.accent_color),
    footer_about_bn: (row.footer_about_bn as string | null) ?? null,
    ad_leaderboard_html: (row.ad_leaderboard_html as string | null) ?? null,
    ad_rect_html: (row.ad_rect_html as string | null) ?? null,
    ad_infeed_html: (row.ad_infeed_html as string | null) ?? null,
    ad_strip_html: (row.ad_strip_html as string | null) ?? null,
    app_config_json: (row.app_config_json as string | null) ?? JSON.stringify(DEFAULT_APP_CONFIG),
    media_storage_json: (row.media_storage_json as string | null) ?? JSON.stringify(DEFAULT_MEDIA_STORAGE),
    default_variant: str(row.default_variant, DEFAULT_VARIANT),
  };
}

/** Single source of truth for site settings (branding + pipeline cadence). */
export async function getSettings(): Promise<SiteSettings> {
  const client = getClient();
  const res = await client.execute("SELECT * FROM settings WHERE id = 1");
  if (res.rows.length === 0) return DEFAULT_SETTINGS;
  return mapSettings(res.rows[0] as Record<string, unknown>);
}

/** Whitelisted, idempotent settings update (skips unknown keys). */
export async function updateSettings(fields: Partial<SiteSettings>): Promise<void> {
  const client = getClient();
  const allowed: Array<keyof SiteSettings> = [
    "pipeline_hours",
    "llm_temperature",
    "fact_gate",
    "site_name",
    "contact_email",
    "police_helpline",
    "child_helpline",
    "archive_visible_days",
    "archive_retention_days",
    "slogan_bn",
    "tagline",
    "logo_url",
    "favicon_url",
    "accent_color",
    "footer_about_bn",
    "ad_leaderboard_html",
    "ad_rect_html",
    "ad_infeed_html",
    "ad_strip_html",
    "app_config_json",
    "media_storage_json",
    "default_variant",
  ];
  if (fields.logo_url === "") fields.logo_url = null;
  if (fields.favicon_url === "") fields.favicon_url = null;
  if (fields.footer_about_bn === "") fields.footer_about_bn = null;
  if (fields.media_storage_json === "") fields.media_storage_json = null;
  const adSlotKeys = ["ad_leaderboard_html", "ad_rect_html", "ad_infeed_html", "ad_strip_html"] as const;
  for (const k of adSlotKeys) {
    if (fields[k] === "") fields[k] = null;
  }
  const sets: string[] = [];
  const args: InValue[] = [];
  for (const k of allowed) {
    const v = fields[k];
    if (v === undefined) continue;
    if (v === null && k !== "logo_url" && k !== "favicon_url" && k !== "footer_about_bn" && !adSlotKeys.includes(k as (typeof adSlotKeys)[number])) continue;
    sets.push(`${k} = ?`);
    args.push(v as InValue);
  }
  if (sets.length === 0) return;
  sets.push("updated_at = ?");
  args.push(nowIso());
  await client.execute({ sql: `UPDATE settings SET ${sets.join(", ")} WHERE id = 1`, args });
}

/* ---------------- section variant engine (scaffold, default-only) ---------------- */

function mapSectionRow(row: Record<string, unknown>): SectionRow {
  let config: Record<string, unknown> | null = null;
  if (row.config_json) {
    try {
      const parsed = JSON.parse(String(row.config_json));
      if (parsed && typeof parsed === "object") config = parsed as Record<string, unknown>;
    } catch {
      config = null;
    }
  }
  return {
    key: String(row.key),
    variant: String(row.variant ?? DEFAULT_VARIANT),
    enabled: Number(row.enabled ?? 1) !== 0,
    sort_order: Number(row.sort_order ?? 0),
    config_json: config,
    updated_at: (row.updated_at as string | null) ?? null,
  };
}

/**
 * Every registry section merged with its persisted row (if any). The result is
 * always the complete registry — sections never disappear — and `variant`
 * falls back to the shipped `"default"`.
 */
export async function listSections(): Promise<SectionState[]> {
  const client = getClient();
  const res = await client.execute("SELECT * FROM sections");
  const byKey = new Map<string, SectionRow>();
  for (const r of res.rows) {
    const row = mapSectionRow(r as Record<string, unknown>);
    byKey.set(row.key, row);
  }
  return SECTION_REGISTRY.map((meta, index) => {
    const row = byKey.get(meta.key);
    return {
      meta,
      key: meta.key,
      variant: row?.variant ?? meta.defaultVariant,
      enabled: row?.enabled ?? meta.defaultVisible,
      sort_order: row?.sort_order ?? index,
    };
  });
}

/**
 * Persist a section's variant/enabled choice. The variant is validated against
 * the registry, so an unknown id is rejected rather than silently stored.
 */
export async function setSectionState(
  key: string,
  fields: { variant?: string; enabled?: boolean; sort_order?: number },
): Promise<boolean> {
  const meta = SECTION_REGISTRY.find((s) => s.key === key);
  if (!meta) return false;
  if (fields.variant !== undefined) {
    const known = meta.variants.some((v) => v.id === fields.variant);
    if (!known) return false;
  }
  const client = getClient();
  const variant = fields.variant ?? meta.defaultVariant;
  const enabled = fields.enabled === undefined ? 1 : fields.enabled ? 1 : 0;
  const sortOrder = fields.sort_order ?? 0;
  await client.execute({
    sql: `INSERT INTO sections (key, variant, enabled, sort_order, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            variant = excluded.variant,
            enabled = excluded.enabled,
            sort_order = excluded.sort_order,
            updated_at = excluded.updated_at`,
    args: [key, variant, enabled, sortOrder, nowIso()],
  });
  return true;
}

/** The site-wide default variant (always `"default"` today). */
export async function getSiteVariant(): Promise<string> {
  const settings = await getSettings();
  return settings.default_variant || DEFAULT_VARIANT;
}

/** Records the site-wide default variant. Reserved for the mockup variants. */
export async function setSiteVariant(variant: string): Promise<boolean> {
  const known = variant === DEFAULT_VARIANT || SECTION_REGISTRY.some((s) => s.variants.some((v) => v.id === variant));
  if (!known) return false;
  await updateSettings({ default_variant: variant });
  return true;
}

/* ---------- notices (announcements + special notice banner) ---------- */

const NOTICE_TONES: NoticeTone[] = ["info", "success", "warn", "alert"];

/** List notices, newest/pinned first. `activeOnly` hides expired rows too. */
export async function listNotices(opts?: {
  activeOnly?: boolean;
  limit?: number;
}): Promise<Notice[]> {
  const client = getClient();
  const { activeOnly = false, limit = 100 } = opts ?? {};
  let sql = "SELECT * FROM notices";
  const args: InValue[] = [];
  if (activeOnly) {
    sql += " WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > ?)";
    args.push(nowIso());
  }
  sql += " ORDER BY pinned DESC, updated_at DESC";
  if (limit > 0) sql += ` LIMIT ${Math.floor(limit)}`;
  const res = await client.execute({ sql, args });
  return res.rows.map((r) => mapNotice(r as Record<string, unknown>));
}

/**
 * Paginated notice board for the admin.
 *
 * The board used to ask for 200 notices server-side and then immediately refetch
 * the entire table from the client on mount, throwing the server query away and
 * rendering every row with no way to reach anything past the cap. This pages it
 * through the shared helper instead.
 *
 * `pinned DESC` stays first so the header banner a pinned notice produces is
 * always the first row, on every page's top.
 */
export async function listNoticesPaged(opts?: {
  page?: number;
  pageSize?: number;
}): Promise<Page<Notice>> {
  return pageRows<Notice>({
    sql: "SELECT * FROM notices",
    order: "pinned DESC, updated_at DESC",
    page: Number(opts?.page ?? 1),
    pageSize: Number(opts?.pageSize ?? 20),
    map: mapNotice,
  });
}

export async function getNotice(id: string): Promise<Notice | null> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM notices WHERE id = ?",
    args: [id],
  });
  if (res.rows.length === 0) return null;
  return mapNotice(res.rows[0] as Record<string, unknown>);
}

export async function createNotice(input: {
  title: string;
  body?: string | null;
  tone?: NoticeTone;
  url?: string | null;
  pinned?: boolean;
  is_active?: boolean;
  expires_at?: string | null;
  created_by?: string;
}): Promise<Notice> {
  const client = getClient();
  const id = randomUUID();
  const now = nowIso();
  const tone = input.tone && NOTICE_TONES.includes(input.tone) ? input.tone : "info";
  await client.execute({
    sql: `INSERT INTO notices
      (id, title, body, tone, url, pinned, is_active, expires_at, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.title,
      input.body ?? null,
      tone,
      input.url ?? null,
      input.pinned ? 1 : 0,
      input.is_active === false ? 0 : 1,
      input.expires_at ?? null,
      input.created_by ?? "web",
      now,
      now,
    ],
  });
  return (await getNotice(id)) as Notice;
}

export async function updateNotice(
  id: string,
  fields: Partial<
    Pick<Notice, "title" | "body" | "tone" | "url" | "pinned" | "is_active" | "expires_at">
  >,
): Promise<Notice | null> {
  const client = getClient();
  const sets: string[] = [];
  const args: InValue[] = [];
  const put = (k: string, v: InValue) => {
    sets.push(`${k} = ?`);
    args.push(v);
  };
  if (fields.title !== undefined) put("title", fields.title);
  if (fields.body !== undefined) put("body", fields.body ?? null);
  if (fields.tone !== undefined && NOTICE_TONES.includes(fields.tone)) put("tone", fields.tone);
  if (fields.url !== undefined) put("url", fields.url ?? null);
  if (fields.pinned !== undefined) put("pinned", fields.pinned ? 1 : 0);
  if (fields.is_active !== undefined) put("is_active", fields.is_active ? 1 : 0);
  if (fields.expires_at !== undefined) put("expires_at", fields.expires_at ?? null);
  if (sets.length === 0) return getNotice(id);
  sets.push("updated_at = ?");
  args.push(nowIso());
  args.push(id);
  await client.execute({
    sql: `UPDATE notices SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
  return getNotice(id);
}

export async function deleteNotice(id: string): Promise<void> {
  const client = getClient();
  await client.execute({ sql: "DELETE FROM notices WHERE id = ?", args: [id] });
}

/** The top pinned active notice → the header "special notice" banner. */
export async function getSpecialNotice(): Promise<Notice | null> {
  const client = getClient();
  const res = await client.execute({
    sql: `SELECT * FROM notices
      WHERE is_active = 1 AND pinned = 1 AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY updated_at DESC LIMIT 1`,
    args: [nowIso()],
  });
  if (res.rows.length === 0) return null;
  return mapNotice(res.rows[0] as Record<string, unknown>);
}

/**
 * Configured categories, active ones first in normal use.
 *
 * `includeInactive` exists for editors that must not lose data: when a save
 * rewrites a source's whole membership set, validating against the active-only
 * list would silently drop a membership that points at a deactivated category.
 */
export async function listCategories(
  opts: { includeInactive?: boolean } = {},
): Promise<CategoryMeta[]> {
  const client = getClient();
  const where = opts.includeInactive ? "" : "WHERE is_active = 1";
  const res = await client.execute(
    `SELECT * FROM category_configs ${where} ORDER BY sort_order ASC`,
  );
  return res.rows.map((r) => mapCategory(r as Record<string, unknown>));
}

export async function getCategory(slug: string): Promise<CategoryMeta | null> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM category_configs WHERE slug = ?",
    args: [slug],
  });
  if (res.rows.length === 0) return null;
  return mapCategory(res.rows[0] as Record<string, unknown>);
}

/** Active categories with a live published-post count — drives the public
 *  home-page category strip (a category only appears when it has content). */
export async function categoriesWithCounts(): Promise<Array<{ category: CategoryMeta; count: number }>> {
  const client = getClient();
  const cats = await listCategories();
  if (cats.length === 0) return [];
  const placeholders = cats.map(() => "?").join(",");
  const res = await client.execute({
    sql: `SELECT category, COUNT(*) AS n FROM posts
          WHERE status = 'published' AND archived_at IS NULL
            AND category IN (${placeholders})
          GROUP BY category`,
    args: cats.map((c) => c.slug),
  });
  const counts = new Map(
    res.rows.map((r) => [
      String((r as Record<string, unknown>).category),
      Number((r as Record<string, unknown>).n),
    ]),
  );
  return cats
    .map((category) => ({ category, count: counts.get(category.slug) ?? 0 }))
    .filter((c) => c.count > 0);
}

/** Active categories opted in to the public site footer nav (editable from web + desk). */
export async function listFooterCategories(): Promise<CategoryMeta[]> {
  const client = getClient();
  const res = await client.execute(
    "SELECT * FROM category_configs WHERE is_active = 1 AND show_in_footer = 1 ORDER BY sort_order ASC, slug ASC",
  );
  return res.rows.map((r) => mapCategory(r as Record<string, unknown>));
}

/** Normalize a dot color for storage as CSS-ready `#hex` (UI sends `#…`;
 *  legacy seed/defaults may arrive unprefixed). */
function normalizeCategoryDot(value: string | undefined): string | null {
  if (!value || !value.trim()) return null;
  const raw = value.trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(raw)
    ? raw
    : /^[0-9a-fA-F]{3,8}$/.test(raw)
      ? `#${raw}`
      : raw;
}

/** Create a new category (admin). */
export async function createCategory(input: {
  slug: string;
  displayNameBn: string;
  displayNameEn: string;
  descriptionBn?: string;
  descriptionEn?: string;
  dot?: string;
  config?: Partial<CategoryConfig>;
  sortOrder?: number;
  showInFooter?: boolean;
  isActive?: boolean;
}): Promise<void> {
  const client = getClient();
  const now = nowIso();
  const existing = (await client.execute("SELECT dot, sort_order FROM category_configs")).rows as unknown as Array<{
    dot: string | null;
    sort_order: number | null;
  }>;
  // No color? Pick the palette entry fewest other categories use. No position?
  // Append after the current last section so admin-created categories never
  // collide with the seeded order or clobber an operator-assigned rank.
  const dot = normalizeCategoryDot(input.dot) ?? pickCategoryDot(existing.map((r) => r.dot));
  const sortOrder = input.sortOrder ?? Math.max(0, ...existing.map((r) => Number(r.sort_order ?? 0))) + 1;
  const defaultConfig: CategoryConfig = {
    requires_double_approval: false,
    show_content_warning: false,
    auto_pending_review: false,
    redaction_strict: "standard",
    allow_identifying_details: true,
    publish_age_gate: false,
    use_allegation_language: false,
    supports_case_status: false,
    share_widely_cta: false,
    include_helpline_numbers: false,
    ...(input.config ?? {}),
  };
  await client.execute({
    sql: `INSERT INTO category_configs (slug, display_name_bn, display_name_en, description_bn, description_en, is_active, sort_order, dot, show_in_footer, config, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.slug,
      input.displayNameBn,
      input.displayNameEn,
      input.descriptionBn ?? "",
      input.descriptionEn ?? "",
      input.isActive === undefined ? 1 : input.isActive ? 1 : 0,
      sortOrder,
      dot,
      input.showInFooter === undefined ? 1 : input.showInFooter ? 1 : 0,
      JSON.stringify(defaultConfig),
      now,
      now,
    ],
  });
}

/** Update an existing category (admin). */
export async function updateCategory(slug: string, fields: Partial<{
  displayNameBn: string;
  displayNameEn: string;
  descriptionBn: string;
  descriptionEn: string;
  isActive: boolean;
  sortOrder: number;
  dot: string;
  showInFooter: boolean;
  config: Partial<CategoryConfig>;
}>): Promise<void> {
  const client = getClient();
  const sets: string[] = [];
  const args: InValue[] = [];
  const now = nowIso();

  if (fields.displayNameBn !== undefined) { sets.push("display_name_bn = ?"); args.push(fields.displayNameBn); }
  if (fields.displayNameEn !== undefined) { sets.push("display_name_en = ?"); args.push(fields.displayNameEn); }
  if (fields.descriptionBn !== undefined) { sets.push("description_bn = ?"); args.push(fields.descriptionBn); }
  if (fields.descriptionEn !== undefined) { sets.push("description_en = ?"); args.push(fields.descriptionEn); }
  if (fields.isActive !== undefined) { sets.push("is_active = ?"); args.push(fields.isActive ? 1 : 0); }
  if (fields.sortOrder !== undefined) { sets.push("sort_order = ?"); args.push(fields.sortOrder); }
  if (fields.dot !== undefined) { sets.push("dot = ?"); args.push(normalizeCategoryDot(fields.dot)); }
  if (fields.showInFooter !== undefined) { sets.push("show_in_footer = ?"); args.push(fields.showInFooter ? 1 : 0); }
  if (fields.config !== undefined) {
    // Merge with existing config
    const existing = await getCategory(slug);
    const merged = { ...(existing?.config ?? {}), ...fields.config };
    sets.push("config = ?");
    args.push(JSON.stringify(merged));
  }

  if (sets.length === 0) return;
  sets.push("updated_at = ?");
  args.push(now, slug);
  await client.execute({ sql: `UPDATE category_configs SET ${sets.join(", ")} WHERE slug = ?`, args });
}

/** Delete a category (admin) - only if no sources/posts reference it. */
export async function deleteCategory(slug: string): Promise<void> {
  const client = getClient();
  // Check references
  const [sourcesRef, postsRef] = await Promise.all([
    client.execute({ sql: "SELECT 1 FROM source_categories WHERE category_slug = ? LIMIT 1", args: [slug] }),
    client.execute({ sql: "SELECT 1 FROM posts WHERE category = ? LIMIT 1", args: [slug] }),
  ]);
  if (sourcesRef.rows.length > 0) throw new Error("Category is referenced by sources");
  if (postsRef.rows.length > 0) throw new Error("Category is referenced by posts");
  await client.execute({ sql: "DELETE FROM category_configs WHERE slug = ?", args: [slug] });
}

/** Get all category slugs for a source. */
export async function getSourceCategories(sourceId: string): Promise<CategorySlug[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT category_slug FROM source_categories WHERE source_id = ?",
    args: [sourceId],
  });
  return res.rows
    .map((r) => String(r.category_slug))
    .sort((a, b) => a.localeCompare(b));

}

/** Set categories for a source (replaces existing). */
export async function setSourceCategories(sourceId: string, categories: CategorySlug[]): Promise<void> {
  const client = getClient();
  await client.execute({ sql: "DELETE FROM source_categories WHERE source_id = ?", args: [sourceId] });
  if (categories.length > 0) {
    const values = categories.map(() => "(?, ?)").join(", ");
    const args = categories.flatMap(c => [sourceId, c]);
    await client.execute({ sql: `INSERT INTO source_categories (source_id, category_slug) VALUES ${values}`, args });
  }
}

export interface WindowOptions {
  category?: CategorySlug | null;
  limit?: number;
  offset?: number;
}

/** Public rolling-window posts — uses posts_current_window view. */
export async function windowPosts(
  opts: WindowOptions = {},
): Promise<CurrentWindowPost[]> {
  const client = getClient();
  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;
  const rows = opts.category
    ? await client.execute({
        sql: "SELECT * FROM posts_current_window WHERE category = ? ORDER BY published_at DESC LIMIT ? OFFSET ?",
        args: [opts.category, limit, offset],
      })
    : await client.execute({
        sql: "SELECT * FROM posts_current_window ORDER BY published_at DESC LIMIT ? OFFSET ?",
        args: [limit, offset],
      });
  return rows.rows.map((r) => {
    const post = mapPost(r as Record<string, unknown>);
    const ttlMs = Number((r as Record<string, unknown>).ttl_ms ?? 0);
    return { ...post, ttl_ms: ttlMs };
  });
}

export async function countWindowPosts(category?: CategorySlug): Promise<number> {
  const client = getClient();
  const res = category
    ? await client.execute({
        sql: "SELECT count(*) AS n FROM posts_current_window WHERE category = ?",
        args: [category],
      })
    : await client.execute("SELECT count(*) AS n FROM posts_current_window");
  return Number(res.rows[0]?.n ?? 0);
}

/** Public post lookup — only published + in the visible window. */
export async function getPublicPostBySlug(slug: string): Promise<Post | null> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM posts_current_window WHERE slug = ? LIMIT 1",
    args: [slug],
  });
  if (res.rows.length === 0) return null;
  return mapPost(res.rows[0] as Record<string, unknown>);
}

/** Admin-oriented lookup — any status, includes archived. */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM posts WHERE slug = ? LIMIT 1",
    args: [slug],
  });
  if (res.rows.length === 0) return null;
  return mapPost(res.rows[0] as Record<string, unknown>);
}

export async function getPostById(id: string): Promise<Post | null> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM posts WHERE id = ? LIMIT 1",
    args: [id],
  });
  if (res.rows.length === 0) return null;
  return mapPost(res.rows[0] as Record<string, unknown>);
}

export async function relatedPosts(
  post: Post,
  limit = 3,
): Promise<Post[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM posts_current_window WHERE category = ? AND id != ? ORDER BY published_at DESC LIMIT ?",
    args: [post.category, post.id, limit],
  });
  return res.rows.map((r) => mapPost(r as Record<string, unknown>));
}

/** Latest published headlines (breaking ticker). */
export async function breakingHeadlines(limit = 6): Promise<Post[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM posts_current_window ORDER BY published_at DESC LIMIT ?",
    args: [limit],
  });
  return res.rows.map((r) => mapPost(r as Record<string, unknown>));
}

/** "Most read" = most recently updated/published, ranked by recency for now. */
export async function mostRead(limit = 5): Promise<Post[]> {
  return breakingHeadlines(limit);
}

/** Live monitor stats for the public homepage + admin dashboard. */
export async function statsSnapshot(): Promise<StatsSnapshot> {
  const client = getClient();
  const today = nowIso().slice(0, 10);
  const [collected, dupes, published, publishedTodayRes, pending, byCat, lastRun, avgDur] =
    await Promise.all([
      client.execute({
        sql: "SELECT count(*) AS n FROM raw_posts WHERE scraped_at LIKE ?",
        args: [`${today}%`],
      }),
      client.execute(
        "SELECT count(*) AS n FROM raw_posts WHERE phash IS NOT NULL AND phash IN (SELECT phash FROM raw_posts GROUP BY phash HAVING count(*) > 1)",
      ),
      client.execute("SELECT count(*) AS n FROM posts_current_window"),
      client.execute({
        sql: "SELECT count(*) AS n FROM posts WHERE status = ? AND published_at LIKE ?",
        args: ["published", `${today}%`],
      }),
      client.execute({
        sql: "SELECT count(*) AS n FROM posts WHERE status = ?",
        args: ["pending_review"],
      }),
      client.execute(
        "SELECT category, count(*) AS n FROM posts_current_window GROUP BY category",
      ),
      client.execute(
        "SELECT status, error FROM pipeline_runs ORDER BY started_at DESC LIMIT 1",
      ),
      client.execute(
        "SELECT AVG((julianday(finished_at) - julianday(started_at)) * 86400) AS avg_sec FROM pipeline_runs WHERE status = 'completed' AND finished_at IS NOT NULL",
      ),
    ]);
  const total = Number(published.rows[0]?.n ?? 0);
  const dupeCount = Number(dupes.rows[0]?.n ?? 0);
  const byCategory: Record<CategorySlug, number> = {
    "child-sexual-abuse": 0,
    "extramarital-crime": 0,
    "missing-children": 0,
  };
  for (const r of byCat.rows) {
    const key = String(r.category) as CategorySlug;
    if (key in byCategory) byCategory[key] = Number(r.n);
  }
  const lastStatusRow = lastRun.rows[0];
  const lastRunStatus: StatsSnapshot["lastRunStatus"] = !lastStatusRow
    ? "never"
    : String(lastStatusRow.status) === "running"
      ? "never"
      : String(lastStatusRow.status) === "completed"
        ? "success"
        : "failed";
  return {
    collectedToday: Number(collected.rows[0]?.n ?? 0),
    duplicatesBlocked: dupeCount,
    dedupRate: total + dupeCount > 0 ? Math.round((dupeCount / (total + dupeCount)) * 100) : 0,
    lastRunStatus,
    publishedToday: Number(publishedTodayRes.rows[0]?.n ?? 0),
    published: total,
    pendingReview: Number(pending.rows[0]?.n ?? 0),
    avgRunDurationSec: Math.round(Number(avgDur.rows[0]?.avg_sec ?? 0)),
    byCategory,
  };
}

export interface RunDayPoint {
  day: string;
  runs: number;
  completed: number;
  failed: number;
  collected: number;
  published: number;
  duplicates: number;
  emptyText: number;
}

/**
 * Daily pipeline throughput for the admin trend chart.
 *
 * Zero-filled across the window so the chart keeps a stable X axis on days with
 * no run (a weekend, a disabled schedule) instead of collapsing the gap and
 * making two adjacent runs look consecutive.
 *
 * `stats` is a free-form JSON blob written by the pipeline, so each field is
 * read through `json_valid` guards and `collected` falls back to the older
 * `scraped` key. A malformed or partial blob degrades that one field to 0 rather
 * than failing the whole dashboard.
 */
export async function runHistoryByDay(days = 14): Promise<RunDayPoint[]> {
  const span = Math.min(Math.max(Math.trunc(days), 1), 90);
  const client = getClient();
  const since = new Date(Date.now() - (span - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const safe = "CASE WHEN json_valid(stats) THEN stats ELSE '{}' END";
  const res = await client.execute({
    sql: `SELECT substr(started_at, 1, 10) AS day,
                 count(*) AS runs,
                 COALESCE(sum(status = 'completed'), 0) AS completed,
                 COALESCE(sum(status = 'failed'), 0) AS failed,
                 COALESCE(sum(COALESCE(json_extract(${safe}, '$.collected'),
                                        json_extract(${safe}, '$.scraped'), 0)), 0) AS collected,
                 COALESCE(sum(COALESCE(json_extract(${safe}, '$.published'), 0)), 0) AS published,
                 COALESCE(sum(COALESCE(json_extract(${safe}, '$.duplicatesBlocked'), 0)), 0) AS duplicates,
                 COALESCE(sum(COALESCE(json_extract(${safe}, '$.emptyText'), 0)), 0) AS empty_text
          FROM pipeline_runs
          WHERE started_at >= ?
          GROUP BY day
          ORDER BY day ASC`,
    args: [`${since}%`],
  });

  const byDay = new Map<string, RunDayPoint>();
  for (const r of res.rows) {
    const day = String(r.day);
    byDay.set(day, {
      day,
      runs: Number(r.runs ?? 0),
      completed: Number(r.completed ?? 0),
      failed: Number(r.failed ?? 0),
      collected: Number(r.collected ?? 0),
      published: Number(r.published ?? 0),
      duplicates: Number(r.duplicates ?? 0),
      emptyText: Number(r.empty_text ?? 0),
    });
  }

  const out: RunDayPoint[] = [];
  for (let i = 0; i < span; i++) {
    const day = new Date(Date.now() - (span - 1 - i) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    out.push(
      byDay.get(day) ?? {
        day,
        runs: 0,
        completed: 0,
        failed: 0,
        collected: 0,
        published: 0,
        duplicates: 0,
        emptyText: 0,
      },
    );
  }
  return out;
}

export interface RadarCategorySummary {
  slug: string;
  name: string;
  dot: string;
}

export interface RadarStageCounts {
  collected: Record<string, number>;
  queued: Record<string, number>;
  published: Record<string, number>;
  duplicate: Record<string, number>;
}

export interface RadarSnapshot {
  categories: RadarCategorySummary[];
  stages: RadarStageCounts;
  totals: { collected: number; queued: number; published: number; duplicate: number };
  generatedAt: string;
}

/**
 * Desk Collector polar-radar snapshot (mockup `collector-radar` parity).
 * Per-category pipeline-stage counts — collected (raw intake), queued
 * (rewrite awaiting publish), published, and duplicates blocked — all
 * computed from real rows. `raw_posts` carry no category so their counts
 * roll up through `sources → source_categories` (a post counts in every
 * category its source belongs to, mirroring how sources drive the intake).
 */
export async function radarSnapshot(): Promise<RadarSnapshot> {
  const client = getClient();
  const toMap = (rows: Array<Record<string, unknown>>): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const r of rows) out[String(r.slug)] = Number(r.n ?? 0);
    return out;
  };
  const [cats, collected, queued, published, duplicate, tCollected, tQueued, tPublished, tDuplicate] =
    await Promise.all([
      listCategories(),
      client.execute(
        `SELECT sc.category_slug AS slug, count(*) AS n
         FROM raw_posts rp
         JOIN sources s ON s.id = rp.source_id
         JOIN source_categories sc ON sc.source_id = s.id
         GROUP BY sc.category_slug`,
      ),
      client.execute(
        "SELECT category AS slug, count(*) AS n FROM posts WHERE status IN ('pending_review', 'approved') GROUP BY category",
      ),
      client.execute(
        "SELECT category AS slug, count(*) AS n FROM posts WHERE status = 'published' GROUP BY category",
      ),
      client.execute(
        `SELECT sc.category_slug AS slug, count(*) AS n
         FROM raw_posts rp
         JOIN sources s ON s.id = rp.source_id
         JOIN source_categories sc ON sc.source_id = s.id
         WHERE rp.phash IS NOT NULL AND rp.phash IN (
           SELECT phash FROM raw_posts GROUP BY phash HAVING count(*) > 1
         )
         GROUP BY sc.category_slug`,
      ),
      client.execute("SELECT count(*) AS n FROM raw_posts"),
      client.execute("SELECT count(*) AS n FROM posts WHERE status IN ('pending_review', 'approved')"),
      client.execute("SELECT count(*) AS n FROM posts WHERE status = 'published'"),
      client.execute(
        "SELECT count(*) AS n FROM raw_posts WHERE phash IS NOT NULL AND phash IN (SELECT phash FROM raw_posts GROUP BY phash HAVING count(*) > 1)",
      ),
    ]);
  return {
    categories: cats.map((c) => ({ slug: c.slug, name: c.displayNameBn, dot: c.dot })),
    stages: {
      collected: toMap(collected.rows as Array<Record<string, unknown>>),
      queued: toMap(queued.rows as Array<Record<string, unknown>>),
      published: toMap(published.rows as Array<Record<string, unknown>>),
      duplicate: toMap(duplicate.rows as Array<Record<string, unknown>>),
    },
    totals: {
      collected: Number(tCollected.rows[0]?.n ?? 0),
      queued: Number(tQueued.rows[0]?.n ?? 0),
      published: Number(tPublished.rows[0]?.n ?? 0),
      duplicate: Number(tDuplicate.rows[0]?.n ?? 0),
    },
    generatedAt: nowIso(),
  };
}

/**
 * Public "newsroom in numbers" snapshot for the home live graph (mockup
 * `live-analytics` parity). Mirrors GET /api/stats in the mockup: totals,
 * trend series, category distribution, activity and pipeline state — all
 * computed from real DB rows, nothing invented.
 */
export async function analyticsSnapshot(
  range: AnalyticsRange = "all",
): Promise<AnalyticsSnapshot> {
  const start = performance.now();
  const client = getClient();
  const [posts, rawPosts, commentRows, sourceRows, runRows, published, cats] =
    await Promise.all([
      client.execute(
        "SELECT id, status, category, created_at, published_at FROM posts",
      ),
      client.execute("SELECT phash, scraped_at FROM raw_posts"),
      client.execute(
        "SELECT created_at FROM comments WHERE status = 'approved'",
      ),
      client.execute("SELECT is_active FROM sources"),
      client.execute(
        "SELECT started_at, finished_at, status FROM pipeline_runs ORDER BY started_at DESC LIMIT 500",
      ),
      client.execute(
        "SELECT id, slug, title_bn, published_at FROM posts_current_window ORDER BY published_at DESC LIMIT 6",
      ),
      listCategories(),
    ]);
  const latencyMs = Math.max(1, Math.round(performance.now() - start));

  const pt = (v: unknown) => {
    const t = Date.parse(String(v ?? ""));
    return Number.isFinite(t) ? t : 0;
  };
  const now = Date.now();
  const day = 86_400_000;

  const all: Array<Record<string, unknown>> = posts.rows as unknown as Array<Record<string, unknown>>;
  const raws: Array<Record<string, unknown>> = rawPosts.rows as unknown as Array<Record<string, unknown>>;
  const comments = commentRows.rows as unknown as Array<Record<string, unknown>>;
  const sources = sourceRows.rows as unknown as Array<Record<string, unknown>>;
  const runs = runRows.rows as unknown as Array<Record<string, unknown>>;
  const topPublished = published.rows as unknown as Array<Record<string, unknown>>;

  const collectedTimes = raws.map((r) => pt(r.scraped_at)).filter(Boolean);
  const publishedTimes = all
    .filter((p) => p.published_at && String(p.status) === "published")
    .map((p) => pt(p.published_at))
    .filter(Boolean);
  // Spread a large array into Math.min() overflows the call stack
  // ("Maximum call stack size exceeded") once intake passes ~100k rows, so the
  // minimum is folded with a plain loop instead.
  const minOf = (values: number[], fallback: number) => {
    let m = fallback;
    for (const v of values) if (v < m) m = v;
    return m;
  };
  const earliest = Math.min(
    collectedTimes.length ? minOf(collectedTimes, now) : now,
    publishedTimes.length ? minOf(publishedTimes, now) : now,
  );
  const from =
    range === "24h"
      ? now - day
      : range === "7d"
        ? now - 7 * day
        : Math.min(earliest - 3_600_000, now - day);
  const bins = range === "7d" ? 7 : 12;
  const step = (now - from) / bins;
  const series = Array.from({ length: bins }, (_, i) => ({
    at: new Date(from + i * step).toISOString(),
    collected: 0,
    published: 0,
  }));
  const inside = (t: number) => t >= from && t <= now;
  const index = (t: number) =>
    Math.min(bins - 1, Math.max(0, Math.floor((t - from) / step)));

  // duplicate detection across the whole intake (a phash seen twice is a dup)
  const phashCount = new Map<string, number>();
  for (const r of raws) {
    if (r.phash) phashCount.set(String(r.phash), (phashCount.get(String(r.phash)) ?? 0) + 1);
  }
  const isDup = (r: Record<string, unknown>) =>
    !!r.phash && (phashCount.get(String(r.phash)) ?? 0) > 1;

  const totals = { collected: 0, published: 0, duplicates: 0, approvedComments: 0, pendingArticles: 0 };
  const allArticles = { published: 0, pending: 0, duplicate: 0 };
  const categoryCounts: Record<string, number> = {};

  for (const r of raws) {
    const t = pt(r.scraped_at);
    if (!inside(t)) continue;
    totals.collected++;
    const bin = series[index(t)];
    if (bin) bin.collected++;
    if (isDup(r)) totals.duplicates++;
  }
  for (const p of all) {
    const st = String(p.status);
    if (st === "published") allArticles.published++;
    else if (st === "pending_review") allArticles.pending++;
    else if (st === "duplicate") allArticles.duplicate++;
    const publishedAt = pt(p.published_at);
    if (st === "published" && inside(publishedAt)) {
      totals.published++;
      const bin = series[index(publishedAt)];
      if (bin) bin.published++;
      const key = String(p.category);
      if (key) categoryCounts[key] = (categoryCounts[key] ?? 0) + 1;
    }
    if (st === "pending_review" && inside(pt(p.created_at))) totals.pendingArticles++;
  }

  for (const c of comments) {
    const at = pt(c.created_at);
    if (inside(at)) totals.approvedComments++;
  }

  const sourceStates = { watching: 0, paused: 0, error: 0, total: sources.length };
  for (const s of sources) {
    sourceStates[String(s.is_active) === "1" ? "watching" : "paused"]++;
  }

  const r0 = runs[0] as Record<string, unknown> | undefined;
  let collectorStatus: AnalyticsSnapshot["collector"]["status"] = "not_connected";
  if (r0) {
    const st = String(r0.status);
    const finished = pt(r0.finished_at ?? r0.started_at);
    collectorStatus =
      st === "running"
        ? "working"
        : now - finished < 90_000
          ? "ready"
          : "offline";
  }

  const selected = runs
    .filter((r) => inside(pt(r.started_at)))
    .map((r) => {
      const s = pt(r.started_at);
      const f = pt(r.finished_at);
      return { durationSec: s && f ? Math.round((f - s) / 1000) : 0 };
    });
  const activities = topPublished
    .filter((p) => p.published_at)
    .map((p) => ({
      id: `a${String(p.id)}`,
      kind: "article" as const,
      text: String(p.title_bn),
      at: String(p.published_at),
      href: `/post/${String(p.slug)}`,
    }));

  const url = (process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "").trim();
  const remote = isRemoteDatabaseUrl(url);
  const driver = remote ? "TURSO" : url.startsWith("file:") ? "LOCAL" : "TURSO";
  const mode: "local" | "cloud" = remote ? "cloud" : "local";

  return {
    ok: true,
    generatedAt: new Date(now).toISOString(),
    range,
    from: new Date(from).toISOString(),
    to: new Date(now).toISOString(),
    database: { driver, mode, latencyMs },
    totals,
    allArticles,
    categories: cats
      .map((c) => ({
        key: c.slug,
        name: c.displayNameBn || c.displayNameEn || c.slug,
        dot: c.dot ? (c.dot.startsWith("#") ? c.dot : `#${c.dot}`) : "#64748b",
        count: categoryCounts[c.slug] ?? 0,
      }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
      .slice(0, 5),
    series,
    sources: sourceStates,
    collector: {
      status: collectorStatus,
      lastSeenAt: r0 ? String(r0.started_at) : null,
    },
    latestPublication: topPublished[0]?.published_at ? String(topPublished[0].published_at) : null,
    activity: activities,
    runSummary: {
      count: selected.length,
      durationSec: selected.length
        ? Math.round(selected.reduce((s, r) => s + r.durationSec, 0) / selected.length)
        : null,
      lastAt: r0 ? String(r0.started_at) : null,
    },
  };
}

export interface RecentPipelineRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  stats: Record<string, unknown> | null;
  provider_used: string | null;
  error: string | null;
}

export async function recentPipelineRuns(limit = 10): Promise<RecentPipelineRun[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT ?",
    args: [limit],
  });
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id),
      started_at: String(row.started_at),
      finished_at: (row.finished_at as string | null) ?? null,
      status: String(row.status),
      stats: parseJson<Record<string, unknown> | null>(row.stats as string, null),
      provider_used: (row.provider_used as string | null) ?? null,
      error: (row.error as string | null) ?? null,
    };
  });
}

/**
 * Whether the pipeline has ever finished a run successfully.
 *
 * `recentPipelineRuns(n)` only sees a window, and during an outage that whole
 * window can be failures plus stale `running` rows left by killed workers. The
 * setup guide used to read only that window and declare "nothing configured" on
 * a fully configured install. It asks this one cheap, indexed question
 * separately so a single historical success keeps the checklist honest.
 */
export async function pipelineEverSucceeded(): Promise<boolean> {
  const client = getClient();
  const res = await client.execute(
    "SELECT 1 AS ok FROM pipeline_runs WHERE status = 'completed' LIMIT 1",
  );
  return res.rows.length > 0;
}

/**
 * Fail pipeline runs that are still marked `running` long after they started.
 *
 * A run only writes its final `finished_at`/`status` at the very end, so any
 * crash that kills the worker first — the runner being reclaimed, or (as with a
 * Turso `disk I/O error`) the database refusing the final UPDATE — leaves the
 * row saying `running` forever. That stale row then becomes the "latest run" the
 * dashboard and the setup guide read, so the automation looks stuck rather than
 * finished-with-an-error.
 *
 * The age gate is deliberately generous (default 3 hours) so a genuinely long
 * run on another machine is never trampled: only an abandoned row is reaped.
 */
export async function reapStalePipelineRuns(
  maxAgeMinutes = 180,
  reason = "run did not finish (worker terminated or database unavailable)",
): Promise<number> {
  const client = getClient();
  const cutoff = new Date(Date.now() - Math.max(1, maxAgeMinutes) * 60_000).toISOString();
  const res = await client.execute({
    sql: `UPDATE pipeline_runs
             SET status = 'failed', finished_at = ?, error = COALESCE(error, ?)
           WHERE status = 'running' AND finished_at IS NULL AND started_at < ?`,
    args: [nowIso(), reason, cutoff],
  });
  return res.rowsAffected ?? 0;
}

/**
 * Counts for the review queues, in one round trip.
 *
 * The dashboard badges, the notification bell and the sidebar all want the same
 * handful of numbers, and each was previously derived by fetching the whole
 * queue and calling `.length` on it. On a table that only ever grows that is the
 * most expensive way to learn "17 are waiting".
 */
export async function countReviewQueues(): Promise<{
  pending_review: number;
  approved: number;
  published: number;
  removed: number;
  /**
   * `rejected` was missing here, so the dashboard's "সব" and "সারিতে" tab
   * counters silently excluded rejected posts while the list they labelled
   * (`status != 'published'`) included them. The tab read a smaller number than
   * the rows beneath it.
   */
  rejected: number;
  open_removals: number;
  open_reports: number;
  new_submissions: number;
  active_notices: number;
  /** Reader comments waiting for a moderator (separate queue, /admin/comments). */
  pending_comments: number;
}> {
  const client = getClient();
  const res = await client.execute({
    sql: `
    SELECT
      (SELECT COUNT(*) FROM posts WHERE status = 'pending_review') AS pending_review,
      (SELECT COUNT(*) FROM posts WHERE status = 'approved')         AS approved,
      (SELECT COUNT(*) FROM posts WHERE status = 'published')        AS published,
      (SELECT COUNT(*) FROM posts WHERE status = 'removed')          AS removed,
      (SELECT COUNT(*) FROM posts WHERE status = 'rejected')        AS rejected,
      (SELECT COUNT(*) FROM removal_requests WHERE status = 'open')  AS open_removals,
      (SELECT COUNT(*) FROM reader_reports WHERE status = 'open')    AS open_reports,
      (SELECT COUNT(*) FROM submitted_pages
         WHERE status IN ('new','reviewing'))                        AS new_submissions,
      (SELECT COUNT(*) FROM notices
         WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > ?)) AS active_notices,
      (SELECT COUNT(*) FROM comments WHERE status = 'pending')       AS pending_comments
  `,
    args: [nowIso()],
  });
  const row = (res.rows[0] ?? {}) as Record<string, unknown>;
  const n = (k: string): number => Number(row[k] ?? 0);
  return {
    pending_review: n("pending_review"),
    approved: n("approved"),
    published: n("published"),
    removed: n("removed"),
    rejected: n("rejected"),
    open_removals: n("open_removals"),
    open_reports: n("open_reports"),
    new_submissions: n("new_submissions"),
    active_notices: n("active_notices"),
    pending_comments: n("pending_comments"),
  };
}

export interface DashboardSourceRow {
  id: string;
  name: string;
  active: boolean;
  postsToday: number;
  openErrors: number;
}

/**
 * Compact source list for the admin dashboard's source-health panels. One round
 * trip for names + today's intake + open scrape errors; the UI derives a health
 * score from the error count, so nothing here is invented.
 */
export async function dashboardSources(): Promise<DashboardSourceRow[]> {
  const client = getClient();
  const today = nowIso().slice(0, 10);
  const [srcs, posts, errs] = await Promise.all([
    client.execute("SELECT id, page_name, is_active FROM sources ORDER BY page_name"),
    client.execute({
      sql: "SELECT source_id, count(*) AS n FROM raw_posts WHERE scraped_at LIKE ? GROUP BY source_id",
      args: [`${today}%`],
    }),
    client.execute({
      sql: "SELECT source_id, count(*) AS n FROM source_errors WHERE status = 'open' GROUP BY source_id",
      args: [],
    }),
  ]);
  const postMap = new Map<string, number>();
  for (const r of posts.rows) postMap.set(String(r.source_id), Number(r.n ?? 0));
  const errMap = new Map<string, number>();
  for (const r of errs.rows) errMap.set(String(r.source_id), Number(r.n ?? 0));
  return srcs.rows.map((r) => {
    const id = String(r.id);
    return {
      id,
      name: String(r.page_name ?? ""),
      active: String(r.is_active) === "1" || r.is_active === 1,
      postsToday: postMap.get(id) ?? 0,
      openErrors: errMap.get(id) ?? 0,
    };
  });
}

export interface MaintenanceSubscriber {
  id: string;
  email: string;
  name: string;
  locale: string;
  created_at: string;
}

export interface MaintenanceMessage {
  id: string;
  name: string;
  email: string;
  topic: string;
  body: string;
  locale: string;
  status: "open" | "reviewed" | "archived";
  created_at: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Maintenance-screen newsletter drop. `duplicate` = already subscribed. */
export async function subscribeMaintenance(
  input: { email: string; name?: string; locale?: string },
): Promise<{ status: "subscribed" | "duplicate" }> {
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw new Error("INVALID_EMAIL");
  }
  const client = getClient();
  const existing = await client.execute({
    sql: "SELECT 1 FROM maintenance_subscribers WHERE email = ?",
    args: [email],
  });
  if (existing.rows.length > 0) return { status: "duplicate" };
  await client.execute({
    sql: "INSERT INTO maintenance_subscribers (id, email, name, locale, via, created_at) VALUES (?, ?, ?, ?, 'maintenance', ?)",
    args: [randomUUID(), email, String(input.name ?? "").trim() || null, input.locale === "en" ? "en" : "bn", nowIso()],
  });
  return { status: "subscribed" };
}

/** Maintenance-screen contact form submit. */
export async function bookMaintenanceMessage(
  input: { name: string; email: string; topic?: string; body: string; locale?: string },
): Promise<void> {
  const client = getClient();
  const name = String(input.name ?? "").trim();
  const email = String(input.email ?? "").trim().toLowerCase();
  const body = String(input.body ?? "").trim();
  if (!name || !EMAIL_RE.test(email) || !body) {
    throw new Error("INVALID_INPUT");
  }
  await client.execute({
    sql: "INSERT INTO maintenance_messages (id, name, email, topic, body, locale, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'open', ?)",
    args: [
      randomUUID(),
      name,
      email,
      String(input.topic ?? "").trim() || null,
      body,
      input.locale === "en" ? "en" : "bn",
      nowIso(),
    ],
  });
}

/** Admin — maintenance inbox dimensions (used by the operations viewer). */
export async function maintenanceInboxSnapshot(): Promise<{
  subscribers: number;
  newSubscribersToday: number;
  messages: number;
  openMessages: number;
}> {
  const client = getClient();
  const today = nowIso().slice(0, 10);
  const [sCount, sToday, mCount, mOpen] = await Promise.all([
    client.execute("SELECT count(*) AS n FROM maintenance_subscribers"),
    client.execute({
      sql: "SELECT count(*) AS n FROM maintenance_subscribers WHERE created_at LIKE ?",
      args: [`${today}%`],
    }),
    client.execute("SELECT count(*) AS n FROM maintenance_messages"),
    client.execute("SELECT count(*) AS n FROM maintenance_messages WHERE status = 'open'"),
  ]);
  return {
    subscribers: Number(sCount.rows[0]?.n ?? 0),
    newSubscribersToday: Number(sToday.rows[0]?.n ?? 0),
    messages: Number(mCount.rows[0]?.n ?? 0),
    openMessages: Number(mOpen.rows[0]?.n ?? 0),
  };
}

export async function listStatusPosts(status: PostStatus): Promise<Post[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM posts WHERE status = ? ORDER BY created_at DESC",
    args: [status],
  });
  return res.rows.map((r) => mapPost(r as Record<string, unknown>));
}

/**
 * Count + page an admin queue that a page reads with a hand-written SELECT.
 *
 * The moderation, removal, submission, source, category and provider pages all
 * query their table directly and rendered every row. That is fine at 5 rows and
 * unusable at 5,000: the whole table is read on every request, so the queue gets
 * slower as it fills, and nothing tells the operator there is more to review.
 *
 * `sql` is the full statement with a `__WHERE` placeholder standing in for the
 * filter and `__ORDER` for the sort. They are inlined rather than parameterised
 * because both are compile-time constants in the admin pages, never user input.
 */
export async function pageRows<T>(
  opts: {
    /** e.g. "SELECT * FROM removal_requests" — constants only, never user input. */
    sql: string;
    /** SQL predicate without the WHERE keyword, or "" for the whole table. */
    where?: string;
    /** Sort clause without the ORDER BY keyword. */
    order: string;
    /** Values for `?` inside `where`, in order. */
    args?: InValue[];
    page?: number;
    pageSize?: number;
    /** Row mapper, normally one of the existing `map*` helpers. */
    map?: (row: Record<string, unknown>) => T;
  },
): Promise<Page<T>> {
  const pageSize = Math.max(1, Math.floor(opts.pageSize ?? 20));
  const client = getClient();
  const where = opts.where ? ` WHERE ${opts.where}` : "";

  const filterArgs = opts.args ?? [];
  const countRes = await client.execute({
    sql: `SELECT COUNT(*) AS n FROM (${opts.sql}${where})`,
    args: filterArgs,
  });
  const total = Number((countRes.rows[0] as Record<string, unknown>).n ?? 0);

  // Clamp to the last page that actually exists. A page beyond the end is
  // reachable in normal use, not just from a hand-typed URL: delete the last row
  // of page 3 and refresh, and the URL still says page=3. Serving that as an
  // empty list makes a queue look wiped, and it leaves `Paginator` rendering
  // "3 / 2".
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(safePage(opts.page), pageCount);

  const res = await client.execute({
    sql: `${opts.sql}${where} ORDER BY ${opts.order} LIMIT ? OFFSET ?`,
    args: [...filterArgs, pageSize, (p - 1) * pageSize],
  });

  return {
    rows: opts.map
      ? res.rows.map((r) => opts.map!(r as Record<string, unknown>))
      : (res.rows as Record<string, unknown>[]) as T[],
    total,
    page: p,
    pageSize,
  };
}

export async function updatePostStatus(
  id: string,
  status: PostStatus,
  extra: { publishedAt?: boolean } = {},
): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "UPDATE posts SET status = ?, updated_at = ? , published_at = COALESCE(published_at, CASE WHEN ? = 1 THEN ? ELSE published_at END) WHERE id = ?",
    args: [
      status,
      nowIso(),
      extra.publishedAt ? 1 : 0,
      nowIso(),
      id,
    ],
  });
}

export const POST_STATUSES: PostStatus[] = [
  "pending_review",
  "approved",
  "rejected",
  "published",
  "removed",
];

export interface BulkModerationResult {
  requested: number;
  updated: string[];
  missing: string[];
  /** Items held at `approved` because their category requires a 2nd approval. */
  needsSecondApproval: string[];
  published: string[];
  rejected: string[];
  removed: string[];
}

/**
 * Approve/reject/publish/remove many posts in one round trip.
 *
 * The desk's bulk buttons used to loop `queue set` per row, which meant N
 * daemon calls (and N UI frames of silence) for a 60-item selection — it read
 * as "nothing happened". This does the whole selection server-side and reports
 * exactly what happened to each row, including the double-approval hold so
 * the UI can explain why an item did not become `published` yet.
 */
export async function bulkModeratePosts(
  ids: readonly string[],
  action: "approved" | "rejected" | "published" | "removed",
): Promise<BulkModerationResult> {
  const result: BulkModerationResult = {
    requested: ids.length,
    updated: [],
    missing: [],
    needsSecondApproval: [],
    published: [],
    rejected: [],
    removed: [],
  };
  if (ids.length === 0) return result;

  const unique = [...new Set(ids.filter((id) => id.trim() !== ""))];
  if (unique.length === 0) return result;

  const client = getClient();
  const placeholders = unique.map(() => "?").join(",");
  const found = await client.execute({
    sql: `SELECT id, category, status FROM posts WHERE id IN (${placeholders})`,
    args: unique as string[],
  });
  const byId = new Map(
    found.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return [String(row.id), { category: String(row.category), status: String(row.status) }];
    }),
  );

  for (const id of unique) {
    const row = byId.get(id);
    if (!row) {
      result.missing.push(id);
      continue;
    }

    let finalStatus: PostStatus = action;
    let publishedAt = false;
    if (action === "approved") {
      const cat = await getCategory(row.category);
      const needsDouble = Boolean(cat?.config.requires_double_approval) && row.status !== "approved";
      finalStatus = needsDouble ? "approved" : "published";
      publishedAt = !needsDouble;
      if (needsDouble) result.needsSecondApproval.push(id);
    }

    const res = await client.execute({
      sql: "UPDATE posts SET status = ?, updated_at = ?, published_at = COALESCE(published_at, CASE WHEN ? = 1 THEN ? ELSE published_at END) WHERE id = ?",
      args: [finalStatus, nowIso(), publishedAt ? 1 : 0, nowIso(), id],
    });
    if (Number(res.rowsAffected ?? 0) === 0) {
      result.missing.push(id);
      continue;
    }
    result.updated.push(id);
    if (finalStatus === "published") result.published.push(id);
    else if (finalStatus === "rejected") result.rejected.push(id);
    else if (finalStatus === "removed") result.removed.push(id);
  }

  return result;
}

/**
 * Hard-delete many posts in one round trip; returns the ids that existed.
 * Mirrors `deletePost` (which throws on a missing id) but tolerates a mixed
 * selection by reporting per-row outcomes instead of aborting the batch.
 */
export async function bulkDeletePosts(ids: readonly string[]): Promise<{
  requested: number;
  deleted: string[];
  missing: string[];
}> {
  const unique = [...new Set(ids.filter((id) => id.trim() !== ""))];
  const out = { requested: unique.length, deleted: [] as string[], missing: [] as string[] };
  if (unique.length === 0) return out;

  const client = getClient();
  for (const id of unique) {
    try {
      await deletePost(id);
      out.deleted.push(id);
    } catch {
      out.missing.push(id);
    }
  }
  return out;
}

export const CASE_STATUSES: CaseStatus[] = [
  "active",
  "found",
  "unresolved",
  "false-alarm",
  "unknown",
];

export const CATEGORY_SLUGS: CategorySlug[] = [
  "child-sexual-abuse",
  "extramarital-crime",
  "missing-children",
];

/**
 * Category validation follows the config table, not the static whitelist above —
 * admins may create dynamic categories and still recategorize posts into them.
 */
export async function categoryExists(slug: string): Promise<boolean> {
  if (CATEGORY_SLUGS.includes(slug as CategorySlug)) return true;
  return (await getCategory(slug)) !== null;
}

/** All posts, newest first (content-manager list + search space). */
export async function listPosts(limit = 300): Promise<Post[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM posts ORDER BY created_at DESC LIMIT ?",
    args: [limit],
  });
  return res.rows.map((r) => mapPost(r as Record<string, unknown>));
}

export type ContentQueueTab = "all" | "published" | "pending";

/**
 * Paginated, searchable content queue for the dashboard.
 *
 * This backs a view that used to load the 300 newest posts and filter them in the
 * browser, so its tab counters and its search box only ever described that window.
 * Moving the work into SQL is what makes the counts honest and lets a search
 * reach rows the old limit could not.
 *
 * `q` is matched against the title and the source name. LIKE metacharacters in
 * the query are escaped, otherwise a search for a literal `%` would silently
 * match every post and report a full queue for a term that appears in none.
 */
export async function listContentQueue(opts: {
  tab?: ContentQueueTab;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<Page<Post>> {
  const tab: ContentQueueTab =
    opts.tab === "published" || opts.tab === "pending" ? opts.tab : "all";
  const q = (opts.q ?? "").trim();
  const clauses: string[] = [];
  const args: InValue[] = [];

  if (tab === "published") clauses.push("status = 'published'");
  else if (tab === "pending") clauses.push("status != 'published'");

  if (q !== "") {
    clauses.push("(title_bn LIKE ? ESCAPE '\\' OR source_name LIKE ? ESCAPE '\\')");
    const pattern = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    args.push(pattern, pattern);
  }

  return pageRows<Post>({
    sql: "SELECT * FROM posts",
    where: clauses.length > 0 ? clauses.join(" AND ") : undefined,
    order: "created_at DESC",
    args,
    page: Number(opts.page ?? 1),
    pageSize: Number(opts.pageSize ?? 20),
    map: mapPost,
  });
}

/**
 * Validate a media reference before it is written to `posts.media_path`.
 *
 * Two accepted shapes, and nothing else:
 *   - an absolute http(s) URL — served directly by the browser/CDN;
 *   - a relative store path like `2026-10-05/img_ab12cd34.webp`, which the web
 *     app resolves to `/uploads/<path>` (see mediaUrl in apps/web).
 *
 * Everything is rejected rather than coerced: `javascript:` and `data:` URLs
 * would turn the post body into a script/HTML injection vector when the image
 * lands in an <img src>, and a relative path escaping the store (`../../…`)
 * would make the served URL point outside /uploads. Backslashes are rejected
 * too: they normalise to `/` on the server, so `a\..\..\etc` would sneak past a
 * check that only looked for forward slashes.
 */
export function normalizeMediaPath(input: string): string | null {
  let raw = input.trim();
  if (raw === "") return null; // empty = clear the image
  if (raw.length > 2000) throw new Error("media_path too long");
  if (/[\u0000-\u001f]/.test(raw)) throw new Error("media_path contains control characters");
  if (raw.includes("\\")) throw new Error("media_path must not contain backslashes");

  // The admin field tells the operator to paste the path they copied off the
  // site, which is served from /uploads/. Accept that public prefix in either
  // the absolute form it appears in (`/uploads/2026-09-27/x.webp`) or without
  // the leading slash, and store the path relative to the public folder — which
  // is what `mediaUrl()` in the web app prepends back. Rejecting the exact
  // string the UI advertises made the documented example an error.
  const uploadsPrefix = raw.replace(/^\/+/, "").match(/^uploads\/(.+)$/i);
  if (uploadsPrefix?.[1]) raw = uploadsPrefix[1];

  if (/^\/+/.test(raw)) throw new Error("media_path must be relative (drop the leading slash)");

  if (/^https?:\/\//i.test(raw)) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new Error("media_path is not a valid URL");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("media_path must be an http(s) URL");
    }
    return url.toString();
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
    throw new Error(`unsupported media scheme: ${raw.split(":")[0]}`);
  }
  // Relative store path: no traversal segments, and no empty ones ("a//b").
  if (raw.split("/").some((seg) => seg === "" || seg === "." || seg === "..")) {
    throw new Error("media_path has an invalid path segment");
  }
  return raw;
}

/** Image extensions we accept for a manual/local media reference. */
const MEDIA_EXT = /\.(?:webp|jpe?g|png|gif|avif|mp4|webm)$/i;

/** Content fields that may be edited through the admin post editor. */
export interface PostUpdateFields {
  title_bn?: string;
  body_bn?: string;
  summary_bn?: string | null;
  category?: CategorySlug;
  case_status?: CaseStatus | null;
  published_at?: string | null;
  /** Absolute http(s) URL or a relative `/uploads/…` store path; null clears. */
  media_path?: string | null;
  /** Inferred from media_path when omitted. */
  media_kind?: "image" | "video" | "none";
}

/**
 * Media URLs the collector already saw for a post, newest raw row first.
 *
 * This is what the admin "sync image" action offers as candidates: the bytes
 * are known-good (the collector fetched them once) and re-downloading one costs
 * a single request instead of a full browser re-visit of the permalink.
 */
export async function listPostMediaCandidates(
  postId: string,
): Promise<{ media_urls: string[]; source_url: string | null; current: string | null; kind: string | null }> {
  const client = getClient();
  const res = await client.execute({
    sql: `SELECT p.media_path, p.media_kind, p.source_url, r.media_urls
          FROM posts p LEFT JOIN raw_posts r ON r.id = p.raw_post_id
          WHERE p.id = ?`,
    args: [postId],
  });
  const row = (res.rows[0] ?? {}) as Record<string, unknown>;
  let media_urls: string[] = [];
  try {
    const parsed = JSON.parse(String(row.media_urls ?? "[]")) as unknown;
    if (Array.isArray(parsed)) media_urls = parsed.filter((u): u is string => typeof u === "string" && u !== "");
  } catch {
    media_urls = [];
  }
  return {
    media_urls,
    source_url: (row.source_url as string) ?? null,
    current: (row.media_path as string) ?? null,
    kind: (row.media_kind as string) ?? null,
  };
}

/** Best-effort kind for a media reference: video by extension, else image. */
function inferMediaKind(path: string | null): "image" | "video" | "none" {
  if (!path) return "none";
  return /\.(?:mp4|webm|mov|m3u8)$/i.test(path) ? "video" : "image";
}

/**
 * PATCH content fields on a post. Every key is validated/whitelisted; invalid
 * enums throw. `summary_bn` / `case_status` / `published_at` may be set to null
 * (clear). Status changes go through `updatePostStatus` (see API route).
 */
export async function updatePost(id: string, fields: PostUpdateFields): Promise<void> {
  const client = getClient();
  const sets: string[] = [];
  const args: InValue[] = [];

  if (typeof fields.title_bn === "string") {
    if (!fields.title_bn.trim()) {
      throw new Error("title_bn must not be empty");
    }
    sets.push("title_bn = ?");
    args.push(fields.title_bn);
  }
  if (typeof fields.body_bn === "string") {
    sets.push("body_bn = ?");
    args.push(fields.body_bn);
  }
  if ("summary_bn" in fields && fields.summary_bn !== undefined) {
    sets.push("summary_bn = ?");
    args.push(fields.summary_bn ?? null);
  }
  if (fields.category !== undefined) {
    if (!(await categoryExists(fields.category))) {
      throw new Error(`invalid category: ${fields.category}`);
    }
    sets.push("category = ?");
    args.push(fields.category);
  }
  if ("case_status" in fields && fields.case_status !== undefined) {
    if (fields.case_status !== null && !CASE_STATUSES.includes(fields.case_status)) {
      throw new Error(`invalid case_status: ${fields.case_status}`);
    }
    sets.push("case_status = ?");
    args.push(fields.case_status ?? null);
    if (fields.case_status) {
      sets.push("case_updated_at = ?");
      args.push(nowIso());
    }
  }
  if ("published_at" in fields && fields.published_at !== undefined) {
    sets.push("published_at = ?");
    args.push(fields.published_at ?? null);
  }
  if ("media_path" in fields && fields.media_path !== undefined) {
    // Throws on anything unsafe, so a bad URL can never reach the page.
    const normalized = normalizeMediaPath(fields.media_path ?? "");
    const kind = fields.media_kind ?? inferMediaKind(normalized);
    // Keep media_kind consistent when a path is cleared: leaving kind='image'
    // with a null path makes the backfill queries (which require kind='none')
    // skip the post forever.
    sets.push("media_path = ?", "media_kind = ?");
    args.push(normalized, normalized ? kind : "none");
  }

  if (sets.length === 0) return;
  sets.push("updated_at = ?");
  args.push(nowIso(), id);
  await client.execute({
    sql: `UPDATE posts SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

/** Hard-delete a post (content manager); caller handles audit logging.
 *  Throws when the id doesn't exist so callers can't silently no-op. */
export async function deletePost(id: string): Promise<void> {
  const client = getClient();
  const res = await client.execute({ sql: "DELETE FROM posts WHERE id = ?", args: [id] });
  if (res.rowsAffected === 0) {
    throw new Error(`post not found: ${id}`);
  }
}

/* ------------------------------------------------------------------ *
 * Reader comments + moderation queue
 * ------------------------------------------------------------------ */

function mapComment(row: Record<string, unknown>): Comment {
  return {
    id: String(row.id),
    post_id: String(row.post_id),
    author: String(row.author),
    body: String(row.body),
    email: row.email ? String(row.email) : null,
    likes: Number(row.likes ?? 0),
    dislikes: Number(row.dislikes ?? 0),
    status: (String(row.status ?? "pending") as CommentStatus),
    created_at: String(row.created_at),
  };
}

/**
 * Public — newest approved comments for one post. Defaults to the 10 most
 * recent (the post page shows a total counter beside them); `getPostCommentCount`
 * supplies the total.
 */
export async function getPostComments(postId: string, limit = 10): Promise<Comment[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM comments WHERE post_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT ?",
    args: [postId, limit],
  });
  return res.rows.map((r) => mapComment(r as Record<string, unknown>));
}

/** Public — total number of approved comments on a post (counter beside the list). */
export async function getPostCommentCount(postId: string): Promise<number> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT COUNT(*) AS n FROM comments WHERE post_id = ? AND status = 'approved'",
    args: [postId],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  return Number(row?.n ?? 0);
}

/** Public — one reader like/dislike per call; returns the fresh counters. */
export async function voteComment(
  id: string,
  vote: "like" | "dislike",
): Promise<{ likes: number; dislikes: number } | null> {
  const client = getClient();
  const column = vote === "like" ? "likes" : "dislikes";
  await client.execute({
    sql: `UPDATE comments SET ${column} = ${column} + 1 WHERE id = ? AND status = 'approved'`,
    args: [id],
  });
  const res = await client.execute({
    sql: "SELECT likes, dislikes FROM comments WHERE id = ?",
    args: [id],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return { likes: Number(row.likes ?? 0), dislikes: Number(row.dislikes ?? 0) };
}

/** Admin/moderation — every comment joined with its parent post title/category. */
export async function getAllComments(limit = 400): Promise<CommentWithPost[]> {
  const client = getClient();
  const res = await client.execute({
    sql: `SELECT c.*, p.title_bn AS postTitle, p.category AS postCategory
          FROM comments c LEFT JOIN posts p ON p.id = c.post_id
          ORDER BY c.created_at DESC LIMIT ?`,
    args: [limit],
  });
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      ...mapComment(row),
      postTitle: (row.postTitle as string | null) ?? null,
      postCategory: (row.postCategory as string | null) ?? null,
    };
  });
}

/** New comment always lands in the moderation queue (status = pending). */
export async function createComment(input: {
  postId: string;
  author: string;
  body: string;
  email?: string | null;
}): Promise<Comment> {
  const client = getClient();
  const id = crypto.randomUUID();
  const created = nowIso();
  await client.execute({
    sql: "INSERT INTO comments (id, post_id, author, body, email, likes, status, created_at) VALUES (?, ?, ?, ?, ?, 0, 'pending', ?)",
    args: [id, input.postId, input.author.trim(), input.body.trim(), input.email?.trim() || null, created],
  });
  return {
    id,
    post_id: input.postId,
    author: input.author.trim(),
    body: input.body.trim(),
    email: input.email?.trim() || null,
    likes: 0,
    dislikes: 0,
    status: "pending",
    created_at: created,
  };
}

/** Moderation action: approve → approved, block → blocked. */
export async function setCommentStatus(
  id: string,
  status: "approved" | "blocked",
): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "UPDATE comments SET status = ? WHERE id = ?",
    args: [status, id],
  });
}

/** Hard-delete a comment (moderation). */
export async function deleteComment(id: string): Promise<void> {
  const client = getClient();
  await client.execute({ sql: "DELETE FROM comments WHERE id = ?", args: [id] });
}

/* ------------------------------------------------------------------ *
 * Reader reports (public report form → admin queue)
 * ------------------------------------------------------------------ */

export function mapReport(row: Record<string, unknown>): ReaderReport {
  return {
    id: String(row.id),
    post_id: String(row.post_id),
    reporter_name: String(row.reporter_name),
    reporter_email: (row.reporter_email as string | null) ?? null,
    reason: String(row.reason),
    details: (row.details as string | null) ?? null,
    status: (String(row.status ?? "open") as ReaderReportStatus),
    created_at: String(row.created_at),
    reviewed_at: (row.reviewed_at as string | null) ?? null,
  };
}

/** New reader report lands in the queue (status = open). */
export async function createReaderReport(input: {
  postId: string;
  reporterName: string;
  reporterEmail?: string;
  reason: string;
  details?: string;
}): Promise<ReaderReport> {
  const client = getClient();
  const id = crypto.randomUUID();
  const created = nowIso();
  await client.execute({
    sql: "INSERT INTO reader_reports (id, post_id, reporter_name, reporter_email, reason, details, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'open', ?)",
    args: [
      id,
      input.postId,
      input.reporterName.trim(),
      input.reporterEmail?.trim() || null,
      input.reason,
      input.details?.trim() || null,
      created,
    ],
  });
  return {
    id,
    post_id: input.postId,
    reporter_name: input.reporterName.trim(),
    reporter_email: input.reporterEmail?.trim() || null,
    reason: input.reason,
    details: input.details?.trim() || null,
    status: "open",
    created_at: created,
    reviewed_at: null,
  };
}

/** Admin queue — reports joined with parent post, newest first. */
export async function listReaderReports(limit = 200): Promise<ReaderReportWithPost[]> {
  const client = getClient();
  const res = await client.execute({
    sql: `SELECT r.*, p.title_bn AS postTitle, p.slug AS postSlug, p.category AS postCategory
          FROM reader_reports r LEFT JOIN posts p ON p.id = r.post_id
          ORDER BY r.created_at DESC LIMIT ?`,
    args: [limit],
  });
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      ...mapReport(row),
      postTitle: (row.postTitle as string | null) ?? null,
      postSlug: (row.postSlug as string | null) ?? null,
      postCategory: (row.postCategory as string | null) ?? null,
    };
  });
}

/** Move a report to reviewed/dismissed (admin). */
export async function setReaderReportStatus(
  id: string,
  status: "reviewed" | "dismissed",
): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "UPDATE reader_reports SET status = ?, reviewed_at = ? WHERE id = ?",
    args: [status, nowIso(), id],
  });
}

/* ------------------------------------------------------------------ *
 * Bi-directional Sync (local file DB ↔ cloud Turso)
 * ------------------------------------------------------------------ */

/** Tables that participate in sync (in dependency order). */
const SYNC_TABLES = [
  "settings",
  "category_configs",
  "sources",
  "source_categories",
  "llm_providers",
  "raw_posts",
  "posts",
  "submitted_pages",
  "admin_users",
  "admin_sessions",
  "pipeline_runs",
  "removal_requests",
  "reader_reports",
  "admin_actions",
  "comments",
  "redaction_blocklist",
] as const;

type SyncTable = typeof SYNC_TABLES[number];

interface SyncOptions {
  direction: "push" | "pull"; // push = local → cloud, pull = cloud → local
  tables?: SyncTable[];
  dryRun?: boolean;
}

/**
 * Perform bi-directional sync between local and cloud databases.
 * Uses INSERT OR REPLACE with timestamp-based conflict resolution.
 */
export async function syncDatabases(
  localClient: ReturnType<typeof getClient>,
  cloudClient: ReturnType<typeof getClient>,
  options: SyncOptions = { direction: "push" },
): Promise<{
  ok: true;
  synced: Record<string, { inserted: number; updated: number; deleted: number }>;
  conflicts: number;
  durationMs: number;
}> {
  const start = Date.now();
  const tables = options.tables ?? SYNC_TABLES;
  const direction = options.direction;
  const dryRun = options.dryRun ?? false;

  const results: Record<string, { inserted: number; updated: number; deleted: number }> = {};
  let totalConflicts = 0;

  // Get or create sync checkpoints
  async function getCheckpoint(table: SyncTable) {
    const res = await localClient.execute({
      sql: "SELECT last_local_max_id, last_cloud_max_id FROM sync_checkpoint WHERE table_name = ?",
      args: [table],
    });
    return res.rows[0] as Record<string, unknown> | undefined;
  }

  async function setCheckpoint(table: SyncTable, localMaxId: string | null, cloudMaxId: string | null) {
    await localClient.execute({
      sql: `INSERT OR REPLACE INTO sync_checkpoint (table_name, last_synced_at, last_local_max_id, last_cloud_max_id)
            VALUES (?, ?, ?, ?)`,
      args: [table, nowIso(), localMaxId, cloudMaxId],
    });
  }

  for (const table of tables) {
    const checkpoint = await getCheckpoint(table);
    const localMaxId = checkpoint?.last_local_max_id as string | null;
    const cloudMaxId = checkpoint?.last_cloud_max_id as string | null;

    // Determine source and target based on direction
    const src = direction === "push" ? localClient : cloudClient;
    const dst = direction === "push" ? cloudClient : localClient;
    const srcMaxId = direction === "push" ? localMaxId : cloudMaxId;

    // Fetch changes since last sync
    const changes = await src.execute({
      sql: `SELECT * FROM ${table} WHERE id > ? ORDER BY id ASC`,
      args: [srcMaxId ?? ""],
    });

    let inserted = 0;
    let updated = 0;
    let deleted = 0;

    for (const row of changes.rows) {
      const rowData = row as Record<string, unknown>;
      const id = String(rowData.id);

      // Check if exists in destination
      const existing = await dst.execute({
        sql: `SELECT updated_at FROM ${table} WHERE id = ?`,
        args: [id],
      });

      if (existing.rows.length === 0) {
        // Insert new
        if (!dryRun) {
          const cols = Object.keys(rowData).join(", ");
          const placeholders = Object.keys(rowData).map(() => "?").join(", ");
          const values = Object.values(rowData) as InValue[];
          await dst.execute({ sql: `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, args: values });
        }
        inserted++;
      } else {
        // Conflict resolution: newer updated_at wins
        const existingRow = existing.rows[0];
        const dstUpdated = existingRow ? String(existingRow.updated_at ?? "") : "";
        const srcUpdated = String(rowData.updated_at ?? "");
        
        if (srcUpdated > dstUpdated) {
          if (!dryRun) {
            const sets = Object.keys(rowData).filter(k => k !== "id").map(k => `${k} = ?`).join(", ");
            const values = Object.entries(rowData).filter(([k]) => k !== "id").map(([, v]) => v) as InValue[];
            await dst.execute({ sql: `UPDATE ${table} SET ${sets} WHERE id = ?`, args: [...values, id] });
          }
          updated++;
          totalConflicts++;
        }
        // If dst is newer, skip (dst wins)
      }
    }

    results[table] = { inserted, updated, deleted };

    // Update checkpoint
    const newMaxId = changes.rows.length > 0 
      ? String(changes.rows[changes.rows.length - 1]?.id ?? "")
      : srcMaxId;
    await setCheckpoint(table, 
      direction === "push" ? newMaxId : localMaxId!,
      direction === "push" ? cloudMaxId! : newMaxId);
  }

  // Log sync
  if (!dryRun) {
    await localClient.execute({
      sql: `INSERT INTO sync_log (id, direction, source_db, target_db, tables_synced, rows_affected, conflicts_resolved, status, started_at, finished_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)`,
      args: [
        crypto.randomUUID(),
        direction,
        direction === "push" ? "local" : "cloud",
        direction === "push" ? "cloud" : "local",
        JSON.stringify(tables),
        Object.values(results).reduce((s, r) => s + r.inserted + r.updated, 0),
        totalConflicts,
        new Date(start).toISOString(),
        nowIso(),
      ],
    });
  }

  return {
    ok: true,
    synced: results,
    conflicts: totalConflicts,
    durationMs: Date.now() - start,
  };
}

/** Get sync history. */
export async function getSyncHistory(limit = 50) {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM sync_log ORDER BY started_at DESC LIMIT ?",
    args: [limit],
  });
  return res.rows;
}

/** Reset sync checkpoints (force full re-sync). */
export async function resetSyncCheckpoints(): Promise<void> {
  const client = getClient();
  await client.execute("DELETE FROM sync_checkpoint");
}
/* ------------------------------------------------------------------ *
 * Paginated history reads
 *
 * The admin log and archive screens used fixed LIMITs with no way to reach
 * older rows, which made history silently incomplete. These take an explicit
 * page and return the total so the UI can render a paginator.
 * ------------------------------------------------------------------ */

export interface Page<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Clamp a caller-supplied page to a sane, positive integer. */
function safePage(page: number | undefined): number {
  const n = Number(page);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export async function listAdminActionsPage(
  page = 1,
  pageSize = 40,
): Promise<Page<Record<string, unknown>>> {
  const p = safePage(page);
  const client = getClient();
  const countRes = await client.execute("SELECT COUNT(*) AS n FROM admin_actions");
  const total = Number((countRes.rows[0] as Record<string, unknown>).n ?? 0);
  const res = await client.execute({
    sql: "SELECT * FROM admin_actions ORDER BY created_at DESC LIMIT ? OFFSET ?",
    args: [pageSize, (p - 1) * pageSize],
  });
  return { rows: res.rows as Record<string, unknown>[], total, page: p, pageSize };
}

export async function listPipelineRunsPage(
  page = 1,
  pageSize = 25,
): Promise<Page<RecentPipelineRun>> {
  const p = safePage(page);
  const client = getClient();
  const countRes = await client.execute("SELECT COUNT(*) AS n FROM pipeline_runs");
  const total = Number((countRes.rows[0] as Record<string, unknown>).n ?? 0);
  const res = await client.execute({
    sql: "SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT ? OFFSET ?",
    args: [pageSize, (p - 1) * pageSize],
  });
  const rows: RecentPipelineRun[] = res.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id),
      started_at: String(row.started_at),
      finished_at: (row.finished_at as string | null) ?? null,
      status: String(row.status),
      stats: parseJson<Record<string, unknown> | null>(row.stats as string, null),
      provider_used: (row.provider_used as string | null) ?? null,
      error: (row.error as string | null) ?? null,
    };
  });
  return { rows, total, page: p, pageSize };
}

export async function listArchivedPostsPage(
  page = 1,
  pageSize = 50,
): Promise<Page<Post>> {
  const p = safePage(page);
  const client = getClient();
  const countRes = await client.execute(
    "SELECT COUNT(*) AS n FROM posts WHERE archived_at IS NOT NULL",
  );
  const total = Number((countRes.rows[0] as Record<string, unknown>).n ?? 0);
  const res = await client.execute({
    sql: "SELECT * FROM posts WHERE archived_at IS NOT NULL ORDER BY archived_at DESC LIMIT ? OFFSET ?",
    args: [pageSize, (p - 1) * pageSize],
  });
  return {
    rows: res.rows.map((r) => mapPost(r as Record<string, unknown>)),
    total,
    page: p,
    pageSize,
  };
}

/**
 * Trim history tables that grow without bound.
 *
 * Pipeline runs and admin actions are append-only and a busy site writes a run
 * every two hours plus an audit row per edit, so the tables would otherwise
 * grow forever. `adminActions` keeps a smaller slice because the audit trail
 * is the more sensitive of the two.
 */
export async function trimHistory(olderThanDays = 90): Promise<{
  runs: number;
  actions: number;
}> {
  const client = getClient();
  const cutoff = new Date(Date.now() - olderThanDays * 86_400_000).toISOString();
  const runs = await client.execute({
    sql: "DELETE FROM pipeline_runs WHERE started_at < ? AND status != 'running'",
    args: [cutoff],
  });
  const actions = await client.execute({
    sql: "DELETE FROM admin_actions WHERE created_at < ?",
    args: [cutoff],
  });
  return { runs: runs.rowsAffected, actions: actions.rowsAffected };
}

/**
 * How many rows `trimHistory` would delete, without deleting anything.
 *
 * The maintenance panel runs a dry run before the real trim, but the dry run used
 * to only restate the retention window — it gave the operator no idea whether
 * the trim would remove 3 rows or 300,000, so there was nothing to review before
 * committing to an irreversible delete.
 */
export async function countTrimmableHistory(olderThanDays = 90): Promise<{
  runs: number;
  actions: number;
}> {
  const client = getClient();
  const cutoff = new Date(Date.now() - olderThanDays * 86_400_000).toISOString();
  const runs = await client.execute({
    sql: "SELECT COUNT(*) AS n FROM pipeline_runs WHERE started_at < ? AND status != 'running'",
    args: [cutoff],
  });
  const actions = await client.execute({
    sql: "SELECT COUNT(*) AS n FROM admin_actions WHERE created_at < ?",
    args: [cutoff],
  });
  const n = (r: { rows: unknown[] }) => Number((r.rows[0] as Record<string, unknown>)?.n ?? 0);
  return { runs: n(runs), actions: n(actions) };
}

/* ------------------------------------------------------------------ *
 * Content hygiene
 * ------------------------------------------------------------------ */

/**
 * Titles that the rewrite step used to emit when the model returned nothing
 * usable. They were stored verbatim and shown to readers, which is how
 * &ldquo;শিরোনাম ছাড়া&rdquo; ended up in the archive. The parser no longer
 * produces them, but rows written before the fix still exist.
 */
const PLACEHOLDER_TITLES = ["শিরোনাম ছাড়া", "শিরোনাম ছাড়া।", "Untitled", "untitled"];

/**
 * Quarantine posts that can never be published.
 *
 * A post is unusable when the title is one of the known placeholders or is
 * blank, or when the body is empty. These are moved to `rejected` rather than
 * deleted: the raw source text is still kept in `raw_posts`, so a re-scrape can
 * rebuild the post properly once the pipeline fix is in place.
 *
 * Returns the ids touched so callers can report them.
 */
export async function quarantineUnusablePosts(): Promise<string[]> {
  const client = getClient();
  const titleClause = unusableTitleClause();
  const res = await client.execute({
    sql: `
      UPDATE posts
         SET status = 'rejected',
             updated_at = ?
       WHERE status IN ('pending_review', 'approved', 'unreviewed')
         AND archived_at IS NULL
         AND ${titleClause}
    `,
    args: [nowIso(), ...PLACEHOLDER_TITLES],
  });
  // RETURNING is not portable across libsql/sqlite builds, so re-select.
  const ids = await client.execute({
    sql: `
      SELECT id FROM posts
       WHERE status = 'rejected'
         AND archived_at IS NULL
         AND ${titleClause}
    `,
    args: [...PLACEHOLDER_TITLES],
  });
  void res;
  return ids.rows.map((r) => String((r as Record<string, unknown>).id));
}

/** Count posts that the quarantine above would affect. */
export async function countUnusablePosts(): Promise<number> {
  const client = getClient();
  const res = await client.execute({
    sql: `SELECT COUNT(*) AS n FROM posts WHERE archived_at IS NULL AND ${unusableTitleClause()}`,
    args: [...PLACEHOLDER_TITLES],
  });
  return Number((res.rows[0] as Record<string, unknown>).n ?? 0);
}

/** Shared predicate; its `?` placeholders must be supplied in order. */
function unusableTitleClause(): string {
  const holes = PLACEHOLDER_TITLES.map(() => "?").join(", ");
  return `(
    TRIM(COALESCE(title_bn, '')) = ''
    OR LOWER(TRIM(COALESCE(title_bn, ''))) IN (${holes})
    OR TRIM(COALESCE(body_bn, '')) = ''
  )`;
}
