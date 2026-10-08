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
    platform: (String(row.platform ?? "facebook") as Source["platform"]) || "facebook",
    kind: String(row.kind) === "group" ? "group" : "page",
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
      keywords: [
        "ধর্ষণ", "ধর্ষণের", "ধর্ষকের", "ধর্ষিত", "যৌন নির্যাতন", "যৌন নির্যাতনে",
        "যৌন হয়রানি", "অভিসার", "অভিসারে", "অভিসারের", "শ্লীলতাহানি", "ইভটিজিং",
        "অশ্লীল", "পর্নো", "পর্নোগ্রাফি", "পর্নো ভিডিও", "নাবালক", "নাবালিকা",
        "মাদ্রাসা ছাত্রী", "স্কুলছাত্রী", "ছাত্রীকে", "শিশুকে ধর্ষণ", "শিশু নির্যাতন",
        "গণধর্ষণ", "অপ্রাপ্তবয়স্ক", "সঙ্গে জড়িত",
      ],
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
      keywords: [
        "পরকীয়া", "পরকীয়ায়", "পরকীয়া প্রেম", "ব্যভিচার", "ব্যভিচারে",
        "অবৈধ সম্পর্ক", "অবৈধ সম্পর্কে", "শারীরিক সম্পর্ক", "স্বামীর প্রেমিকা",
        "স্বামীর প্রেমিকার", "স্ত্রীর প্রেমিক", "স্ত্রীর সাথে প্রেম", "উপপত্নী",
        "বৈবাহিক বে-ইমানি", "বিয়ে করে", "অন্য পুরুষের সাথে",
      ],
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
      keywords: [
        "নিখোঁজ", "নিখোজ", "নিখুঁজ", "খোঁজা", "খুঁজছে", "হারিয়ে গেছে",
        "হারিয়ে যাওয়া", "হারিয়ে যায়", "উধাও", "উধাও হয়েছে",
        "খুঁজে পাওয়া যাচ্ছে না", "খুঁজে পাওয়া যায়নি", "সন্ধান চাই",
        "সন্ধান চলছে", "অভিযোগ দায়ের", "এলাকা ছেড়ে", "নিজ বাড়ি থেকে",
        "ছবি থেকে", "ছেলেটি", "মেয়েটি",
      ],
    },
    showInFooter: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * General editorial categories seeded idempotently (INSERT OR IGNORE) on every
 * `ensureSchema` run.
 *
 * There are no longer only three "special" categories — the catalogue is a
 * full, dynamic list. Each entry carries a `keywords` list so the classifier's
 * topic detection (#4 in the classify book) actually has signal for these
 * slugs, and they are READY to publish (routine config) so a helping or
 * inspiration post is no longer parked under the extramarital/child-abuse
 * frames. Admins can edit or archive these exactly like any other category.
 */
export const GENERAL_CATEGORY_SEED: Array<{
  slug: string;
  displayNameBn: string;
  displayNameEn: string;
  descriptionBn: string;
  descriptionEn: string;
  dot: string;
  sortOrder: number;
  keywords: string[];
}> = [
  {
    slug: "health",
    displayNameBn: "স্বাস্থ্য",
    displayNameEn: "Health",
    descriptionBn: "রোগ, চিকিৎসা, হাসপাতাল ও জনস্বাস্থ্য সেবা সংক্রান্ত সংবাদ।",
    descriptionEn: "Health, treatment, hospitals, and public health news.",
    dot: "16a34a",
    sortOrder: 4,
    keywords: [
      "স্বাস্থ্য", "হাসপাতাল", "ডাক্তার", "চিকিৎসা", "চিকিৎসক", "রোগী", "জ্বর",
      "ডেঙ্গু", "ভ্যাকসিন", "টিকা", "ক্যান্সার", "অপারেশন", "ওষুধ", "ক্লিনিক", "মহামারী",
    ],
  },
  {
    slug: "education",
    displayNameBn: "শিক্ষা",
    displayNameEn: "Education",
    descriptionBn: "শিক্ষা প্রতিষ্ঠান, পরীক্ষা, ভর্তি ও শিক্ষার্থীদের সংবাদ।",
    descriptionEn: "Educational institutions, exams, admissions, and student news.",
    dot: "7c3aed",
    sortOrder: 5,
    keywords: [
      "শিক্ষা", "শিক্ষক", "স্কুল", "কলেজ", "বিশ্ববিদ্যালয়", "পরীক্ষা", "ভর্তি",
      "পাঠ্যবই", "শিক্ষার্থী", "মাদ্রাসা", "বোর্ড", "রেজাল্ট", "বৃত্তি", "হোস্টেল",
    ],
  },
  {
    slug: "sports",
    displayNameBn: "খেলাধুলা",
    displayNameEn: "Sports",
    descriptionBn: "ক্রিকেট, ফুটবল ও জাতীয় দলের খেলার সংবাদ।",
    descriptionEn: "Cricket, football, and national team news.",
    dot: "0891b2",
    sortOrder: 6,
    keywords: [
      "খেলা", "ক্রিকেট", "ফুটবল", "খেলোয়াড়", "টুর্নামেন্ট", "ম্যাচ", "মাঠ",
      "স্টেডিয়াম", "উইকেট", "গোল", "হ্যাটট্রিক", "অলিম্পিক", "দল", "অভিষেক",
    ],
  },
  {
    slug: "politics",
    displayNameBn: "রাজনীতি",
    displayNameEn: "Politics",
    descriptionBn: "দলীয় কর্মসূচি, নির্বাচন ও রাজনৈতিক নেতাদের সংবাদ।",
    descriptionEn: "Party programs, elections, and national politics.",
    dot: "dc2626",
    sortOrder: 7,
    keywords: [
      "রাজনীতি", "রাজনৈতিক", "নির্বাচন", "সংসদ", "মন্ত্রী", "মন্ত্রণালয়", "সরকার",
      "আন্দোলন", "সমাবেশ", "নেতা", "মেয়র", "চেয়ারম্যান", "কমিটি", "দল", "রাষ্ট্রপতি",
    ],
  },
  {
    slug: "corruption",
    displayNameBn: "দুর্নীতি",
    displayNameEn: "Corruption",
    descriptionBn: "দুর্নীতি, ঘুষ ও সরকারি অনিয়ম সংক্রান্ত সংবাদ।",
    descriptionEn: "Corruption, bribery, and public-sector irregularities.",
    dot: "b45309",
    sortOrder: 8,
    keywords: [
      "দুর্নীতি", "দুর্নীতিবাজ", "ঘুষ", "অনিয়ম", "অডিট", "অপচয়", "তহবিল আত্মসাৎ",
      "সুবর্ণদুর্গ", "লুটপাট", "দালালি", "সরকারি হিসাব", "উন্মুক্ত আইন",
    ],
  },
  {
    slug: "environment",
    displayNameBn: "পরিবেশ ও দুর্যোগ",
    displayNameEn: "Environment & disasters",
    descriptionBn: "প্রাকৃতিক দুর্যোগ, নদী, বন ও জলবায়ু পরিবর্তনের সংবাদ।",
    descriptionEn: "Natural disasters, rivers, forests, and climate change.",
    dot: "15803d",
    sortOrder: 9,
    keywords: [
      "বন্যা", "ভূমিকম্প", "ঝড়", "ঘূর্ণিঝড়", "পরিবেশ", "দূষণ", "জলবায়ু", "নদী",
      "হাওর", "আবাদ", "খরা", "তাপপ্রবাহ", "শৈত্যপ্রবাহ", "দুর্যোগ", "বজ্রপাত",
    ],
  },
  {
    slug: "accident",
    displayNameBn: "দুর্ঘটনা",
    displayNameEn: "Accidents",
    descriptionBn: "সড়ক, নৌ ও অন্যান্য দুর্ঘটনার সংবাদ।",
    descriptionEn: "Road, water, and other accident news.",
    dot: "ea580c",
    sortOrder: 10,
    keywords: [
      "দুর্ঘটনা", "সংঘর্ষ", "চাপা", "ধাক্কা", "দগ্ধ", "আহত", "ঘটনাস্থল", "বাস উল্টে",
      "ট্রাকচাপা", "নৌকাডুবি", "ভেঙে", "ধসে", "আগুন", "বিস্ফোরণ", "পড়ে",
    ],
  },
  {
    slug: "crime",
    displayNameBn: "অপরাধ",
    displayNameEn: "Crime",
    descriptionBn: "চুরি, ডাকাতি, খুন ও অপরাধ সংক্রান্ত সংবাদ।",
    descriptionEn: "Theft, dacoity, homicide, and crime news.",
    dot: "be123c",
    sortOrder: 11,
    keywords: [
      "অপরাধ", "চুরি", "ডাকাতি", "ছিনতাই", "খুন", "হত্যা", "সন্ত্রাস", "মাদক",
      "প্রতারক", "প্রতারণা", "ধর্ষণ", "মামলা", "গ্রেপ্তার", "অস্ত্র", "চাঁদাবাজি",
    ],
  },
  {
    slug: "inspiration",
    displayNameBn: "অনুপ্রেরণা",
    displayNameEn: "Inspiration",
    descriptionBn: "স্বপ্ন, অর্জন ও অসাধারণ সাহসের গল্প।",
    descriptionEn: "Dreams, achievements, and extraordinary courage stories.",
    dot: "059669",
    sortOrder: 12,
    keywords: [
      "অনুপ্রেরণা", "উদ্বোধক", "স্বপ্ন", "সাফল্য", "সফল", "সাহস", "উদ্যোগ", "সম্মাননা",
      "অর্জন", "নজির", "আদর্শ", "অসাধারণ", "লড়াই", "জয়", "অভিনন্দন",
    ],
  },
  {
    slug: "helping-others",
    displayNameBn: "মানবিক সহায়তা",
    displayNameEn: "Helping others",
    descriptionBn: "স্বেচ্ছাসেবা, দান, ত্রাণ ও সহায়তার সংবাদ।",
    descriptionEn: "Volunteering, charity, relief, and support stories.",
    dot: "0d9488",
    sortOrder: 13,
    keywords: [
      "সাহায্য", "সহায়তা", "স্বেচ্ছাসেবী", "দান", "ত্রাণ", "ওষুধ বিলি", "রক্তদান",
      "তহবিল", "উদ্যোগে", "হাত বাড়িয়ে", "পাশে দাঁড়িয়ে", "অর্থ সংগ্রহ", "খাদ্য বিতরণ",
      "উপহার", "সাহায্যের হাত",
    ],
  },
  {
    slug: "history-traditions",
    displayNameBn: "ঐতিহ্য ও ইতিহাস",
    displayNameEn: "Heritage & history",
    descriptionBn: "প্রাচীন ঐতিহ্য, সংস্কৃতি ও উৎসবের খবর।",
    descriptionEn: "Ancient heritage, culture, and festival news.",
    dot: "a16207",
    sortOrder: 14,
    keywords: [
      "ঐতিহ্য", "ইতিহাস", "পুরাকীর্তি", "সংস্কৃতি", "উৎসব", "লোকশিল্প", "ঐতিহ্যবাহী",
      "পহেলা", "বৈশাখ", "মেলায়", "মন্দির", "মসজিদ", "প্রাচীন", "শিল্প", "স্থাপত্য",
    ],
  },
  {
    slug: "economy",
    displayNameBn: "অর্থনীতি",
    displayNameEn: "Economy",
    descriptionBn: "বাজার, দাম, রপ্তানি ও ব্যাংকের সংবাদ।",
    descriptionEn: "Markets, prices, exports, and banking news.",
    dot: "2563eb",
    sortOrder: 15,
    keywords: [
      "অর্থনীতি", "বাজার", "দাম", "মজুরি", "রপ্তানি", "আমদানি", "মুদ্রা", "ব্যাংক",
      "ঋণ", "অর্থ", "বিনিয়োগ", "শেয়ার", "ডলার", "টাকা", "সোনা",
    ],
  },
  {
    slug: "rural-life",
    displayNameBn: "গ্রামজীবন",
    displayNameEn: "Rural life",
    descriptionBn: "কৃষি, ফসল, হাট-বাজার ও গ্রামীণ জীবনের সংবাদ।",
    descriptionEn: "Farming, crops, markets, and rural life news.",
    dot: "65a30d",
    sortOrder: 16,
    keywords: [
      "কৃষক", "ফসল", "ধান", "হাট", "মেলা", "গ্রাম", "কৃষি", "মাছ", "গবাদি পশু",
      "জমি", "চাষ", "বীজ", "সার", "খেত", "লোকজন",
    ],
  },
  {
    slug: "technology",
    displayNameBn: "প্রযুক্তি",
    displayNameEn: "Technology",
    descriptionBn: "ইন্টারনেট, অ্যাপ, স্টার্টআপ ও ডিজিটাল খবর।",
    descriptionEn: "Internet, apps, startups, and digital news.",
    dot: "0ea5e9",
    sortOrder: 17,
    keywords: [
      "প্রযুক্তি", "ইন্টারনেট", "অ্যাপ", "স্মার্টফোন", "স্টার্টআপ", "সাইবার", "ডিজিটাল",
      "ল্যাপটপ", "কম্পিউটার", "কৃত্রিম বুদ্ধিমত্তা", "এআই", "সফটওয়্যার", "নেটওয়ার্ক",
      "ডেটা", "অনলাইন",
    ],
  },
  {
    slug: "law-order",
    displayNameBn: "আইন ও বিচার",
    displayNameEn: "Law & justice",
    descriptionBn: "আদালত, মামলা ও বিচার প্রক্রিয়ার সংবাদ।",
    descriptionEn: "Courts, cases, and the justice process.",
    dot: "475569",
    sortOrder: 18,
    keywords: [
      "আদালত", "মামলা", "বিচার", "বিচারক", "পুলিশ", "এজাহার", "জামিন", "অভিযুক্ত",
      "রায়", "আপিল", "আদালতে", "তদন্ত", "সাক্ষী", "প্রমাণ", "দণ্ড",
    ],
  },
  {
    slug: "opinion",
    displayNameBn: "মতামত",
    displayNameEn: "Opinion",
    descriptionBn: "বিশ্লেষণ, কলাম ও পাঠক মতামত।",
    descriptionEn: "Analysis, columns, and reader opinions.",
    dot: "9333ea",
    sortOrder: 19,
    keywords: [
      "মতামত", "বিশ্লেষণ", "কলাম", "খোলা চিঠি", "দৃষ্টিভঙ্গি", "প্রতিচ্ছবি", "মত",
      "মন্তব্য", "পর্যালোচনা", "তাত্ত্বিক",
    ],
  },
  {
    slug: "research",
    displayNameBn: "গবেষণা",
    displayNameEn: "Research",
    descriptionBn: "বিজ্ঞান, গবেষণা ও নতুন তথ্যের খবর।",
    descriptionEn: "Science, research, and new discoveries.",
    dot: "134e4a",
    sortOrder: 20,
    keywords: [
      "গবেষণা", "গবেষক", "বিজ্ঞানী", "গবেষণাগার", "রিপোর্ট", "জরিপ", "পরিসংখ্যান",
      "আবিষ্কার", "শিক্ষায়তন", "পরীক্ষা", "ন্যাশনাল", "সার্ভে",
    ],
  },
  {
    slug: "diaspora",
    displayNameBn: "প্রবাস",
    displayNameEn: "Diaspora",
    descriptionBn: "প্রবাসে বাংলাদেশিদের জীবন ও স্মরণীয় ঘটনা।",
    descriptionEn: "Life and milestones of Bangladeshis abroad.",
    dot: "0f766e",
    sortOrder: 21,
    keywords: [
      "প্রবাস", "প্রবাসী", "প্রবাসে", "অভিবাসী", "রেমিট্যান্স", "ওভারসিজ", "বিদেশে",
      "আমেরিকা", "ইংল্যান্ড", "মালয়েশিয়া", "সৌদি", "দুবাই", "কায়িক শ্রমিক", "পাসপোর্ট",
    ],
  },
  {
    slug: "weather",
    displayNameBn: "আবহাওয়া",
    displayNameEn: "Weather",
    descriptionBn: "আবহাওয়ার পূর্বাভাস ও বর্তমান অবস্থা।",
    descriptionEn: "Weather forecasts and current conditions.",
    dot: "0284c7",
    sortOrder: 22,
    keywords: [
      "আবহাওয়া", "তাপমাত্রা", "বৃষ্টি", "আকাশ", "বায়ু", "আর্দ্রতা", "পূর্বাভাস",
      "আবহাওয়া অধিদপ্তর", "বর্ষা", "ঝড়বৃষ্টি", "মেঘ", "রোদ",
    ],
  },
  {
    slug: "misc",
    displayNameBn: "বিবিধ",
    displayNameEn: "Miscellaneous",
    descriptionBn: "অন্যান্য সব খবর যেগুলো অন্য শ্রেণিতে পড়ে না।",
    descriptionEn: "Everything else that fits nowhere else.",
    dot: "6b7280",
    sortOrder: 23,
    keywords: [],
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

/**
 * Accent palette for admin-created categories (CSS-ready `#hex`). Kept small
 * and distinct from the built-in seed colors so a new section reads as its own
 * color instead of silently sharing an existing one.
 */
export const CATEGORY_DOT_PALETTE = [
  "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316",
  "#ec4899", "#22c55e", "#06b6d4", "#eab308", "#a855f7", "#84cc16",
  "#f43f5e", "#10b981", "#3b82f6", "#d946ef",
] as const;

/**
 * Deterministic dot pick for a new category: the palette entry least used by
 * the categories that already exist. Idempotent and cheap, so callers can also
 * run it as a backfill over rows whose `dot` is still empty.
 */
export function pickCategoryDot(taken: ReadonlyArray<string | null | undefined>): string {
  const used = new Set(taken.filter((d): d is string => Boolean(d)).map((d) => d.toLowerCase()));
  for (const color of CATEGORY_DOT_PALETTE) {
    if (!used.has(color.toLowerCase())) return color;
  }
  return CATEGORY_DOT_PALETTE[taken.length % CATEGORY_DOT_PALETTE.length]!;
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