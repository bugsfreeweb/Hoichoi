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

/** Parses strict `<LABEL>: <value>` output into structured fields. */
export function parseRewriteOutput(raw: string): ParsedRewrite {
  const grab = (label: string) => {
    const rx = new RegExp(`^${label}:\\s*([\\s\\S]*?)(?=^[A-Z_]+:|\\s*$)`, "im");
    const m = raw.match(rx);
    return m ? m[1]!.trim() : "";
  };

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
    title_bn: grab("TITLE") || "শিরোনাম ছাড়া",
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