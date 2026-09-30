import { getClient, mapPost } from "@hoichoi/db";
import { isBengaliScript } from "@hoichoi/llm";
import type { CategoryConfig, CategorySlug, Post, RewriteOutput } from "@hoichoi/shared-types";
import type { ParsedRewrite } from "@hoichoi/llm";

export interface RedactionBlocklistEntry {
  value: string;
  kind: string;
}

export async function loadRedactionBlocklist(): Promise<string[]> {
  const client = getClient();
  const res = await client.execute("SELECT value FROM redaction_blocklist");
  return res.rows.map((r) => String(r.value));
}

/** Replace sensitive tokens. `mode` follows category config redaction_strict. */
export function redactText(
  text: string,
  mode: "maximum" | "standard" | "child_minimal",
  blocklist: string[],
  opts: { policeHelpline?: string; childHelpline?: string } = {},
): string {
  let out = text;
  let count = 0;

  // Phone numbers (Bangla + latin digits, BD-style) → helpline or placeholder.
  const phoneRe =
    /(?:\+?88)?(?:\b0\d{9}\b|\b০\d{১০}\b|\b\d{11}\b)[ ,؛;-]*/g;
  const phone = opts.childHelpline ?? "১০৯";
  out = out.replace(phoneRe, (m) => {
    count++;
    return mode === "maximum" ? "XXXXXXXXXXXX" : phone;
  });

  // Blocklist entries.
  for (const value of blocklist) {
    if (!value) continue;
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "gi");
    if (re.test(out)) {
      out = out.replace(re, () => {
        count++;
        return mode === "maximum" ? "XXX" : "ওই ব্যক্তি";
      });
    }
  }

  // maximum: strip any remaining suspected names around common markers.
  if (mode === "maximum") {
    out = out.replace(
      /(?:জনাব|শ্রী|মোঃ|মো\.?|আব্দুল|আব্দুল্লাহ|মোস্তাফিজুর|শেখ)\s+[^.\s,;।]+/gi,
      () => {
        count++;
        return "XXX";
      },
    );
    // Replace numeric ages with a generic phrase to avoid precise identity.
    out = out.replace(/\d{1,2}\s*[বছর|বর্ষ]/g, () => {
      count++;
      return "এক শিশু";
    });
  }
  return mode === "maximum" ? out.trim() : out.trim();
}

export interface RewriteOutcome {
  rewritten: RewriteOutput;
  provider: string;
  flags: string[];
  redacted: boolean;
  embedding: number[] | null;
}

/**
 * Run the LLM rewrite + post-pass:
 *  1. resolve a provider (with fallback + cooldown, in Resolver)
 *  2. parse strict output
 *  3. redact per category policy
 *  4. compute embedding via the embedding provider
 *  5. validate Bengali script
 */
export async function rewritePost(input: {
  rawText: string;
  sourceName: string;
  sourcePageName: string;
  category: CategorySlug;
  categoryConfig: CategoryConfig;
  originalAuthorName?: string | null;
  policeHelpline?: string;
  childHelpline?: string;
  /** Optional override from operator preferences; providers clamp and default. */
  temperature?: number;
  resolver: import("@hoichoi/llm").Resolver;
  log?: (msg: string) => void;
}): Promise<RewriteOutcome> {
  const { resolver, log = () => {} } = input;
  const ctx = {
    rawText: input.rawText,
    sourceName: input.sourceName,
    sourcePageName: input.sourcePageName,
    category: input.category,
    categoryConfig: input.categoryConfig,
    originalAuthorName: input.originalAuthorName ?? null,
    temperature: input.temperature,
  };

  const { out, provider } = await resolver.rewrite(ctx);
  const flags: string[] = [];
  const redaction =
    input.categoryConfig.redaction_strict === "none"
      ? out.body_bn
      : redactText(
          out.body_bn,
          input.categoryConfig.redaction_strict,
          await loadRedactionBlocklist(),
          { policeHelpline: input.policeHelpline, childHelpline: input.childHelpline },
        );
  let redacted = false;
  if (redaction !== out.body_bn) {
    redacted = true;
    out.body_bn = redaction;
  }

  if (out.safety_flag !== "none") flags.push(out.safety_flag);

  let embedding: number[] | null = null;
  try {
    const { vector } = await resolver.embedText(
      `${out.title_bn} ${out.summary_bn} ${out.body_bn}`,
    );
    embedding = vector;
    log(`[llm] embedding ok (${vector.length} dims, ${provider})`);
  } catch (err) {
    log(`[llm] embedding skipped: ${(err as Error).message}`);
  }

  if (!isBengaliScript(`${out.title_bn} ${out.body_bn}`)) {
    flags.push("bengali_script_missing");
  }
  if (input.categoryConfig.requires_double_approval) {
    flags.push("needs_double_approval");
  }
  if (redacted) flags.push("redacted");

  return {
    rewritten: out,
    provider,
    flags,
    redacted,
    embedding,
  };
}

/** Unique but stable-ish slug: transliterate Bengal→latin where possible. */
export function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[০-৯]/g, (d) => "0123456789"["০১২৩৪৫৬৭৮৯".indexOf(d)] ?? d)
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const rand = crypto.randomUUID().slice(0, 6);
  return `${base || "post"}-${rand}`;
}

export function resolveCaseStatus(out: ParsedRewrite): Post["case_status"] {
  return out.case_status ?? null;
}

export { mapPost };