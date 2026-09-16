import { getClient, mapProvider } from "@hoichoi/db";
import type { LLMProviderRow } from "@hoichoi/shared-types";
import { buildProvider, type KeyStore } from "./build";
import type { LLMProvider, ParsedRewrite, RewriteContext } from "./types";
import { ProviderError } from "./types";

export type Operation = "rewrite" | "embed";

export interface ActiveProvider {
  row: LLMProviderRow;
  provider: LLMProvider;
}

export interface ResolverOptions {
  /** Stronghold-backed key store (desktop). Falls back to env. */
  keyStore?: KeyStore;
  /** Cooldown after a rate-limit/network failure, default 5 minutes. */
  cooldownMs?: number;
}

/** Reads llm_providers and walks them in priority order with failure fallback. */
export class Resolver {
  private readonly cooldowns = new Map<string, number>();
  private readonly history = new Map<string, { ok: number; fail: number }>();

  constructor(private readonly opts: ResolverOptions = {}) {}

  async activeProviders(operation: Operation): Promise<ActiveProvider[]> {
    const client = getClient();
    const res = await client.execute(
      "SELECT * FROM llm_providers WHERE is_active = 1 AND (supports_rewrite = 1 OR supports_embeddings = 1) ORDER BY priority ASC",
    );
    const rows = res.rows.map((r) => mapProvider(r as Record<string, unknown>));
    return rows
      .filter((row) => operation === "rewrite" ? Boolean(row.supports_rewrite) : Boolean(row.supports_embeddings))
      .map((row) => {
        try {
          return { row, provider: buildProvider(row, this.opts.keyStore ?? (() => null)) };
        } catch {
          return null;
        }
      })
      .filter((p): p is ActiveProvider => p !== null);
  }

  /** First provider in priority order that has a key and is not cooling down. */
  async next(operation: Operation): Promise<ActiveProvider | null> {
    const active = await this.activeProviders(operation);
    for (const ap of active) {
      if (this.isCoolingDown(ap.row.id)) continue;
      const key = this.resolveKey(ap.row);
      if (!key && ap.provider.providerKey !== "ollama") continue;
      return ap;
    }
    return null;
  }

  async rewrite(ctx: RewriteContext, signal?: AbortSignal): Promise<{ out: ParsedRewrite; provider: string }> {
    const lastError: string[] = [];
    let provider: ActiveProvider | null = null;
    while ((provider = await this.next("rewrite"))) {
      try {
        const out = await provider.provider.rewrite(ctx, signal);
        this.markSuccess(provider.row.id, provider.row.display_name);
        return { out, provider: provider.row.display_name };
      } catch (err) {
        const e = err as ProviderError | Error;
        lastError.push(`${provider.row.display_name}: ${e.message}`);
        this.markFailure(provider.row.id, e instanceof ProviderError ? e.kind : "unknown");
        if (e instanceof ProviderError && e.kind === "bad_output") break;
      }
    }
    throw new ProviderError("network", `all providers exhausted [${lastError.join(" | ")}]`);
  }

  async embedText(text: string, signal?: AbortSignal): Promise<{ vector: number[]; provider: string }> {
    const lastError: string[] = [];
    let provider: ActiveProvider | null = null;
    while ((provider = await this.next("embed"))) {
      if (!provider.provider.embed) continue;
      try {
        const vector = await provider.provider.embed(text, signal);
        this.markSuccess(provider.row.id, provider.row.display_name);
        return { vector, provider: provider.row.display_name };
      } catch (err) {
        const e = err as Error;
        lastError.push(`${provider.row.display_name}: ${e.message}`);
        this.markFailure(provider.row.id, e instanceof ProviderError ? e.kind : "unknown");
      }
    }
    throw new ProviderError("network", `no embedding provider available [${lastError.join(" | ")}]`);
  }

  private resolveKey(row: LLMProviderRow): string | null {
    return row.api_key ?? this.opts.keyStore?.(row.api_key_env_var) ?? process.env[row.api_key_env_var] ?? null;
  }

  private isCoolingDown(id: string): boolean {
    const until = this.cooldowns.get(id);
    return until !== undefined && until > Date.now();
  }

  markSuccess(id: string, _name: string): void {
    this.cooldowns.delete(id);
    this.bump(id, true);
  }

  markFailure(id: string, kind: ProviderError["kind"]): void {
    this.bump(id, false);
    // rate limits: longer cooldown (N min); network/auth: 5 min.
    const ms = kind === "rate_limit" ? 4 * 60_000 : kind === "auth" ? 0 : 5 * 60_000;
    if (ms > 0) this.cooldowns.set(id, Date.now() + ms);
  }

  stats(id: string): { ok: number; fail: number } {
    return this.history.get(id) ?? { ok: 0, fail: 0 };
  }

  private bump(id: string, ok: boolean): void {
    const cur = this.history.get(id) ?? { ok: 0, fail: 0 };
    if (ok) cur.ok++;
    else cur.fail++;
    this.history.set(id, cur);
  }
}

export function newResolver(opts: ResolverOptions = {}): Resolver {
  return new Resolver(opts);
}