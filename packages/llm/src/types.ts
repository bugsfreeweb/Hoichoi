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
  sourcePageName: string;
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
 * A field starts a new section only when the line begins with an all-caps
 * label followed by a colon, e.g. `TITLE:` or `SAFETY_FLAG:`.
 */
const FIELD_LABEL = /^([A-Z][A-Z0-9_]*):[ \t]?/;

/**
 * Parses strict `<LABEL>: <value>` output into structured fields.
 *
 * This walks the output line by line instead of using one regex per field.
 * The previous regex terminator was `(?=^[A-Z_]+:|\s*$)`; under the `m` flag
 * `\s*$` matches at *every* line end rather than only at end-of-string, so the
 * lazy BODY capture stopped at the first newline. Every multi-paragraph
 * article was silently reduced to its opening paragraph, which is why posts
 * read as a one-line brief instead of an article. A line scanner has no such
 * ambiguity and also tolerates Windows line endings.
 */
export function parseRewriteOutput(raw: string): ParsedRewrite {
  const fields: Record<string, string> = {};
  let label: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (label) fields[label] = buffer.join("\n").trim();
  };

  for (const line of raw.split(/\r?\n/)) {
    const m = FIELD_LABEL.exec(line);
    if (m) {
      flush();
      label = m[1]!;
      // Keep the remainder of the label's own line, so single-line values work.
      buffer = [line.slice(m[0].length)];
    } else if (label) {
      buffer.push(line);
    }
  }
  flush();

  const grab = (name: string) => fields[name] ?? "";

  const safetyRaw = grab("SAFETY_FLAG").toLowerCase();
  const safetyFlag = (
    ["minor_involved", "unverified_claim", "graphic_content"].includes(safetyRaw)
      ? safetyRaw
      : "none"
  ) as ParsedRewrite["safety_flag"];

  const caseRaw = grab("CASE_STATUS").toLowerCase();
  const caseStatus = (
    ["active", "found", "unresolved", "false-alarm"].includes(caseRaw)
      ? caseRaw
      : undefined
  ) as ParsedRewrite["case_status"];

  return {
    // Intentionally no "শিরোনাম ছাড়া" fallback: an absent title must stay
    // empty so the scraper rejects the post instead of storing a placeholder
    // headline on the site.
    title_bn: grab("TITLE"),
    summary_bn: grab("SUMMARY"),
    body_bn: grab("BODY"),
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