import type { HealthCheckResult, LLMProviderRow } from "@hoichoi/shared-types";
import { ProviderError, type LLMProvider, type ParsedRewrite, type RewriteContext } from "./types";
import { getSystemPrompt } from "./prompts";
import { parseRewriteOutput, resolveTemperature } from "./types";

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

/**
 * Extracts reasoning-free text from an OpenAI-compatible chat response.
 *
 * Custom BYOK endpoints disagree on where the completion lives: some return
 * `message.content` as a string, some as an array of text parts, legacy ones
 * return `choices[0].text`, and reasoning models occasionally put every token
 * in `reasoning_content`. Every shape is accepted rather than only the
 * canonical one.
 */
function extractCompletion(data: Record<string, unknown>): string {
  const choices = data?.choices as Array<Record<string, unknown>> | undefined;
  const choice = choices?.[0] ?? (data?.candidates as Array<Record<string, unknown>>)?.[0];
  const message = (choice?.message as Record<string, unknown> | undefined) ?? choice ?? {};
  let content = message.content as string | Array<unknown> | null | undefined;

  if (Array.isArray(content)) {
    content = content
      .map((part) => {
        if (typeof part === "string") return part;
        const p = part as Record<string, unknown>;
        return typeof p.text === "string" ? p.text : p.type === "text" ? "" : "";
      })
      .filter((t) => typeof t === "string" && t.length > 0)
      .join("\n");
  }

  if (typeof content !== "string" || content.trim().length === 0) {
    const alt =
      (typeof choice?.text === "string" && choice.text.trim()) ||
      (typeof message.reasoning_content === "string" && message.reasoning_content.trim()) ||
      (typeof data.output_text === "string" && data.output_text.trim()) ||
      (typeof data.content === "string" && data.content.trim());
    if (alt) content = alt;
    else throw new ProviderError("bad_output", "empty chat completion");
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
  private readonly embedPath: string | undefined;
  private readonly headers: Record<string, string>;

  constructor(opts: OpenAICompatOptions) {
    this.row = opts.row;
    this.name = opts.row.display_name;
    this.providerKey = opts.row.provider_key;
    this.isFreeTier = Boolean(opts.row.is_free_tier);
    this.supportsEmbeddings = Boolean(opts.row.supports_embeddings);
    this.key = opts.key;
    this.embedPath = opts.embedPath;
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
    const content = await this.postUntilOk(
      this.chatCandidates(),
      {
        model: this.row.model_name,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: resolveTemperature(ctx.temperature),
        max_tokens: 4096,
      },
      extractCompletion,
      signal,
    );
    return parseRewriteOutput(content);
  }

  async embed(text: string, signal?: AbortSignal): Promise<number[]> {
    if (!this.supportsEmbeddings) {
      throw new ProviderError("bad_output", `${this.name} does not support embeddings`);
    }
    return this.postUntilOk(
      this.embedCandidates(),
      { model: this.embeddingModel(), input: text },
      extractEmbedding,
      signal,
    );
  }

  async healthCheck(signal?: AbortSignal): Promise<HealthCheckResult> {
    const started = Date.now();
    try {
      const body = {
        model: this.row.model_name,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1,
      };
      let reason = "";
      for (const url of this.chatCandidates()) {
        let res: Response;
        try {
          res = await fetch(url, {
            method: "POST",
            headers: this.headers,
            signal,
            body: JSON.stringify(body),
          });
        } catch (err) {
          reason = (err as Error).message;
          continue;
        }
        if (res.ok) return { ok: true, latencyMs: Date.now() - started };
        if (res.status === 404 || res.status === 405 || res.status === 501) {
          reason = `no endpoint at ${url} (${res.status})`;
          continue;
        }
        return {
          ok: false,
          error: `${res.status} ${(await res.text()).slice(0, 200)}`,
          latencyMs: Date.now() - started,
        };
      }
      return { ok: false, error: reason || "no chat endpoint answered", latencyMs: Date.now() - started };
    } catch (err) {
      return { ok: false, error: (err as Error).message, latencyMs: Date.now() - started };
    }
  }

  /**
   * Ordered candidate endpoints for a chat-completions call under one base
   * URL. Custom BYOK providers disagree on where `/chat/completions` lives
   * relative to `base_url`: OpenAI and most gateways keep it under `/v1/...`,
   * Groq and GitHub Models under `/openai/v1`, and the rest put it directly at
   * the root. Each candidate is POSTed until one answers; 404/405/501 means the
   * path is bogus, so a user who typed `https://api.groq.com/openai` (missing
   * the `/v1`) still works. `base_url` here can even be the full endpoint —
   * that case is tried first.
   */
  private chatCandidates(): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    const push = (u: string) => {
      if (!/^https?:\/\//i.test(u) || seen.has(u)) return;
      seen.add(u);
      out.push(u);
    };
    if (/\/chat\/completions\/?$/i.test(this.baseUrl)) push(this.baseUrl);
    push(`${this.baseUrl}/chat/completions`);
    push(`${this.baseUrl}/v1/chat/completions`);
    push(`${this.baseUrl}/openai/v1/chat/completions`);
    return out;
  }

  /** The embeddings analog of {@link chatCandidates}. */
  private embedCandidates(): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    const push = (u: string) => {
      if (!/^https?:\/\//i.test(u) || seen.has(u)) return;
      seen.add(u);
      out.push(u);
    };
    if (this.embedPath) {
      push(this.embedPath.startsWith("/") ? `${this.baseUrl}${this.embedPath}` : `${this.baseUrl}/${this.embedPath}`);
    }
    if (/\/embeddings\/?$/i.test(this.baseUrl)) push(this.baseUrl);
    push(`${this.baseUrl}/embeddings`);
    push(`${this.baseUrl}/v1/embeddings`);
    push(`${this.baseUrl}/openai/v1/embeddings`);
    return out;
  }

  /**
   * POSTs `body` to each candidate endpoint until one returns a usable JSON
   * payload. Endpoint-missing statuses (404/405/501) move on to the next path
   * shape; a genuine provider error (auth, rate limit, 5xx, bad request) aborts
   * immediately because re-sending against another path cannot fix it.
   */
  private async postUntilOk<T>(
    candidates: string[],
    body: unknown,
    extract: (data: Record<string, unknown>) => T,
    signal?: AbortSignal,
  ): Promise<T> {
    let lastReason: Error | null = null;
    for (const url of candidates) {
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: this.headers,
          signal,
          body: JSON.stringify(body),
        });
      } catch (err) {
        lastReason = err instanceof Error ? err : new Error(String(err));
        continue;
      }
      if (res.ok) return extract((await res.json()) as Record<string, unknown>);
      const text = await res.text();
      if (res.status === 404 || res.status === 405 || res.status === 501) {
        lastReason = new ProviderError("bad_output", `no endpoint at ${url} (${res.status})`);
        continue;
      }
      classifyStatus(res.status, text);
    }
    if (lastReason) throw lastReason;
    throw new ProviderError("bad_output", `no usable endpoint under base_url "${this.baseUrl}"`);
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