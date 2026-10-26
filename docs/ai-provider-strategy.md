# Multi-AI Provider Strategy — Free by Default, No Lock-in

Companion to `coding-agent-prompt.md` and `architecture-notes.md`. Read this if you want the *economics* of the LLM setup.

---

## The TL;DR

You can run the entire pipeline at $0/month in LLM costs up to ~1,000 posts/day, using the free tiers of Google Gemini + Groq + OpenRouter + local Ollama, with automatic fallback. The design lets you add paid providers later for quality without rewriting anything.

---

## Free-tier limits (Sept 2026, verified)

| Provider | Free models | Free quota | Card? | Bangla quality | Speed |
|---|---|---|---|---|---|
| **Google Gemini 2.0 Flash** | gemini-2.0-flash, gemini-2.5-flash | 1,500 req/day, 10 RPM, 1M tokens/min, 1.5M tokens/day | No | **Excellent** | Medium |
| **Groq** | llama-3.3-70b-versatile, mixtral-8x7b, llama-3.1-8b | 30 RPM, ~14k req/day, 6K TPM | No | Good | **Fastest (700+ tok/s)** |
| **OpenRouter** | 20+ `:free` models (DeepSeek, Llama, Qwen, Gemma) | 20 RPM, 50 req/day free (1,000 with $10 top-up) | No | Good (varies) | Medium |
| **Ollama** (local) | llama3.2, mistral, gemma2, phi-3.5 | Unlimited | No | Decent | Depends on hardware |
| **Mistral La Plateforme** | mistral-small, mistral-large | Trial credits, then paid | **Yes** | Good | Fast |

**Sources:** verified against cheahjs/free-llm-api-resources (March 2026 update) and provider docs (April–Sept 2026). Verify current numbers before committing — free tiers change often.

---

## Recommended default config (drop into `llm_providers` on first install)

```sql
-- Priority 1: Google Gemini Flash (best Bangla + embeddings)
insert into llm_providers (provider_key, display_name, model_name, api_key_env_var, priority, is_active, is_free_tier, supports_rewrite, supports_embeddings) values
  ('google', 'Google Gemini 2.0 Flash', 'gemini-2.0-flash', 'GOOGLE_API_KEY', 1, true, true, true, true);

-- Priority 2: Groq Llama 70B (fastest fallback)
insert into llm_providers (provider_key, display_name, model_name, api_key_env_var, priority, is_active, is_free_tier, supports_rewrite, supports_embeddings) values
  ('groq', 'Groq Llama 3.3 70B', 'llama-3.3-70b-versatile', 'GROQ_API_KEY', 2, true, true, true, false);

-- Priority 3: OpenRouter (broadest variety as last resort)
insert into llm_providers (provider_key, display_name, model_name, api_key_env_var, priority, is_active, is_free_tier, supports_rewrite, supports_embeddings) values
  ('openrouter', 'OpenRouter Free', 'meta-llama/llama-3.3-70b:free', 'OPENROUTER_API_KEY', 3, true, true, true, false);

-- Priority 4: Ollama (optional, for admins running a local server)
insert into llm_providers (provider_key, display_name, model_name, api_key_env_var, priority, is_active, is_free_tier, supports_rewrite, supports_embeddings) values
  ('ollama', 'Ollama (local)', 'llama3.2', 'OLLAMA_BASE_URL', 4, false, true, true, false);
```

When the admin sets `GOOGLE_API_KEY`, that provider activates. When the admin sets `GROQ_API_KEY`, that one activates. Each provider is "active" only when its key is present. The resolver walks them in priority order.

---

## How much free can you actually use?

Assuming the scraper produces 100 posts/day that need rewriting:

| Provider | Daily rewrite calls used | % of free quota |
|---|---|---|
| Google Gemini | ~100 | 6.7% of 1,500 |
| Groq (fallback only) | 0 | 0% |
| OpenRouter (fallback) | 0 | 0% |
| **Total free capacity** | n/a | **~3,000 rewrites/day** |

You can scale to 1,000 posts/day on free tiers and still have headroom. The scraper batches and rate-limits itself, so the only ceiling is the per-minute rate (10 RPM on Gemini = max 600 rewrites/hour).

**Embeddings** are the bigger constraint. Each post needs one embedding call. At 1,000 posts/day, you're doing 1,000 embedding calls, all on Gemini free tier (1,500 req/day cap). At that scale, switch embeddings to a dedicated provider:
- Google `text-embedding-004` (free, 1,500 req/day on the same key) — same quota issue.
- Hugging Face Inference API free — slower, ~1k req/day.
- **Local Ollama `bge-m3` or `nomic-embed-text`** — unlimited, runs on the admin's hardware, no rate limit. **This is the move at scale.**

---

## When to add a paid provider

| Trigger | Add | Why |
|---|---|---|
| Gemini Bangla quality isn't good enough for you | `anthropic claude-haiku-4-5` at priority 0 | Best-in-class Bangla, ~$0.003/post |
| Embeddings quota hit on free tier | Local Ollama `bge-m3` | Unlimited, free |
| Need GPT-style instruction following | `openai gpt-4o-mini` | Reliable, multilingual, cheap |
| Want best embeddings for cross-source dedup | `openai text-embedding-3-small` | $0.02 per 1M tokens, basically free |
| Latency on Gemini is killing you | `groq llama-3.3-70b` at priority 0 | 700+ tok/s |

The architecture lets you add these via the admin UI without touching code.

---

## Bangla-specific quality notes

- **Google Gemini Flash** has the best free-tier Bangla. Tested on news rewriting, summarization, and name redaction — output is clean Bengali script, follows formatting instructions reliably, handles safety flags correctly.
- **Groq Llama 3.3 70B** is good but occasionally drops to Banglish (Latin script) on edge cases. The post-rewrite regex range check (`U+0980–U+09FF` on first 100 chars) catches this and flags the post for review.
- **OpenRouter free models** vary wildly. Some `:free` models are quantizations that struggle with Bengali. The rewrite system prompt explicitly asks for Bengali script, which helps, but you may still see 5–10% rejection rate. Routing through Groq as primary and OpenRouter as last resort means this is rare.
- **Ollama local models** are the weakest for Bangla. Phi-3.5 mini handles it but with mistakes. Use Ollama as a last-resort fallback or for embeddings only.
- **Claude Haiku 4.5** (paid) is the gold standard. If you ever monetize this and quality matters, set priority 0 on it and let the others be the free fallback.

---

## Cost comparison: paid vs free

Assumption: 100 posts/day, 3000/month.

| Setup | Monthly cost | Bangla quality | Reliability |
|---|---|---|---|
| All Google Gemini free | $0 | Excellent (9/10) | High (one provider, no fallback) |
| Gemini + Groq free (recommended) | $0 | Excellent (9/10) | Very high (two providers, auto-fallback) |
| Gemini + Groq + OpenRouter + Ollama | $0 | Good-Excellent (8/10) | Maximum (four providers) |
| Claude Haiku only | ~$9 | Best (10/10) | Single point of failure |
| Claude Haiku + Gemini free | ~$9 | Best (10/10) | Very high |
| GPT-4o-mini + Gemini free | ~$5 | Excellent (9/10) | Very high |

**My recommendation: Gemini + Groq free for v1, add Claude Haiku with priority 0 if you need premium Bangla for monetization later.**

---

## The "Custom OpenAI-compatible endpoint" slot

Covers:
- **Together AI** — Llama, Mistral, Qwen, paid.
- **Fireworks AI** — fast inference, paid.
- **Replicate** — any open model, pay-per-second.
- **vLLM** — self-hosted, free but needs a server.
- **LM Studio** — desktop GUI for local models, free.
- **OpenRouter** — covered by the built-in preset, but you can use the custom slot to point at a specific OpenRouter model with custom routing.

The custom slot just needs: base URL (e.g. `https://api.together.xyz/v1`), model name (e.g. `meta-llama/Llama-3.3-70B-Instruct-Turbo`), and API key.

---

## Where keys live: vault/env (default) vs per-provider override

By default **no key is ever stored in the database**. The resolver resolves in this precedence order:

1. `llm_providers.api_key` — an **optional** admin-entered override stored on the row (only if you explicitly type one in the admin Provider form).
2. Stronghold/AES vault on desktop (`keyStore`), keyed by `api_key_env_var`.
3. `process.env[api_key_env_var]` (web hosts, CI, self-hosted).

This lets a hosted Vercel web twin work with a per-provider key in the DB **without** exposing it in env config, while the desktop keeps its sealed vault as the primary mechanism (see the "Keys encrypted" panel in AdminShell). The same precedence applies in `packages/llm` `buildProvider` and `Resolver.resolveKey`.

## Auto-fetching free models

The admin **Provider** form (web) has an "⚡ মডেল তালিকা অটো-ফেচ করুন" button that calls `POST /api/providers/models` (admin-only, server-side):

- OpenAI-compatible providers: `${base_url}/v1/models` with the typed key as `Authorization: Bearer` (Ollama sends none).
- Google: `${base_url}/v1beta/models?key=…`.
- **OpenRouter is always filtered to `:free` / free-priced models.**
- The returned list fills the model-name field (one click). The key used for the probe is transient — this route never persists keys; `/api/providers` (POST) and `/api/providers/[id]` (PATCH) handle the optional `api_key` override storage.

**The desktop app mirrors all of this** (`apps/desktop`): Settings → **AI প্রোভাইডার**
embeds `DeskProviderManager`, which talks to the shared `llm_providers` rows through
the bundled runner CLI `providers list|upsert|toggle|remove|models` (same probe:
`/v1/models`, Gemini `v1beta/models`, OpenRouter filtered to free, key used
transiently). So provider editing happens identically from the web admin or the desk;
both write the same Turso table and the pipeline picks changes up on the next run.

---

## What if all providers go down simultaneously?

The pipeline doesn't crash. It:
1. Marks the post `pending_review` with `error = 'all_providers_exhausted'`.
2. Logs the failure to `pipeline_runs.error`.
3. Continues to the next post.
4. Exits 0 so the cron job doesn't retry-loop.

The admin sees a "LLM providers offline" banner in the desktop and web admin UIs, and gets a notification (via `tauri-plugin-notification` on desktop, browser push on web).

**This is by design.** Better to have a pile of unrewritten `pending_review` posts than to crash and lose data.

---

## Purpose (`text` / `image`) and multi-key overrides (v1.1.9)

- Every row in `llm_providers` carries a **`purpose`**: `text` (default) or `image`.
  The rewrite/classification chain selects only `COALESCE(purpose,'text') = 'text'`;
  AI hero images are resolved by a dedicated `ImageResolver` (`@hoichoi/llm`) from
  rows whose `purpose = 'image'`. The two chains fail over independently, so a
  free text provider and an image provider can coexist at different priorities.
- Providers may hold **several keys** and an optional per-row **`api_key`
  override** that takes precedence over the stronghold vault and env. The unique
  constraint is `(provider_key, purpose)` (non-unique index), not `provider_key`
  alone.
- CLI: `providers add … --purpose image` (the desktop provider manager and the
  web `/admin/providers` form expose the same select). `Group by purpose` in the
  admin so an image model never lands in the text fallback chain.

---

## Manual image generation (v1.1.10)

The image chain is no longer only an automatic fallback for media-less posts — an
operator can generate a hero for **any** post on demand.

- **Interface.** `@hoichoi/llm` adds an **optional** `generateImage(request)` to the
  provider interface (providers that cannot render images simply omit it),
  `composeImagePrompt` (the same safety-banned prompt the fallback path uses),
  `listImageProviders`, and `image-util.ts`.
- **Eligibility.** Only rows with `purpose = image` are considered. As with the
  fallback path, sensitive categories (missing-children / child-sexual-abuse /
  extramarital-crime) are **always** excluded and the prompt bans text, logos, real
  people and children.
- **Surfaces.**
  - CLI: `media generate <postId>` (scraper `media-backfill.ts`).
  - Web: `POST /api/posts/[id]/generate-image` + the **AI ছবি তৈরি** panel
    (`PostImageGenerator.tsx`) in the post editor.
  - Desktop: the কনটেন্ট সারি row action (`deskQueueGenerateImage` /
    `deskImageProviders`).
- **Storage.** On the desktop/CLI the returned buffer is persisted through
  `@hoichoi/db`'s shared uploader (`writeGeneratedMedia` → adapter chain, else the
  local `public/uploads` mirror), so it lands in the same place as scraped media and
  is served identically. On the **hosted web** the route instead dispatches
  `.github/workflows/generate-image.yml` when `GH_TRIGGER_TOKEN` + `GH_REPO` are set:
  the runner mirrors + **commits** the image (the only thing a serverless deploy can
  serve), and the editor polls until it appears. Without a runner the route generates
  in-process and returns 501 if the bytes cannot be persisted.
- **Providers that render images:** Gemini image models
  (`GEMINI_IMAGE_MODEL`, default `gemini-2.5-flash-image`) are the built-in option;
  any OpenAI-compatible endpoint that exposes an images API can be added as a custom
  image provider.
