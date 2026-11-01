import assert from "node:assert/strict";
import type { LLMProviderRow } from "@hoichoi/shared-types";
import { Resolver, type ActiveProvider, type Operation } from "../resolver";
import type { LLMProvider, ParsedRewrite, RewriteContext } from "../types";

const output: ParsedRewrite = {
  title_bn: "শিরোনাম",
  summary_bn: "সারাংশ",
  body_bn: "বিবরণ",
  safety_flag: "none",
};

function provider(
  id: string,
  rewrite: LLMProvider["rewrite"],
  embed?: LLMProvider["embed"],
): ActiveProvider {
  const row: LLMProviderRow = {
    id,
    provider_key: "groq",
    display_name: id,
    base_url: null,
    model_name: "test-model",
    api_key_env_var: "TEST_API_KEY",
    api_key: "test-key",
    priority: 1,
    is_active: true,
    is_free_tier: true,
    supports_rewrite: true,
    supports_embeddings: Boolean(embed),
    purpose: "text",
    rate_limit_rpm: null,
    config: null,
    last_ok_at: null,
    last_error_at: null,
    error_count: 0,
    created_at: "",
    updated_at: "",
  };
  const instance: LLMProvider = {
    name: id,
    providerKey: row.provider_key,
    isFreeTier: true,
    supportsEmbeddings: Boolean(embed),
    rewrite,
    healthCheck: async () => ({ ok: true }),
    ...(embed ? { embed } : {}),
  };
  return { row, provider: instance };
}

class TestResolver extends Resolver {
  activeCalls = 0;

  constructor(
    private readonly candidates: ActiveProvider[],
    timeoutMs: number,
  ) {
    super({ rewriteAttemptTimeoutMs: timeoutMs, embeddingAttemptTimeoutMs: timeoutMs });
  }

  override async activeProviders(_operation: Operation): Promise<ActiveProvider[]> {
    this.activeCalls++;
    return this.candidates;
  }

  override markSuccess(_id: string, _name: string): void {}
  override markFailure(_id: string, _kind: "rate_limit" | "auth" | "network" | "bad_output" | "unknown"): void {}
}

const context: RewriteContext = {
  rawText: "test",
  sourceName: "test",
  sourcePageName: "test",
  category: "sports",
  categoryConfig: {
    requires_double_approval: false,
    show_content_warning: false,
    auto_pending_review: false,
    redaction_strict: "none",
    allow_identifying_details: false,
  },
};

const waitsForAbort: LLMProvider["rewrite"] = (_ctx, signal) =>
  new Promise<ParsedRewrite>((_resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
  });

const succeeds: LLMProvider["rewrite"] = async () => output;
const embedWaitsForAbort: NonNullable<LLMProvider["embed"]> = (_text, signal) =>
  new Promise<number[]>((_resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
const embedSucceeds: NonNullable<LLMProvider["embed"]> = async () => [0.1, 0.2];
const keepAlive = setTimeout(() => undefined, 1_000);

const fallbackResolver = new TestResolver(
  [provider("slow", waitsForAbort), provider("fallback", succeeds)],
  20,
);
const fallbackResult = await fallbackResolver.rewrite(context, AbortSignal.timeout(1_000));
assert.equal(fallbackResult.provider, "fallback");
assert.equal(fallbackResolver.activeCalls, 1);

const embeddingResolver = new TestResolver(
  [
    provider("slow-embedding", succeeds, embedWaitsForAbort),
    provider("embedding-fallback", succeeds, embedSucceeds),
  ],
  20,
);
const embeddingResult = await embeddingResolver.embedText("test", AbortSignal.timeout(1_000));
assert.deepEqual(embeddingResult.vector, [0.1, 0.2]);
assert.equal(embeddingResult.provider, "embedding-fallback");
assert.equal(embeddingResolver.activeCalls, 1);

const expiredResolver = new TestResolver([provider("slow", waitsForAbort), provider("unused", succeeds)], 1_000);
await assert.rejects(
  expiredResolver.rewrite(context, AbortSignal.timeout(20)),
  /rewrite deadline exceeded/,
);
assert.equal(expiredResolver.activeCalls, 1);

clearTimeout(keepAlive);
console.log("[test] rewrite timeouts and provider fallback checks passed");
