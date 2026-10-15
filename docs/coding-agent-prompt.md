# Coding Agent Prompt — Bangla Facebook Content Pipeline (v2)

> **Status: historical build prompt.** This is the original phase-by-phase prompt
> that constructed the system; it is kept as a reference, not a spec. Subsequent
> decisions changed parts of it: the DB is **Turso/libSQL** (Supabase was
> dropped — no pgvector; dedup uses libSQL `vec0`, storage is a pluggable
> local/R2 adapter), the desktop vault is **AES-256-GCM** (Stronghold removed),
> admin login is **one-time codes** (no password), and the desktop is a
> mockup-parity **8-tab desk console** with a sync bar (see `docs/DESKTOP.md`).
> For the current state read `README.md`, `docs/DEPLOY_WEB.md`,
> `docs/DESKTOP.md`, `docs/design-system.md`, `docs/database-decision.md`.

> **How to use:** Copy everything below the line into your coding agent (Claude Code, Cursor Agent, Codex, etc.). The agent should work in phases. Confirm each phase before moving to the next.
>
> **Decisions locked in (from user):**
> 0. **Legal posture (clarified by user):** All content is collected from public Facebook feeds with the original user posts as the source. The site is a public-interest news aggregator (not a scraper site), attribution is always preserved, and the activity is legitimate. This is the framing used throughout Phase 8 and the editorial policy.
> 0a. **Positioning (clarified by user):** The product is a **viral-content ephemeral snapshot** — not a permanent news archive. Content appears, trends, then disappears. The platform does not claim ownership of FB content; it only holds a temporary, attributed mirror of public posts for a short window. After the window, content is hard-deleted on our side; the original FB post remains the source of truth.
> 0b. **Project name:** **হৈচৈ (Hoichoi)** — "buzz/uproar/commotion" in Bangla. Captures the viral spread feeling, distinctly Bangla, and fun. Wordmark is `হৈচৈ।` with the red dot. Top-bar brand text: `HOICHOI · AUTO-CURATED NEWS DESK`. Primary tagline: `"ভাইরাল বাংলা, সপ্তাহখানেক"` (Viral Bangla, for a week). Secondary masthead tagline: `"ফেসবুকের হৈচৈ — এখন বাংলায়, সাত দিন পর গায়েব"` (Facebook's buzz — now in Bangla, gone after 7 days).
>   > **Note on brand overlap:** there is an existing Bangla OTT streaming platform also called "Hoichoi / হৈচৈ". The streaming platform focuses on Bengali movies and series; this product focuses on viral news aggregation. The contexts are different. The colloquial Bangla word "হৈচৈ" (meaning "buzz") predates the streaming brand. If brand overlap is a concern, the user can pivot to **চর্চা (Chorcha)** or **ফুলকি (Fulki)** without changing any architecture.
> 0c. **Archive window:** **7 days rolling** (post is public for 7 days after `published_at`, then auto-archived; archive retention is 30 days admin-only, then hard-deleted). After ~37 days max, every trace (rewritten body, media, screenshot, raw_post) is permanently deleted from our side. Configurable via env var `ARCHIVE_VISIBLE_DAYS` (default 7) and `ARCHIVE_RETENTION_DAYS` (default 30).
> 1. Categories — **final slugs and display names** (chosen for clarity, SEO, and appropriate gravity; user confirmed colloquial terms can be rearranged):
>
>    | Colloquial | What it actually is | **Final slug** | Bangla display name | English label |
>    |---|---|---|---|---|
>    | bolatkar | Madrasa / mosque / private place child sexual abuse victims (male and female) | `child-sexual-abuse` | শিশু যৌন নির্যাতন | "Child sexual abuse (religious & private settings)" |
>    | porokiya | Extramarital blackmail & related crime (not just affair gossip) | `extramarital-crime` | পরকীয়া অপরাধ | "Extramarital crime & blackmail" |
>    | child kidnap | ছেলে ধরা (stranger-kidnap hoaxes / mob panics) + নিখোঁজ (missing children) | `missing-children` | নিখোঁজ শিশু ও ছেলে ধরা | "Missing children & child safety" |
>
>    Screenshot of the original post is captured **for internal reference / audit only** — the public post displays the **actual media** (the photo/video inside the post) re-processed, never the FB UI screenshot.
> 2. **Multi-AI provider system** with admin-managed keys. Built-in defaults for free tiers (Google Gemini, Groq, OpenRouter, Ollama), plus a "Custom OpenAI-compatible endpoint" slot for anything else. Admin can add, prioritize, enable/disable, and remove providers at runtime. No single-vendor lock-in.
> 3. **Logged-in Facebook scraping is the default mode** (user has legal basis). Still rate-limited, still verified-Pages-only, still skips personal profiles.
> 4. Host on **`.vercel.app` for v1**, add custom domain later.
> 5. Public site has **full set of pages**: home, category, post, submit-a-page, about, privacy, terms, DMCA, contact. **Full SEO**: sitemap, robots, JSON-LD `NewsArticle`, OG, Twitter cards, Bangla self-hosted font, `next/image`, ISR.

---

## Project: Bangla Facebook Content Aggregator & Publisher

Build a system that:
1. Scrapes **public Facebook Pages** (never personal profiles) for video/picture posts in three fixed categories: **`child-sexual-abuse`** (madrasa/mosque/private-place child sexual abuse victims), **`extramarital-crime`** (extramarital blackmail & related crime), **`missing-children`** (ছেলে ধরা + নিখোঁজ children). See the "Category-specific editorial rules" section for behavior per category.
2. For each post, captures a **reference screenshot** (internal audit only, **never shown on the public site**) AND downloads the **actual media** (photo/video) for re-processing.
3. Rewrites the post in **Bangla** as a clean news-style article via a multi-AI-provider system (with free-tier defaults). Strict rules: no fabrication, no child PII, no slur reproduction, automatic safety flagging.
4. Detects duplicates across text (semantic embedding) and images (perceptual hash) before publishing.
5. Publishes to a public Bangla website hosted on Vercel, displaying the **re-processed media** (not the FB UI screenshot).
6. Runs the full pipeline automatically every 2 hours via GitHub Actions cron.
7. Provides a **Tauri desktop admin** (credential vault via OS keychain, source mgmt, manual pipeline trigger, moderation queue, AI provider mgmt) AND a **Next.js web admin** (same features for browser-based use).
8. Public site includes a **"Submit a Facebook Page"** form and full legal pages (About, Privacy, Terms, DMCA, Contact) with proper SEO.

All credentials and account keys are stored encrypted (Tauri Stronghold on desktop, GitHub Secrets for the cron mirror) — never in code, never in `.env` files committed to git.

---

## Non-negotiable tech stack

| Layer | Choice | Reason |
|---|---|---|
| Desktop app | **Tauri 2.x** (Rust backend + web frontend) | Small bundle, OS keychain via `tauri-plugin-stronghold` |
| Desktop UI | **React 18 + Vite + TypeScript + Tailwind + shadcn/ui** | Familiar, fast, looks native |
| Web app (public site + admin) | **Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui** | Vercel-native, ISR, `next/image`, `next/font`, file-based metadata conventions |
| Database | **Supabase (Postgres)** — free tier | Postgres + pgvector + Auth + Storage in one |
| Local DB on desktop | **SQLite via `tauri-plugin-sql`** | Offline cache of jobs & credentials metadata |
| Scraper | **Playwright (TypeScript)** | Built-in screenshots, robust DOM handling |
| Media processing | **ffmpeg** (video) + **sharp** (image) | Strip UI, re-encode, add watermark, generate thumbnails |
| Bangla rewriting | **Multi-provider** (see AI section below) | Free by default, no vendor lock-in |
| Embeddings for dedup | **`text-embedding-3-small`** (OpenAI) OR **Google `text-embedding-004`** (free) | 1536 / 768 dims, both fine for pgvector |
| Image dedup | **`image-hash` (pHash)** in Node, stored in Postgres | Perceptual hash, robust to crop/resize |
| Video dedup | Extract keyframe (ffmpeg at t=2s) → pHash | Reuses image hash pipeline |
| Cron | **GitHub Actions** on `0 */2 * * *` | Free 2000 min/mo for private repos |
| Hosting | **Vercel (Hobby)**, `*.vercel.app` for v1 | Free for Next.js, ISR, edge |
| CI | **GitHub Actions** (lint, type-check, test, build) | Same as cron infra |
| Monorepo tool | **pnpm workspaces + Turborepo** | Share types between desktop, scraper, web |

---

## Multi-AI provider design (key section — read carefully)

The user wants **free by default** with the option to add paid providers. The system must support **multiple providers configured by the admin at runtime** with automatic fallback.

### Provider catalog (built-in presets the admin can enable with one click)

| Provider key | Free tier | Model examples (default) | Bangla quality | Notes |
|---|---|---|---|---|
| `google` | 1,500 req/day, 10 RPM (Gemini Flash) | `gemini-2.0-flash`, `gemini-2.5-flash` | Excellent | Default for both rewrite + embeddings |
| `groq` | 30 RPM, ~14k req/day | `llama-3.3-70b-versatile`, `mixtral-8x7b` | Good | Fastest inference, great fallback |
| `openrouter` | 20 RPM, 50 req/day (free models) | Any `:free` model (e.g., `meta-llama/llama-3.3-70b:free`) | Good | One key → many models |
| `ollama` | Unlimited (local CPU/GPU) | `llama3.2`, `mistral`, `gemma2`, `bge-m3` (embeddings) | Decent | Runs on the admin's own machine; no API key |
| `anthropic` | None (paid, cheap) | `claude-haiku-4-5` | **Best Bangla** | Optional paid burst for quality-critical posts |
| `openai` | None (paid) | `gpt-4o-mini`, `text-embedding-3-small` | Excellent | Optional paid burst + best embeddings |
| `mistral` | Free trial credits | `mistral-small-latest` | Good | EU-friendly |
| `custom` | Depends | Any model on an OpenAI-compatible endpoint | n/a | For Together AI, Fireworks, Replicate, self-hosted vLLM, etc. |

### How providers are stored and resolved

1. The admin adds a provider in the **desktop or web admin UI**. Form fields: provider key, display name, model name, optional base URL, priority (1 = highest), free-tier checkbox, "also enable for embeddings" checkbox, optional rate-limit override.
2. The form also has an **API key** field. When submitted:
   - The key is stored in **Tauri Stronghold** on the desktop (primary store).
   - The key is **pushed to GitHub Actions secrets** via the GitHub API (so the cron job can use it). The web admin uses the same flow.
   - The provider config (without the key) is saved to the `llm_providers` table.
3. The `llm_providers` row has an `api_key_env_var` field — the **name of the env var / Stronghold key** to look up at runtime. This is auto-generated from the provider key (e.g., `groq` → `GROQ_API_KEY`).
4. At runtime, the scraper:
   - Reads all `llm_providers` rows where `is_active = true`, sorted by `priority ASC`.
   - For the highest-priority provider, resolves the API key by looking up `process.env[api_key_env_var]` (cron) or `stronghold.get(api_key_env_var)` (desktop).
   - Calls the provider's `rewrite()` and (if supported) `embed()` methods.
   - On failure (rate limit, network, auth error), automatically tries the next provider in priority order. Logs the failure per provider.
5. The "Add custom OpenAI-compatible endpoint" form lets the admin plug in Together AI, Fireworks, Replicate, vLLM, LM Studio, etc. by entering a base URL + model name + key.

### Default priority on first install

| Priority | Provider | Reason |
|---|---|---|
| 1 | `google` (gemini-2.0-flash) | Free, excellent Bangla, supports both rewrite + embeddings |
| 2 | `groq` (llama-3.3-70b-versatile) | Free, blazing fast fallback |
| 3 | `openrouter` (any free model) | Free, broadest model variety as last resort |
| 4 | `ollama` (if running locally) | Free, unlimited, no internet required |

Admin can add `anthropic` or `openai` with priority 0 to override for quality-critical posts.

---

## Repository layout

```
bangla-feed-pipeline/
├── apps/
│   ├── desktop/                  # Tauri admin app
│   │   ├── src/                  # React frontend
│   │   └── src-tauri/            # Rust backend (Stronghold commands)
│   ├── web/                      # Next.js public site + web admin
│   │   ├── app/
│   │   │   ├── (public)/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── category/[slug]/page.tsx
│   │   │   │   ├── post/[slug]/page.tsx
│   │   │   │   ├── submit/page.tsx
│   │   │   │   ├── about/page.tsx
│   │   │   │   ├── privacy/page.tsx
│   │   │   │   ├── terms/page.tsx
│   │   │   │   ├── dmca/page.tsx
│   │   │   │   └── contact/page.tsx
│   │   │   ├── (admin)/
│   │   │   │   └── admin/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── sources/page.tsx
│   │   │   │       ├── moderation/page.tsx
│   │   │   │       ├── providers/page.tsx
│   │   │   │       ├── submissions/page.tsx
│   │   │   │       ├── removal-requests/page.tsx
│   │   │   │       └── settings/page.tsx
│   │   │   ├── api/
│   │   │   ├── sitemap.ts
│   │   │   ├── robots.ts
│   │   │   ├── opengraph-image.tsx
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   └── lib/
│   └── scraper/                  # Standalone scraper package
│       ├── src/
│       │   ├── facebook.ts
│       │   ├── screenshot.ts
│       │   ├── media.ts
│       │   ├── video.ts
│       │   ├── dedup.ts
│       │   ├── rewrite.ts
│       │   ├── provider.ts
│       │   └── pipeline.ts
├── packages/
│   ├── shared-types/             # TS types shared everywhere
│   ├── supabase-client/          # Typed Supabase client
│   └── llm/                      # Multi-provider LLM abstraction
│       ├── src/
│       │   ├── index.ts
│       │   ├── types.ts
│       │   ├── anthropic.ts
│       │   ├── openai.ts
│       │   ├── google.ts
│       │   ├── groq.ts
│       │   ├── openrouter.ts
│       │   ├── ollama.ts
│       │   ├── mistral.ts
│       │   ├── custom.ts
│       │   ├── resolver.ts        # reads llm_providers table, picks + falls back
│       │   └── prompts/
│       │       ├── rewrite.child-sexual-abuse.ts
│       │       ├── rewrite.extramarital-crime.ts
│       │       └── rewrite.missing-children.ts
│       └── package.json
├── .github/
│   └── workflows/
│       ├── pipeline-cron.yml     # Every 2h
│       ├── keep-alive.yml        # Daily Supabase keep-alive
│       └── ci.yml
├── supabase/
│   ├── migrations/
│   └── functions/                # Edge functions (only if needed)
├── turbo.json
├── pnpm-workspace.yaml
├── README.md
├── LICENSE
└── .env.example
```

---

## Database schema (Supabase / Postgres)

Create these tables via SQL migrations. Use the **`vector`** extension. Enable **RLS** on all public-facing tables; only `service_role` and admin users can write.

```sql
-- 1) Sources: Facebook Pages we are allowed to scrape
create table sources (
  id uuid primary key default gen_random_uuid(),
  page_url text not null unique,
  page_name text not null,
  category text not null check (category in ('child-sexual-abuse','extramarital-crime','missing-children')),
  is_verified boolean default false,           -- manually verified by admin
  is_active boolean default true,
  last_scraped_at timestamptz,
  created_at timestamptz default now()
);

-- Seed sources (admin must verify before activation). Examples of what to add:
--   ('https://facebook.com/<verified-bangla-news-page>', '<Page Name>', 'child-sexual-abuse', false, true)
--   ('https://facebook.com/<verified-bangla-news-page>', '<Page Name>', 'extramarital-crime', false, true)
--   ('https://facebook.com/<verified-bangla-news-page>', '<Page Name>', 'missing-children', false, true)
-- Note: if a public Facebook Page with হৈচৈ in its name exists and qualifies under our editorial rules
-- (verified news/awareness outlet, not the Hoichoi OTT platform), it can be added as a seed source
-- AFTER manual verification by an admin.

-- 2) Raw scraped posts (pre-dedup, pre-rewrite)
create table raw_posts (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id) on delete cascade,
  fb_post_id text not null,
  fb_post_url text not null,
  raw_text text,
  media_urls text[] not null default '{}',
  screenshot_path text,                       -- PRIVATE storage path; reference only, NOT shown publicly
  phash text,                                 -- perceptual hash of first image / keyframe
  scraped_at timestamptz default now(),
  raw_meta jsonb,
  unique (source_id, fb_post_id)
);

-- 3) Rewritten posts (publishable)
create table posts (
  id uuid primary key default gen_random_uuid(),
  raw_post_id uuid references raw_posts(id) on delete set null,
  source_id uuid references sources(id) on delete set null,
  category text not null check (category in ('child-sexual-abuse','extramarital-crime','missing-children')),
  title_bn text not null,
  body_bn text not null,
  summary_bn text,
  media_path text,                            -- PUBLIC storage path to processed media
  media_kind text check (media_kind in ('image','video','none')),
  source_url text not null,                   -- original FB post URL
  source_name text not null,
  slug text not null unique,
  status text not null default 'pending_review'
    check (status in ('pending_review','approved','rejected','published','removed')),
  safety_flags text[] default '{}',           -- ['minor_involved','unverified_claim','graphic_content']
  embedding vector(1536),                     -- default dim; configurable per provider
  case_status text,                            -- only for 'missing-children': 'active' | 'found' | 'unresolved' | 'false-alarm'
  case_updated_at timestamptz,
  original_author_name text,                    -- the actual FB user who wrote the original post (vs. the Page)
  original_author_url text,                     -- link to the author's profile/post (when discoverable)
  published_at timestamptz,
  -- Monthly archive: at 00:00 on the 1st of each month, last month's published posts
  -- are stamped with `archived_at`. Public queries filter this out. The data is kept
  -- (admin can still see it) until the retention job hard-deletes it (default 180 days).
  archived_at timestamptz,
  archive_reason text check (archive_reason in ('auto_rollover','manual','retention_purge')),
  legal_hold boolean default false,             -- excludes post from retention purge (e.g. active court case)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Helper view: the public-facing rolling 7-day window
create view posts_current_window as
  select * from posts
  where status = 'published'
    and archived_at is null
    and published_at >= now() - (interval '1 day' * current_setting('app.archive_visible_days', true)::int)
    and not (
      category = 'missing-children'
      and case_status = 'active'
    );

-- Indexes for archive queries
create index on posts (archived_at);
create index on posts (status, archived_at, published_at desc);

-- 4) Submitted pages (public form inserts here)
create table submitted_pages (
  id uuid primary key default gen_random_uuid(),
  page_url text not null,
  page_name text,
  submitter_email text,
  submitter_name text,
  category text check (category in ('child-sexual-abuse','extramarital-crime','missing-children')),
  notes text,
  status text default 'new' check (status in ('new','reviewing','accepted','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- 5) LLM provider configurations (metadata only — KEYS LIVE IN STRONGHOLD / GH SECRETS)
create table llm_providers (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null,                  -- 'google' | 'groq' | 'openrouter' | 'ollama' | 'anthropic' | 'openai' | 'mistral' | 'custom'
  display_name text not null,
  base_url text,                                -- for ollama, custom, vllm
  model_name text not null,
  api_key_env_var text not null,                -- e.g. 'GOOGLE_API_KEY', 'GROQ_API_KEY'
  priority int not null default 100,            -- lower = tried first
  is_active boolean default true,
  is_free_tier boolean default false,
  supports_rewrite boolean default true,
  supports_embeddings boolean default false,
  rate_limit_rpm int,
  config jsonb,                                 -- provider-specific extras (e.g. headers)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6) Admin users (separate from auth.users for clarity)
create table admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('admin','editor','moderator')),
  created_at timestamptz default now()
);

-- 7) Pipeline run logs
create table pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz default now(),
  finished_at timestamptz,
  status text,
  stats jsonb,                                  -- {scraped, deduped, rewritten, published, errors}
  provider_used text,                            -- which LLM provider handled the run
  error text
);

-- 8) Moderation / removal requests (public users can submit)
create table removal_requests (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  reason text,
  reporter_email text,
  status text default 'open' check (status in ('open','reviewed','actioned')),
  created_at timestamptz default now()
);

-- 9) Admin action audit log
create table admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id),
  action text not null,                         -- 'approve' | 'reject' | 'unpublish' | 'edit' | 'add_provider' | 'double_approve' | 'case_status_change' | etc.
  target_table text,
  target_id uuid,
  details jsonb,
  created_at timestamptz default now()
);

-- 10) Category configs — drives per-category behavior
--     Seeded on first install; admin can edit display_name and descriptions but NOT slug (slug is the behavior key).
create table category_configs (
  slug text primary key,                        -- 'child-sexual-abuse' | 'extramarital-crime' | 'missing-children'
  display_name_bn text not null,                -- shown publicly in Bangla
  display_name_en text not null,                -- shown in admin and meta tags
  description_bn text,                          -- short description for the category landing page
  description_en text,
  is_active boolean default true,
  sort_order int default 0,
  config jsonb not null default '{}'::jsonb,    -- per-category behavior flags, see below
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed the 3 categories (config JSONB per category):
insert into category_configs (slug, display_name_bn, display_name_en, description_bn, description_en, sort_order, config) values
  ('child-sexual-abuse',
   'শিশু যৌন নির্যাতন',
   'Child sexual abuse (religious & private settings)',
   'মাদ্রাসা, মসজিদ ও বেসরকারি পরিবেশে শিশু (পুত্র ও কন্যা) যৌন নির্যাতনের শিকারদের সংবাদ।',
   'News about child sexual abuse victims in madrasas, mosques, and private settings (male and female).',
   1,
   '{
     "requires_double_approval": true,
     "show_content_warning": true,
     "content_warning_text_bn": "সতর্কতা: এই প্রবন্ধে শিশু যৌন নির্যাতন সংক্রান্ত বিষয়বস্তু রয়েছে, যা পড়তে কষ্টকর হতে পারে।",
     "auto_pending_review": true,
     "redaction_strict": "maximum",
     "allow_identifying_details": false,
     "publish_age_gate": false
   }'::jsonb),
  ('extramarital-crime',
   'পরকীয়া অপরাধ',
   'Extramarital crime & blackmail',
   'পরকীয়া সম্পর্কজনিত চাঁদাবাজি, হুমকি, ব্ল্যাকমেইল ও সংশ্লিষ্ট অপরাধের সংবাদ।',
   'News about blackmail, extortion, and criminal acts arising from extramarital affairs.',
   2,
   '{
     "requires_double_approval": false,
     "show_content_warning": false,
     "auto_pending_review": false,
     "redaction_strict": "standard",
     "allow_identifying_details": true,
     "use_allegation_language": true
   }'::jsonb),
  ('missing-children',
   'নিখোঁজ শিশু ও ছেলে ধরা',
   'Missing children & child safety',
   ''"ছেলে ধরা"'' সংক্রান্ত গুজব ও ঘটনা এবং নিখোঁজ শিশুদের সংবাদ ও সচেতনতা।',
   'News and awareness about missing children and "chhele dhora" stranger-kidnap incidents.',
   3,
   '{
     "requires_double_approval": false,
     "show_content_warning": false,
     "auto_pending_review": false,
     "redaction_strict": "child_minimal",
     "allow_identifying_details": true,
     "supports_case_status": true,
     "share_widely_cta": true,
     "include_helpline_numbers": true
   }'::jsonb);

-- Indexes
create index on posts using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index on raw_posts (phash);
create index on posts (category, status, published_at desc);
create index on submitted_pages (status, created_at desc);
create index on llm_providers (is_active, priority);

-- Supabase Storage buckets:
--   screenshots/  (PRIVATE; signed URLs only; never displayed on public site)
--   media/        (PUBLIC; rewritten posts reference these as the hero content)
```

### RLS policies (summary — implement in a second migration)

- `posts`: anyone can `select` where `status = 'published'`; only `service_role` and admins can write.
- `sources`, `raw_posts`, `llm_providers`, `admin_users`, `pipeline_runs`, `admin_actions`, `submitted_pages` (write): only `service_role` and admins.
- `submitted_pages` (insert): anyone (with rate limit via Edge Function).
- `removal_requests`: anyone can `insert`; only admins can `select/update`.

---

## Phase 1 — Repo bootstrap

1. Initialize pnpm workspaces + Turborepo at the root.
2. Create the directory layout above.
3. Initialize a public GitHub repo (suggest name: `bangla-feed-pipeline`). Push empty commit.
4. Add `README.md` with the project overview, deployment steps, a "Report content" link placeholder, and a "Submit a Facebook Page" link.
5. Add `.gitignore` (Node, Rust, `.env`, OS junk, `node_modules`, `dist`, `target`).
6. Add `LICENSE` (MIT or your choice).
7. Add `.env.example` with placeholder variables (no real values). Document every variable in README.
8. Add `CODE_OF_CONDUCT.md` and `CONTRIBUTING.md` placeholders.
9. Enable GitHub secret scanning and push protection in repo Settings.

**Deliverable:** `pnpm install` succeeds, all packages build, GitHub repo is live and clean.

---

## Phase 2 — Supabase setup

1. Create a free Supabase project. **Region:** Singapore (closest to BD).
2. In SQL editor, enable extensions: `vector`, `pg_trgm`.
3. Run the migration above.
4. Create Storage buckets: `screenshots` (PRIVATE), `media` (PUBLIC).
5. In **Authentication → Providers**, enable Email + Google.
6. Add the RLS policies migration.
7. Add the first admin user manually in `auth.users` then insert into `admin_users` with role `admin`.
8. Save: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (scraper/backend only — never exposed to browser/desktop UI).

**Deliverable:** Schema applied, first admin user can log in to a stub Supabase auth UI.

---

## Phase 3 — Scraper package (`apps/scraper`)

Implement in TypeScript, runnable both as CLI (`pnpm scrape`) and as a library imported by GitHub Actions.

### 3.1 `facebook.ts` — Facebook Page scraper
- Use **Playwright** with Chromium.
- **Logged-in mode is the default** (per user decision). Accept an FB session cookie (extracted by the desktop app, stored in Stronghold, mirrored to GH Secrets as `FB_SESSION_COOKIE`).
- For each active source: navigate to the Page URL, scroll the timeline, collect post URLs.
- **Hard rule:** if the URL points to a personal profile (not `/pages/`, not `/<page-name>-<numericId>/`, not a verified Page handle), skip it.
- Skip posts from private/restricted accounts even when logged in.
- Return: `{ fbPostId, fbPostUrl, rawText, mediaUrls, postTimestamp, fbMediaIsVideo: bool }`.

### 3.2 `screenshot.ts` — Reference screenshot (INTERNAL ONLY, never displayed)
- Use Playwright to render the post URL and capture a clipped screenshot of the post element.
- **Purpose: internal audit / dispute resolution / proof of original content.** This screenshot is **never served on the public site** and never shown to visitors. It is stored in the **PRIVATE** `screenshots/` bucket with restricted signed URLs.
- The public post displays the **actual media from the post** (downloaded in 3.7), not this screenshot.
- Upload to `screenshots/{source_id}/{fbPostId}.png` with bucket = private.
- Compute pHash of the first image (or the keyframe for video — see 3.3) for image dedup.
- If pHash matches any existing `raw_posts.phash` for that source → mark as duplicate, skip rewrite and media download.

### 3.3 `video.ts` — Video keyframe
- If the post contains a video, use `yt-dlp` (preferred) or `ffmpeg` HTTP input to download a low-res copy (max 100 MB).
- Extract a frame at t=2s with ffmpeg, compute pHash on that frame.
- Skip videos > 100 MB or < 3 s.

### 3.4 `dedup.ts` — Text dedup via embedding
- Resolve embedding provider from `llm_providers` table (first active one with `supports_embeddings = true`, ordered by `priority`).
- Generate embedding vector from `rawText` (or a 200-char excerpt).
- Query Postgres for any `posts.embedding` where cosine distance < 0.12 AND same `source_id` (or any if cross-source). Reuse the ivfflat index.
- If hit → mark as duplicate, skip rewrite.

### 3.5 `rewrite.ts` — Bangla rewriting (multi-provider, category-aware)
- Resolve rewrite provider from `llm_providers` table (first active one with `supports_rewrite = true`, ordered by `priority`). On failure, fall back to the next provider in priority order.
- **Three category-specific system prompts** live in `packages/llm/src/prompts/`. The router picks the prompt based on the post's `category` slug. All three share the same strict output format.
- **After the rewrite**, run a post-processing pass per category (see "Post-processing" below) and apply the category-level behavior flags from `category_configs.config`.

#### 3.5.1 `rewrite.child-sexual-abuse.ts` (শিশু যৌন নির্যাতন)

```
You are a Bangla news editor for a public-interest website reporting on
child sexual abuse. Rewrite the given Facebook post into a neutral,
factual Bangla news article with MAXIMUM REDACTION.

Absolute rules (violation = output is rejected):
- Output only valid Bangla (বাংলা) using Bengali script.
- NEVER include the child's name, parent's name, school, madrasa, mosque,
  village, thana, district, exact age, or any other identifying detail —
  even if present in the source. Refer only as "ওই শিশু", "ওই কিশোর",
  "নির্যাতনের শিকার", "অভিযুক্ত ব্যক্তি".
- If the source names a religious institution (madrasa / মসজিদ / মন্দির),
  refer to it ONLY as "সংশ্লিষ্ট প্রতিষ্ঠান" or "ওই ধর্মীয় প্রতিষ্ঠান".
  Do not name it.
- If the source names a suspect, refer to them ONLY as "অভিযুক্ত ব্যক্তি" or
  "প্রাথমিকভাবে চিহ্নিত ব্যক্তি" — do not name them.
- NEVER describe the specific sexual act. Summarize with neutral
  terminology: "যৌন নির্যাতন", "অসদাচরণ", "শারীরিক স্পর্শের অভিযোগ".
- Do not speculate on guilt, motive, or punishment. Use "অভিযোগ",
  "দাবি", "প্রাথমিক তথ্য অনুযায়ী".
- Do not reproduce slurs, insults, or graphic language.
- Lead with: the category of incident, the location type (not name),
  and the action taken (FIR filed, suspect arrested, etc.) if known.
- Keep it 80–160 words.
- End with "সূত্র: {source_page_name} (ফেসবুক)".

Output format (strict):
  TITLE: <one-line headline, must NOT name the child or institution>
  SUMMARY: <one sentence, generalized>
  BODY: <article body with maximum redaction>
  SAFETY_FLAG: minor_involved
```

#### 3.5.2 `rewrite.extramarital-crime.ts` (পরকীয়া অপরাধ)

```
You are a Bangla news editor for a public-interest website reporting on
criminal acts arising from extramarital affairs. Rewrite the given
Facebook post into a neutral, factual Bangla news article.

Strict rules:
- Output only valid Bangla (বাংলা) using Bengali script.
- Names of involved adults ARE allowed if they appear in the source AND
  the post is a verified news page. For gossip/rumor pages, anonymize:
  "এক নারী", "এক ব্যক্তি", "অভিযুক্ত".
- Lead with the CRIMINAL ACT (blackmail, threat, extortion, murder,
  suicide, etc.), NOT the affair itself. The affair is context, not
  the news.
- Use allegation language: "অভিযোগ", "দাবি", "অনুযায়ী", "প্রাথমিক তথ্য".
- Do not moralize, slut-shame, or speculate on character.
- If the source includes intimate details or sexual content, summarize
  with neutral terms: "শারীরিক সম্পর্কের অভিযোগ", "অন্তরঙ্গ ছবি ব্যবহার
  করে চাঁদাবাজির অভিযোগ".
- Do not reproduce any explicit messages, photos, or recordings from
  the source.
- Keep it 80–180 words.
- End with "সূত্র: {source_page_name} (ফেসবুক)".

Output format (strict):
  TITLE: <one-line headline focusing on the criminal act>
  SUMMARY: <one sentence>
  BODY: <article body>
  SAFETY_FLAG: <none | unverified_claim | graphic_content>
```

#### 3.5.3 `rewrite.missing-children.ts` (নিখোঁজ শিশু ও ছেলে ধরা)

```
You are a Bangla news editor for a public-interest website reporting on
missing children and child safety. Rewrite the given Facebook post into
a clear, factual Bangla news article with practical information.

Strict rules:
- Output only valid Bangla (বাংলা) using Bengali script.
- For MISSING CHILD reports:
  - Include the child's name, age, last-seen location, date, and
    physical description from the source — these help find the child.
  - Include a "যোগাযোগ" line with any phone number or hotline given
    in the source, plus the national child helpline "১০৯" if not
    present.
  - Set SAFETY_FLAG: none. This is the ONE category where identifying
    details are intentionally NOT redacted.
- For "ছেলে ধরা" (stranger-kidnap hoax / mob panic) reports:
  - DO NOT amplify panic. Lead with: "পুলিশের বরাত দিয়ে ফেসবুক
    পোস্টে দাবি করা হয়েছে..." or "প্রাথমিকভাবে যাচাই করা হয়নি..."
  - If the source is a rumor-driven post, mark SAFETY_FLAG:
    unverified_claim.
  - Include the police helpline "৯৯৯" and child helpline "১০৯" in the body.
  - Add a "সতর্কতা: গুজব ছড়াবেন না" line.
- NEVER include private phone numbers of unrelated parties.
- Keep it 80–180 words.

Output format (strict):
  TITLE: <one-line headline>
  SUMMARY: <one sentence>
  BODY: <article body, include helpline numbers where relevant>
  SAFETY_FLAG: <none | unverified_claim>
  CASE_STATUS: <active | found | unresolved | false-alarm | unknown>
```

#### 3.5.4 Post-processing (runs after the LLM call, before insert)

1. **Bengali script check**: verify the first 100 chars of `body_bn` are in the range `U+0980–U+09FF`. If not → set `status = 'pending_review'`, `safety_flags += ['bengali_script_missing']`, log error. **Never auto-publish broken content.**
2. **Category config application** (read from `category_configs.config` JSONB for the post's category):
   - If `auto_pending_review = true` → always `status = 'pending_review'`.
   - If `requires_double_approval = true` → tag the post with `needs_double_approval` in `safety_flags`. Moderation queue enforces two different admins must approve.
   - If `redaction_strict = 'maximum'` (or `'child_minimal'` for missing-children which is the opposite) → run the redaction regex pass (see below).
3. **Redaction regex pass** (for categories that need it):
   - Maintain a blocklist of common Bangla first names, school keywords, mosque/madrasa names, thana names in `redaction_blocklist` (a separate table, admin-editable).
   - For each name in the blocklist that appears in the post body, replace with `__REDACTED__` ONLY for the `child-sexual-abuse` category. For `extramarital-crime`, the blocklist is off by default. For `missing-children`, redaction is skipped entirely.
4. **Insert** into `posts` with the computed status, safety flags, and category-specific metadata.

### 3.6 `provider.ts` + `packages/llm/resolver.ts` — Multi-provider orchestration
- Implement the `LLMProvider` interface for: `anthropic`, `openai`, `google` (Gemini SDK), `groq` (OpenAI-compat), `openrouter` (OpenAI-compat), `ollama` (OpenAI-compat, local), `mistral` (OpenAI-compat), `custom` (OpenAI-compat, configurable base URL).
- `resolver.ts`:
  - Reads `llm_providers` from Supabase, sorted by `priority ASC`.
  - For each `rewrite()` / `embed()` call: tries providers in order until one succeeds.
  - Tracks per-provider success/failure for the day; on rate-limit, marks that provider as "cooling down" for N minutes (in-memory + in `pipeline_runs.stats`).
  - Exposes a `getAvailableProvider(operation: 'rewrite' | 'embed')` function.

### 3.7 `media.ts` — Download and process actual post media (PUBLIC-FACING)
- For each post that passed dedup:
  - Download each media file from `mediaUrls` to a local temp directory.
  - **Image processing** (with `sharp`):
    - Strip EXIF metadata (privacy).
    - Resize to max 1600px wide (preserves quality, shrinks file).
    - Convert to WebP @ 80% quality.
    - Generate a 1200×630 OG-image variant.
    - Add a subtle bottom-right watermark text with the source page name (e.g. "সূত্র: <page name>"), small and semi-transparent.
    - Upload the processed images to the **PUBLIC** `media/` bucket at `media/{post_id}/{n}.webp`.
  - **Video processing** (with `ffmpeg`):
    - Re-encode to H.264 + AAC, max 720p, target bitrate 1500k.
    - Add a 1-second title card at the start with the source attribution.
    - Strip all metadata.
    - Generate a thumbnail (frame at t=2s) and upload as `media/{post_id}/thumb.webp`.
    - Upload the video to the **PUBLIC** `media/` bucket at `media/{post_id}/video.mp4`.
  - If the original post has no media → `media_kind = 'none'`, no media_path needed.
  - Insert the post into `posts` with `media_path` set to the first processed asset and `media_kind` set accordingly.
  - **Never upload the raw FB UI screenshot to the public bucket. The screenshot lives in the private `screenshots/` bucket for admin reference only.**

### 3.8 `pipeline.ts` — Orchestrator
1. Fetch all active sources.
2. For each source: scrape → screenshot (private) → pHash dedup → embed dedup → download actual media (3.7) → rewrite → publish to `posts` (status depends on safety flag and provider health).
3. Write a `pipeline_runs` row with stats, which provider was used, and any errors.
4. Print a one-line summary; exit code 0 if the orchestrator ran, non-zero if it crashed.

### 3.9 `archive.ts` — Rolling archive + retention purge (CLI)
Two subcommands the GitHub Action `rolling-archive.yml` calls:

**`archive --older-than-days=N`** (default 7, configurable via `ARCHIVE_VISIBLE_DAYS` env var) — runs the SQL in 6.2 above. Stamps every `published` post older than N days with `archived_at = now()`, `archive_reason = 'auto_rollover'`, except:
- `missing-children` posts where `case_status = 'active'` (kept public until the case resolves).
- `status = 'removed'` posts (already taken down — not re-archived, just counted).

After the SQL runs, call the Vercel deploy hook so the public site regenerates with the new "current window" set.

**`purge --older-than-days=N`** (default 30, configurable via `ARCHIVE_RETENTION_DAYS` env var):
1. For every post with `archived_at < now() - interval 'N days'` AND `legal_hold = false`:
   - Delete the `media/` bucket objects at `media/{post_id}/*`.
   - Delete the `screenshots/` bucket object (if still present).
   - Hard-delete the `raw_posts` row.
   - Hard-delete the `posts` row.
   - Log the deletion in `admin_actions` with `action = 'retention_purge'`, `details = { post_id, archived_at, category }`.
2. Print summary: `purged_count`, `freed_storage_mb`.

**Note on legal hold:** the purge step respects a `legal_hold` boolean (default false) per post. If a post is under legal hold (e.g. active court case), it is excluded from the purge until the hold is lifted. Admins can set `legal_hold` in the moderation UI.

**Total max retention on our side:** `ARCHIVE_VISIBLE_DAYS` (public) + `ARCHIVE_RETENTION_DAYS` (admin-only) = 7 + 30 = **37 days max**. After this, no trace of the post remains in our DB or storage. The original FB post remains the source of truth.

**Deliverable:** `pnpm --filter scraper archive --older-than-days=7` archives the expected posts; `pnpm --filter scraper purge --older-than-days=30` removes only the old archive entries.

---

## Phase 4 — Next.js public site (`apps/web`)

### 4.0 Design system (read `design-system.md` first)

The site follows the **"হৈচৈ"** (Hoichoi) visual identity — a Bangla newspaper that feels both traditional and modern. The full design tokens, typography, layout, and component library are in **`design-system.md`**. The summary:

- **Color tokens:** `--paper #f3eee1` (cream bg) + `--ink #0a0c10` (near-black) + `--alizarin #d2202c` (red accent) + `--lime #c8f65d` (live indicator) + `--amberx #f5b800` (warning) + per-category color dots (blue for child protection, teal for family/society, red for crime, etc.).
- **Typography:** Noto Serif Bengali for display/headlines, Hind Siliguri for body, Space Grotesk for English UI, JetBrains Mono for technical labels — all self-hosted via `next/font/google`.
- **Page chrome (in this order, top to bottom):**
  1. `<TopBar />` — 40px sticky ink bar with brand + nav (পাবলিক সাইট / অ্যাডমিন কনসোল / সিস্টেম ব্লুপ্রিন্ট) + animated red ping dot + "AUTO-SHIP · EVERY 2H" indicator
  2. `<BreakingTicker />` — red "জরুরি আপডেট" panel + horizontal-scrolling headlines
  3. `<Masthead />` — Bangla date strip + giant "হৈচৈ।" wordmark with red dot + horizontal-rule-flanked tagline
  4. `<HeroPostCard variant="lead" />` (left) + `<LiveDeskMonitor />` + `<MostReadList />` (right sidebar)
  5. `<CategoryMarquee />` — full-width band of giant scrolling category names
  6. `<PostGrid />` — "আজকের সংগ্রহ" (Today's Collection) 3-column card grid with category filter pills
  7. `<PipelineDiagram />` — 6-step flow (ফেসবুক সোর্স → ডেস্কটপ কালেক্টর → ডুপ্লিকেট ইঞ্জিন → এআই পুনর্লিখন → GitHub কমিট → Vercel লাইভ) with lime connectors on `md+`
  8. `<Footer />` — 3-col with wordmark, categories, system links
- **A second top-level route** `/system` (linked from the top bar) shows the pipeline diagram at full size plus recent `pipeline_runs` in a monospace table.
- **All custom components** are listed in `design-system.md` §5 with the lucide icon name and the exact classes used. Build them in `apps/web/components/`.
- **Animations are subtle and editorial** — linear infinite tickers, group-hover card lift, `link-sweep` underline animation, `frame-press` image hover. No parallax, no scroll-jacking, no bouncy springs.

### 4.0a Visual wireframes & mockups (the "make it look like this" blueprint)

> **🎨 A working mockup lives in the `mockup/` folder** (a self-contained Next.js app in this repo). Run it with `cd mockup && npm install && npm run dev` and open http://localhost:3000 — it needs no external database: when `DATABASE_URL` is unset it renders bundled demo content, and it has working ticker + marquee + live countdown, real Pexels images, and the exact Tailwind classes the production components will use. **The coding agent should open this app first and use it as the authoritative visual reference for every component.** The text wireframes below are a backup summary, but the live mockup is the source of truth. (For a design-only pass there is also a static arena reference site linked in `design-system.md`.)

The text below are ASCII wireframes of the three most important pages: the public homepage, the single post page, and the web admin moderation queue. The coding agent should treat these as the authoritative visual spec — pixel dimensions, colors, and typography are all referenced against the design tokens above. The wireframes are drawn at desktop width (1440px). Mobile collapse is documented separately in `design-system.md` §8.

---

#### 4.0a.1 Homepage wireframe (1440 × ~3200px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ● HOICHOI · AUTO-CURATED NEWS DESK   [📰পাবলিক সাইট] [▶অ্যাডমিন] [⌘সিস্টেম]  │  40px ink
│                                                          → ▲ AUTO-SHIP 2H   │  top bar
├──────────────────────────────────────────────────────────────────────────────┤
│ 📢 জরুরি আপডেট  ◆ শিশুকে উদ্ধার... ◆ ভাইরাল ভিডিওতে... ◆ সন্দেহে... (→ → →)  │  48px breaking
├──────────────────────────────────────────────────────────────────────────────┤
│ সোমবার, ৭ সেপ্টেম্বর, ২০২৬ · ঢাকা সংস্করণ  ISSN-AUTO-24        মূল্য: ৳০  │  ~24px
│                                                                              │
│                            হৈচৈ।                                              │  ~120px wordmark
│        ── ভাইরাল বাংলা, সপ্তাহখানেক ──                                       │  ~16px tagline
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┬──────────────────────────────┐ │
│ │ 🔥 শিশু সুরক্ষা · প্রধান সংবাদ    📍ঢাকা  │ ▓▓▓ ডেস্ক মনিটর · লাইভ        │ │
│ │                              SYNCED ০৩:৪২│                              │ │
│ │                                          │   ┌──┐                       │ │
│ │ নিখোঁজের ছয় ঘণ্টায় ফিরে পেল বাবা-মা:  │   │◐ │ ০১:১৬:৩৪                │ │
│ │ সিসি ক্যামেরা আর প্রতিবেশীর সতর্কতায়  │   └──┘  NEXT SYNC              │ │
│ │ উদ্ধার শিশু                              │         ১২:১৬ PM (ঢাকা)        │ │
│ │                                          │         cron: 0 */2 * * *      │ │
│ │ মিরপুরে স্কুলফেরত পথে নিখোঁজ হওয়া...  │ ─────────────────────────────  │ │
│ │                                          │ COLLECTED TODAY       ৩৯   │ │
│ │ [পুরোটা পড়ুন →]  #a1f3c...  ৪ মিনিট পড়া │ DUPLICATES BLOCKED     ৯   │ │
│ │                                          │ DEDUP RATE            ১৯%  │ │
│ │ ┌────────────────────────────────────┐  │ LAST RUN STATUS  ● SUCCESS │ │
│ │ │                                    │  │                              │ │
│ │ │         [16:8.2 hero image]        │  │ ─── সর্বাধিক পঠিত ─────────  │ │
│ │ │                                    │  │ 1 ভাইরাল ভিডিওতেই ধরা... ●  │ │
│ │ │   📶 SOURCE · FACEBOOK ARCHIVE      │  │ 2 সন্দেহে ভাঙনের মুখে... ●  │ │
│ │ └────────────────────────────────────┘  │ 3 নারীর ওপর হেনস্তার... ●   │ │
│ │ ছবি: Pexels · 112 UP · প্রতীকী  SHOT_1  │                              │ │
│ └──────────────────────────────────────────┴──────────────────────────────┘ │
│                                                                              │
│  ◀ ◀  ◀ অপরাধ ✳ শিশু সুরক্ষা ✳ পরিবার ও সমাজ ✳ ভাইরাল ও তথ্য ✳ যাচাইকৃত ▶ ▶  │  marquee
│                                                                              │
│ ▚ TODAY'S COLLECTION · AUTO-CURATED       প্রতিটি আইটেম ফেসবুক থেকে...   │
│ আজকের হৈচৈ (৮)                                                          │
│                                                                              │
│ [সব ৮] [অপরাধ ৩] [পরিবার ২] [শিশু সুরক্ষা ২] [ভাইরাল ১]    FILTER · LLM  │
│                                                                              │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                            │
│ │ [hero img]  │ │ [hero img]  │ │ [hero img]  │   ← 3-column post grid       │
│ │ শিশু সুরক্ষা │ │ অপরাধ      │ │ অপরাধ      │                              │
│ │ Headline... │ │ Headline... │ │ Headline... │                              │
│ │ Lede text...│ │ Lede text...│ │ Lede text...│                              │
│ │ ৪ ঘণ্টা আগে │ │ ৮ ঘণ্টা আগে │ │ ১১ ঘণ্টা আগে│                             │
│ └─────────────┘ └─────────────┘ └─────────────┘                            │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                            │
│ │  ...        │ │  ...        │ │  ...        │                            │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ ▓▓ ফেসবুক সোর্স ─── ডেস্কটপ কালেক্টর ─── ডুপ্লিকেট ইঞ্জিন ─── AI পুনর্লিখন ─── GitHub ─── Vercel লাইভ  │  pipeline
│     [users]              [app-window]      [fingerprint]    [sparkles]   [git]   [triangle]│
│                                                                              │
│   ✓ ফ্যাক্ট-গেট যাচাই     ✓ হ্যাশ মিলানো     ✓ শৈলী পুনর্লিখন              →│
├──────────────────────────────────────────────────────────────────────────────┤
│ হৈচৈ।     স্বয়ংক্রিয় সংবাদ কিউরেশন ডেস্কের... │ বিভাগসমূহ    │ সিস্টেম মানচিত্র │  footer
│                                              │ ◆ অপরাধ     │ [অ্যাডমিন →]    │
│                                              │ ◆ শিশু সুরক্ষা │ [সিস্টেম →]   │
│                                              │ ◆ পরিবার ও সমাজ│                 │
│                                              │ ◆ ভাইরাল     │                  │
│ © 2026 HOICHOI DESK · v1.0 LAUNCH  · DHAKA · ASIA/UTC+6 · EDGE CACHE ON   │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Key dimensions & references:**
- Max width: `max-w-[1400px]`, centered with `mx-auto px-4 md:px-8`.
- Top bar: 40px fixed at top, z-[60], `bg-[#0a0c10]` ink.
- Breaking news: 48px, ink bg, alizarin red left panel (px-4 py-2) + scrolling track.
- Masthead: ~24px date strip, ~120px wordmark (Noto Serif Bengali 900 weight), ~16px tagline.
- Hero section: `grid grid-cols-12 gap-10 border-y-2 border-ink py-8 lg:py-10`. Hero post is `col-span-8`, sidebar is `col-span-4` with `lg:border-l lg:border-ink/15 lg:pl-8`.
- Sidebar monitor: `bg-ink p-6 text-paper`. Circular SVG 92×92px.
- Marquee: ~64px text in serif, `border-b border-ink/15 py-6`.
- Post grid: `grid sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-14 mt-10`.
- Pipeline: dark `bg-ink text-paper` panel, 6 cards in a row on `md+`, stacked on mobile, lime connectors between cards.
- Footer: `border-t-2 border-ink py-12`, 12-col grid.

---

#### 4.0a.2 Post page wireframe (1440 × ~1400px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ● HOICHOI · AUTO-CURATED NEWS DESK   [📰পাবলিক সাইট] [▶অ্যাডমিন] [⌘সিস্টেম]  │  top bar (same)
├──────────────────────────────────────────────────────────────────────────────┤
│ 📢 জরুরি আপডেট  ◆ ... (scrolling)                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ ← হোম    শিশু সুরক্ষা / নিখোঁজ শিশু                                          │  breadcrumb
│                                                                              │
│ [⚠ সতর্কতা: এই প্রবন্ধে শিশু যৌন নির্যাতন সংক্রান্ত বিষয়বস্তু আছে]   │  (only for child-sexual-abuse)
│                                                                              │
│ শিশু সুরক্ষা · নিখোঁজ শিশু [active: সক্রিয় অনুসন্ধান]    📍 ঢাকা · মিরপুর  │  category badge + case status
│                                                          ঢাকা, ৬ ঘণ্টা আগে  │
│                                                                              │
│ নিখোঁজের ছয় ঘণ্টায় ফিরে পেল বাবা-মা:                                       │  h1: serif 42-56px
│ সিসি ক্যামেরা আর প্রতিবেশীর সতর্কতায় উদ্ধার শিশু                          │
│                                                                              │
│ [16:8.2 hero image with caption strip below]                                │
│  📶 SOURCE · FACEBOOK ARCHIVE                                                 │
│  ছবি: প্রতীকী (Pexels) · SHOT_0001.PNG · PLAYWRIGHT CAPTURE                  │
│                                                                              │
│ মিরপুরে স্কুলফেরত পথে নিখোঁজ হওয়া শিশু ছয় ঘণ্টার মধ্যেই বাড়ি ফিরেছে...  │  body: sans 16-18px
│ দ্রুত সাড়া কীভাবে সম্ভব হলো — আর নিখোঁজের প্রথম এক ঘণ্টায় করণীয়...     │  4-6 paragraphs
│ ...                                                                              │
│                                                                              │
│ ─── সূত্র ───                                                                 │
│ লেখক: <original_author_name> · সূত্র: <source_page_name> (ফেসবুক)         │  attribution block
│ পোস্টের মূল লিংক → (nofollow noopener ugc)                                  │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐    │
│ │ ⚠️ রিপোর্ট করুন / Report this content                          →    │    │  report button
│ └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│ জরুরি সহায়তা: পুলিশ ৯৯৯ | শিশু হেল্পলাইন ১০৯                                │  helpline footer
│                                                                              │
│ ─── সম্পর্কিত পোস্ট ───                                                       │  related posts
│ ┌────────────┐ ┌────────────┐ ┌────────────┐                                │
│ │ ...        │ │ ...        │ │ ...        │                                │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Key dimensions:**
- Breadcrumb at top: `text-[12px] text-ink-soft`, separator `·` between segments.
- Content warning gate: `bg-amber-50 border-amber-200 p-4 rounded-md text-[13px]` (only for `child-sexual-abuse`).
- H1: `font-serif-bn text-[30px] md:text-[56px] leading-tight font-extrabold`.
- Body: `font-sans-bn text-[16px] md:text-[18px] leading-[1.7] text-ink max-w-[68ch] mx-auto`.
- Attribution: `border-t border-ink/15 pt-6 mt-10 text-[12px] text-ink-soft`.
- Report button: `border-2 border-ink px-6 py-3 text-[14px] font-bold hover:bg-ink hover:text-paper`.
- Helpline footer: `mt-8 p-4 bg-paper-deep border border-ink/15 text-[13px] font-medium`.

---

#### 4.0a.3 Web admin moderation queue wireframe (1440 × ~1100px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ● HOICHOI · AUTO-CURATED NEWS DESK   [📰পাবলিক সাইট] [▶অ্যাডমিন*] [⌘সিস্টেম]│
├──────────────────────────────────────────────────────────────────────────────┤
│ 🛡 হৈচৈ · অ্যাডমিন কনসোল                                                    │  admin sub-header
│                                                                              │
│ ┌─নেভ─┬─────────────────────────────────────────────────────────────────────┐│
│ │হোম  │  ▚ MODERATION QUEUE · ১২ pending review · ৩ needs double-approval   ││
│ │সোর্স│  ───────────────────────────────────────────────────────────────────  ││
│ │কিউ  │                                                                     ││
│ │[✓] │  POST #a1f3c9e2d4b78056                                  ০৩:৪২ AM   ││
│ │AI  │  ┌──────────────────┐  Category: শিশু সুরক্ষা [redact: MAX]            ││
│ │     │  │ [hero image]     │  Status: pending_review                       ││
│ │     │  │                  │  Flags: needs_double_approval, minor_involved  ││
│ │     │  │ SOURCE · FB ARCH │  LLM: Google Gemini 2.0 Flash                 ││
│ │     │  └──────────────────┘  ───────────────────────────────────────────  ││
│ │     │  [Reference screenshot — PRIVATE] (signed URL, admin-only)        ││
│ │     │  [📸 view]                                                               ││
│ │     │  ───────────────────────────────────────────────────────────────────  ││
│ │     │  TITLE: নিখোঁজের ছয় ঘণ্টায় ফিরে পেল বাবা-মা: সিসি ক্যামেরা...   ││
│ │     │                                                                     ││
│ │     │  BODY:                                                              ││
│ │     │  মিরপুরে স্কুলফেরত পথে নিখোঁজ হওয়া শিশু...                       ││
│ │     │  ...                                                                ││
│ │     │                                                                     ││
│ │     │  [✏ Edit body]  [↩ Reject]  [✓ Approve*]   * = needs 2nd approver ││
│ │     │  ───────────────────────────────────────────────────────────────────  ││
│ │     │  Source: <page_name> on Facebook · <original_author>                 ││
│ │     │  Posted: ২ ঘণ্টা আগে (auto-archive in: ৫ দিন ২২ ঘণ্টা)              ││
│ │     │                                                                     ││
│ │     │  ▚ POST #b2e4d8...                                  ০১:১৫ AM       ││
│ │     │  ... (next post)                                                     ││
│ └─────┴─────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
```

**Key dimensions & behavior:**
- Sidebar: 200px fixed left, `bg-paper-deep border-r border-ink/15`. Active nav item: `bg-ink text-paper`.
- Main: padded `px-8 py-6`, max-w with comfortable reading width.
- Each post card: `border-b border-ink/15 py-6`. Image + meta on left, body and actions on right (or stacked on mobile).
- "Approve" button is **disabled** if `safety_flags` includes `needs_double_approval` AND no other admin has approved yet. Show "Awaiting second approval from: <list>".
- "Edit body" opens an inline editor (textarea, monospace + Bangla preview).
- "Reject" opens a reason picker (safety concern / not newsworthy / duplicate / other).
- Reference screenshot is a small thumbnail that expands to full size in a modal; it pulls a **signed URL** from the private `screenshots/` bucket.
- Countdown to auto-archive is shown in real time: "৫ দিন ২২ ঘণ্টা" formatted in Bangla.

---

#### 4.0a.4 Tauri desktop app — main window (1280 × 800)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ হৈচৈ · ডেস্কটপ কালেক্টর  v1.0      [─][□][×]                                 │  title bar (native)
├──────────────────────────────────────────────────────────────────────────────┤
│ │ ড্যাশবোর্ড │ পাইপলাইন │ ক্রেডেনশিয়াল │ AI প্রোভাইডার │ সোর্স │ কিউ │ আর্কাইভ │ লগ │  tabs
├──────────────────────────────────────────────────────────────────────────────┤
│  Pipeline tab (default)                                                       │
│                                                                              │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐    │
│  │ Next run: ১২:১৬ PM          │  │  Today's stats                       │    │
│  │ Last run: ১০:১৬ AM          │  │  ┌─────────┬─────────┬─────────┐   │    │
│  │ Status: ✓ SUCCESS           │  │  │ COLLECT │ DEDUP   │ PUBLISH │   │    │
│  │ Duration: 6m 23s            │  │  │   ৩৯    │   ৯     │  ২৮    │   │    │
│  │ Provider: Google Gemini     │  │  └─────────┴─────────┴─────────┘   │    │
│  └─────────────────────────────┘  │  Per-category breakdown:             │    │
│                                    │  • শিশু সুরক্ষা: ১২                │    │
│  [▶ RUN PIPELINE NOW]              │  • অপরাধ: ৮                         │    │
│  [⚙ Configure schedule]            │  • পরিবার ও সমাজ: ৫                │    │
│  [📊 View run history]             │  • ভাইরাল ও তথ্য: ৩                  │    │
│                                    │  Recent errors (if any):             │    │
│  ┌─────────────────────────────┐  │  • <timestamp> <error message>     │    │
│  │ Live preview of pipeline     │  │  ...                                 │    │
│  │ <animated diagram:           │  └─────────────────────────────────────┘    │
│  │  FB → Scraping → Dedup →    │                                                │
│  │  Rewrite → Publish>         │                                                │
│  └─────────────────────────────┘                                                │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Key behavior:**
- 9 tabs across the top. Active tab has `bg-ink text-paper` background; inactive has `text-ink-soft hover:bg-paper-deep`.
- Tabs are: ড্যাশবোর্ড, পাইপলাইন, ক্রেডেনশিয়াল, AI প্রোভাইডার, সোর্স, কিউ (moderation), সাবমিশন, আর্কাইভ, লগ.
- "Run pipeline now" triggers a Tauri command that spawns the scraper CLI and shows real-time progress via a WebSocket connection to the CLI's stdout.
- "Live preview" shows the pipeline diagram from the homepage but in an animated state — each step highlights as it runs.
- All credential values are NEVER shown in the UI; only metadata (name, type, last-used timestamp).

---

### 4.1 Public pages

**The entire public site shows ONLY posts from the current calendar month.** At 00:00 UTC on the 1st of each month, the previous month's posts are archived (not deleted, not public). This is enforced everywhere: list pages, sitemap, search, JSON-LD, OG image generation.

| Route | Purpose |
|---|---|
| `/` | Homepage with the **current rolling 7-day window's** published posts, paginated, grouped by category tabs. Header shows "গত ৭ দিনের ঢেউ" (Last 7 days' wave) with the post count, and a subtle countdown showing "X posts will be archived at 00:00 UTC". |
| `/category/[slug]` | List per category — **current 7-day window only**. Shows the count for this category in this window. |
| `/post/[slug]` | Single post page (see 4.2). If the post is archived, renders the "archived notice" page instead of the full content (see below). |
| `/submit` | Public form to submit a Facebook Page for inclusion |
| `/about` | About the project, who runs it, editorial policy |
| `/privacy` | Privacy policy (placeholder; user must fill in real text with a lawyer) |
| `/terms` | Terms of use (placeholder) |
| `/dmca` | DMCA / takedown procedure (placeholder) |
| `/contact` | Contact email + simple form |
| `/api/submit-page` | POST handler for `/submit` form (validates + inserts into `submitted_pages`, rate-limited) |
| `/api/report-content` | POST handler for the per-post "Report" button (inserts into `removal_requests`) |

**No public archive page.** The user explicitly stated that only the current 7-day rolling window is public. Older posts return a polite notice page (see 4.2 below). If you want a public archive later (e.g., a daily/weekly summary), add it in v1.1.

### 4.2 `/post/[slug]` page structure

- **Hero media**: the **re-processed image / video** from the `media/` bucket. Use `next/image` with explicit width/height and `priority` for above-the-fold. Video uses `<video controls preload="metadata" poster=".../thumb.webp">`.
- **Title** (Bangla, `<h1>`), **summary**, **body** (all in Bangla).
- **Source attribution** below the body: "সূত্র: <page name> on Facebook" linking to the original post (with `rel="nofollow noopener ugc"`).
- **"⚠️ রিপোর্ট করুন / Report this content"** button → modal form → posts to `/api/report-content`.
- **Published date** in Bangla locale (`toLocaleDateString('bn-BD')`).
- **"সম্পর্কিত পোস্ট / Related posts"** section: 3 posts from the same category, fetched server-side.
- **NEVER** displays the FB UI screenshot. The screenshot is admin-only (visible in the moderation queue and the desktop app's post view).
- **Archived post behavior:** if `post.archived_at IS NOT NULL`, the server component returns a Bangla "এই পোস্ট হৈচৈ থেকে গায়েব হয়ে গেছে — সাত দিনের মধ্যে প্রকাশিত সব পোস্ট চলে যায়" page (HTTP 200, polite notice) instead of the full content. The page shows: the original publish date, the category name, the source name + URL, and a "গত ৭ দিনের সব খবর দেখুন" link back to the homepage. This is so that old shared links (e.g., from Facebook shares) don't 404. The actual post body, media, and `case_status` badge are NOT rendered. Exception: if `case_status = 'active'` and the post is `missing-children`, the full content is shown regardless of archive status (active missing child cases are never archived).
- **Content warning gate** (only for `child-sexual-abuse`): if `category_configs.config.show_content_warning = true` for the post's category, render a `<details>` block BEFORE the title with the warning text (e.g. "সতর্কতা: এই প্রবন্ধে শিশু যৌন নির্যাতন সংক্রান্ত বিষয়বস্তু রয়েছে, যা পড়তে কষ্টকর হতে পারে।"). The user clicks to reveal. Style it with a soft warning color (amber, not red — red feels alarmist). This is both ethical (informed consent for sensitive content) and helps with platform-level content moderation policies.
- **Case status badge** (only for `missing-children`): if `case_status` is set, show a small badge in the header: "সক্রিয় অনুসন্ধান" (active) / "শিশুকে উদ্ধার করা হয়েছে" (found) / "অমীমাংসিত" (unresolved) / "ভুয়া খবর" (false alarm). For `false-alarm` or `found`, show a "সর্বশেষ আপডেট: <date>" line. This is the only category where published posts get updated in-place after publish.

### 4.3 Public `/submit` form

- Fields: Facebook Page URL (required), page name, suggested category (dropdown), submitter name + email (optional), notes.
- Client-side validation: must be a valid FB URL.
- POST to `/api/submit-page` → Edge Function inserts into `submitted_pages` with rate limit (5/hour per IP).
- Success page: "ধন্যবাদ — আপনার পেজ পর্যালোচনার জন্য জমা হয়েছে।" with link back to homepage.
- Honeypot field + hCaptcha (or Cloudflare Turnstile, free tier) for spam protection.

### 4.4 SEO configuration (critical — implement carefully)

- **`app/layout.tsx`** (root):
  - `<html lang="bn" dir="ltr">` (Bangla is LTR script).
  - `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL)`.
  - Default `title.template = "%s | <site name>"`, default `title.default = "<site name>"`.
  - Default Open Graph, Twitter card, robots, viewport.
  - `next/font` self-hosting **Hind Siliguri** or **Noto Sans Bengali** (free Google Fonts, excellent Bangla coverage). Apply to `<body>`.
  - Global JSON-LD `WebSite` + `Organization` schema.
- **`app/sitemap.ts`**: dynamic, lists homepage, each category, each **currently public** post (i.e. `status = 'published' AND archived_at IS NULL AND published_at >= start_of_month()`) with `lastModified = post.updated_at`, each legal page. Priorities: homepage 1.0, category 0.9, post 0.8, legal 0.3. **Archived posts are excluded from sitemap** — Google will eventually de-index them via the next sitemap fetch. Do not include archived post URLs even with `noindex`, to keep the sitemap small and accurate.
- **`app/robots.ts`**: allow `/`, disallow `/admin/` and `/api/`, point to sitemap.
- **`app/manifest.ts`**: PWA manifest with Bangla site name, theme color, icons.
- **`app/opengraph-image.tsx`** (and per-post `opengraph-image.tsx`): generates a 1200×630 OG image with the post title in Bangla.
- **Per-page metadata**: every page exports a `metadata` object (static pages) or a `generateMetadata()` function (dynamic pages). Each has: unique `<title>`, unique meta description (150–160 chars, in Bangla), canonical URL, Open Graph (with locale `bn_BD`), Twitter card `summary_large_image`.
- **JSON-LD `NewsArticle`** on every `/post/[slug]`: `headline`, `datePublished`, `dateModified`, `author` (Organization), `publisher` (Organization with logo), `image` (the processed media), `mainEntityOfPage`, `articleSection` (category), `inLanguage: "bn-BD"`. Validate against Google's Rich Results Test before shipping.
- **JSON-LD `BreadcrumbList`** on every `/post/[slug]` and `/category/[slug]`.
- **JSON-LD `FAQPage`** on `/about` (3–5 editorial-policy Q&As).
- **`next/image`**: all images have explicit width/height, descriptive Bangla `alt` text, `priority` on hero. Configure `images.remotePatterns` for Supabase Storage.
- **Performance**: target Lighthouse ≥ 95 on all categories. Use RSC, dynamic imports for heavy client components, `revalidate = 300` on listing pages, `revalidate = 60` on homepage.
- **`hreflang`**: not needed for single-language site, but include `<link rel="alternate" hreflang="bn-BD" href="...">` for each page.
- **Favicon set**: use Next.js `app/icon.tsx` and `app/apple-icon.tsx` to generate dynamically.

### 4.5 Web admin (`/admin/*`)
- Login with Supabase Auth (email + Google). RLS enforces admin role.
- **Dashboard:** today's pipeline stats, recent errors, queue size, and a per-category breakdown.
- **Sources** page: add/edit/disable Facebook Pages, manually trigger a re-scrape.
- **Moderation queue** page: list `posts` where `status = 'pending_review'`. For each post show: **the re-processed media** as the hero (NOT the screenshot), the rewritten Bangla text, the source URL, the **"Reference screenshot"** (signed URL from private bucket, visible only here for moderators), the `category_configs.config` flags, the `safety_flags`, the LLM provider that produced the rewrite, Approve / Reject / Edit body / Unpublish buttons. **Double-approval enforcement**: for posts where `'requires_double_approval' = true` in `safety_flags`, the Approve button is disabled until a second admin (different `auth.users.id`) has also approved. The UI shows "Awaiting second approval from: <list>".
- **Case management** page (only `missing-children`): list of `case_status = 'active'` posts, with a "Mark as found / false alarm / unresolved" action that updates the post and the public badge. Logged to `admin_actions`.
- **Providers** page: add/edit/disable LLM providers, set priority, toggle free-tier flag, paste API key (which pushes to GH Secrets via the desktop app's GitHub PAT, or stores in the desktop's Stronghold if no GH is configured).
- **Categories** page: edit `category_configs.display_name_bn`, `display_name_en`, descriptions, and the `config` JSONB (display names only; slugs are immutable). Changing display name does NOT change URLs.
- **Submissions** page: list `submitted_pages` from the public form, mark Accepted / Rejected (Accepted → creates a `sources` row with `is_verified = false` for further review).
- **Removal requests** page: list user-submitted reports, mark actioned.
- **Settings** page: pipeline hours, site name, contact email, helpline numbers (999, 109), `redaction_blocklist` editor.
- **Archive** page: list all `posts` where `archived_at IS NOT NULL`, with the archive date, archive reason, days-until-purge, category, status, and case_status (if any). Filters: by month, by category, by archive reason. Actions: un-archive (clears `archived_at`, only allowed for admin role; logs to `admin_actions` with `action = 'unarchive'`), set `legal_hold = true` to exempt from the retention purge, view the post (full content + media) in a modal. Paginates through the entire archive.
- **Retention** page: read-only view of what the next purge will delete (`archived_at < now() - ARCHIVE_RETENTION_DAYS`), with a count by month. Useful for "how much longer will X stay in the archive?" questions.

**Deliverable:** `pnpm --filter web dev` shows the homepage with a stub post; `/admin` login works for the first admin user; `/sitemap.xml` is reachable; `/post/[slug]` renders the processed media (not the screenshot).

---

## Phase 4.6 — Category-specific editorial rules (REFERENCE — read carefully)

The three categories drive very different behavior. The matrix below is the single source of truth; everything else in this prompt defers to it.

| Concern | `child-sexual-abuse` | `extramarital-crime` | `missing-children` |
|---|---|---|---|
| **Bangla display name** | শিশু যৌন নির্যাতন | পরকীয়া অপরাধ | নিখোঁজ শিশু ও ছেলে ধরা |
| **English display name** | Child sexual abuse (religious & private settings) | Extramarital crime & blackmail | Missing children & child safety |
| **LLM system prompt file** | `rewrite.child-sexual-abuse.ts` | `rewrite.extramarital-crime.ts` | `rewrite.missing-children.ts` |
| **Identifying details (name, school, location)** | **NEVER** — maximum redaction | Allowed only from verified news pages; anonymize for gossip pages | **ALWAYS** — info helps find the child |
| **Suspect naming** | Only as "অভিযুক্ত ব্যক্তি" / "প্রাথমিকভাবে চিহ্নিত" | Allowed if in source, with allegation language | Not relevant |
| **Religious institution naming** | NEVER — only "সংশ্লিষ্ট প্রতিষ্ঠান" | Not relevant | Not relevant |
| **Sexual act description** | NEVER — use neutral terms | Summarize, never quote | Not relevant |
| **Auto-publish after rewrite?** | **No** — always `pending_review` | Yes (if safety flag clean) | Yes (if safety flag clean) |
| **Double-approval required?** | **Yes** — 2 different admins | No | No |
| **Content warning on post page?** | **Yes** — amber `<details>` block above title | No | No |
| **Helpline numbers in body?** | Optional | No | **Yes** — 109 (child), 999 (police) |
| **Case status tracking?** | No | No | **Yes** — active / found / unresolved / false-alarm, with public badge |
| **In-place post updates after publish?** | No (re-edit resets to `pending_review`) | No | **Yes** — case_status can change without re-review |
| **Allow public removal request?** | Yes (extra-sensitive handling) | Yes | Yes |
| **Share-widely CTA?** | No | No | **Yes** — "শেয়ার করুন — সহায়তা হতে পারে" with social buttons |
| **JSON-LD `keywords` on post page** | "child protection, madrasa, abuse awareness" | "blackmail, extortion" | "missing child, child safety, ছেলে ধরা" |
| **Newsletter/social cross-post** | Manual only, double-checked | Allowed | Allowed, prioritized for active cases |

### How the matrix is enforced

- **`category_configs.config` JSONB** is the runtime source of truth (see Phase 2 schema).
- The `LLMProvider.rewrite()` accepts a `category` arg and picks the right system prompt file.
- The post-processing pass in 3.5.4 reads `category_configs.config` for the post's category and applies the behavior flags.
- The Next.js post page server component reads `category_configs.config` to decide whether to render the content warning, case status badge, etc.
- The moderation queue UI reads `category_configs.config` to enable/disable the double-approval flow.
- The moderation queue "Edit" action for `child-sexual-abuse` posts resets `status` to `pending_review` and re-enforces double-approval, even if it was previously approved.

---

## Phase 5 — Tauri desktop app (`apps/desktop`)

### 5.1 Scaffold
- `pnpm create tauri-app` → choose React + TypeScript + Vite.
- Add `tauri-plugin-stronghold` (credentials), `tauri-plugin-sql` (SQLite), `tauri-plugin-store` (settings), `tauri-plugin-shell` (open browser to admin), `tauri-plugin-notification` (alerts), `tauri-plugin-fs` (import FB cookie file).

### 5.2 First-run setup wizard
- Step 1: enter `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (with a clear "service role can read/write everything" warning). Store in **Stronghold** (OS keychain) — never on disk in plaintext.
- Step 2: optionally paste a **GitHub PAT** (with `repo` and `workflow` scopes) for the "Push keys to GitHub Actions" feature. Store in Stronghold. If skipped, the app works in local-only mode (desktop pipeline runs only, no cron).
- Step 3: **AI provider setup**. Show the 4 free-tier providers as one-click enable buttons. For each enabled provider, prompt for the API key. Optionally paste a custom OpenAI-compatible endpoint. Save provider configs to `llm_providers` and keys to Stronghold + GH Secrets.
- Step 4: **Facebook login**. Either (a) import a cookie file exported from the browser, or (b) open a Playwright window inside the desktop app where the user logs in to Facebook, then save the resulting session cookie. Store cookie in Stronghold.
- Step 5: confirm and finish.

### 5.3 Admin UI tabs

- **Dashboard:** same as web admin's dashboard.
- **Pipeline tab:** "Run now" button (spawns the scraper CLI locally), schedule preview, last-run summary, toggle "Also run as cron" (uses system Task Scheduler on Windows / launchd on macOS / systemd-timer on Linux as a fallback to the GH Action).
- **Credentials tab:** list of stored credentials (Supabase, GitHub PAT, FB cookie, AI provider keys). Add/edit/delete. "Push to GitHub Actions secrets" button per credential. Per-credential metadata (name, type, last-used) — never display the value.
- **AI Providers tab:** full CRUD on `llm_providers`, drag-to-reorder priority, "Test" button per provider that runs a `healthCheck()` + a sample rewrite.
- **Sources tab:** same as web admin.
- **Moderation tab:** same as web admin, plus inline view of the private reference screenshot.
- **Submissions tab:** same as web admin.
- **Logs tab:** tail `pipeline_runs` from Supabase, filter by status, view error stack traces. Includes a separate "Archive & Retention" panel showing next-run date for `rolling-archive.yml` (compute as next 00:00 UTC, runs daily), last archive stats, and any `legal_hold` posts.
- **Archive tab:** read-only mirror of the web admin's Archive page. Filter by month, category, archive reason. View full content of any archived post (for editorial review or legal response). Actions: un-archive, toggle `legal_hold`.

### 5.4 Tauri commands (Rust)
- `store_credential(name, value)` → Stronghold.
- `get_credential(name)` → Stronghold.
- `list_credentials()` → Stronghold metadata only (never values).
- `run_pipeline()` → spawns the scraper CLI.
- `set_github_secret(name, value)` → calls GitHub API.
- `import_fb_cookie(path)` → reads a cookie export file, validates, stores in Stronghold.
- `test_llm_provider(provider_id)` → calls `LLMProvider.healthCheck()` and returns latency + sample rewrite.

**Deliverable:** `pnpm --filter desktop tauri dev` launches the app; user completes the setup wizard, stores a Supabase key + one AI provider key, runs the pipeline locally, and sees a `pending_review` post.

---

## Phase 6 — GitHub Actions cron

### 6.1 `pipeline-cron.yml`
```yaml
name: Pipeline Cron
on:
  schedule:
    - cron: '0 */2 * * *'   # every 2 hours
  workflow_dispatch:        # manual trigger
jobs:
  run:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - name: Run scraper
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          FB_SESSION_COOKIE: ${{ secrets.FB_SESSION_COOKIE }}
          # LLM provider keys — the scraper reads llm_providers from DB and resolves by name
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
          OLLAMA_BASE_URL: ${{ secrets.OLLAMA_BASE_URL }}   # optional
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: pnpm --filter scraper scrape --all
      - name: Trigger Vercel rebuild (if any post published)
        if: success()
        run: curl -X POST "${{ secrets.VERCEL_DEPLOY_HOOK_URL }}"
```

### 6.2 `rolling-archive.yml` — runs daily at 00:00 UTC, archives any post older than `ARCHIVE_VISIBLE_DAYS`
```yaml
name: Rolling Archive
on:
  schedule:
    - cron: '0 0 * * *'   # 00:00 UTC every day
  workflow_dispatch:
jobs:
  archive:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - name: Archive posts older than visible window
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          ARCHIVE_VISIBLE_DAYS: '7'
        run: pnpm --filter scraper archive --older-than-days=$ARCHIVE_VISIBLE_DAYS
      - name: Hard-purge posts in archive older than retention period
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          ARCHIVE_RETENTION_DAYS: '30'
        run: pnpm --filter scraper purge --older-than-days=$ARCHIVE_RETENTION_DAYS
      - name: Trigger Vercel rebuild (archive changes public listings)
        if: always()
        run: curl -X POST "${{ secrets.VERCEL_DEPLOY_HOOK_URL }}"
```

The `archive --older-than-days=7` command (added to the scraper CLI in Phase 3.9) runs this SQL:

```sql
-- Archive every published post older than the visible window,
-- EXCEPT missing-children posts with an active case.
update posts
set archived_at = now(),
    archive_reason = 'auto_rollover',
    updated_at = now()
where status = 'published'
  and archived_at is null
  and published_at < now() - (interval '1 day' * $ARCHIVE_VISIBLE_DAYS::int)
  and not (
    category = 'missing-children'
    and case_status = 'active'
  );

-- Log how many were archived.
insert into pipeline_runs (status, stats)
values (
  'completed',
  jsonb_build_object(
    'job', 'auto_rollover',
    'window_days', $ARCHIVE_VISIBLE_DAYS::int,
    'archived_count', (select count(*) from posts where archive_reason = 'auto_rollover' and archived_at > now() - interval '1 minute'),
    'kept_active_missing', (select count(*) from posts where category = 'missing-children' and case_status = 'active' and archived_at is null)
  )
);
```

The `purge --older-than-days=30` command hard-deletes `posts` (and their `media/` bucket assets, `screenshots/` bucket objects, and `raw_posts` rows) where `archived_at < now() - interval '30 days'`. The retention period is configurable via env var `ARCHIVE_RETENTION_DAYS` (default 30). **After this purge, no trace of the post remains on our side — the original FB post remains the canonical source.**

**Total max retention on our side:** `ARCHIVE_VISIBLE_DAYS` (public) + `ARCHIVE_RETENTION_DAYS` (admin-only) = 7 + 30 = **37 days max**. Adjust both env vars in lockstep if you want a different window.

### 6.3 `keep-alive.yml`
```yaml
name: Supabase Keep-Alive
on:
  schedule:
    - cron: '0 12 * * *'
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS "${{ secrets.SUPABASE_URL }}/rest/v1/posts?select=id&limit=1" \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

### 6.4 `ci.yml`
- Lint, type-check, test, build for desktop + web on every PR.
- Build (not publish) the Tauri app to verify it compiles on macOS, Windows, Linux.

**Deliverable:** First manual workflow run creates a `pending_review` post from a real source.

---

## Phase 7 — Vercel deployment

1. Import the GitHub repo into Vercel.
2. **Root directory:** `apps/web`.
3. **Build command:** `pnpm --filter web build`.
4. **Output:** Next.js default.
5. **Environment variables:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. **Never** put `SUPABASE_SERVICE_ROLE_KEY` here.
6. Add a **Deploy Hook** in Vercel → save URL as `VERCEL_DEPLOY_HOOK_URL` GitHub secret.
7. Domain: stick with the auto-generated `*.vercel.app` for v1. Add custom domain later in Vercel → Domains (free with Hobby plan if you bring your own DNS).
8. Configure Vercel Analytics (free) for traffic and Core Web Vitals monitoring.

**Deliverable:** Vercel URL serves the homepage; a freshly approved post is visible within 60s. `/sitemap.xml` is reachable and lists every published post.

---

## Phase 8 — Security, legal, and safety guardrails (non-negotiable)

**Legal posture (per user):** All content is collected from **public Facebook feeds** with the **original user posts as the source**. The site is a public-interest news aggregator (think AllTop / Flipboard / Groundviews, but specialized for Bangla local content), not a scraper or aggregator of private content. The original user/page is always attributed. This framing is the foundation for everything below: we are not doing anything illegal, but we do operate in a sensitive space, and the engineering safeguards below are what keep it that way.

**The categories in this project are sensitive by design.** This is a public-interest news aggregator covering child sexual abuse, criminal extortion, and missing children. The platform must be defensible under Bangladesh law, Facebook ToS, and basic child-safety principles. The user is responsible for final legal review with a qualified lawyer; the engineering safeguards below are the floor, not the ceiling.

### 8.1 Bangladesh legal context (for the engineering team's awareness)

- **Digital Security Act 2018 (DSA), §25/§29** — criminalizes publication of "obscene" or "defamatory" content. All three categories touch this. The mitigation: always attribute, never invent, redact identifying details for `child-sexual-abuse`, use allegation language.
- **Children Act 2013** — imposes special obligations when publishing about minors. The `child-sexual-abuse` category is the most exposed; double-approval + content warning + max redaction is the engineering response.
- **Pornography Control Act 2012** — applies to any visual depiction of abuse. The re-processed media is a real news photo/video, but the scraper should drop any post whose primary media appears to depict explicit acts (use the LLM to flag, then route to reject). Already partially covered by `safety_flag = graphic_content`.
- **Right to Information Act 2009** — public-interest reporting is generally protected if done responsibly.
- **The user must add a legal disclaimer** on `/about` and `/terms` stating that the platform is a public-interest news aggregator, posts are rewritten from sources, and the editorial team applies the safeguards in this section. This is a placeholder — **a real lawyer must review before public launch.**

### 8.2 Engineering safeguards (must implement)

1. **ToS & robots.txt respect:** before scraping a Page, fetch `https://facebook.com/robots.txt` and the Page's terms link. Refuse if explicitly disallowed. (Best effort; FB robots is sparse.)
2. **Rate limiting:** max 1 request / 2s per source, max 30 sources / run, max 200 posts / run. Random jitter ±500ms.
3. **Child PII stripping (defense in depth):**
   - The category-specific LLM rewrite prompts enforce redaction.
   - **Post-rewrite regex pass** on the `child-sexual-abuse` category redacts any name patterns from a configurable `redaction_blocklist` (admin-editable) and any pattern matching a `redaction_patterns` regex table (e.g. Bangla mobile numbers, school keywords, mosque/madrasa names, thana names).
   - Every post in `child-sexual-abuse` requires double-approval from two different admins before going live.
4. **Screenshot is private, always.** No code path may serve a screenshot URL on the public site. CI guard: a unit test parses every public page's HTML and fails the build if it finds a URL under `/storage/v1/object/sign/screenshots/`.
5. **Removal flow:** public "Report" form on every post; admin can one-click unpublish. Removed posts return **HTTP 410 Gone** with a "this post has been removed" message in Bangla. For `child-sexual-abuse` removals, also delete the post from the DB (don't just unpublish) to minimize retention.
6. **Attribution:** every published post has the source page name and a link to the original FB post with `rel="nofollow noopener ugc" target="_blank"`. The re-processed media has a subtle watermark with the source name.
7. **Audit log:** every admin action (approve, double_approve, reject, unpublish, edit, add_provider, push_secret, case_status_change) writes to `admin_actions`. The `details` JSONB captures the full before/after of any edit.
8. **No secret in git:** pre-commit hook (`gitleaks` or `husky + detect-secrets`) blocks accidental commits. GitHub secret scanning + push protection enabled.
9. **Backups:** Supabase free has no backups. Export `posts` + `raw_posts` to a private GitHub repo weekly via another Action (use `pg_dump` and commit the compressed dump, encrypted with a GitHub Actions secret).
10. **CSP & security headers:** strict CSP (script-src self + Supabase), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal. Set in `next.config.ts` `headers()`.
11. **Cookie & session hygiene:** FB session cookie expires every ~60 days; desktop app shows a banner 7 days before expiry asking the user to re-login.
12. **Helpline footer:** every public page footer shows: "জরুরি সহায়তা: পুলিশ ৯৯৯ | শিশু হেল্পলাইন ১০৯" with tel: links. Especially critical on `missing-children` posts but should be site-wide.
13. **Data retention (driven by `rolling-archive.yml` + `archive.ts` in Phase 3.9):**
    - **Public visibility window**: each post is public for `ARCHIVE_VISIBLE_DAYS` (default 7) days after `published_at`. The daily archive job stamps every published post older than that window with `archived_at = now()`, `archive_reason = 'auto_rollover'`. Exception: `missing-children` posts with `case_status = 'active'` are NOT auto-archived (active missing child cases stay public until resolved).
    - **Admin-only archive window**: archived posts are still in the DB and visible to admins in the Archive page. Default retention = 30 days (`ARCHIVE_RETENTION_DAYS` env var). After that, the `purge` subcommand hard-deletes the row + media + screenshot + raw_post. **Total max retention on our side is 37 days** (`ARCHIVE_VISIBLE_DAYS` + `ARCHIVE_RETENTION_DAYS`).
    - **Legal hold**: any post with `legal_hold = true` is excluded from the retention purge. Admins set this for posts under court order, active disputes, or audit. The post stays in the archive indefinitely until the hold is lifted.
    - `removal_requests` rows retained indefinitely for legal record.
    - `admin_actions` rows retained indefinitely for legal record.
    - **Legal framing note:** after the retention purge, the platform holds **no copy** of the rewritten post, the screenshot, the processed media, or the raw source. The original FB post (on the source's server) is the only remaining copy. This is intentional and load-bearing for the legal posture: we are a **rolling snapshot, not a permanent store**.
8. **No secret in git:** pre-commit hook (`gitleaks` or `husky + detect-secrets`) blocks accidental commits. GitHub secret scanning + push protection enabled.
9. **Backups:** Supabase free has no backups. Export `posts` + `raw_posts` to a private GitHub repo weekly via another Action (use `pg_dump` and commit the compressed dump, encrypted with a GitHub Actions secret).
10. **CSP & security headers:** strict CSP (script-src self + Supabase), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal. Set in `next.config.ts` `headers()`.
11. **Cookie & session hygiene:** FB session cookie expires every 60 days; desktop app shows a banner 7 days before expiry asking the user to re-login.

**Deliverable:** `pnpm gitleaks` passes; manual test of report → unpublish flow works; CI fails if any public page references a screenshot URL.

---

## Phase 9 — README and ops docs

The README should include:
- Disclaimer: this is a public-interest news aggregator, not a gossip site. Posts are rewritten for clarity, attributed to the original source, and moderated before publication where required.
- Local dev setup (`pnpm install`, env vars, `supabase start` for local dev, `pnpm dev`).
- How to add a new LLM provider (with screenshot of admin UI).
- How to add a new source (with the verification checklist).
- How to approve a post.
- How to handle a takedown request.
- Cost expectations at 100 / 1k / 10k posts per month, per provider.
- Contact email + report-content link.

---

## Acceptance criteria — done means:

- [ ] `pnpm install` works on a fresh clone.
- [ ] `supabase db push` applies the schema to a fresh project, including the 3 seeded `category_configs` rows.
- [ ] GitHub Actions cron produces at least one `pending_review` post from a verified source within 24h.
- [ ] An admin can log in via web, approve the post, and the post appears on the public site within 60s.
- [ ] The hero image on the public post is the **re-processed media** from `media/`, **NOT** the FB UI screenshot from `screenshots/`.
- [ ] A public user can submit a removal request and the admin can act on it (post returns 410; for `child-sexual-abuse` removals the row is hard-deleted).
- [ ] A public user can submit a Facebook Page via `/submit`; admin sees it in the submissions queue.
- [ ] The desktop app can store a Supabase key + at least one AI provider key in Stronghold, run the pipeline locally, and see the same post appear in `pending_review`.
- [ ] LLM provider fallback works: kill the primary provider's API mid-run, and the scraper automatically tries the next one in priority order.
- [ ] `/sitemap.xml` lists every published post and every legal page.
- [ ] `/robots.txt` exists, allows `/`, disallows `/admin/` and `/api/`.
- [ ] Every `/post/[slug]` page has valid JSON-LD `NewsArticle` (passes Google Rich Results Test).
- [ ] Bangla content uses Bengali script (verified by `range U+0980–U+09FF` check on every published body).
- [ ] All legal pages (`/about`, `/privacy`, `/terms`, `/dmca`, `/contact`) render with real placeholder content the user can fill in.
- [ ] No secrets in git history. `gitleaks` is green.
- [ ] Lighthouse score ≥ 95 on Performance, Accessibility, SEO, Best Practices for the homepage and a post page.
- [ ] Hosted on `*.vercel.app` (no custom domain in v1).
- [ ] **Category-specific behavior verified** (run a sample post through each category):
  - `child-sexual-abuse`: post is forced to `pending_review`, no identifying details in the body (regex check passes), content warning appears on the public page after approval, double-approval enforced (one admin can't approve alone).
  - `extramarital-crime`: post auto-publishes if safety flag is clean, allegation language used, source attribution present.
  - `missing-children`: post auto-publishes, helpline numbers (999, 109) appear in the body, admin can update `case_status` and the public badge updates without re-review.
- [ ] **Three LLM system prompts exist** (`rewrite.child-sexual-abuse.ts`, `rewrite.extramarital-crime.ts`, `rewrite.missing-children.ts`) and the scraper routes by category.
- [ ] **Helpline footer (999, 109)** appears on every public page.
- [ ] **CI guard test** exists that fails the build if any public page references a URL under `/storage/v1/object/sign/screenshots/`.
- [ ] **Rolling archive verified** (run a manual test):
  - `pnpm --filter scraper archive --older-than-days=7` correctly stamps every published post older than 7 days with `archived_at` and `archive_reason = 'auto_rollover'`.
  - `missing-children` posts with `case_status = 'active'` are NOT archived (they stay public).
  - After archive, those posts are NOT visible on the public site (homepage, category pages, sitemap) within one Vercel deploy cycle.
  - Visiting an archived post's `/post/[slug]` URL returns the polite "এই পোস্ট হৈচৈ থেকে গায়েব হয়ে গেছে" page (200 OK, no body, no media) — not 404.
  - The Archive page in `/admin/archive` shows the newly archived posts.
  - `pipeline_runs` has a row with `stats.job = 'auto_rollover'`.
- [ ] **Retention purge verified**: `pnpm --filter scraper purge --older-than-days=1` (in a test environment with fake data) hard-deletes posts older than 1 day from the archive, including their media + screenshot + raw_post rows, and the corresponding `admin_actions` row is written. Posts with `legal_hold = true` are NOT purged.
- [ ] **37-day max retention verified**: trace a post through publish → archive → purge. After 37 days (`ARCHIVE_VISIBLE_DAYS=7` + `ARCHIVE_RETENTION_DAYS=30`), no trace remains in the posts table, the raw_posts table, the `media/` bucket, or the `screenshots/` bucket. The platform holds **no copy** of the post after this point.

---

**Stop after Phase 1 and confirm the directory layout with the user before continuing.**

---

## Appendix — additions after the original prompt (through v1.1.10)

The phases above built v1. Reference these later additions for the current feature
set; they are documented in depth in `architecture-notes.md`, `database-decision.md`,
`DESKTOP.md`, `DEPLOY_WEB.md`, `ai-provider-strategy.md`, and `design-system.md`.

- **v1.1.7 — maintenance mode + feed-count knobs.** `app_config_json` gained
  `maintenance_mode`, `home_post_count`, `detail_similar_count`, `comments_show_count`
  and the maintenance screen/subscriber/message tables; admin Settings is a tabbed
  console with one PATCH save.
- **v1.1.9 — provider purpose, dashboard live controls, variant engine.**
  `llm_providers.purpose` (`text`/`image`) + per-row API-key override; live dashboard
  range/refresh + manual pipeline run; `/admin/appearance` variant switcher
  (`default`-only scaffold, `sections` table + `settings.default_variant`); shared
  `.hoichoi-dash` light theme.
- **v1.1.10 — traffic analytics, media refactor, manual image generation, footer
  socials, refresh feedback.**
  - *First-party cookie-less analytics:* `page_views` + `ad_events`
    (`migrations/011_traffic.sql`, `ensureTrafficTables`), `visitorFingerprint`
    (daily-rotating SHA-256, no raw IP), geo from Vercel edge headers, UA sniff, bots
    and internal paths dropped. Beacon `POST /api/track`; snapshot
    `trafficSnapshot(range)` (pure SQL) served by `GET /api/admin/traffic` and rendered
    by the shared `TrafficView` on web `/admin/traffic` and the desk ট্রাফিক tab.
  - *Media refactor:* the uploader moved into `@hoichoi/db`
    (`media-storage.ts`/`storage.ts`, `uploadBufferRemote`, `writeGeneratedMedia`) so
    both scraper and web can write media.
  - *Manual image generation:* optional `generateImage` on the `@hoichoi/llm`
    provider interface, `composeImagePrompt`, `listImageProviders`; surfaced via
    `media generate <id>`, `POST /api/posts/[id]/generate-image`, and the desk queue
    panel — same category safety rules as the automatic fallback.
  - *Footer socials:* `SiteAppConfig.footer_socials` edited in admin settings and
    rendered by `FooterSocials.tsx`.
  - *Desktop* gained the 9th ট্রাফিক tab (runner `traffic <range>` command in
    `dispatchCmd`); `refresh()` now returns `{ ok, error }` and drives an animated
    refresh button + result toast. **Re-run `bundle:runner` before `tauri build`**
    whenever `cli.ts` or `packages/db/migrations/` change.
  - *Storage analytics:* `storageSnapshot()` (`packages/db/src/storage-report.ts`) →
    shared `StorageView` (`packages/dash/src/storage.tsx`, `fmtBytes`) on web
    `/admin/traffic` + desk ট্রাফিক/স্টোরেজ sub-tab + CLI `storage`. Remote byte sizes
    are estimates (only blob counts are exact).
  - *Default post image + brand animation:* `SiteAppConfig.default_post_image` /
    `brand_animation`; `withDefaultImage(s)` stamps the default onto media-less posts;
    `.brand-motion` animates the home Hero wordmark/logo.
  - *Multi-image posts:* `post_images` (`migrations/012_post_images.sql`,
    `ensurePostImagesTable`, `packages/db/src/post-images.ts`); the collector mirrors
    every source image (cap 8), admins manage extras, the public page adds a thumbnail
    strip + lightbox. New `POST/PATCH/DELETE /api/posts/[id]/images`, editor gallery
    panels, and the runner `queue images` command.
  - *Variant switcher moved* into Settings → ডিজাইন (`/admin/settings?tab=design`) with
    a cookie-based live preview (`PUT /api/admin/preview`, `loadLive(previewVariant?)`)
    and a true reset-to-default; the admin sidebar is grouped/collapsible.
