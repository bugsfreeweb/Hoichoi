# হইচই · Hoichoi

Bangla viral-content **ephemeral** news desk — an auto-curated feed that scrapes
social pages, dedupes, redacts PII, rewrites neutrally via a multi-provider LLM
resolver, double-approves sensitive content, and publishes on a 7-day rolling
window. Every post is archived or purged by policy.

Live site: <https://hoichoifeed.vercel.app> · Source: <https://github.com/bugsfreeweb/Hoichoi> (private)

---

## Monorepo layout

```
apps/
  web/        Next.js 15 public site (SSR feed, /sitemap, OG images) + admin
              console (moderation, sources, providers, pipeline console)
  scraper/    Playwright + HTTP pipeline: scrape → dedup → rewrite → moderate → publish
  desktop/    Tauri 2 desktop admin — Stronghold keychain, pipeline console,
              web-admin panel. Ships a self-contained Windows installer.
packages/
  db/         Turso/libSQL schema (migrations 001_init, 002_vec), seed, demo data
  llm/        Multi-provider resolver: Gemini / Groq / OpenRouter / Ollama /
              Anthropic / OpenAI / Mistral with fail-over + schema-constrained output
  shared-types/  Post/RawPost/Source/Category types shared by all apps
.github/workflows/
  ci.yml            lint · typecheck · test · build (JS) + cargo check (Tauri)
  pipeline-cron.yml scrape every 2h
  rolling-archive.yml  daily archive + purge
  keep-alive.yml    keeps GitHub cron alive past the 60-day inactivity cutoff
```

## Prerequisites

- **Node 20+** and **pnpm** (`corepack enable` or `npm i -g pnpm`)
- **Rust 1.77.2+** (stable) for the desktop app — Microsoft C++ Build Tools on Windows
- Playwright browsers for logged-out scrolling: `pnpm --filter @hoichoi/scraper exec playwright install chromium`

## Quickstart

```bash
pnpm install
pnpm db:migrate      # creates data/hoichoi.db (Turso file: URL by default)
pnpm db:seed         # admin user, categories, providers, blocklist
pnpm db:demo         # 9 demo posts + sample sources (optional)
pnpm dev             # web at http://localhost:3000, desktop at :1420
```

- **Public site:** http://localhost:3000
- **Admin console:** http://localhost:3000/admin — demo login `admin@hoichoi.local` / `demo-admin-2026` (seeded)
- **One-shot scrape:** `pnpm run scrape` (add `HOICHOI_MOCK=1` for an offline fake run)

## Environment variables

Copy `.env.example` → `.env`. Key ones:

| Var | Purpose |
| --- | --- |
| `TURSO_DATABASE_URL` | `file:./data/hoichoi.db` locally; `libsql://...turso.io` in prod |
| `TURSO_AUTH_TOKEN` | Turso read/write token (prod only) |
| `ADMIN_AUTH_SECRET` | 32-byte hex for admin sessions (`openssl rand -hex 32`) |
| `ADMIN_ALLOWED_EMAILS` | Comma-separated login allow-list |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for SEO/sitemap |
| `STORAGE_ADAPTER` | `local` or `r2` (+ `R2_*` credentials) |
| `GOOGLE_API_KEY` `GROQ_API_KEY` `OPENROUTER_API_KEY` `OLLAMA_BASE_URL` … | LLM resolver keys |
| `FB_SESSION_COOKIE` | Optional `c_user`/`xs` cookie for logged-in Facebook scraping |
| `ARCHIVE_VISIBLE_DAYS` `ARCHIVE_RETENTION_DAYS` | 7 / 30 day rolling policy |

## Deployments

### GitHub (private)

```bash
git init
git add .
git commit -m "chore: initial monorepo"
git branch -M main
git remote add origin https://github.com/bugsfreeweb/Hoichoi.git
git push -u origin main
```

Secrets to add in **Settings → Actions → Secrets and variables** so the cron
actually runs attended: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`,
`ADMIN_AUTH_SECRET`, `ADMIN_ALLOWED_EMAILS`, `GOOGLE_API_KEY`, `GROQ_API_KEY`,
`OPENROUTER_API_KEY`, `OLLAMA_BASE_URL`, `FB_SESSION_COOKIE`, plus repo
variables `MAX_SOURCES_PER_RUN`/`MAX_POSTS_PER_RUN`. The desktop **Settings**
screen mirrors keys into Actions secrets automatically (libsodium sealed-box).

### Vercel (hoichoifeed.vercel.app)

1. Import the private repo; set **Root Directory → `apps/web`** (the
   `apps/web/vercel.json` pins the install/build commands).
2. Add the prod env vars above (Turso URL/token, `ADMIN_AUTH_SECRET`,
   `ADMIN_ALLOWED_EMAILS`, `NEXT_PUBLIC_SITE_URL=https://hoichoifeed.vercel.app`).
3. Deploys are automatic on `main`. Optionally set `VERCEL_DEPLOY_HOOK_URL`
   so the 2-hour pipeline pings a re-deploy after each scrape.
4. Storage: on serverless, use `STORAGE_ADAPTER=r2` so `/media` survives;
   `local` only works Long-running (dev) deployments.

## Desktop app (Windows)

`apps/desktop` is a Tauri 2 shell that keeps API keys in an **Stronghold**
encrypted vault and runs the pipeline with zero setup beyond first-run setup.

```bash
pnpm --filter @hoichoi/desktop tauri dev     # dev shell
pnpm --filter @hoichoi/desktop tauri build   # NSIS/MSI Windows installer
```

The installers live in `apps/desktop/src-tauri/target/release/bundle/` and are
bit-by-bit reproducible from the committed icons + `tauri.conf.json`.
See `apps/desktop/README.md` for the self-contained build story.

## Editorial & safety

- No verified users under 18; absolute block on child-sexual-abuse content.
- Approved pedo-adjacent titles are **double-approved** before publication.
- PII (phone numbers, national IDs, street addresses) is redacted during rewrite.
- Every post follows the 7-day visible / 30-day retention policy.
- Facebook content is scraped only for **non-personal, public** pages/blogs
  (group pages, personal profiles, and private content are hard-blocked).
  Logged-in scraping requires accepting Meta's ToS at first-run setup.