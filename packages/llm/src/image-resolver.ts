import { getClient, mapProvider } from "@hoichoi/db";
import type { LLMProviderRow } from "@hoichoi/shared-types";
import { buildProvider, type KeyStore } from "./build";
import type { LLMProvider } from "./types";

export interface ImageActiveProvider {
  row: LLMProviderRow;
  provider: LLMProvider;
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