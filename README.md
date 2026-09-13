# হৈচৈ · Hoichoi

Bangla viral-content **ephemeral** news desk — an auto-curated feed that scrapes
public social pages, dedupes, redacts PII, rewrites neutrally via a multi-provider
LLM resolver, double-approves sensitive content, and publishes on a rolling
window. Every post is archived or purged by policy.

Live site: <https://hoichoifeed.vercel.app> · Source: <https://github.com/bugsfreeweb/Hoichoi> (private)

```
Web (apps/web)      Next.js 15 public site (SSR feed, /sitemap, OG images) + admin console
Scraper             Collection pipeline: scrape → dedup → rewrite → moderate → publish
Desktop (apps/desktop)  Tauri 2 desktop admin + local collector controller
DB/LLM/Types        packages/db (Turso/libSQL), packages/llm (multi-provider resolver), shared-types
```

## Quickstart

```bash
pnpm install
pnpm db:migrate      # creates data/hoichoi.db (Turso file: URL by default)
pnpm db:seed         # admin user, categories, providers, blocklist
pnpm db:demo         # 9 demo posts + sample sources (optional)
pnpm dev             # web at http://localhost:3000, desktop at :1420
```

- **Public site:** http://localhost:3000
- **Admin console:** http://localhost:3000/admin — demo access
  `admin@hoichoi.local` (seeded; codes minted from the desktop app)
- **One-shot scrape:** `pnpm run scrape` (add `HOICHOI_MOCK=1` for an offline fake run)

## Repository layout

```
apps/
  web/        Next.js 15 public site + admin (the ONLY app deployed to Vercel)
  scraper/    Playwright + HTTP pipeline: scrape → dedup → rewrite → moderate → publish
  desktop/    Tauri 2 native desktop controller (self-contained Windows installer)
packages/
  db/         Turso/libSQL client, migrations, seeds, shared archive/media helpers
  llm/        Multi-provider resolver (Gemini/Groq/OpenRouter/Ollama/…) with fail-over
  shared-types/  Post/RawPost/Source/Category types shared by all apps
docs/         All documentation (deploy, desktop build, design system, editorial policy)
mockup/       Static design reference (do not deploy; not part of the build)
.github/workflows/   ci · pipeline-cron (every 2h) · rolling-archive · keep-alive · deploy-web
```

## Environment variables

Copy `.env.example` → `.env`. Key ones:

| Var | Purpose |
| --- | --- |
| `TURSO_DATABASE_URL` | `file:./data/hoichoi.db` locally; `libsql://…turso.io` in prod |
| `TURSO_AUTH_TOKEN` | Turso read/write token (prod only) |
| `ADMIN_AUTH_SECRET` | 32-byte hex for admin sessions (`openssl rand -hex 32`) |
| `ADMIN_ALLOWED_EMAILS` | Comma-separated login allow-list |
| `NEXT_PUBLIC_SITE_URL`, `SITE_URL` | Canonical site URL for SEO/sitemap/base metadata |
| `STORAGE_ADAPTER` | `local` or `r2` (+ `R2_*` credentials) |
| `GOOGLE_API_KEY` `GROQ_API_KEY` `OPENROUTER_API_KEY` `OLLAMA_BASE_URL` … | LLM resolver keys |
| `FB_SESSION_COOKIE` | Optional `c_user`/`xs` cookie for logged-in Facebook scraping |
| `ARCHIVE_VISIBLE_DAYS` `ARCHIVE_RETENTION_DAYS` | Rolling policy |

## Deployments

### Web — Vercel through GitHub

The web app is `apps/web` and is the only thing that ships to Vercel. **See
[`docs/DEPLOY_WEB.md`](docs/DEPLOY_WEB.md) for the exact flow** (push whole repo
to GitHub, Vercel builds `apps/web` via `vercel.json`). It is also auto-deployed
by `.github/workflows/deploy-web.yml` when Vercel secrets are configured.

### Desktop — Windows installer

`apps/desktop` is a Tauri 2 native app shipping a self-contained pipeline
runner. **See [`docs/DESKTOP.md`](docs/DESKTOP.md).** Quick rebuild:

```bash
pnpm --filter @hoichoi/desktop build          # tsc + vite
pnpm --filter @hoichoi/desktop bundle:runner  # stage portable runner → resources/runner
pnpm --filter @hoichoi/desktop tauri build    # NSIS + MSI into src-tauri/target/release/bundle
```

Copy the three artifacts from `src-tauri/target/release/` into `releases/`
(`Hoichoi Desk.exe`, `…_x64-setup.exe`, `…_x64_en-US.msi`) and upload them to the
GitHub release.

## Editorial & safety

- No verified users under 18; absolute block on child-sexual-abuse content.
- Approved pedo-adjacent titles are **double-approved** before publication.
- PII (phone numbers, national IDs, street addresses) is redacted during rewrite.
- Every post follows the rolling retention policy (`ARCHIVE_VISIBLE_DAYS` /
  `ARCHIVE_RETENTION_DAYS`).
- Facebook content is scraped only for **non-personal, public** pages/blogs
  (group pages, personal profiles, and private content are hard-blocked).
  Logged-in scraping requires accepting Meta's ToS at first-run setup.

Full editorial standard: [`docs/editorial-policy.md`](docs/editorial-policy.md).