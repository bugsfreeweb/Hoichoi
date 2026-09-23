import type {
  ArchiveReason,
  CaseStatus,
  CategoryConfig,
  CategoryMeta,
  CategorySlug,
  LLMProviderRow,
  MediaKind,
  Notice,
  NoticeTone,
  PipelineRun,
  Post,
  PostStatus,
  RawPost,
  RemovalRequest,
  SafetyFlag,
  Source,
  SubmittedPage,
} from "@hoichoi/shared-types";

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function yesNo(value: unknown): boolean {
  return Boolean(value);
}

function rowDates<T extends { created_at?: string }>(row: T): T {
  return row;
}

export function mapSource(row: Record<string, unknown>, categories?: CategorySlug[]): Source {
  return {
    id: String(row.id),
    page_url: String(row.page_url),
    page_name: String(row.page_name),
    category: row.category as CategorySlug,
    categories: categories ?? [], // Populated via source_categories join by callers
    is_verified: yesNo(row.is_verified),
    is_active: yesNo(row.is_active),
    last_scraped_at: (row.last_scraped_at as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

export function mapRawPost(row: Record<string, unknown>): RawPost {
  return {
    id: String(row.id),
    source_id: String(row.source_id),
    fb_post_id: String(row.fb_post_id),
    fb_post_url: String(row.fb_post_url),
    raw_text: (row.raw_text as string | null) ?? null,
    media_urls: parseJson<string[]>(row.media_urls as string, []),
    screenshot_path: (row.screenshot_path as string | null) ?? null,
    phash: (row.phash as string | null) ?? null,
    scraped_at: String(row.scraped_at),
    raw_meta: parseJson<Record<string, unknown> | null>(row.raw_meta as string, null),
  };
}

export function mapPost(row: Record<string, unknown>): Post {
  rowDates(row);
  return {
    id: String(row.id),
    raw_post_id: (row.raw_post_id as string | null) ?? null,
    source_id: (row.source_id as string | null) ?? null,
    category: row.category as CategorySlug,
    title_bn: String(row.title_bn),
    body_bn: String(row.body_bn),
    summary_bn: (row.summary_bn as string | null) ?? null,
    media_path: (row.media_path as string | null) ?? null,
    media_kind: (row.media_kind as MediaKind) ?? "none",
    source_url: String(row.source_url),
    source_name: String(row.source_name),
    slug: String(row.slug),
    status: row.status as PostStatus,
    safety_flags: parseJson<SafetyFlag[]>(row.safety_flags as string, []),
    embedding: parseJson<number[] | null>(row.embedding as string, null),
    case_status: (row.case_status as CaseStatus | null) ?? null,
    case_updated_at: (row.case_updated_at as string | null) ?? null,
    original_author_name: (row.original_author_name as string | null) ?? null,
    original_author_url: (row.original_author_url as string | null) ?? null,
    published_at: (row.published_at as string | null) ?? null,
    archived_at: (row.archived_at as string | null) ?? null,
    archive_reason: (row.archive_reason as ArchiveReason | null) ?? null,
    legal_hold: yesNo(row.legal_hold),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function mapSubmittedPage(row: Record<string, unknown>): SubmittedPage {
  return {
    id: String(row.id),
    page_url: String(row.page_url),
    page_name: (row.page_name as string | null) ?? null,
    submitter_email: (row.submitter_email as string | null) ?? null,
    submitter_name: (row.submitter_name as string | null) ?? null,
    category: (row.category as CategorySlug | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    status: row.status as SubmittedPage["status"],
    reviewed_by: (row.reviewed_by as string | null) ?? null,
    reviewed_at: (row.reviewed_at as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

export function mapProvider(row: Record<string, unknown>): LLMProviderRow {
  return {
    id: String(row.id),
    provider_key: row.provider_key as LLMProviderRow["provider_key"],
    display_name: String(row.display_name),
    base_url: (row.base_url as string | null) ?? null,
    model_name: String(row.model_name),
    api_key_env_var: String(row.api_key_env_var),
    api_key: (row.api_key as string | null | undefined) ?? null,
    priority: Number(row.priority),
    is_active: yesNo(row.is_active),
    is_free_tier: yesNo(row.is_free_tier),
    supports_rewrite: yesNo(row.supports_rewrite),
    supports_embeddings: yesNo(row.supports_embeddings),
    rate_limit_rpm: (row.rate_limit_rpm as number | null) ?? null,
    config: parseJson<Record<string, unknown> | null>(row.config as string, null),
    last_ok_at: (row.last_ok_at as string | null | undefined) ?? null,
    last_error_at: (row.last_error_at as string | null | undefined) ?? null,
    error_count: Number((row.error_count as number | null | undefined) ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function mapPipelineRun(row: Record<string, unknown>): PipelineRun {
  return {
    id: String(row.id),
    started_at: String(row.started_at),
    finished_at: (row.finished_at as string | null) ?? null,
    status: row.status as PipelineRun["status"],
    stats: parseJson<Record<string, unknown> | null>(row.stats as string, null),
    provider_used: (row.provider_used as string | null) ?? null,
    error: (row.error as string | null) ?? null,
  };
}

export function mapNotice(row: Record<string, unknown>): Notice {
  return {
    id: String(row.id),
    title: String(row.title),
    body: (row.body as string | null) ?? null,
    tone: (row.tone as NoticeTone) ?? "info",
    url: (row.url as string | null) ?? null,
    pinned: yesNo(row.pinned),
    is_active: yesNo(row.is_active),
    expires_at: (row.expires_at as string | null) ?? null,
    created_by: String(row.created_by ?? "web"),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function mapRemovalRequest(row: Record<string, unknown>): RemovalRequest {
  return {
    id: String(row.id),
    post_id: String(row.post_id),
    reason: (row.reason as string | null) ?? null,
    reporter_email: (row.reporter_email as string | null) ?? null,
    status: row.status as RemovalRequest["status"],
    created_at: String(row.created_at),
  };
}

/** Category seed data (used by migrations, seeds, and the web layer). */
export const CATEGORY_SEED: CategoryMeta[] = [
  {
    slug: "child-sexual-abuse",
    displayNameBn: "শিশু যৌন নির্যাতন",
    displayNameEn: "Child sexual abuse",
    descriptionBn:
      "মাদ্রাসা, মসজিদ ও বেসরকারি পরিবেশে শিশু (পুত্র ও কন্যা) যৌন নির্যাতনের শিকারদের সংবাদ।",
    descriptionEn:
      "News about child sexual abuse victims in madrasas, mosques, and private settings (male and female).",
    isActive: true,
    sortOrder: 1,
    dot: "2563eb",
    config: {
      requires_double_approval: true,
      show_content_warning: true,
      content_warning_text_bn:
        "সতর্কতা: এই প্রবন্ধে শিশু যৌন নির্যাতন সংক্রান্ত বিষয়বস্তু রয়েছে, যা পড়তে কষ্টকর হতে পারে।",
      auto_pending_review: true,
      redaction_strict: "maximum",
      allow_identifying_details: false,
      publish_age_gate: false,
    },
    showInFooter: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    slug: "extramarital-crime",
    displayNameBn: "পরকীয়া অপরাধ",
    displayNameEn: "Extramarital crime & blackmail",
    descriptionBn:
      "পরকীয়া সম্পর্কজনিত চাঁদাবাজি, হুমকি, ব্ল্যাকমেইল ও সংশ্লিষ্ট অপরাধের সংবাদ।",
    descriptionEn:
      "News about blackmail, extortion, and criminal acts arising from extramarital affairs.",
    isActive: true,
    sortOrder: 2,
    dot: "d2202c",
    config: {
      requires_double_approval: false,
      show_content_warning: false,
      auto_pending_review: false,
      redaction_strict: "standard",
      allow_identifying_details: true,
      use_allegation_language: true,
    },
    showInFooter: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    slug: "missing-children",
    displayNameBn: "নিখোঁজ শিশু",
    displayNameEn: "Missing children & child safety",
    descriptionBn:
      "নিখোঁজ শিশুদের সংবাদ, উদ্ধার ও সচেতনতা এবং অপহরণ-সংক্রান্ত গুজব-সতর্কতা।",
    descriptionEn:
      "News and awareness about missing children and abduction-safety incidents.",
    isActive: true,
    sortOrder: 3,
    dot: "0d9488",
    config: {
      requires_double_approval: false,
      show_content_warning: false,
      auto_pending_review: false,
      redaction_strict: "child_minimal",
      allow_identifying_details: true,
      supports_case_status: true,
      share_widely_cta: true,
      include_helpline_numbers: true,
    },
    showInFooter: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/** Normalize a category dot to CSS-ready `#hex` (legacy seed values stored
 *  without the `#` prefix, e.g. "2563eb"). */
function normalizeDot(value: unknown, fallback: string): string {
  const raw = String(value ?? "").trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(raw)) return raw;
  if (/^[0-9a-fA-F]{3,8}$/.test(raw)) return `#${raw}`;
  return fallback;
}

export function mapCategory(row: Record<string, unknown>): CategoryMeta {
  const base = CATEGORY_SEED.find((c) => c.slug === row.slug);
  const dot = normalizeDot(row.dot, base?.dot ? `#${base.dot}` : "#4a4a4a");
  return {
    slug: row.slug as CategorySlug,
    displayNameBn: String(row.display_name_bn),
    displayNameEn: String(row.display_name_en),
    descriptionBn: (row.description_bn as string) ?? "",
    descriptionEn: (row.description_en as string) ?? "",
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order ?? 0),
    dot,
    config: parseJson<CategoryConfig>(
      row.config as string,
      base?.config ?? ({} as CategoryConfig),
    ),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    showInFooter: (row as Record<string, unknown>).show_in_footer === undefined ? true : Boolean(row.show_in_footer),
  };
}