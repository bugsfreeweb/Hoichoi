import type { CategorySlug, SourceType } from "@hoichoi/shared-types";

/**
 * Fixed editorial taxonomy.
 *
 * Categories are still stored in `category_configs` so operators can rename and
 * colour them, but classification may only return one of these desks. The
 * guard below prevents the specific failure this list exists for: technology
 * and business copy filed as "দুর্নীতি" because the source or a weak keyword
 * match said so.
 */
export const FIXED_TAXONOMY = [
  "politics",
  "economy",
  "technology",
  "ai",
  "startup",
  "international",
  "bangladesh",
  "dhaka",
  "education",
  "health",
  "sports",
  "entertainment",
  "lifestyle",
  "environment",
  "law-order",
  "crime",
  "corruption",
  "administration",
  "transport",
  "agriculture",
  "opinion",
  "analysis",
  "social-media",
  "live-events",
  "opinion-polls",
  "misc",
] as const;

/** Existing DB descriptors that belong to the fixed desks. */
const ALIASES: Record<string, CategorySlug> = {
  tech: "technology",
  technology: "technology",
  ai: "ai",
  startup: "startup",
  economy: "economy",
  business: "economy",
  politics: "politics",
  international: "international",
  bangladesh: "bangladesh",
  dhaka: "dhaka",
  education: "education",
  health: "health",
  sports: "sports",
  entertainment: "entertainment",
  lifestyle: "lifestyle",
  environment: "environment",
  "law-order": "law-order",
  crime: "crime",
  corruption: "corruption",
  administration: "administration",
  transport: "transport",
  agriculture: "agriculture",
  opinion: "opinion",
  analysis: "analysis",
  "social-media": "social-media",
  "live-events": "live-events",
  "opinion-polls": "opinion-polls",
  misc: "misc",
  uncategorized: "misc",
  other: "misc",
  accident: "misc",
  tutorial: "technology",
  research: "analysis",
  inspiration: "opinion",
  "history-traditions": "opinion",
  literature: "opinion",
  diaspora: "international",
  viral: "social-media",
  "social-welfare": "bangladesh",
  "helping-others": "bangladesh",
  "medical-science": "health",
  "rural-life": "agriculture",
};

export function canonicalDesk(slug: string): CategorySlug | null {
  return ALIASES[slug] ?? null;
}

const TECH_RE =
  /(?:\bAI\b|কৃত্রিম বুদ্ধিমত্তা|এআই|artificial intelligence|machine learning|LLM|OpenAI|Anthropic|NVIDIA|Nvidia|এনভিডিয়া|GPU|chip|চিপ|semiconductor|software|সফটওয়্যার|developer|ডেভেলপার|database|ডেটাবেস|Figma|biotech|robotics|robot|cloud|cloud computing|cybersecurity|সাইবার|smartphone|iPhone|Android|app\b|অ্যাপ|Hacker News|TechCrunch|হ্যাকার|হ্যাক|পাসওয়ার্ড|password|hack|ransomware|breach|ডেটা চুরি)/i;
const SECURITY_INCIDENT_RE =
  /(?:হ্যাক|হ্যাকার|hack|ransomware|cyberattack|cyber attack|data breach|ডেটা চুরি|পাসওয়ার্ড চুরি|password leak|vulnerab|malware|ফিশিং|phishing|security flaw)/i;
const FINANCE_RE =
  /(?:IPO|আইপিও|revenue|earnings|valuation|funding|raises? \$|stock|শেয়ার|market cap|profit|লাভ|রাজস্ব)/i;
const HEALTH_RE =
  /(?:স্বাস্থ্য|চিকিৎসা|ঔষধ|ওষুধ|ভ্যাকসিন|টিকা|গর্ভনিরোধক|গর্ভাবস্থা|রোগ|হাসপাতাল|ডাক্তার|ক্যান্সার|ডায়াবেটিস|মানসিক স্বাস্থ্য|health|medicine|vaccine|contracept|pregnan|disease|hospital|doctor)/i;
const SPORTS_RE =
  /(?:ক্রিকেট|ফুটবল|খেলোয়াড়|ম্যাচ|গোল|টুর্নামেন্ট|অলিম্পিক|cricket|football|match|goal|tournament|olympic|athlete)/i;
const ENTERTAINMENT_RE =
  /(?:সিনেমা|চলচ্চিত্র|অভিনেতা|অভিনেত্রী|গান|সংগীত|বিনোদন|film|movie|actor|actress|music|entertainment|cinema)/i;
const INTERNATIONAL_RE =
  /(?:রাশিয়া|ইউক্রেন|গাজা|ইসরায়েল|ফিলিস্তিন|আমেরিকা|যুক্তরাষ্ট্র|চীন|ভারত|পাকিস্তান|ইউরোপ|নেটো|জাতিসংঘ|যুদ্ধ|international|ukraine|russia|gaza|israel|nato|united nations|war\b)/i;
const AI_RE =
  /(?:\bAI\b|কৃত্রিম বুদ্ধিমত্তা|এআই|artificial intelligence|machine learning|LLM|OpenAI|Anthropic|NVIDIA|Nvidia|GPU|Gemini|ChatGPT|model\b)/i;
const STARTUP_RE =
  /(?:startup|স্টার্টআপ|seed round|Series [A-C]|funding|ফান্ডিং|raises? \$|বিনিয়োগ|উদ্যোক্তা|venture capital|valuation)/i;
const BUSINESS_RE =
  /(?:revenue|earnings|market|বাজার|ব্যাংক|bank|শেয়ার|stock|inflation|GDP|export|import|রপ্তানি|আমদানি|budget|বাজেট|কোম্পানি|company|corporate|শিল্প)/i;
const CORRUPTION_EVIDENCE_RE =
  /(?:দুর্নীতি|দুর্নীতিবাজ|ঘুষ|ঘুষখোর|অনিয়ম|তহবিল আত্মসাৎ|আত্মসাৎ|লুটপাট|দালালি|সরকারি হিসাব|অডিট|audit|graft|bribery|embezzl|kickback|money laundering|অবৈধ সম্পদ|সুবর্ণদুর্গ)/i;
const NEGATED_EVIDENCE_RE =
  /(?:প্রমাণ|evidence|অভিযোগ).{0,40}(?:নেই|নাই|পাওয়া যায়নি|পাওয়া যায় না|অনুপস্থিত|absent|not found|no evidence)|(?:নেই|নাই|অনুপস্থিত).{0,30}(?:প্রমাণ|evidence)|কোনো.{0,30}অভিযোগ প্রকাশিত না|প্রমাণ.{0,20}অনুপস্থিত|সন্দেহজনক.{0,40}না/i;

/** A corruption word only counts when the sentence is not denying evidence. */
function hasCorruptionEvidence(text: string): boolean {
  const re = new RegExp(CORRUPTION_EVIDENCE_RE.source, "gi");
  for (const match of text.matchAll(re)) {
    const at = match.index ?? 0;
    const context = text.slice(
      Math.max(0, at - 100),
      at + match[0].length + 100,
    );
    if (!NEGATED_EVIDENCE_RE.test(context)) return true;
  }
  return false;
}

const ALLEGATION_RE =
  /(?:অভিযোগ|অভিযুক্ত|দাবি|দাবি করেছে|alleged|allegation|claims?|accused|accusation|রিপোর্ট অনুযায়ী)/i;

/**
 * Deterministic category guard. Returns the corrected desk and a reason for
 * the audit log, or `null` when the assigned desk stands.
 */
export function guardCategory(
  text: string,
  assigned: CategorySlug,
  sourceName = "",
): { slug: CategorySlug; reason: string } | null {
  const corpus = `${text}\n${sourceName}`;
  const canonical = canonicalDesk(assigned) ?? assigned;
  const techSource = /techcrunch|the verge|wired|arstechnica/i.test(sourceName);

  // A dedicated technology outlet files technology, not corruption. Even a
  // lawsuit or an allegation against a tech company belongs on a technology
  // desk (or business), never on the corruption desk by default.
  if (canonical === "corruption" && techSource) {
    if (AI_RE.test(corpus)) {
      return {
        slug: "ai",
        reason: "technology outlet story filed as corruption",
      };
    }
    if (STARTUP_RE.test(corpus)) {
      return {
        slug: "startup",
        reason: "technology outlet funding story filed as corruption",
      };
    }
    if (BUSINESS_RE.test(corpus)) {
      return {
        slug: "economy",
        reason: "technology outlet business story filed as corruption",
      };
    }
    return {
      slug: "technology",
      reason: "technology outlet story filed as corruption",
    };
  }

  // Technology / AI / startup / business must not become corruption without
  // explicit corruption evidence. This is a veto, not a preference.
  if (canonical === "corruption" && !hasCorruptionEvidence(corpus)) {
    if (AI_RE.test(corpus)) {
      return { slug: "ai", reason: "tech/AI story had no corruption evidence" };
    }
    if (STARTUP_RE.test(corpus)) {
      return {
        slug: "startup",
        reason: "startup/funding story had no corruption evidence",
      };
    }
    if (TECH_RE.test(corpus)) {
      return {
        slug: "technology",
        reason: "technology story had no corruption evidence",
      };
    }
    if (BUSINESS_RE.test(corpus)) {
      return {
        slug: "economy",
        reason: "business story had no corruption evidence",
      };
    }
    return {
      slug: "misc",
      reason: "corruption label had no corruption evidence",
    };
  }

  // A technology outlet's security incident is technology, even when its
  // business desk was the fallback. Funding/IPO copy stays on economy.
  if (
    techSource &&
    canonical === "economy" &&
    SECURITY_INCIDENT_RE.test(corpus) &&
    !FINANCE_RE.test(corpus)
  ) {
    return {
      slug: "technology",
      reason: "technology outlet security story filed as business",
    };
  }

  // A "misc" row is the least informative outcome of classification, not a
  // verdict. Clear health, sport, entertainment and world copy gets its desk.
  if (canonical === "misc") {
    // Only the headline decides a promotion out of misc. The body of a long
    // story mentions sport, illness and foreign countries incidentally, and
    // matching there filed unrelated copy on the wrong desk.
    const title = text.split("\n")[0] ?? "";
    if (AI_RE.test(title)) {
      return { slug: "ai", reason: "clear AI headline filed as misc" };
    }
    if (TECH_RE.test(title)) {
      return {
        slug: "technology",
        reason: "clear technology headline filed as misc",
      };
    }
    if (SPORTS_RE.test(title)) {
      return { slug: "sports", reason: "clear sport copy filed as misc" };
    }
    if (HEALTH_RE.test(title)) {
      return { slug: "health", reason: "clear health headline filed as misc" };
    }
    if (ENTERTAINMENT_RE.test(title)) {
      return {
        slug: "entertainment",
        reason: "clear entertainment copy filed as misc",
      };
    }
    if (INTERNATIONAL_RE.test(title)) {
      return {
        slug: "international",
        reason: "clear world copy filed as misc",
      };
    }
  }

  // A technology story assigned to a generic desk is not corruption either.
  if (
    canonical !== "technology" &&
    canonical !== "ai" &&
    canonical !== "startup" &&
    canonical !== "economy"
  ) {
    if (AI_RE.test(corpus) && !ALLEGATION_RE.test(corpus)) {
      return {
        slug: "ai",
        reason: "AI content filed outside a technology desk",
      };
    }
    if (TECH_RE.test(corpus) && !ALLEGATION_RE.test(corpus)) {
      return {
        slug: "technology",
        reason: "technology content filed outside a technology desk",
      };
    }
    if (STARTUP_RE.test(corpus) && !ALLEGATION_RE.test(corpus)) {
      return {
        slug: "startup",
        reason: "startup/funding content filed outside a business desk",
      };
    }
  }
  return null;
}

/** Desks that may never be auto-published or auto-featured. */
export const NEVER_AUTO_DESKS = new Set<string>([
  "child-sexual-abuse",
  "extramarital-crime",
  "missing-children",
]);

/** Content that must go to a human regardless of desk. */
export function needsHumanReview(input: {
  category: string;
  sourceCategory?: string;
  text: string;
  sourceType: SourceType;
  flags: readonly string[];
}): { review: boolean; reason: string } {
  if (NEVER_AUTO_DESKS.has(input.category)) {
    return { review: true, reason: `sensitive desk: ${input.category}` };
  }
  // A sensitive source stays sensitive even when a weak classifier moves the
  // story to a general desk. The source is the placement of record.
  if (input.sourceCategory && NEVER_AUTO_DESKS.has(input.sourceCategory)) {
    return {
      review: true,
      reason: `sensitive source desk: ${input.sourceCategory}`,
    };
  }
  if (
    input.category === "health" &&
    /(?:ভ্যাকসিন|টিকা|ঔষধ|ওষুধ|চিকিৎসা|cure|remedy|health claim|ক্যান্সার নিরাময়)/i.test(
      input.text,
    )
  ) {
    return { review: true, reason: "health claim needs human review" };
  }
  if (input.category === "politics" && input.sourceType === "facebook") {
    return { review: true, reason: "political social-media post" };
  }
  if (input.category === "politics" && ALLEGATION_RE.test(input.text)) {
    return { review: true, reason: "political allegation" };
  }
  if (
    /(?:নির্বাচন|election|ভোট|referendum)/i.test(input.text) &&
    input.category !== "opinion-polls"
  ) {
    return { review: true, reason: "election content" };
  }
  if (
    /(?:নিহত|মৃত্যু|casualt|dead|killed|ধর্মীয় সংঘর্ষ|religious clash|riot)/i.test(
      input.text,
    )
  ) {
    return { review: true, reason: "casualties or religious conflict" };
  }
  if (
    /(?:অভিযোগ|অভিযুক্ত|alleged|accused)/i.test(input.text) &&
    /(?:মন্ত্রী|এমপি|মেয়র|মুখ্যমন্ত্রী|minister|MP|mayor|CEO|চেয়ারম্যান)/i.test(
      input.text,
    )
  ) {
    return { review: true, reason: "allegation against a named public figure" };
  }
  if (
    input.flags.includes("minor_involved") ||
    input.flags.includes("unverified_claim")
  ) {
    return { review: true, reason: "safety flag requires human review" };
  }
  return { review: false, reason: "" };
}

/** Deterministic quality of the AI rewrite. Not a fact-check. */
export function rewriteQuality(out: {
  title_bn: string;
  body_bn: string;
  summary_bn: string;
  flags: readonly string[];
}): number {
  let score = 0.72;
  const title = out.title_bn.trim();
  const words = out.body_bn.trim().split(/\s+/).filter(Boolean).length;
  if (title.length >= 20 && title.length <= 120) score += 0.08;
  if (out.summary_bn.trim().length >= 50) score += 0.06;
  if (words >= 120) score += 0.1;
  if (words >= 220) score += 0.02;
  if (out.flags.includes("bengali_script_missing")) score -= 0.25;
  if (out.flags.includes("redacted")) score -= 0.03;
  return Math.max(0, Math.min(0.99, Math.round(score * 100) / 100));
}

export function sourceTypeFromUrl(url: string): SourceType {
  const raw = (url ?? "").trim();
  if (!raw) return "unknown";
  let parsed: URL;
  try {
    parsed = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return "unknown";
  }
  // The hostname, not substring matches on the full URL. This is both the
  // CodeQL fix and the correct rule: fb.com.example is not Facebook.
  const host = parsed.hostname.toLowerCase();
  if (
    host === "facebook.com" ||
    host.endsWith(".facebook.com") ||
    host === "fb.com" ||
    host.endsWith(".fb.com") ||
    host === "fb.watch" ||
    host.endsWith(".fb.watch")
  ) {
    return "facebook";
  }
  if (/(^|\.)gov(\.[a-z]{2})?$/.test(host) || host.endsWith(".government")) {
    return "government";
  }
  if (parsed.protocol === "http:" || parsed.protocol === "https:") return "news";
  return "unknown";
}
