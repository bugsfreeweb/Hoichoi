import type {
  CategoryConfig,
  CategorySlug,
  HealthCheckResult,
  LLMProviderRow,
  RewriteInput,
} from "@hoichoi/shared-types";

export type { HealthCheckResult };

/** Strict rewrite output parsed from the `<label>: <value>` format. */
export interface ParsedRewrite {
  title_bn: string;
  summary_bn: string;
  body_bn: string;
  safety_flag: "none" | "minor_involved" | "unverified_claim" | "graphic_content";
  case_status?: "active" | "found" | "unresolved" | "false-alarm" | "unknown";
}

export interface RewriteContext extends RewriteInput {
  category: CategorySlug;
  categoryConfig: CategoryConfig;
  /** Bangla display name of the category, used to frame the generic editorial prompt. */
  categoryNameBn?: string;
  /** Bangla description of the category, used to frame the generic editorial prompt. */
  categoryDescriptionBn?: string;
  sourcePageName: string;
  /**
   * Sampling temperature for this call. Optional because a rewrite should never
   * fail just because nobody set a preference: providers fall back to the
   * conservative 0.3 used for Bengali editorial prose.
   */
  temperature?: number;
}

/** Default temperature for rewrite calls. */
export const DEFAULT_TEMPERATURE = 0.3;

/** Clamp a caller-supplied temperature into the range providers accept. */
export function resolveTemperature(t: number | null | undefined): number {
  if (typeof t !== "number" || !Number.isFinite(t)) return DEFAULT_TEMPERATURE;
  return Math.min(1, Math.max(0, t));
}

export interface LLMProvider {
  readonly name: string;
  readonly providerKey: LLMProviderRow["provider_key"];
  readonly isFreeTier: boolean;
  readonly supportsEmbeddings: boolean;
  rewrite(ctx: RewriteContext, signal?: AbortSignal): Promise<ParsedRewrite>;
  embed?(text: string, signal?: AbortSignal): Promise<number[]>;
  healthCheck(signal?: AbortSignal): Promise<HealthCheckResult>;
}

/** Resolves a key for a provider at runtime (env → vault). */
export type KeyResolver = (envVar: string) => string | null;

export interface ProviderFactoryOptions {
  row: LLMProviderRow;
  key: string | null;
}

export class ProviderError extends Error {
  readonly kind: "rate_limit" | "auth" | "network" | "bad_output" | "unknown";
  constructor(kind: ProviderError["kind"], message: string) {
    super(message);
    this.name = "ProviderError";
    this.kind = kind;
  }
}

/**
 * Bangla aliases for the canonical labels. Some rerouted or fine-tuned models
 * echo "শিরোনাম:" instead of "TITLE:", which the strict scanner could never
 * see, so every rewrite from that model lost its headline. Recognising the
 * aliases keeps a bad echo from silently dropping a section.
 */
const BANGLA_LABEL_ALIASES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["TITLE", ["শিরোনাম"]],
  ["SUMMARY", ["সংক্ষিপ্ত বিবরণ", "সারসংক্ষেপ", "সারমর্ম", "সারাংশ"]],
  ["BODY", ["মূল বিবরণ", "মূল অংশ", "মূল লেখা", "মূল বার্তা", "বিস্তারিত"]],
  ["SAFETY_FLAG", ["নিরাপত্তা পতাকা", "নিরাপত্তা ফ্ল্যাগ"]],
  ["CASE_STATUS", ["মামলার অবস্থা", "কেস স্ট্যাটাস"]],
];

/**
 * English label prefix: a line starts a new section when its leading token is
 * one of the canonical labels, optionally bulleted (`-`/`*`/`•`) or double-
 * starred bold, or spelled with spaces instead of underscores (`SAFETY FLAG`,
 * `CASE STATUS`). The long labels must be tried before the short ones.
 */
const ENGLISH_LABEL_PREFIX =
  /^[ \t]*(?:[-*•][ \t]+)?\*{0,2}[ \t]*((?:CASE[\s_\-]?STATUS|SAFETY[\s_\-]?FLAG|TITLE|SUMMARY|BODY))[ \t]*\*{0,2}[ \t]*(?::[ \t]*|$)/i;

const CANONICAL_BY_NORM: Record<string, string> = {
  title: "TITLE",
  summary: "SUMMARY",
  body: "BODY",
  safetyflag: "SAFETY_FLAG",
  casestatus: "CASE_STATUS",
};

/** Reads `field` directly when the model wrote it in canonical form. */
function grabField(fields: Record<string, string>, name: string): string {
  return fields[name] ?? "";
}

/**
 * Parses `<LABEL>: <value>` output into structured fields.
 *
 * This walks the output line by line instead of using one regex per field.
 * The previous regex terminator was `(?=^[A-Z_]+:|\s*$)`; under the `m` flag
 * `\s*$` matches at *every* line end rather than only at end-of-string, so the
 * lazy BODY capture stopped at the first newline. Every multi-paragraph
 * article was silently reduced to its opening paragraph, which is why posts
 * read as a one-line brief instead of an article. A line scanner has no such
 * ambiguity and also tolerates Windows line endings.
 *
 * The scanner is lenient about presentation: a ``` fence around the whole
 * answer, a preamble before the first label, bold `**TITLE:**`, bulleted
 * `- TITLE:`, spaced `SAFETY FLAG`, and the Bangla aliases below are all
 * accepted. Anything before the first label is discarded.
 */
export function parseRewriteOutput(raw: string): ParsedRewrite {
  let text = raw
    .replace(/^```[a-zA-Z0-9_-]*[ \t]*\r?\n/, "")
    .replace(/\r?\n```[ \t]*$/, "")
    .trim();

  const fields: Record<string, string> = {};
  let label: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (label) fields[label] = buffer.join("\n").trim();
  };

  const labelOf = (line: string): { label: string; value: string } | null => {
    const stripped = line
      .trim()
      .replace(/^[-*•][ \t]+/, "")
      .replace(/\*\*/g, "");
    for (const [canon, aliases] of BANGLA_LABEL_ALIASES) {
      for (const alias of aliases) {
        if (stripped.startsWith(alias)) {
          const rest = stripped.slice(alias.length);
          if (/^[ \t]*(?::[ \t]*|$)/.test(rest)) {
            return { label: canon, value: rest.replace(/^[ \t]*:[ \t]*/, "") };
          }
        }
      }
    }
    const m = ENGLISH_LABEL_PREFIX.exec(stripped);
    if (m) {
      const canon = CANONICAL_BY_NORM[m[1]!.toLowerCase().replace(/[^a-z]/g, "")];
      if (canon) return { label: canon, value: stripped.slice(m[0].length) };
    }
    // Preserve the strict all-caps boundary: `NOTE:` or `UPDATE:` after BODY
    // must close the body section even though they are not canonical fields.
    const strict = /^([A-Z][A-Z0-9_]*):[ \t]?/.exec(stripped);
    if (strict) return { label: strict[1]!, value: stripped.slice(strict[0].length) };
    return null;
  };

  for (const line of text.split(/\r?\n/)) {
    const hit = labelOf(line);
    if (hit) {
      flush();
      label = hit.label;
      buffer = [hit.value];
    } else if (label) {
      buffer.push(line);
    }
  }
  flush();

  const title = grabField(fields, "TITLE");
  const summary = grabField(fields, "SUMMARY");
  const body = grabField(fields, "BODY");

  const norm = (v: string) => v.toLowerCase().replace(/[^a-z]/g, "");
  const safetyRaw = norm(grabField(fields, "SAFETY_FLAG"));
  const safetyMap: Record<string, ParsedRewrite["safety_flag"]> = {
    minorinvolved: "minor_involved",
    minor: "minor_involved",
    unverifiedclaim: "unverified_claim",
    unverified: "unverified_claim",
    graphiccontent: "graphic_content",
    graphic: "graphic_content",
  };
  const safetyFlag = safetyMap[safetyRaw] ?? "none";

  const caseRaw = norm(grabField(fields, "CASE_STATUS"));
  const caseMap: Record<string, ParsedRewrite["case_status"]> = {
    active: "active",
    found: "found",
    unresolved: "unresolved",
    falsealarm: "false-alarm",
    unknown: "unknown",
  };
  const caseStatus = caseMap[caseRaw] ?? undefined;

  return {
    // Intentionally no "শিরোনাম ছাড়া" fallback: an absent title must stay
    // empty so the scraper rejects the post instead of storing a placeholder
    // headline on the site.
    title_bn: title,
    summary_bn: summary,
    body_bn: body,
    safety_flag: safetyFlag,
    case_status: caseStatus,
  };
}

/** Verifies the first 100 chars are Bengali script (U+0980–U+09FF). */
export function isBengaliScript(text: string, windowChars = 100): boolean {
  const slice = text.slice(0, windowChars).replace(/\s+/g, "");
  if (slice.length === 0) return false;
  let bengali = 0;
  for (const ch of slice) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x0980 && code <= 0x09ff) bengali++;
  }
  return bengali / slice.length >= 0.6;
}