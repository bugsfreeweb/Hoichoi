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
│   └── llm/          Multi-provider LLM abstraction (8 providers + resolver + prompts)
├── docs/             index + DEPLOY_WEB, DESKTOP, design system, editorial policy, etc.
├── vercel.json       scopes Vercel to apps/web (web/desktop are separate deploys)
└── .github/workflows/ pipeline-cron (every 2h), rolling-archive (daily), keep-alive, ci, deploy-web
```

> **Web ⇄ Desktop separation.** The web app (`apps/web`) depends only on the
> `@hoichoi/db|llm|shared-types` packages. It never imports `@hoichoi/scraper`
> or `@hoichoi/desktop`, so uploading/deploying the web app to Vercel is
> unambiguous and never drags in Playwright, tsx, or the native app. See
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
- **Admin:** http://localhost:3000/admin (demo login: `admin@hoichoi.local` / `demo-admin-2026`)
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

1. **Admin → Moderation queue**. Filter by category.
2. Review the rewritten Bangla, the re-processed media, and the **private reference screenshot** (signed, admin-only — never shown publicly).
3. Edit the body if needed → **Approve**. Posts tagged `needs_double_approval` (child-sexual-abuse) require approval from **two different admins**.
4. The post appears on the public site within the ISR revalidation window (300s).

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