# Architecture & Design Notes — Bangla Feed Pipeline (v2)

> **Current-state deltas (Sept 2026):** this is a design note, not the live
> spec. The repo now uses **Turso/libSQL** (not Supabase/Postgres — no
> pgvector, no keep-alive ping; dedup vectors use libSQL `vec0`, and media
> lives on a pluggable adapter: local FS dev / Cloudflare R2 prod). The desktop
> vault is **AES-256-GCM** (not Stronghold), and admin auth uses **one-time
> codes** minted in the desktop app (no password, `admin_login_codes`). The
> desktop console is an **8-tab mockup-parity desk** (Monitor … Ads) with a
> live sync bar, whose মনিটর tab and the web admin home both render the **shared
> `@hoichoi/dash` five-tab dashboard** (data comes from the app, UI comes from
> the package). See `README.md`, `docs/DEPLOY_WEB.md`, `docs/DESKTOP.md` and
> `docs/design-system.md` for the authoritative current state.

Companion to `coding-agent-prompt.md`. Read this for the *why* before pasting the prompt.

> **v2.1 update — category clarity.** The user clarified that the three categories are: child sexual abuse (madrasa/mosque/private place victims, both genders), extramarital blackmail/crime, and missing children + ছেলে ধরা hoaxes. The colloquial names have been replaced with clearer slugs (`child-sexual-abuse`, `extramarital-crime`, `missing-children`) and each category has its own LLM system prompt, its own moderation rules, and its own public-page behavior. See `editorial-policy.md` for the full editorial standard. **Before pasting the prompt, also read `editorial-policy.md`** — this is a public-interest news platform covering sensitive topics, and the engineering is only the floor, not the ceiling, of what's needed.

---

## 1. System overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  Every 2 hours (or manual trigger)                                   │
│                                                                      │
│   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│   │  GitHub Actions  │───▶│  Scraper (Node)  │───▶│  Turso DB    │  │
│   │   cron job       │    │  Playwright +    │    │  libSQL +    │  │
│   └──────────────────┘    │  Multi-LLM       │    │  vec0        │  │
│                           │  Resolver        │    │  + media     │  │
│                           └────────┬─────────┘    └──────┬───────┘  │
│                                    │                      │          │
│             ┌──────────────────────┼──────────────────────┘          │
│             │                      │                                 │
│             ▼                      ▼                                 │
│      ┌─────────────┐        ┌─────────────┐                          │
│      │ PRIVATE     │        │ PUBLIC      │                          │
│      │ screenshots/│        │ media/      │                          │
│      │ (audit only)│        │ (shown to   │                          │
│      │             │        │  visitors)  │                          │
│      └─────────────┘        └──────┬──────┘                          │
│                                    │                                 │
│   ┌──────────────────┐             │                                 │
│   │  Tauri Desktop   │             │                                 │
│   │  Admin App       │             │                                 │
│   │  + Stronghold    │             │                                 │
│   │  (keys + cookies)│             │                                 │
│   └────────┬─────────┘             │                                 │
│            │                       ▼                                 │
│            │              ┌──────────────────┐                        │
│            │              │  Vercel-hosted   │                        │
│            │              │  Next.js site    │  ISR + revalidate      │
│            │              │  (public + /admin)                       │
│            │              └──────────────────┘                        │
│            │                                                           │
│            └──▶ local pipeline run (spawns scraper CLI)               │
│                                                                      │
│   ┌──────────────────┐    ┌──────────────────┐                      │
│   │  Public visitors │───▶│  /submit form    │ → submitted_pages     │
│   │  / report button │───▶│  /api/report-content → removal_requests  │
│   └──────────────────┘    └──────────────────┘                      │
└──────────────────────────────────────────────────────────────────────┘
```

The split is the same as v1, but with two important additions:
1. **Two storage buckets with very different jobs.** The `screenshots/` bucket is **private** and only admins ever see the FB UI screenshot. The `media/` bucket is **public** and holds the re-processed image/video that visitors actually see on the public site.
2. **Multi-AI provider resolver.** Instead of one LLM vendor, the scraper reads `llm_providers` from the DB at runtime and tries providers in priority order with automatic fallback.

---

## 2. Why screenshot is private, media is public

This is the most important design decision in v2 and the one most teams get wrong.

**The user collects local Bangla content from Facebook.** They take a screenshot of the original post to keep as **proof / reference** (in case Facebook deletes it, in case someone disputes what was originally there, in case a moderation decision needs to be defended later). But they do **not** want visitors to see a screenshot of the Facebook UI — that's a confusing, low-quality, brand-destroying way to present news.

So the pipeline has two parallel outputs per post:

| Output | Storage | Visible to | Purpose |
|---|---|---|---|
| Reference screenshot of FB post UI | `screenshots/` (private) | Admins/moderators only, via signed URL in the moderation queue | Audit trail, dispute resolution, proof of original |
| Re-processed image/video (the actual media in the post, downloaded, watermark-added, re-encoded) | `media/` (public) | Everyone — this is the hero of the public post page | The actual content visitors consume |

**The public post page never references the screenshots bucket.** There is a CI guard that fails the build if any public page contains a URL under `/storage/v1/object/sign/screenshots/`.

**Why this matters for SEO:** Google indexes images. Screenshotting the FB UI means indexing FB's UI, which is duplicate, low-quality, and gets filtered out of image search. The re-processed real media is original, gets indexed, and shows up in Google Images for the topic.

**Why this matters for trust:** Visitors landing on a site full of Facebook UI screenshots feel like they're on a scraper site, not a news site. Real re-processed media with a subtle attribution watermark looks like real editorial.

---

## 3. Multi-AI provider design — deep dive

See `ai-provider-strategy.md` for the free-tier economics. This section is the architecture.

### 3.1 The interface

```typescript
// packages/llm/src/types.ts
export type RewriteOutput = {
  title_bn: string;
  summary_bn: string;
  body_bn: string;
  safety_flag: 'none' | 'minor_involved' | 'unverified_claim' | 'graphic_content';
};

export interface LLMProvider {
  readonly name: string;
  readonly isFreeTier: boolean;
  rewrite(input: { rawText: string; sourceName: string }): Promise<RewriteOutput>;
  embed?(input: string): Promise<number[]>;
  healthCheck(): Promise<{ ok: boolean; latencyMs?: number; error?: string }>;
}
```

One interface, many implementations: Anthropic, OpenAI, Google Gemini, Groq, OpenRouter, Mistral, Ollama, plus a generic "custom OpenAI-compatible" that covers Together AI, Fireworks, Replicate, vLLM, LM Studio, etc.

### 3.2 The resolver

```typescript
// packages/llm/src/resolver.ts (sketch)
export async function getRewriteProvider(): Promise<LLMProvider> {
  const configs = await db.llm_providers
    .select('*')
    .eq('is_active', true)
    .eq('supports_rewrite', true)
    .order('priority', { ascending: true });
  for (const cfg of configs) {
    const key = await resolveKey(cfg.api_key_env_var);  // env or Stronghold
    if (!key) continue;
    const provider = buildProvider(cfg, key);
    const health = await provider.healthCheck().catch(() => ({ ok: false }));
    if (health.ok) return provider;
  }
  throw new Error('No LLM provider available');
}
```

The same pattern for `embed()`. The resolver is called once per rewrite/embed operation; on a per-call failure, it tries the next provider.

### 3.3 Key storage — three places, one name

The `api_key_env_var` field is the single source of truth for "where is this key?" Examples:

| Provider | `api_key_env_var` | Where it actually lives |
|---|---|---|
| `google` | `GOOGLE_API_KEY` | Desktop Stronghold + GH Secret |
| `groq` | `GROQ_API_KEY` | Desktop Stronghold + GH Secret |
| `ollama` | `OLLAMA_BASE_URL` | GH Secret (no key needed) |
| `custom` | `MY_CUSTOM_LLM_KEY` | Desktop Stronghold + GH Secret |

Why no keys in the DB: the `llm_providers` table can be queried freely for the admin UI (provider list, priorities, free-tier flag) without ever touching secrets. Keys only get pulled at runtime by the scraper, which is the only place that needs them.

### 3.4 Failure and rate-limit handling

- **429 rate limit** → mark that provider as "cooldown until X" in memory + log to `pipeline_runs.stats`. Don't try it again for N minutes.
- **401 / 403 auth error** → log error, try the next provider. Don't cooldown (retrying won't help).
- **5xx / network error** → try the next provider; cooldown for 5 min.
- **Bad output** (e.g. returned English instead of Bangla) → don't fall back automatically; flag the post as `pending_review` with an error. A bad fallback cascading is worse than a human reviewing it.
- **All providers exhausted** → fail the rewrite, mark post `pending_review`, log to `pipeline_runs.error`. The cron job still exits 0 (so Vercel doesn't get pinged for nothing).

### 3.5 Default priority on first install

| Priority | Provider | Reason |
|---|---|---|
| 1 | `google` (gemini-2.0-flash) | Free, excellent Bangla, supports both rewrite + embeddings |
| 2 | `groq` (llama-3.3-70b-versatile) | Free, blazing fast fallback |
| 3 | `openrouter` (any `:free` model) | Free, broadest model variety as last resort |
| 4 | `ollama` (if running locally) | Free, unlimited, no internet required |

Admin can add `anthropic` with priority 0 if they want to use Claude Haiku 4.5 for quality and fall back to Gemini for cost.

---

## 4. Duplicate detection — how and why (unchanged from v1)

Two layers, both essential:

1. **Image perceptual hash (pHash).**
   - Robust to crop, resize, color shift, JPEG re-encoding.
   - Computed on the **re-processed media** before upload (so even after our ffmpeg/sharp pass, a repost catches).
   - Hamming distance ≤ 8 = duplicate.
2. **Text embedding cosine similarity.**
   - Catches paraphrased reposts where the image is different.
   - Stored in `pgvector` with `ivfflat` index → sub-100ms queries at 100k posts.
   - Threshold: cosine distance < 0.12 with the same `source_id` (cross-source threshold should be higher, like 0.08, to avoid false positives between different stories about the same topic).

---

## 5. Logged-in scraping — design notes

The user confirmed logged-in mode is the default. Implications:

- **Cookie management:** desktop app imports the FB session cookie (via a Playwright login window OR a browser cookie export) and stores it in Stronghold. The cookie is mirrored to GH Secrets as `FB_SESSION_COOKIE` for the cron.
- **Cookie expiry:** Facebook session cookies expire after ~60 days. The desktop app shows a "Re-login to Facebook" banner 7 days before expiry. The cron job detects 401s and fails with a clear "session expired" error in `pipeline_runs.error`.
- **Personal profile guard:** logged-in mode makes it tempting to scrape more. The scraper must still skip any URL that's not a verified Page (no `/pages/`, no `/<name>-<numericId>/`, no verified handle).
- **Rate limits stay.** Even logged in, 1 req / 2s per source is the safe upper bound. Going faster triggers FB's "unusual activity" detector and gets the account locked.
- **ToS acceptance:** the desktop app's first-run setup shows a single checkbox: "I understand logged-in scraping accesses content as me, and I am responsible for complying with Facebook's Terms and applicable laws." No checkbox = no setup.

---

## 6. Vercel + GitHub integration (unchanged from v1)

- **Vercel auto-deploys** on push to `main`.
- For **content updates** (scraper), use a **Vercel Deploy Hook** that the GitHub Action pings after a successful run.
- ISR with `revalidate = 300` is the safety net — even if the deploy hook fails, the public site refreshes within 5 minutes.
- Custom domain: skipped in v1. Add later in Vercel → Domains (free, just point your DNS).

---

## 7. SEO strategy

The user explicitly asked for "SEO must need better". The full implementation is in Phase 4.4 of the prompt, but the high-level:

- **Self-hosted Bangla font** (Hind Siliguri or Noto Sans Bengali) via `next/font` — no FOIT, no external request, Lighthouse-friendly.
- **Every page has unique metadata** with Bangla descriptions. The `title.template` pattern keeps the brand consistent.
- **JSON-LD `NewsArticle`** on every post. This is what gets you into Google News and Top Stories carousel. The required fields are: `headline`, `image`, `datePublished`, `dateModified`, `author`, `publisher` (with logo URL). Bangla is supported (`inLanguage: "bn-BD"`).
- **JSON-LD `BreadcrumbList`** for `/category/[slug]` and `/post/[slug]`. Helps with sitelinks.
- **`sitemap.xml`** is dynamic and includes every **currently public** post (i.e. `status = 'published' AND archived_at IS NULL AND published_at >= start_of_month()`) with its `lastModified`. Because the public window is one calendar month, the sitemap is small and the freshness signal is strong. Google News / Discover loves this — daily churn, recent publishes, small index.
- **`robots.txt`** allows `/`, disallows `/admin/` and `/api/`, points to the sitemap.
- **OG image per post**: a 1200×630 image with the post title in Bangla, rendered at build time via `opengraph-image.tsx`. Massive CTR boost when shared on Facebook.
- **Structured data on legal pages**: `Organization` on `/about`, `ContactPage` on `/contact`, `WebPage` on the others.
- **Core Web Vitals**: RSC + dynamic imports + `next/image` priority on hero + font preloading → target ≥ 95 on Lighthouse.
- **No client-side JS bloat**: the homepage should hydrate in < 50KB. The admin (`/admin/*`) is a separate route group and can be heavier.

---

## 8. Free-tier budget — updated for v2

What broke and what didn't:

| Resource | v1 estimate | v2 reality | Verdict |
|---|---|---|---|
| Turso DB (500 MB) | ~1.6 MB/day → 500 MB in 300 days | Same | OK |
| Media storage (1 GB) | **30 MB/day → 1 GB in 33 days** | Now we store re-encoded WebP (~50 KB/image) + MP4 (~2 MB/video) + private screenshot (~200 KB). Slightly worse. | **First thing to address** |
| Egress (5 GB/mo) | 10k pageviews | Same | OK |
| GitHub Actions min (2000/mo private) | 90% used | Scraper run is now ~7 min (added media processing) = 84 min/day = 2520/mo | **Now OVER quota on private repos** |
| LLM API cost | ~$9/mo at 100 posts/day | $0 if using Gemini/Groq free tiers, or ~$3/mo if using Gemini paid tier | **Now near zero** |

**Two fixes:**
1. **Make the GitHub repo public** (or upgrade to GitHub Pro). Public repos get unlimited Actions minutes. The data in the repo is only the schema and the app code, not the content. The actual posts live in Turso, which is private.
2. **Aggressive media compression** (already in the prompt: WebP 80%, H.264 720p, 1500k bitrate). Plus: move screenshots to a separate private repo or delete after 90 days.

**LLM cost collapse:** the v1 estimate of $9/mo assumed Claude Haiku 4.5. With Gemini Flash free tier handling 1,500 rewrite calls per day (way more than you'll need), the v2 cost is **$0/mo at any realistic volume**. This is the big win of the multi-provider design.

---

## 9. Things I deliberately did NOT include (updated)

- **No reactions/likes** on the public site. Comments exist but are **moderated-first** (`comments.status = pending → approved/blocked` via its own `/admin/comments` queue); it's a content pipeline, not a community.
- **No email newsletter.** Skip for v1; add later with Resend free tier. (Maintenance-mode *email subscribe* inbox is a stop/notice channel, not a newsletter.)
- **No mobile app.** Tauri desktop covers desktop. Mobile can come later via Tauri Mobile once v1 is stable.
- **No multi-tenant admin.** One operator, one org.
- **No real-time push.** ISR is enough for news.
- **No automatic translation back to English.** If you need it later, add a separate LLM call with a "translate bn→en" prompt.
- **No automatic Facebook posting** (i.e., we don't auto-repost back to FB). The user collects, we publish on their own site. Cross-posting would be an obvious ToS violation.
- **No self-hosted database.** Use hosted Turso. Self-hosting costs more in time than money at this scale.

---

## 11. Monthly archive — the content lifecycle

The user explicitly stated that **only the current calendar month is public**. Older content is archived, not deleted, and is admin-only.

### Lifecycle of a post

```
[pending_review] → [approved] → [published] (public for current month)
                                          ↓
                                  [archived] (00:00 UTC on 1st of next month)
                                          ↓
                            stays in DB for ARCHIVE_RETENTION_DAYS (default 180)
                                          ↓
                                  [purged] (hard-deleted, media + screenshot + raw_post gone)
```

Exceptions:
- `missing-children` posts with `case_status = 'active'` skip the archive step. They stay public until the case is marked `found`, `unresolved`, or `false-alarm` by an admin, at which point normal archive rules apply.
- Posts with `legal_hold = true` skip the purge step. They stay in the archive indefinitely until the hold is lifted.

### Why this design

1. **Freshness signal to Google.** A site that cycles through ~30 days of content at a time has very high content/recency ratios. Google News and Discover prioritize this. Compare to a site with 5 years of posts where most are stale.
2. **Lower storage costs.** Media storage is a pluggable adapter (local FS in dev, Cloudflare R2 or GitHub in prod). At ~50 KB per image, ~2 MB per video, and ~200 KB per screenshot, plus the database row, you can hold ~3 months of archive comfortably before hitting limits. Default 180-day retention keeps it tight.
3. **Lower legal exposure.** Sensitive content (especially `child-sexual-abuse`) has a higher deletion risk over time. 180 days is a reasonable window for legal/editorial record without indefinite retention of identifying material.
4. **Editorial discipline.** The "this month only" framing matches the daily-news cadence the categories imply. You can't be a stale-archive site if you only show the current month.

### What "archived" looks like for each surface

| Surface | Behavior |
|---|---|
| Public site homepage, category pages, sitemap | Excluded entirely |
| Public post URL `/post/[slug]` | Polite "এই পোস্ট গত মাসের সংবাদ" page (200 OK, no content) — so shared links don't 404 |
| Web admin `/admin/archive` | Full content visible, filterable, with un-archive + legal-hold actions |
| Desktop app Archive tab | Same as web admin |
| Google Search | Will de-index on next sitemap fetch (typically within days) |
| JSON-LD / OG image | Not generated for archived posts |
| `pipeline_runs` | Archive runs log here with `stats.job = 'monthly_rollover'` |

### Implementation summary

- **GitHub Action `rolling-archive.yml`** runs on a schedule. Calls `pnpm --filter scraper archive --previous-month` then `purge --older-than-days=180`, then pings the Vercel deploy hook.
- **`scraper archive.ts`** (Phase 3.9) implements both subcommands as plain SQL against Turso, plus media-adapter calls for blob cleanup.
- **The view `posts_current_month`** encapsulates the "what's public" logic for all public queries. Use it everywhere.
- **No RLS in this project.** There is no Supabase, so there are no row-level policies. Public queries filter to `published` + non-archived explicitly, and every admin route re-checks the session server-side. Defense in depth lives in the API layer, not the database.

---

## 10. Roadmap after v1

1. **Tauri Mobile** (iOS + Android) — same codebase, one new build target.
2. **Custom domain** + Google News publisher registration (once you have consistent publishing).
3. **Cross-source dedup** (same story shared across 5 Pages → 1 published post).
4. **Automatic English translation** of approved posts for international SEO.
5. **Public read-only JSON API** so other sites can republish with attribution.
6. **Community flagging with weighted trust scores**, auto-hide after N reports.
7. **LLM fine-tune** on approved Bangla rewrites for cheaper, more on-brand output.
8. **Move screenshots to a dedicated private bucket** once the configured media adapter becomes the bottleneck.
9. **Vector dedup of the re-processed media** (so a repost with a different crop but same visual content is caught even if the original screenshot is different).
10. **Auto-publish via Vercel deploy hook only** (skip ISR for breaking-news categories) — adds a manual "publish now" button in the admin.

---

## 12. Maintenance mode + feed-count knobs (v1.1.7)

- **Where it lives:** nested inside `settings.app_config_json` (`maintenance` subtree, typed `MaintenanceSiteConfig`). No new columns — `parseAppConfig` deep-merges it via `parseMaintenanceConfig` in `@hoichoi/db`, so an untouched row renders the built-in defaults.
- **Gate:** `(site)/layout.tsx` checks `cfg.maintenance_mode` for logged-out visitors only. Signed-in admins see the site normally. `robots.txt` disallows while active.
- **Screen:** `apps/web/src/components/maintenance/MaintenanceScreen.tsx` is fully self-contained (`mc-*` CSS variables/tokens) so the mockup look survives any theme change. It renders real data: `statsSnapshot` (collectedToday/published/duplicatesBlocked) + `countReviewQueues().pending_comments` + the latest `pipeline_runs` row.
- **Catch basin:** two public, insert-only routes (`POST /api/maintenance/subscribe`, `POST /api/maintenance/contact`) write into `maintenance_subscribers` / `maintenance_messages` (created by `ensureMaintenanceTables()` in `client.ts`). The admin Settings → অপারেশন tab snapshots both counts via `maintenanceInboxSnapshot()`.
- **Editing:** the রক্ষণাবেক্ষণ tab (`MaintenanceEditor`) edits every visual/copy field with a live `<MaintenanceScreen preview>`; saves through the single tabbed console PATCH → `/api/settings`.
- **Feed-count knobs:** `home_post_count` (homepage `pageSize()` clamp 4–50), `detail_similar_count` (post-page related grid, clamp 1–8), `comments_show_count` (server-side `/api/comments` limit sanitized `Math.max(1, n)`). Desktop Settings mirrors the same three fields and reads the same merged config, so counts survive cloud sync.
