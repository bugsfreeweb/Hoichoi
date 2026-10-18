import type { HealthCheckResult, LLMProviderRow } from "@hoichoi/shared-types";
import { classifyStatus } from "./openai-compat";
import { getSystemPrompt } from "./prompts";
import {
  ProviderError,
  composeImagePrompt,
  type ImageGenRequest,
  type ImageGenResult,
  type LLMProvider,
  type ParsedRewrite,
  type RewriteContext,
} from "./types";
import { parseRewriteOutput, resolveTemperature } from "./types";
import { decodeBase64, sniffImageMime } from "./image-util";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; inlineData?: { data?: string; mimeType?: string } }> };
  }>;
  error?: { message?: string; code?: number };
}

interface GeminiEmbedResponse {
  embedding?: { values?: number[] };
  error?: { message?: string; code?: number };
}

export class GoogleGeminiProvider implements LLMProvider {
  readonly name: string;
  readonly providerKey: LLMProviderRow["provider_key"];
  readonly isFreeTier: boolean;
  readonly supportsEmbeddings: boolean;
  readonly supportsImage = true;
  private readonly row: LLMProviderRow;
  private readonly key: string | null;

  constructor(row: LLMProviderRow, key: string | null) {
    this.row = row;
    this.name = row.display_name;
    this.providerKey = "google";
    this.isFreeTier = Boolean(row.is_free_tier);
    this.supportsEmbeddings = Boolean(row.supports_embeddings);
    this.key = key;
  }

  private fetchBase(): string {
    return this.row.base_url?.replace(/\/$/, "") ?? API_BASE;
  }

  async rewrite(ctx: RewriteContext, signal?: AbortSignal): Promise<ParsedRewrite> {
    const content = getSystemPrompt(ctx);
    const user = [
      ctx.originalAuthorName ? `মূল লেখক: ${ctx.originalAuthorName}` : "",
      `মূল ফেসবুক পোস্ট (${ctx.sourcePageName}):`,
      ctx.rawText,
      "নিচের ফরম্যাটে শুধুমাত্র ফলাফল দাও:\nTITLE: ...\nSUMMARY: ...\nBODY: ...\nSAFETY_FLAG: ...",
      ctx.category === "missing-children" ? "CASE_STATUS: <active|found|unresolved|false-alarm|unknown>" : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const res = await fetch(
      `${this.fetchBase()}/models/${encodeURIComponent(this.row.model_name)}:generateContent?key=${encodeURIComponent(this.key ?? "")}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: content }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: {
            temperature: resolveTemperature(ctx.temperature),
            maxOutputTokens: 4096,
          },
        }),
      },
    );
    if (!res.ok) classifyStatus(res.status, await res.text());
    const data = (await res.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n");
    if (!text) {
      throw new ProviderError("bad_output", data.error?.message ?? "gemini returned no text");
    }
    return parseRewriteOutput(text);
  }

  async embed(text: string, signal?: AbortSignal): Promise<number[]> {
    if (!this.supportsEmbeddings) {
      throw new ProviderError("bad_output", "Google provider not configured for embeddings");
    }
    const model = this.embeddingModel();
    const res = await fetch(
      `${this.fetchBase()}/models/${encodeURIComponent(model)}:embedContent?key=${encodeURIComponent(this.key ?? "")}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal,
        body: JSON.stringify({ content: { parts: [{ text }] } }),
      },
    );
    if (!res.ok) classifyStatus(res.status, await res.text());
    const data = (await res.json()) as GeminiEmbedResponse;
    const values = data.embedding?.values;
    if (!values || values.length === 0) {
      throw new ProviderError("bad_output", data.error?.message ?? "gemini returned no embedding");
    }
    return values;
  }

  /**
   * Text-to-image through Gemini's native `:generateContent` with
   * `responseModalities: ["TEXT", "IMAGE"]` (gemini-2.5-flash-image et al).
   * `aspectRatio` maps to `generationConfig.imageConfig`, which the image
   * models accept; older text models simply ignore the config.
   */
  async generateImage(req: ImageGenRequest, signal?: AbortSignal): Promise<ImageGenResult> {
    const model = req.model?.trim() || process.env.GEMINI_IMAGE_MODEL || this.row.model_name || "gemini-2.5-flash-image";
    const prompt = composeImagePrompt(req);
    const generationConfig: Record<string, unknown> = { responseModalities: ["TEXT", "IMAGE"] };
    if (req.aspectRatio) generationConfig.imageConfig = { aspectRatio: req.aspectRatio };
    const url = `${this.fetchBase()}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.key ?? "")}`;
    const body = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });

    let res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal,
      body,
    });
    // Some models (e.g. gemini-3.x flash) render images but gate the aspect
    // ratio feature, answering 400 "Aspect ratio is not enabled for this model".
    // The picture is still generatable, so drop `imageConfig` and retry once
    // with the natural ratio rather than failing the whole generation.
    if (!res.ok && generationConfig.imageConfig) {
      const text = await res.text();
      if (res.status === 400 && /aspect ratio/i.test(text)) {
        delete generationConfig.imageConfig;
        res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal,
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig,
          }),
        });
      } else {
        classifyStatus(res.status, text);
      }
    }
    if (!res.ok) classifyStatus(res.status, await res.text());
    const data = (await res.json()) as GeminiResponse;
    const inline = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
    if (!inline?.data) {
      throw new ProviderError("bad_output", data.error?.message ?? "gemini returned no inline image");
    }
    const bytes = decodeBase64(inline.data);
    return {
      bytes,
      contentType: inline.mimeType && inline.mimeType.startsWith("image/") ? inline.mimeType : sniffImageMime(bytes),
      provider: this.name,
      model,
      prompt,
    };
  }

  async healthCheck(signal?: AbortSignal): Promise<HealthCheckResult> {
    const started = Date.now();
    // Probe the *rewrite* path with a real, tiny generation call.
    //
    // The previous check did two things wrong:
    //   1. it asked for `text-embedding-004`, a retired model that answers 404,
    //      so a perfectly usable rewrite key was scored dead and skipped for
    //      the whole run; and
    //   2. it only did `GET /models/{id}`, which a model answers 200 for even
    //      when generation is refused (gemini-2.5-flash lists but 404s on
    //      :generateContent). A listing check therefore reports a model as
    //      healthy and then every real rewrite fails.
    // One max-token generation confirms the key, the model and the quota in the
    // same round trip that rewrite() will actually use.
    const model = this.row.model_name;
    try {
      const res = await fetch(
        `${this.fetchBase()}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.key ?? "")}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal,
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "hi" }] }],
            generationConfig: { maxOutputTokens: 1 },
          }),
        },
      );
      if (!res.ok) classifyStatus(res.status, await res.text());
      await res.json();
      return { ok: true, latencyMs: Date.now() - started };
    } catch (err) {
      const e = err as Error;
      return { ok: false, error: e.message, latencyMs: Date.now() - started };
    }
  }

  private embeddingModel(): string {
    const override = (this.row.config as Record<string, unknown> | null)?.embedding_model;
    if (typeof override === "string" && override) return override;
    // `text-embedding-004` was retired and answers 404, so every embedding
    // was skipped with "no embedding provider available" and SEM-1 dedup ran
    // silently disabled - reposts were only caught if their images happened to
    // collide. `gemini-embedding-001` is the current GA model on the same
    // `:embedContent` endpoint (verified: 200, 3072 dimensions).
    return "gemini-embedding-001";
  }
}