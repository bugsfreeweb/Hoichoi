import type { HealthCheckResult, LLMProviderRow } from "@hoichoi/shared-types";
import {
  CLOUDFLARE_ACCOUNT_ENV,
  hasAccountPlaceholder,
  normalizeCloudflareModel,
  resolveAccountPlaceholder,
} from "@hoichoi/shared-types";
export {
  CLOUDFLARE_ACCOUNT_ENV,
  hasAccountPlaceholder,
  resolveAccountPlaceholder,
} from "@hoichoi/shared-types";
import {
  ProviderError,
  composeImagePrompt,
  type ImageGenRequest,
  type ImageGenResult,
  type LLMProvider,
  type ParsedRewrite,
  type RewriteContext,
} from "./types";
import { getSystemPrompt } from "./prompts";
import { parseRewriteOutput, resolveTemperature } from "./types";
import { decodeBase64, sniffImageMime } from "./image-util";

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

/**
 * A provider's refusal, in one readable line.
 *
 * Measured failures this replaces: a Cloudflare 404 printed
 * `{"code":7003,"message":"Could not route to /client/v4/accounts/ACCOUNT_ID/…"}`,
 * which tells an operator nothing they can act on, and a 403 came back as a whole
 * Cloudflare HTML interstitial (`<!DOCTYPE html>…`, kilobytes of it) rendered
 * inside the admin panel.
 *
 * So: JSON `message` fields are preferred over the raw blob, known provider codes
 * are named in Bangla, HTML is reduced to its title, and the result is clamped —
 * a provider must not be able to paint the console with its own error page.
 */
export function summarizeProviderError(status: number, body: string): string {
  const raw = (body ?? "").trim();
  let detail = "";

  const parsed = /^[{[]/.test(raw) ? safeJson(raw) : null;
  if (parsed && typeof parsed === "object") {
    const obj = parsed as {
      message?: unknown;
      code?: unknown;
      error?: { message?: unknown };
      errors?: Array<{ message?: unknown; code?: unknown }>;
    };
    const message = obj.message ?? obj.error?.message ?? obj.errors?.[0]?.message;
    if (typeof message === "string" && message.trim()) detail = message.trim();
    const code = obj.code ?? obj.errors?.[0]?.code;
    const codeHint =
      code === 7003
        ? "Cloudflare: base URL-এর ACCOUNT_ID এখনো বদলানো হয়নি"
        : code === 10000 || code === 10001
          ? "Cloudflare: টোকেনে Workers AI-এর অনুমতি নেই"
          : "";
    if (codeHint) detail = [codeHint, detail].filter(Boolean).join(" — ");
  }

  if (!detail && /<(!doctype|html|head|body)/i.test(raw)) {
    const title = /<title[^>]*>([^<]{1,120})<\/title>/i.exec(raw)?.[1]?.trim();
    detail = title ? `HTML পৃষ্ঠা: ${title}` : "HTML পৃষ্ঠা ফিরেছে (কী বা হোস্ট প্রত্যাখ্যান)";
  }
  if (!detail && raw) detail = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 200);

  const hint =
    status === 404
      ? "ঠিকানাটি পাওয়া যায়নি — base URL বা মডেলের নাম দেখুন"
      : status === 401 || status === 403
        ? "কী প্রত্যাখ্যাত হয়েছে — টোকেন বা কী ঠিক আছে কিনা দেখুন"
        : "";
  const head = `${status}${
    status === 429
      ? " rate limited"
      : status === 401 || status === 403
        ? " auth error"
        : status >= 500
          ? " server error"
          : ""
  }`;
  const shown = detail.length > 180 ? `${detail.slice(0, 177)}…` : detail;
  return `${head}${shown ? `: ${shown}` : ""}${hint ? ` — ${hint}` : ""}`;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Classify HTTP status into typed ProviderError. */
export function classifyStatus(status: number, body: string): never {
  const message = summarizeProviderError(status, body);
  if (status === 429) throw new ProviderError("rate_limit", message);
  if (status === 401 || status === 403) throw new ProviderError("auth", message);
  if (status >= 500) throw new ProviderError("network", message);
  throw new ProviderError(status === 400 || status === 422 ? "bad_output" : "unknown", message);
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
  readonly supportsImage = true;
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
    this.baseUrl = resolveAccountPlaceholder(
      opts.row.base_url?.replace(/\/$/, "") ?? opts.defaultBaseUrl.replace(/\/$/, ""),
      process.env,
    );
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

  /**
   * Text-to-image via the OpenAI `/images/generations` shape, which most
   * gateways (OpenAI, Azure-style, Together, DeepInfra, custom BYOK) speak.
   * `gpt-image-*` models reject `response_format`, so it is requested only for
   * DALL·E-style models and retried without it if the provider complains.
   */
  async generateImage(req: ImageGenRequest, signal?: AbortSignal): Promise<ImageGenResult> {
    const model = req.model?.trim() || this.row.model_name;
    const prompt = composeImagePrompt(req);
    this.assertRoutable();
    if (this.isCloudflareWorkersAi()) {
      return this.generateCloudflareImage(model, prompt, signal);
    }
    const body: Record<string, unknown> = {
      model,
      prompt,
      n: Math.max(1, Math.min(4, req.count ?? 1)),
    };
    if (req.size) body.size = req.size;
    if (req.style) body.style = req.style;
    if (req.quality) body.quality = req.quality;
    const tryB64 = !/gpt-image/i.test(model);
    if (tryB64) body.response_format = this.isTogether() ? "base64" : "b64_json";
    return this.postImageUntilOk(this.imageCandidates(), body, { model, prompt }, signal);
  }

  /** Refuse to call a Cloudflare row whose account placeholder was never filled. */
  private assertRoutable(): void {
    if (!hasAccountPlaceholder(this.baseUrl)) return;
    throw new ProviderError(
      "auth",
      "base URL-এ ACCOUNT_ID এখনও বসানো হয়নি — Providers পাতায় Cloudflare account ID দিন, " +
        `অথবা ${CLOUDFLARE_ACCOUNT_ENV} সেট করুন (Cloudflare dashboard → Workers & Pages → Account ID)।`,
    );
  }

  private isCloudflareWorkersAi(): boolean {
    try {
      const url = new URL(this.baseUrl);
      return url.hostname === "api.cloudflare.com" && /\/client\/v4\/accounts\/[^/]+\/ai\/run(?:\/|$)/i.test(url.pathname);
    } catch {
      return false;
    }
  }

  private isTogether(): boolean {
    try {
      return new URL(this.baseUrl).hostname === "api.together.ai";
    } catch {
      return false;
    }
  }

  private async generateCloudflareImage(
    model: string,
    prompt: string,
    signal?: AbortSignal,
    size?: string,
    aspectRatio?: string,
  ): Promise<ImageGenResult> {
    /**
     * A Workers AI route is `…/ai/run/@cf/<vendor>/<model>`.
     *
     * A row saved with the short name (`flux-1-schnell`) used to be sent as
     * `…/ai/run/flux-1-schnell`, and Cloudflare answered `400 No route for that
     * URI` — a message that reads like a broken account or a wrong base URL and
     * is neither. The known short names are mapped here so an existing row starts
     * working without anyone editing it, and an unknown one is refused with the
     * shape it should have had instead of spending a round trip on a 400.
     */
    const routed = normalizeCloudflareModel(model);
    if (!routed) {
      throw new ProviderError(
        "bad_output",
        `Cloudflare-এ “${model}” নামে কোনো মডেল নেই — পুরো আইডি দিন, যেমন @cf/black-forest-labs/flux-1-schnell।`,
      );
    }
    const modelPath = routed
      .split("/")
      .map((segment) => encodeURIComponent(segment).replace(/%40/gi, "@"))
      .join("/");
    const basePath = this.baseUrl.replace(/\/+$/, "");
    const url = basePath.endsWith(`/${modelPath}`) ? basePath : `${basePath}/${modelPath}`;
    /**
     * The Workers AI binding validates its input against the model's own schema
     * and rejects anything the schema does not declare — this payload's first
     * live run failed with "Additional or unevaluated properties '/width,
     * /height' not allowed", so flux-1-schnell does **not** take dimensions
     * (only `prompt`, `steps` and `seed`; it renders 1024×1024). Asking for a
     * frame here was worse than useless: it made the one provider that was known
     * to work refuse every request. The landscape frame is now guaranteed where
     * it belongs — the plate crops the render to 16:9 (`fit: cover`,
     * `position: attention`), which is applied to every provider's output anyway.
     *
     * `steps` must stay <= 8 on the Workers AI binding; 4 is the fast default.
     */
    const payload: Record<string, unknown> = { prompt, steps: 4 };
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers,
      signal,
      body: JSON.stringify(payload),
    });
    if (!res.ok) classifyStatus(res.status, await res.text());
    const raw = (await res.json()) as {
      result?: { image?: string };
      errors?: Array<{ message?: string }>;
    };
    const encoded = raw.result?.image;
    if (!encoded) {
      throw new ProviderError("bad_output", raw.errors?.map((error) => error.message).filter(Boolean).join("; ") || "Cloudflare response contained no image");
    }
    const bytes = decodeBase64(encoded);
    return {
      bytes,
      contentType: sniffImageMime(bytes),
      provider: this.name,
      model,
      prompt,
    };
  }

  /** The `/images/generations` analog of {@link chatCandidates}. */
  private imageCandidates(): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    const push = (u: string) => {
      if (!/^https?:\/\//i.test(u) || seen.has(u)) return;
      seen.add(u);
      out.push(u);
    };
    if (/\/images\/generations\/?$/i.test(this.baseUrl)) push(this.baseUrl);
    push(`${this.baseUrl}/images/generations`);
    push(`${this.baseUrl}/v1/images/generations`);
    return out;
  }

  private async postImageUntilOk(
    candidates: string[],
    baseBody: Record<string, unknown>,
    meta: { model: string; prompt: string },
    signal?: AbortSignal,
  ): Promise<ImageGenResult> {
    let lastReason: Error | null = null;
    for (const url of candidates) {
      const body = { ...baseBody };
      for (let attempt = 0; attempt < 2; attempt++) {
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
          break;
        }
        if (res.ok) return this.decodeImageResponse(await res.json(), meta);
        const text = await res.text();
        // gpt-image-1 rejects `response_format`; drop it and retry once.
        if (res.status === 400 && body.response_format !== undefined && /response_format/i.test(text)) {
          delete body.response_format;
          continue;
        }
        if (res.status === 404 || res.status === 405 || res.status === 501) {
          lastReason = new ProviderError("bad_output", `no image endpoint at ${url} (${res.status})`);
          break;
        }
        classifyStatus(res.status, text);
      }
    }
    if (lastReason) throw lastReason;
    throw new ProviderError("bad_output", `no usable image endpoint under base_url "${this.baseUrl}"`);
  }

  private async decodeImageResponse(
    raw: unknown,
    meta: { model: string; prompt: string },
  ): Promise<ImageGenResult> {
    const data =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const arr = Array.isArray(data.data) ? (data.data as Array<Record<string, unknown> | null>) : [];
    const first = arr.find((d) => d && (typeof d.b64_json === "string" || typeof d.url === "string")) ?? arr[0] ?? null;
    if (!first) {
      const err = (data.error as { message?: string } | undefined)?.message;
      throw new ProviderError("bad_output", err ?? "image response contained no image");
    }
    if (typeof first.b64_json === "string" && first.b64_json) {
      const bytes = decodeBase64(first.b64_json);
      return { bytes, contentType: sniffImageMime(bytes), provider: this.name, model: meta.model, prompt: meta.prompt };
    }
    if (typeof first.url === "string" && first.url) {
      const res = await fetch(first.url, {
        headers: { "user-agent": "Hoichoi/1.1 image-generator" },
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new ProviderError("network", `image download failed: ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const ct = res.headers.get("content-type");
      return {
        bytes,
        contentType: ct && ct.startsWith("image/") ? ct : sniffImageMime(bytes),
        provider: this.name,
        model: meta.model,
        prompt: meta.prompt,
      };
    }
    throw new ProviderError("bad_output", "image response had neither b64_json nor url");
  }

  async healthCheck(signal?: AbortSignal): Promise<HealthCheckResult> {
    const started = Date.now();
    try {
      // A row whose account id is still a placeholder cannot succeed, so say so
      // instead of spending a round trip to learn it from a 404.
      this.assertRoutable();
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
          error: summarizeProviderError(res.status, await res.text()),
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

/**
 * The pixel frame to ask a free-form image host for.
 *
 * `size` exists for OpenAI, whose API only accepts 1024x1024, 1536x1024 and
 * 1024x1536 — so 16:9 has to be sent as 3:2 and cropped later. A free-form host
 * (Cloudflare's FLUX, or any custom endpoint with width/height parameters) takes
 * the frame literally, and sending it the 3:2 size meant the brief promised a
 * "horizontal 16:9 frame" while the render was 1.5:1. Here the requested ratio
 * wins and the area of `size` is kept, rounded to a multiple of 8 because that
 * is what diffusion pipelines want.
 */
export function frameDims(
  size?: string,
  aspectRatio?: string,
): { width: number; height: number } | null {
  const dims = /^(\d{2,5})x(\d{2,5})$/i.exec(size ?? "");
  const ratio = /^(\d{1,2})[:x](\d{1,2})$/i.exec(aspectRatio ?? "");
  if (!dims) return null;
  const baseW = Number(dims[1]);
  const baseH = Number(dims[2]);
  if (!ratio) return { width: baseW, height: baseH };
  const rw = Number(ratio[1]);
  const rh = Number(ratio[2]);
  if (!rw || !rh) return { width: baseW, height: baseH };
  const area = baseW * baseH;
  const width = Math.round(Math.sqrt((area * rw) / rh) / 8) * 8;
  const height = Math.round(width * (rh / rw) / 8) * 8;
  if (width < 256 || height < 256) return { width: baseW, height: baseH };
  return { width, height };
}
