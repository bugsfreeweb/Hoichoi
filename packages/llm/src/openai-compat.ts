import type { HealthCheckResult, LLMProviderRow } from "@hoichoi/shared-types";
import { ProviderError, type LLMProvider, type ParsedRewrite, type RewriteContext } from "./types";
import { getSystemPrompt } from "./prompts";
import { parseRewriteOutput } from "./types";

export interface OpenAICompatOptions {
  row: LLMProviderRow;
  key: string | null;
  defaultBaseUrl: string;
  extraHeaders?: Record<string, string>;
  /** Provider-specific OpenAI-compatible embedding path override. */
  embedPath?: string;
  /** Some providers put the key as bearer, others need a different header. */
  authHeaderName?: string;
  stripBearer?: boolean;
}

/** Extracts reasoning-free text from an OpenAI-compatible chat response. */
function extractCompletion(data: {
  choices?: Array<{ message?: { content?: string | null } | null } | null>;
}): string {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new ProviderError("bad_output", "empty chat completion");
  }
  return content;
}

function extractEmbedding(data: {
  data?: Array<{ embedding?: number[] } | null>;
}): number[] {
  const emb = data?.data?.[0]?.embedding;
  if (!emb || emb.length === 0) {
    throw new ProviderError("bad_output", "empty embedding response");
  }
  return emb;
}

/** Classify HTTP status into typed ProviderError. */
export function classifyStatus(status: number, body: string): never {
  if (status === 429) throw new ProviderError("rate_limit", `429 rate limited: ${body.slice(0, 300)}`);
  if (status === 401 || status === 403) throw new ProviderError("auth", `${status} auth error: ${body.slice(0, 300)}`);
  if (status >= 500) throw new ProviderError("network", `${status} server error: ${body.slice(0, 300)}`);
  throw new ProviderError("unknown", `${status} ${body.slice(0, 300)}`);
}

/**
 * Generic OpenAI-compatible provider. Covers groq, openrouter, mistral,
 * openai, ollama, and any custom OpenAI-compatible endpoint.
 */
export class OpenAICompatProvider implements LLMProvider {
  readonly name: string;
  readonly providerKey: LLMProviderRow["provider_key"];
  readonly isFreeTier: boolean;
  readonly supportsEmbeddings: boolean;
  private readonly row: LLMProviderRow;
  private readonly key: string | null;
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(opts: OpenAICompatOptions) {
    this.row = opts.row;
    this.name = opts.row.display_name;
    this.providerKey = opts.row.provider_key;
    this.isFreeTier = Boolean(opts.row.is_free_tier);
    this.supportsEmbeddings = Boolean(opts.row.supports_embeddings);
    this.key = opts.key;
    this.baseUrl = opts.row.base_url?.replace(/\/$/, "") ?? opts.defaultBaseUrl.replace(/\/$/, "");
    this.headers = {
      "content-type": "application/json",
      ...(opts.extraHeaders ?? {}),
    };
    if (this.key) {
      if (opts.stripBearer) {
        this.headers["authorization"] = this.key;
      } else {
        this.headers["authorization"] = `Bearer ${this.key}`;
      }
    }
  }

  async rewrite(ctx: RewriteContext, signal?: AbortSignal): Promise<ParsedRewrite> {
    const system = getSystemPrompt(ctx);
    const user = this.buildUserPrompt(ctx);
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers,
      signal,
      body: JSON.stringify({
        model: this.row.model_name,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.3,
        max_tokens: 700,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      classifyStatus(res.status, body);
    }
    const data = (await res.json()) as Parameters<typeof extractCompletion>[0];
    return parseRewriteOutput(extractCompletion(data));
  }

  async embed(text: string, signal?: AbortSignal): Promise<number[]> {
    if (!this.supportsEmbeddings) {
      throw new ProviderError("bad_output", `${this.name} does not support embeddings`);
    }
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: this.headers,
      signal,
      body: JSON.stringify({ model: this.embeddingModel(), input: text }),
    });
    if (!res.ok) {
      const body = await res.text();
      classifyStatus(res.status, body);
    }
    const data = (await res.json()) as Parameters<typeof extractEmbedding>[0];
    return extractEmbedding(data);
  }

  async healthCheck(signal?: AbortSignal): Promise<HealthCheckResult> {
    const started = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.headers,
        signal,
        body: JSON.stringify({
          model: this.row.model_name,
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 1,
        }),
      });
      if (!res.ok) classifyStatus(res.status, await res.text());
      return { ok: true, latencyMs: Date.now() - started };
    } catch (err) {
      const e = err as Error;
      return { ok: false, error: e.message, latencyMs: Date.now() - started };
    }
  }

  protected buildUserPrompt(ctx: RewriteContext): string {
    const parts = [`মূল ফেসবুক পোস্ট (${ctx.sourcePageName}):`, ctx.rawText];
    if (ctx.originalAuthorName) parts.unshift(`মূল লেখক: ${ctx.originalAuthorName}`);
    parts.push(
      "নিচের ফরম্যাটে শুধুমাত্র ফলাফল দাও:\nTITLE: ...\nSUMMARY: ...\nBODY: ...\nSAFETY_FLAG: ...",
      ctx.category === "missing-children" ? "CASE_STATUS: <active|found|unresolved|false-alarm|unknown>" : "",
    );
    return parts.filter((p) => p !== "").join("\n\n");
  }

  protected embeddingModel(): string {
    const override = (this.row.config as Record<string, unknown> | null)?.embedding_model;
    return typeof override === "string" ? override : this.row.model_name;
  }
}