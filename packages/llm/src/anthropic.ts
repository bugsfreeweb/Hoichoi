import type { HealthCheckResult, LLMProviderRow } from "@hoichoi/shared-types";
import { classifyStatus } from "./openai-compat";
import { getSystemPrompt } from "./prompts";
import { ProviderError, type LLMProvider, type ParsedRewrite, type RewriteContext } from "./types";
import { parseRewriteOutput } from "./types";

const API_BASE = "https://api.anthropic.com";

interface AnthropicResponse {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string; type?: string };
}

export class AnthropicProvider implements LLMProvider {
  readonly name: string;
  readonly providerKey: LLMProviderRow["provider_key"];
  readonly isFreeTier: boolean;
  readonly supportsEmbeddings: boolean;
  private readonly row: LLMProviderRow;
  private readonly key: string | null;

  constructor(row: LLMProviderRow, key: string | null) {
    this.row = row;
    this.name = row.display_name;
    this.providerKey = "anthropic";
    this.isFreeTier = Boolean(row.is_free_tier);
    this.supportsEmbeddings = Boolean(row.supports_embeddings);
    this.key = key;
  }

  async rewrite(ctx: RewriteContext, signal?: AbortSignal): Promise<ParsedRewrite> {
    const base = this.row.base_url?.replace(/\/$/, "") ?? API_BASE;
    const user = [
      ctx.originalAuthorName ? `মূল লেখক: ${ctx.originalAuthorName}` : "",
      `মূল ফেসবুক পোস্ট (${ctx.sourcePageName}):`,
      ctx.rawText,
      "নিচের ফরম্যাটে শুধুমাত্র ফলাফল দাও:\nTITLE: ...\nSUMMARY: ...\nBODY: ...\nSAFETY_FLAG: ...",
    ]
      .filter(Boolean)
      .join("\n\n");

    const res = await fetch(`${base}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.key ?? "",
        "anthropic-version": "2023-06-01",
      },
      signal,
      body: JSON.stringify({
        model: this.row.model_name,
        system: getSystemPrompt(ctx),
        messages: [{ role: "user", content: user }],
        max_tokens: 700,
        temperature: 0.3,
      }),
    });
    if (!res.ok) classifyStatus(res.status, await res.text());
    const data = (await res.json()) as AnthropicResponse;
    const text = data.content?.map((b) => b.text ?? "").join("\n");
    if (data.error || !text) {
      throw new ProviderError("bad_output", data.error?.message ?? "anthropic returned no text");
    }
    return parseRewriteOutput(text);
  }

  async embed(): Promise<number[]> {
    throw new ProviderError("bad_output", "Anthropic does not provide embeddings via this interface");
  }

  async healthCheck(signal?: AbortSignal): Promise<HealthCheckResult> {
    const started = Date.now();
    try {
      const res = await fetch(`${(this.row.base_url ?? API_BASE).replace(/\/$/, "")}/v1/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.key ?? "",
          "anthropic-version": "2023-06-01",
        },
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
}