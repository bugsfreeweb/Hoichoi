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
  /** Per-provider health probe timeout before a rewrite, default 10s. */
  probeTimeoutMs?: number;
}

/** Reads llm_providers and walks them FREE-tier-first with failure fallback. */
export class Resolver {
  private readonly cooldowns = new Map<string, number>();
  private readonly history = new Map<string, { ok: number; fail: number }>();
  /** Probe cache per run — a provider is health-checked at most once. */
  private readonly probed = new Set<string>();
  /** Skip a provider that keeps failing until this window from its last write passes. */
  private static readonly PERSISTED_DOWN_MS = 5 * 60_000;

  /**
   * Why `next()` returned null on its most recent full scan of the chain.
   * Read only when building a failure message, never for control flow.
   */
  private lastSkipped: string[] = [];

  /**
   * Active rows that could not even be constructed. Reported alongside
   * `lastSkipped` so a misconfigured row is visible rather than invisible.
   */
  private brokenProviders: string[] = [];

  constructor(private readonly opts: ResolverOptions = {}) {}

  async activeProviders(operation: Operation): Promise<ActiveProvider[]> {
    const client = getClient();
    const res = await client.execute(
      // Free tiers first (so a paid fallback never shadows a usable free one,
      // regardless of admin priorities), then priority within each tier.
      "SELECT * FROM llm_providers WHERE is_active = 1 AND (supports_rewrite = 1 OR supports_embeddings = 1) ORDER BY is_free_tier DESC, priority ASC",
    );
    const rows = res.rows.map((r) => mapProvider(r as Record<string, unknown>));
    const built: ActiveProvider[] = [];
    const broken: string[] = [];
    for (const row of rows) {
      if (operation === "rewrite" ? !row.supports_rewrite : !row.supports_embeddings) continue;
      try {
        built.push({ row, provider: buildProvider(row, this.opts.keyStore ?? (() => null)) });
      } catch (err) {
        // A row that cannot be constructed is not a candidate, but dropping it
        // silently meant a malformed base_url or unknown provider_key removed it
        // from the chain with no trace at all. Recorded so `next()` can name it.
        broken.push(`${row.display_name} (${row.provider_key}): ${(err as Error).message}`);
      }
    }
    this.brokenProviders = broken;
    return built;
  }

/** First provider (free-first, priority) that is keyed, not cooling down and
   *  not still down from a recent persisted failure. For rewrites the provider
   *  is also health-probed once per run so a retired model never dead-ends the
   *  chain - we find the provider that actually answers *now*.
   *
   *  `ignoreProviderDown` drops the cooldown and persisted-failure gates. It is
   *  for embeddings: those hit `:embedContent`, a different endpoint with its
   *  own quota, so a provider that is cooling down from a failed *generation*
   *  may still embed fine. Without this, one rate-limited rewrite disabled
   *  SEM-1 for the whole run - Google is the only embedding provider we have,
   *  so every embedding was skipped with "no embedding provider available"
   *  while the run still reported success. Embedding stays best-effort: a real
   *  failure still records and still falls through the chain. */
  async next(
    operation: Operation,
    opts: { ignoreProviderDown?: boolean } = {},
  ): Promise<ActiveProvider | null> {
    const active = await this.activeProviders(operation);
    // Why each candidate was passed over. Every `continue` below records a
    // reason: without this the chain is silent, and a total failure surfaced as
    // `all providers exhausted []` with an empty bracket - which is unreadable
    // and hid a four-day publishing outage behind a green workflow run.
    const skipped: string[] = [];
    for (const ap of active) {
      if (!opts.ignoreProviderDown) {
        if (this.isCoolingDown(ap.row.id)) {
          skipped.push(`${ap.row.display_name}: cooling down`);
          continue;
        }
        if (this.isPersistentlyDown(ap.row)) {
          skipped.push(`${ap.row.display_name}: skipped after a recent failure (${ap.row.last_error_at})`);
          continue;
        }
      }
      const key = this.resolveKey(ap.row);
      if (!key && ap.provider.providerKey !== "ollama") {
        skipped.push(`${ap.row.display_name}: no key for ${ap.row.api_key_env_var}`);
        continue;
      }
      if (operation === "rewrite" && !this.probed.has(ap.row.id)) {
        this.probed.add(ap.row.id);
        try {
          const hc = await ap.provider.healthCheck?.(
            AbortSignal.timeout(this.opts.probeTimeoutMs ?? 10_000),
          );
          if (!hc?.ok) {
            throw new ProviderError(
              (hc as unknown as { kind?: ProviderError["kind"] }).kind ?? "network",
              hc?.error ?? `health check failed (${ap.row.display_name})`,
            );
          }
          this.markSuccess(ap.row.id, ap.row.display_name);
        } catch (err) {
          const e = err as ProviderError | Error;
          this.markFailure(
            ap.row.id,
            e instanceof ProviderError ? e.kind : "network",
          );
          skipped.push(`${ap.row.display_name}: probe failed — ${e.message}`);
          continue;
        }
      }
      return ap;
    }
    this.lastSkipped = [...skipped, ...this.brokenProviders];
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
    throw new ProviderError("network", `all providers exhausted [${describe(lastError, this.lastSkipped)}]`);
  }

  async embedText(text: string, signal?: AbortSignal): Promise<{ vector: number[]; provider: string }> {
    const lastError: string[] = [];
    let provider: ActiveProvider | null = null;
    while ((provider = await this.next("embed", { ignoreProviderDown: true }))) {
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
    throw new ProviderError("network", `no embedding provider available [${describe(lastError, this.lastSkipped)}]`);
  }

  private resolveKey(row: LLMProviderRow): string | null {
    return row.api_key ?? this.opts.keyStore?.(row.api_key_env_var) ?? process.env[row.api_key_env_var] ?? null;
  }

  private isCoolingDown(id: string): boolean {
    const until = this.cooldowns.get(id);
    return until !== undefined && until > Date.now();
  }

  /** True when the provider's last recorded attempt failed and the failure is
   *  still inside the skip window (persisted across runs). A later successful
   *  write (last_ok_at newer) clears it, so recovered providers come back. */
  private isPersistentlyDown(row: LLMProviderRow): boolean {
    const errAt = row.last_error_at ? Date.parse(row.last_error_at) : NaN;
    if (!Number.isFinite(errAt)) return false;
    const okAt = row.last_ok_at ? Date.parse(row.last_ok_at) : NaN;
    if (Number.isFinite(okAt) && okAt >= errAt) return false;
    return Date.now() - errAt < Resolver.PERSISTED_DOWN_MS;
  }

  markSuccess(id: string, _name: string): void {
    this.cooldowns.delete(id);
    this.bump(id, true);
    this.persist(id, { ok: true });
  }

  markFailure(id: string, kind: ProviderError["kind"]): void {
    this.bump(id, false);
    // rate limits: longer cooldown (N min); network/auth: 5 min.
    const ms = kind === "rate_limit" ? 4 * 60_000 : kind === "auth" ? 0 : 5 * 60_000;
    if (ms > 0) this.cooldowns.set(id, Date.now() + ms);
    this.persist(id, { ok: false });
  }

  /** Write liveness back to llm_providers so future runs skip/resume correctly.
   *  NOTE: uses raw string SQL — the bundled @libsql/client HTTP (Turso) driver
   *  crashes on object-form `execute({ sql, args })`, which the cloud desktop
   *  build hits on every run. Values are internal row ids / timestamps only. */
  private persist(id: string, outcome: { ok: boolean }): void {
    const when = new Date().toISOString();
    const q = (v: string) => `'${v.replaceAll("'", "''")}'`;
    const sql = outcome.ok
      ? `UPDATE llm_providers SET last_ok_at = ${q(when)}, last_error_at = NULL, error_count = 0, updated_at = ${q(when)} WHERE id = ${q(id)}`
      : `UPDATE llm_providers SET last_error_at = ${q(when)}, error_count = COALESCE(error_count, 0) + 1, updated_at = ${q(when)} WHERE id = ${q(id)}`;
    try {
      const client = getClient();
      void client.execute(sql);
    } catch {
      /* health tracking is best-effort; never break the run over it */
    }
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

/**
 * Merge "provider was tried and failed" with "provider was never tried" into one
 * message. When the chain yields nothing at all, `lastError` is empty and the
 * operator is left staring at `[]`; the skip reasons say whether the keys are
 * missing, a probe is failing, or everything is in cooldown, which are three
 * very different fixes.
 */
function describe(lastError: string[], skipped: string[]): string {
  return [...lastError, ...skipped].join(" | ");
}

export function newResolver(opts: ResolverOptions = {}): Resolver {
  return new Resolver(opts);
}