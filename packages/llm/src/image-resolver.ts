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
      if (!key && ap.provider.providerKey !== "ollama") {
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
    if (row.api_key?.trim()) return row.api_key.trim();
    const env = process.env[row.api_key_env_var];
    if (env?.trim()) return env.trim();
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
      row.provider_key === "ollama";
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
  const candidates = (
    opts.providerId ? active.filter((ap) => ap.row.id === opts.providerId) : active
  ).filter((ap) => ap.provider.supportsImage && typeof ap.provider.generateImage === "function");

  if (candidates.length === 0) {
    throw new ProviderError(
      "bad_output",
      opts.providerId
        ? "নির্বাচিত প্রোভাইডারটি ছবি তৈরি করতে পারে না বা সক্রিয় নয়।"
        : "কোনো সক্রিয় ছবি-প্রোভাইডার নেই। (purpose = image যোগ করুন)",
    );
  }

  const errors: string[] = [];
  for (const ap of candidates) {
    const key = resolver.resolveKey(ap.row);
    if (!key && ap.row.provider_key !== "ollama") {
      errors.push(`${ap.row.display_name}: key missing (${ap.row.api_key_env_var})`);
      continue;
    }
    try {
      return await ap.provider.generateImage!(opts, signal);
    } catch (err) {
      errors.push(`${ap.row.display_name}: ${(err as Error).message}`);
      if (err instanceof ProviderError && err.kind === "bad_output") break;
    }
  }
  throw new ProviderError("network", `ছবি তৈরি ব্যর্থ [${errors.join(" | ")}]`);
}