import { getClient, mapProvider } from "@hoichoi/db";
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
 * `ollama` is a local server (key only when auth is enabled) and
 * Pollinations' image endpoint is anonymous by design. Treating these as
 * "key missing" is what made the image chain report "no active provider" even
 * though a usable free backend was configured.
 */
export function providerNeedsKey(row: LLMProviderRow): boolean {
  if (row.provider_key === "ollama") return false;
  const url = row.base_url ?? "";
  return !/gen\.pollinations\.ai|image\.pollinations\.ai/i.test(url);
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
  /** Force one provider row instead of walking the chain. */
  providerId?: string;
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
  const preferred = opts.providerId ? usable.filter((ap) => ap.row.id === opts.providerId) : [];
  const rest = opts.providerId ? usable.filter((ap) => ap.row.id !== opts.providerId) : usable;
  const candidates = [...preferred, ...rest];

  if (candidates.length === 0) {
    throw new ProviderError(
      "bad_output",
      opts.providerId
        ? "নির্বাচিত প্রোভাইডারটি ছবি তৈরি করতে পারে না বা সক্রিয় নয়, এবং বিকল্প কোনো প্রোভাইডার নেই।"
        : "কোনো সক্রিয় ছবি-প্রোভাইডার নেই। (purpose = image যোগ করুন)",
    );
  }

  const errors: string[] = [];
  for (const ap of candidates) {
    const key = resolver.resolveKey(ap.row);
    if (!key && providerNeedsKey(ap.row)) {
      errors.push(`${ap.row.display_name}: key missing (${ap.row.api_key_env_var})`);
      continue;
    }
    try {
      return await ap.provider.generateImage!(opts, signal);
    } catch (err) {
      // A per-minute rate limit is worth one short retry before giving up on the
      // row: Gemini's free tier answers 429 while the same key works again a few
      // seconds later, and failing over leaves the nicer model unused.
      const msg = (err as Error).message ?? "";
      if (/(^|[^0-9])429([^0-9]|$)|rate.?limit/i.test(msg)) {
        await new Promise((r) => setTimeout(r, 4_000));
        try {
          return await ap.provider.generateImage!(opts, signal);
        } catch (retryErr) {
          errors.push(`${ap.row.display_name}: ${(retryErr as Error).message}`);
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
      continue;
    }
  }
  throw new ProviderError("network", `ছবি তৈরি ব্যর্থ [${errors.join(" | ")}]`);
}