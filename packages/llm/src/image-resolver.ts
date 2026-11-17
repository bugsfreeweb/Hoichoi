import {
  getClient,
  getProviderHealth,
  mapProvider,
  providerState,
  recordProviderFailure,
  recordProviderSkip,
  recordProviderSuccess,
  registerProvider,
} from "@hoichoi/db";
import type { LLMProviderRow } from "@hoichoi/shared-types";
import { buildProvider, type KeyStore } from "./build";
import type { ImageGenRequest, ImageGenResult, LLMProvider } from "./types";
import { ProviderError } from "./types";

export interface ImageActiveProvider {
  row: LLMProviderRow;
  provider: LLMProvider;
}

/** Lightweight provider descriptor for the manual image-generator UI. */
export interface ImageProviderInfo {
  id: string;
  displayName: string;
  providerKey: string;
  model: string;
  isFreeTier: boolean;
  envVar: string;
  /** True when a key is resolvable right now (env or stored row key). */
  hasKey: boolean;
  supportsImage: boolean;
}

export interface ImageResolverOptions {
  keyStore?: KeyStore;
  probeTimeoutMs?: number;
}

/**
 * True when a provider legitimately runs without an API key.
 *
 * `ollama` is a local server, and a row with no key variable at all is an
 * anonymous endpoint by declaration. Treating those as "key missing" is what
 * made the image chain report "no active provider" while a usable free backend
 * was configured.
 */
export function providerNeedsKey(row: LLMProviderRow): boolean {
  if (row.provider_key === "ollama") return false;
  return Boolean((row.api_key_env_var ?? "").trim());
}

/** Resolver for image-generation providers (purpose='image'). */
export class ImageResolver {
  private probed = new Set<string>();
  lastSkipped: string[] = [];

  constructor(private readonly opts: ImageResolverOptions = {}) {}

  async activeProviders(): Promise<ImageActiveProvider[]> {
    const client = getClient();
    const res = await client.execute(
      "SELECT * FROM llm_providers WHERE is_active = 1 AND purpose = 'image' ORDER BY is_free_tier DESC, priority ASC",
    );
    const rows = res.rows.map((r) => mapProvider(r as Record<string, unknown>));
    const built: ImageActiveProvider[] = [];
    const broken: string[] = [];
    for (const row of rows) {
      try {
        built.push({
          row,
          provider: buildProvider(row, this.opts.keyStore ?? (() => null)),
        });
      } catch (err) {
        broken.push(`${row.display_name} (${row.provider_key}): ${(err as Error).message}`);
      }
    }
    this.lastSkipped = broken.slice();
    return built;
  }

  async next(): Promise<ImageActiveProvider | null> {
    const active = await this.activeProviders();
    const skipped: string[] = [];
    for (const ap of active) {
      const key = this.resolveKey(ap.row);
      if (!key && providerNeedsKey(ap.row)) {
        skipped.push(`${ap.row.display_name}: no key for ${ap.row.api_key_env_var}`);
        continue;
      }
      if (!this.probed.has(ap.row.id)) {
        this.probed.add(ap.row.id);
        try {
          const hc = await ap.provider.healthCheck?.(
            AbortSignal.timeout(this.opts.probeTimeoutMs ?? 10_000),
          );
          if (!hc?.ok) {
            throw new Error(hc?.error ?? "health check failed");
          }
        } catch (err) {
          skipped.push(`${ap.row.display_name}: ${(err as Error).message}`);
          continue;
        }
      }
      return ap;
    }
    this.lastSkipped = [...active.length ? [] : [], ...skipped].filter(Boolean);
    return null;
  }

  resolveKey(row: LLMProviderRow): string | null {
    const store = this.opts.keyStore ?? (() => null);
    const fromStore = store(row.id) ?? store(row.provider_key) ?? store(row.api_key_env_var);
    if (fromStore?.trim()) return fromStore.trim();
    const env = process.env[row.api_key_env_var]?.trim();
    /**
     * In CI the repository secret is the authoritative credential.
     *
     * A provider row can keep a stale `api_key` from an earlier setup, and the
     * old precedence (row before env) silently used it — that is why the same
     * Gemini account worked in the desktop app (vault key) while GitHub Actions
     * returned 429/quota errors (old DB key). Outside CI the row still wins,
     * so an operator who intentionally stores a key per provider is unaffected.
     */
    const ci = Boolean(process.env.GITHUB_ACTIONS) || process.env.CI === "true";
    if (ci && env) return env;
    if (row.api_key?.trim()) return row.api_key.trim();
    if (env) return env;
    return null;
  }
}

/**
 * List the image-purpose providers with whether each can actually run right
 * now. Used to populate the provider picker in the manual image generator so an
 * operator sees at a glance which backends are usable.
 */
export async function listImageProviders(opts: { keyStore?: KeyStore } = {}): Promise<ImageProviderInfo[]> {
  const client = getClient();
  const res = await client.execute(
    "SELECT * FROM llm_providers WHERE is_active = 1 AND purpose = 'image' ORDER BY is_free_tier DESC, priority ASC",
  );
  const rows = res.rows.map((r) => mapProvider(r as Record<string, unknown>));
  return rows.map((row) => {
    let provider: LLMProvider | null = null;
    try {
      provider = buildProvider(row, opts.keyStore ?? (() => null));
    } catch {
      provider = null;
    }
    const hasKey =
      Boolean(row.api_key?.trim()) ||
      Boolean(opts.keyStore?.(row.api_key_env_var)?.trim()) ||
      Boolean(process.env[row.api_key_env_var]?.trim()) ||
      !providerNeedsKey(row);
    return {
      id: row.id,
      displayName: row.display_name,
      providerKey: row.provider_key,
      model: row.model_name,
      isFreeTier: Boolean(row.is_free_tier),
      envVar: row.api_key_env_var,
      hasKey,
      supportsImage: Boolean(provider?.supportsImage),
    };
  });
}

export interface GenerateImageOptions extends ImageGenRequest {
  /** Prefer one provider row; the rest of the chain still backs it up. */
  providerId?: string;
  /**
   * Diagnose a single provider: no fallback, no retry-on-429. Used by the
   * admin "test this provider" action so the operator sees that row's real
   * error (bad key, wrong model, quota) instead of a masked success from the
   * next row down the chain.
   */
  strict?: boolean;
  keyStore?: KeyStore;
}

/**
 * Generate one image, walking every active image provider (free tier first)
 * until one answers. `providerId` pins a single provider when the operator
 * picked one in the UI; otherwise the whole chain is tried.
 *
 * Throws a `ProviderError` whose message summarises every attempt when nothing
 * produced an image, so the editor can show a useful reason instead of a generic
 * failure.
 */
export async function generateImage(
  opts: GenerateImageOptions,
  signal?: AbortSignal,
): Promise<ImageGenResult> {
  const resolver = new ImageResolver({ keyStore: opts.keyStore });
  const active = await resolver.activeProviders();
  const usable = active.filter(
    (ap) => ap.provider.supportsImage && typeof ap.provider.generateImage === "function",
  );
  /**
   * A pinned provider is a *preference*, not a hard filter.
   *
   * Pinning used to reduce the candidate list to that one row, so a quota error
   * on the chosen row (Gemini 429, OpenAI "no credits") aborted generation even
   * though the next row was healthy. The editor then looked broken while the
   * desktop — which passes no pin — worked with the same accounts. Preferring
   * the pinned row and then walking the rest fixes that without changing what
   * happens when the pinned row succeeds.
   */
  /**
   * Rows keep the operator's own order: `usable` is already sorted by priority,
   * and priority is the only thing that decides who renders first. The keyless
   * watermark host that used to be forced to the end is gone — it was never a
   * provider this newsroom wanted to publish, only a fallback that made every
   * picture look the same.
   */
  const ordered = usable;
  const preferred = opts.providerId ? ordered.filter((ap) => ap.row.id === opts.providerId) : [];
  const rest = opts.providerId && !opts.strict ? ordered.filter((ap) => ap.row.id !== opts.providerId) : ordered;
  const candidates = opts.providerId ? [...preferred, ...(opts.strict ? [] : rest)] : ordered;

  if (candidates.length === 0) {
    throw new ProviderError(
      "bad_output",
      opts.providerId
        ? "নির্বাচিত প্রোভাইডারটি ছবি তৈরি করতে পারে না বা সক্রিয় নয়, এবং বিকল্প কোনো প্রোভাইডার নেই।"
        : "কোনো সক্রিয় ছবি-প্রোভাইডার নেই। (purpose = image যোগ করুন)",
    );
  }

  /**
   * Health-aware ordering for image providers too.
   *
   * A provider that keeps answering 429 for an hour used to be retried first on
   * every single generation, so each click paid the rate-limit round trip before
   * falling through. Registering the rows also gives the desk a place to see that
   * the "gemini" row has been failing since Tuesday.
   */
  let ordered2 = candidates;
  const healthKey = (ap: (typeof candidates)[number]) => `image:${ap.row.provider_key}`;
  try {
    for (const ap of candidates) {
      await registerProvider({
        key: healthKey(ap),
        kind: "image",
        label: ap.row.display_name || ap.row.provider_key,
      });
    }
    const rows = await Promise.all(candidates.map((ap) => getProviderHealth(healthKey(ap))));
    const now = new Date();
    const healthy = candidates.filter((_, i) => {
      const row = rows[i];
      if (!row) return true;
      const state = providerState(row, now);
      return state === "ok" || state === "degraded";
    });
    // Never empty the chain: a stale cooldown must not stop image generation.
    ordered2 = healthy.length > 0 ? healthy : candidates;
    for (const ap of candidates.filter((c) => !ordered2.includes(c))) {
      const row = await getProviderHealth(healthKey(ap)).catch(() => null);
      if (row) await recordProviderSkip(row.provider_key, "cooling down after repeated failures").catch(() => undefined);
    }
  } catch {
    ordered2 = candidates;
  }

  const errors: string[] = [];
  const failedThisRun: { row: { provider_key: string; display_name: string } }[] = [];
  for (const ap of ordered2) {
    const key = resolver.resolveKey(ap.row);
    if (!key && providerNeedsKey(ap.row)) {
      errors.push(`${ap.row.display_name}: key missing (${ap.row.api_key_env_var})`);
      continue;
    }
    try {
      const result = await ap.provider.generateImage!(opts, signal);
      await recordProviderSuccess(healthKey(ap)).catch(() => undefined);
      for (const failed of failedThisRun) {
        await recordProviderSkip(
          failed.row.provider_key,
          `generation failed; fell back to ${ap.row.display_name}`,
        ).catch(() => undefined);
      }
      return result;
    } catch (err) {
      // A transient "not right now" is worth one retry before giving up on the
      // row: Gemini's free tier answers 429 while the same key works again a few
      // seconds later, and a shared free tier answers 503 during peak load even
      // though every other request succeeds. Failing over on that left the desk
      // with *no* image at all — the operator clicks again and it works, which
      // is the definition of a bug, not a quota.
      const msg = (err as Error).message ?? "";
      const retryDelayMs = retryDelayFor(msg);
      if (!opts.strict && retryDelayMs > 0) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
        try {
          const result = await ap.provider.generateImage!(opts, signal);
          await recordProviderSuccess(healthKey(ap)).catch(() => undefined);
          return result;
        } catch (retryErr) {
          errors.push(`${ap.row.display_name}: ${(retryErr as Error).message}`);
          failedThisRun.push(ap);
          await recordProviderFailure(healthKey(ap), (retryErr as Error).message).catch(() => undefined);
          continue;
        }
      }
      // Keep walking the chain on EVERY failure, including `bad_output`.
      // Breaking early here meant one mis-configured row (e.g. a chat model
      // saved with purpose=image, whose /images/generations 404s) aborted the
      // whole chain before the working providers below it were ever tried —
      // the operator saw "ছবি তৈরি ব্যর্থ" even though a usable provider was
      // configured one row down.
      errors.push(`${ap.row.display_name}: ${(err as Error).message}`);
      failedThisRun.push(ap);
      await recordProviderFailure(healthKey(ap), (err as Error).message).catch(() => undefined);
      continue;
    }
  }
  throw new ProviderError("network", `ছবি তৈরি ব্যর্থ [${errors.join(" | ")}]`);
}

/**
 * How long to wait before retrying one image call, or 0 when a retry is pointless.
 *
 * 429 means "slow down" (4 s). A 5xx overload means "come back later": providers
 * often say so in prose ("Retry after 10s"), so that number is honoured when
 * present and capped, because a provider must not be able to park a request for
 * a minute.
 */
export function retryDelayFor(message: string): number {
  if (/(^|[^0-9])429([^0-9]|$)|rate.?limit/i.test(message)) return 4_000;
  const overloaded = /(^|[^0-9])50[234]([^0-9]|$)|service.?unavailable|at its limit/i.test(message);
  if (!overloaded) return 0;
  const advised = /retry after (\d{1,2}) ?s/i.exec(message);
  const seconds = advised ? Number(advised[1]) : 10;
  return Math.min(15, Math.max(2, seconds)) * 1_000;
}