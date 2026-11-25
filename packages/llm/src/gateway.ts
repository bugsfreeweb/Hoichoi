/**
 * Server-side AI gateway client.
 *
 * The desktop app runs the whole collection pipeline locally, which used to mean
 * the operator's machines carried the provider API keys — a Google or OpenRouter
 * key on a laptop that may be lost, shared, or left unlocked. The keys are the
 * one part of a run that has to stay on the server: they are billed, they can be
 * revoked, and they are exactly what a stolen laptop should not have.
 *
 * So when a device token is configured the runner stops holding them: this class
 * speaks to `POST /api/ai/task` instead of a provider, and the server does the
 * generation with the same editorial rules the web console uses. Everything the
 * pipeline needs comes back in one small object.
 *
 * What this is not: a general HTTP client. The request body is fixed — a closed
 * task name plus raw material — because the endpoint is not a prompt proxy. A
 * caller cannot choose a model, a prompt or a provider.
 */
import {
  ProviderError,
  type LLMProvider,
  type ParsedRewrite,
  type RewriteContext,
} from "./types";

/** Where the gateway is and how to authenticate. Both come from the vault. */
export interface GatewayConfig {
  baseUrl: string;
  token: string;
}

/** Vault env names the desktop writes when a device token is in use. */
export const GATEWAY_URL_ENV = "HOICHOI_DESK_BASE_URL";
export const GATEWAY_TOKEN_ENV = "HOICHOI_DESK_TOKEN";

/** A gateway call that failed, with the kind the resolver's cooldown logic understands. */
export class AiGatewayError extends ProviderError {
  constructor(
    kind: ProviderError["kind"],
    message: string,
    readonly status: number,
  ) {
    super(kind, message);
    this.name = "AiGatewayError";
  }
}

/** Normalise `base` + path without doubling or dropping the slash. */
/** Strip trailing "/" without a regex: the URL is operator input. */
function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) end -= 1;
  return value.slice(0, end);
}

export function gatewayUrl(cfg: GatewayConfig, path = "/api/ai/task"): string {
  return `${trimTrailingSlashes(cfg.baseUrl.trim())}${path}`;
}

/** Read the connection from the environment; `null` when either half is missing. */
export function gatewayConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): GatewayConfig | null {
  const baseUrl = (env[GATEWAY_URL_ENV] ?? "").trim();
  const token = (env[GATEWAY_TOKEN_ENV] ?? "").trim();
  if (!baseUrl || !token) return null;
  if (!/^https?:\/\//i.test(baseUrl)) return null;
  return { baseUrl, token };
}

/** The body the endpoint accepts. Kept next to the client so the two cannot drift. */
export function gatewayRequestBody(
  ctx: RewriteContext,
): Record<string, string> {
  const body: Record<string, string> = {
    // `draft` is the only task that returns title + summary + body, which is what
    // a pipeline rewrite needs. Never a prompt: the endpoint refuses extra keys.
    task: "draft",
    text: ctx.rawText,
  };
  const sourceName = (ctx.sourceName ?? "").trim();
  if (sourceName) body.sourceName = sourceName;
  if (ctx.category) body.category = ctx.category;
  if (ctx.categoryNameBn) body.categoryNameBn = ctx.categoryNameBn;
  return body;
}

const SAFETY_FLAGS = new Set<ParsedRewrite["safety_flag"]>([
  "none",
  "minor_involved",
  "unverified_claim",
  "graphic_content",
]);

function asSafetyFlag(value: unknown): ParsedRewrite["safety_flag"] {
  return typeof value === "string" &&
    SAFETY_FLAGS.has(value as ParsedRewrite["safety_flag"])
    ? (value as ParsedRewrite["safety_flag"])
    : "none";
}

/** Map an HTTP status onto the resolver's error kinds, so cooldowns behave. */
function kindForStatus(status: number): ProviderError["kind"] {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limit";
  if (status === 400 || status === 422) return "bad_output";
  return "network";
}

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

/**
 * The pipeline's provider, but the generation happens on the server.
 *
 * `name` is what the log line and the run summary show, so an operator can tell
 * from the run history whether a draft was made locally or by the gateway.
 */
export class AiGatewayProvider implements LLMProvider {
  readonly name = "হৈচৈ গেটওয়ে (সার্ভার)";
  readonly providerKey = "custom" as LLMProvider["providerKey"];
  readonly isFreeTier = false;
  readonly supportsEmbeddings = false;

  constructor(
    private readonly cfg: GatewayConfig,
    private readonly fetchImpl: FetchLike = ((input, init) =>
      fetch(input, init)) as FetchLike,
  ) {}

  async rewrite(
    ctx: RewriteContext,
    signal?: AbortSignal,
  ): Promise<ParsedRewrite> {
    let response: Response;
    try {
      response = await this.fetchImpl(gatewayUrl(this.cfg), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.cfg.token}`,
        },
        body: JSON.stringify(gatewayRequestBody(ctx)),
        signal,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "network error";
      // A caller's abort must not be reported as a provider fault: the pipeline
      // distinguishes "we ran out of time" from "the provider is broken".
      if (/abort/i.test(message))
        throw new AiGatewayError("network", "gateway deadline exceeded", 0);
      throw new AiGatewayError("network", `gateway unreachable: ${message}`, 0);
    }

    const text = await response.text().catch(() => "");
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    const body = (parsed ?? {}) as {
      ok?: boolean;
      error?: string;
      result?: {
        title_bn?: string;
        summary_bn?: string;
        body_bn?: string;
        safety_flag?: string;
      };
    };

    if (!response.ok) {
      // The server's own Bangla message is what an operator should see; never the
      // request, and never the token.
      const message = body.error
        ? String(body.error).slice(0, 200)
        : `gateway returned ${response.status}`;
      throw new AiGatewayError(
        kindForStatus(response.status),
        message,
        response.status,
      );
    }
    if (!body.ok || !body.result) {
      throw new AiGatewayError(
        "bad_output",
        "gateway returned no draft",
        response.status,
      );
    }

    const result = body.result;
    const title = (result.title_bn ?? "").trim();
    const draft = (result.body_bn ?? "").trim();
    // A rewrite without a headline or a body is not a draft; refusing here keeps
    // an empty row out of the queue instead of publishing a blank story.
    if (!title || !draft) {
      throw new AiGatewayError(
        "bad_output",
        "gateway returned an incomplete draft",
        response.status,
      );
    }
    return {
      title_bn: title,
      summary_bn: (result.summary_bn ?? "").trim() || draft.slice(0, 280),
      body_bn: draft,
      safety_flag: asSafetyFlag(result.safety_flag),
    };
  }

  /** The endpoint's `GET` is a free, cheap connection probe. */
  async healthCheck(
    signal?: AbortSignal,
  ): Promise<{ ok: boolean; error?: string; latencyMs?: number }> {
    const started = Date.now();
    try {
      const response = await this.fetchImpl(gatewayUrl(this.cfg), {
        method: "GET",
        headers: { authorization: `Bearer ${this.cfg.token}` },
        signal,
      });
      return {
        ok: response.ok,
        latencyMs: Date.now() - started,
        error: response.ok ? undefined : `gateway returned ${response.status}`,
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "gateway unreachable",
      };
    }
  }
}

/** Build the provider when a device token is present; otherwise `null`. */
export function gatewayProviderFromEnv(
  env: Record<string, string | undefined> = process.env,
  fetchImpl?: FetchLike,
): AiGatewayProvider | null {
  const cfg = gatewayConfigFromEnv(env);
  return cfg ? new AiGatewayProvider(cfg, fetchImpl) : null;
}
