# হৈচৈ (Hoichoi) — Bangla Viral-Content Ephemeral Snapshot

> **Preserved reference (original design-phase README).** For the current state
> see the repo root `README.md`, `docs/DEPLOY_WEB.md` and `docs/DESKTOP.md`.
> Historical notes: the desktop vault has moved from Stronghold to its own
> AES-256-GCM key store, and the web admin now logs in with **one-time codes**
> (desktop-minted) instead of a password.

> **"ভাইরাল বাংলা, সপ্তাহখানেক"** — Viral Bangla, for a week.

Hoichoi is a **public-interest news aggregator** for Bangla local content. It watches **public Facebook Pages** in three narrow categories, describes them in clean Bangla, shows them for **7 days**, then makes every trace disappear. Posts are rewritten by a **multi-AI-provider** system with automatic fallback (free by default), deduplicated by **semantic embeddings + perceptual hashes**, hosted on **Vercel**, and driven by a **GitHub Actions cron** that runs every 2 hours.

> ⚠️ **Not a gossip site.** Posts are rewritten for clarity, attributed to the original source, and moderated before publication where required. This platform is a rolling snapshot — it holds **no permanent copy** of any post.

## The three categories

| Slug | Bangla | English label |
|---|---|---|
| `child-sexual-abuse` | শিশু যৌন নির্যাতন | Child sexual abuse (religious & private settings) — max redaction, double-approval, content warning |
| `extramarital-crime` | পরকীয়া অপরাধ | Extramarital crime & blackmail — lead with the criminal act, allegation language |
| `missing-children` | নিখোঁজ শিশু ও ছেলে ধরা | Missing children & child safety — identifying details kept, helplines 999 / 109 |

## Content lifecycle (max retention = 37 days)

```
[pending_review] → [approved] → [published]  (public for ARCHIVE_VISIBLE_DAYS=7)
                                      ↓
                              [archived]  (admin-only for ARCHIVE_RETENTION_DAYS=30)
                                      ↓
                              [purged]    (row + media + screenshot + raw_post hard-deleted)
```

Exceptions: active `missing-children` cases stay public until resolved; `legal_hold` posts are exempt from purge.

## Repo layout

```
├── apps/
│   ├── web/          Next.js public site + web admin (Vercel) — the ONLY app deployed to Vercel
│   ├── desktop/      Tauri native desktop app (Stronghold keychain) — separate product, NOT in web deploy
│   └── scraper/      Collection pipeline (CLI + library) — runs on desktop/CI, not serverless
├── packages/
│   ├── shared-types/ Types shared everywhere
│   ├── db/           Turso/libSQL client, migrations, seeds, + shared archive/media helpers
│   ├── dash/         Shared dashboard kit + `DashModel` + 5-tab view rendered by BOTH
│   │                 the web admin home and the desktop Monitor
│   └── llm/          Multi-provider LLM abstraction (8 providers + resolver + prompts)
├── docs/             index + DEPLOY_WEB, DESKTOP, design system, editorial policy, etc.
├── vercel.json       scopes Vercel to apps/web (web/desktop are separate deploys)
└── .github/workflows/ pipeline-cron (every 2h), rolling-archive (daily), keep-alive, ci, deploy-web
```

> **Web ⇄ Desktop separation.** The web app (`apps/web`) depends only on the
> `@hoichoi/db|llm|shared-types|dash` packages. It never imports
> `@hoichoi/scraper` or `@hoichoi/desktop`, so uploading/deploying the web app to
> Vercel is unambiguous and never drags in Playwright, tsx, or the native app. See
> [`docs/DEPLOY_WEB.md`](docs/DEPLOY_WEB.md) (deploy) and
> [`docs/DESKTOP.md`](docs/DESKTOP.md) (standalone desktop build).

## Local dev setup

```bash
pnpm install
cp .env.example .env        # fill in what you need; local-first defaults work without keys
pnpm --filter db migrate    # create the SQLite/Turso schema
pnpm --filter db demo       # seed demo content so the site is immediately viewable
pnpm dev                    # web on :3000, scraper CLI ready
```

- **Web:** `pnpm --filter web dev` → http://localhost:3000
- **Admin:** http://localhost:3000/admin (demo access: `admin@hoichoi.local` seeded; one-time code minted from the desktop app)
- **Desktop:** `pnpm --filter desktop tauri dev` (requires Rust toolchain)

## Database choice

The schema and queries are exclusively relational SQL, semantic dedup needs native **vector search**, and writes are bursty (every 2h from a cron). Between **Turso** and Firebase, **Turso (libSQL)** was chosen:

- Relational schema (views, joins, FKs, cascades) ports 1:1 from the original Postgres design.
- Native `vec0` virtual tables give cosine-similarity embedding dedup inside the DB.
- 5 GB free, **no idle-pause** (unlike Supabase free), no server to keep alive.
- Auth + storage are app-level concerns handled here with workable adapters (see below).

Firebase was the runner-up but its NoSQL document model forces a redesign of the exact schema and it has no native vector search.

**Auth:** self-contained admin auth in the web app (HTTP-only session cookie + `admin_users` table). **Storage:** pluggable adapter — `local` filesystem for development; Cloudflare R2 (S3-compatible) for production via one env-var swap. Screenshots live in a private path served **only** through authenticated admin routes — never publicly routable.

## How to add a new LLM provider

Providers are runtime records in the `llm_providers` table, editable from the admin UI (**Admin → AI Providers**). Keys are never stored in the DB — each row references an env var (`api_key_env_var`); the resolver walks active providers in `priority` order and falls back on failure.

1. Admin → AI Providers → **Add provider**.
2. Pick a preset (`google`, `groq`, `openrouter`, `ollama`, `anthropic`, `openai`, `mistral`) or a custom OpenAI-compatible base URL (Together AI, Fireworks, vLLM, LM Studio…).
3. Paste the API key. It is stored in the desktop app's **Stronghold** vault (OS keychain) and mirrored to GitHub Actions secrets for the cron (via a GitHub PAT with `repo` + `workflow` scopes).
4. Set priority, toggle rewrite/embedding support, save. The scraper picks it up on the next run.

## How to add a new source

1. **Submit a page** from the public site (`/submit`) → lands in the admin **Submissions** queue.
2. Admin verifies the Page is a real news outlet / government body / child-welfare NGO, has no history of fabrication or hate speech, and is not a personal profile.
3. Accept → a `sources` row is created with `is_verified = false`.
4. After 14 days of consistent factual reporting, the admin sets `is_verified = true`, which activates scraping.

## How to approve a post

1. **Admin → কনটেন্ট মডারেশন** (`/admin/moderation`). Filter by category.
2. Review the rewritten Bangla, the re-processed media, and the **private reference screenshot** (signed, admin-only — never shown publicly).
3. Edit the body if needed → **Approve**. Posts tagged `needs_double_approval` (child-sexual-abuse) require approval from **two different admins**.
4. The post appears on the public site within the ISR revalidation window (300s).

## How to moderate comments

Reader comments are **not public-first** — they land as `pending` and appear only after approval.

1. **Admin → মন্তব্য মডারেশন** (`/admin/comments`, same queue UI as posts, over the `comments` table).
2. Approve (visible with the "সম্পাদক অনুমোদিত" meta) or Block (hidden). The pending count shows as its own urgent badge in the admin nav + `/admin/notifications` and in the desktop desk badge.
3. How many approved comments render on the post page + `/api/comments` is capped by `settings.app_config_json.comments_show_count`.

## How to flip maintenance mode

A one-click kill-switch for the public site without any deploy.

1. **Admin → Settings → ভিজিবিলিটি tab → maintenance toggle** (or desktop সাইট ও বিজ্ঞাপন tab), then Save.
2. Logged-out visitors get the mockup-faithful **maintenance screen** with live stats (posts collected/published, duplicates blocked, pending comments, last run) + subscribe/contact forms landing in the রক্ষণাবেক্ষণ ইনবক্স (Settings → অপারেশন tab).
3. Signed-in admins keep normal access; `robots.txt` de-indexes while active. The screen's copy/colors/progress/countdown are all editable in the রক্ষণাবেক্ষণ tab with a live preview.

## How to handle a takedown request

1. Any visitor clicks **"রিপোর্ট করুন / Report this content"** on a post → `removal_requests` is created.
2. **Admin → Removal requests**. Actioned requests unpublish the post (HTTP **410 Gone** with a Bangla notice). For `child-sexual-abuse` removals the DB row is hard-deleted, not just unpublished.
3. All actions are recorded in `admin_actions`.

## Deployment (v1)

1. Push this repo to GitHub (**make it public** for free Actions minutes).
2. Create a Turso database → set `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` as GitHub secrets and Vercel env vars.
3. Run `pnpm --filter db migrate` + `pnpm --filter db seed` against the remote DB (locally with the token).
4. Import into Vercel. Root directory `apps/web`, build `pnpm --filter web build`. Env: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_AUTH_SECRET`, `ADMIN_ALLOWED_EMAILS`, `STORAGE_ADAPTER`.
5. Add a Vercel Deploy Hook → save as `VERCEL_DEPLOY_HOOK_URL` secret.
6. Scraper secrets: `SUPABASE_…` are not used; add `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `FB_SESSION_COOKIE` (optional), and the LLM provider keys.

## Costs at scale (LLM, all free tiers)

| Provider | Free quota | Role |
|---|---|---|
| Google Gemini Flash | 1,500 req/day | Priority-1 rewrite + embeddings |
| Groq Llama 3.3 70B | ~14k req/day | Fast fallback |
| OpenRouter `:free` | 50 req/day | Last resort |
| Ollama (local) | Unlimited | Offline / embeddings at scale |

Estimated LLM cost at up to 1,000 posts/day: **$0/mo**. At extreme volume, or for premium Bangla quality, add Claude Haiku 4.5 with `priority 0`.

## Report content / legal

- **Report a story:** use the **রিপোর্ট করুন** button on any post.
- **Submit a Facebook Page:** `/submit`.
- Every public page footer shows **জরুরি সহায়তা: পুলিশ ৯৯৯ · শিশু হেল্পলাইন ১০৯**.
- See `/about`, `/terms`, `/privacy`, `/dmca`, `/contact` for legal posture. **A qualified lawyer must review the legal pages before public launch.**

## Traffic analytics & footer socials (v1.1.10)

- **Cookie-less traffic analytics** are built in — no third-party analytics service.
  Anonymous page views (`page_views`) and ad view/click events (`ad_events`) are
  recorded by a beacon, with no raw IP stored (a daily-rotating hash counts unique
  visitors). The admin dashboard shows these five groups in its **ট্রাফিক ও স্টোরেজ**
  tab (`/admin`, and the desk **ট্রাফিক** tab): live visitors by country/flag,
  most-read content, comments, page-view/OS/browser/device mix, and ad
  views/clicks/CTR.
- **Footer social links** are admin-editable (settings → সাইট) — no code change to
  add a Facebook/YouTube/Telegram/etc. link.
- **On-demand image generation:** any post's hero can be generated from the post
  editor, the desk, or `media generate <id>` (subject to the same category safety
  rules as the automatic fallback).

## Storage, gallery, and design controls (v1.1.10)

- **Storage analytics** are built in: DB size + largest tables, the on-disk media
  tree with a per-day byte series, and remote blob counts per adapter (web
  dashboard → ট্রাফিক ও স্টোরেজ, desk ট্রাফিক → স্টোরেজ, CLI `storage`). Remote byte
  sizes are estimates.
- **Default post image + brand animation** are operator settings: a default image is
  stamped onto media-less posts, and the home Hero wordmark/logo animates
  (`fade | typewriter | shimmer | slide`).
- **Multi-image posts:** a post can carry a gallery of extra images alongside its
  primary one (collector-mirrored and admin-added); the public post page shows a
  thumbnail strip and a full-page lightbox.
- **Design variants** are selectable from Settings → ডিজাইন with a live preview and
  a one-click reset to the shipped `default`; the live structure never changes until
  an operator opts in.