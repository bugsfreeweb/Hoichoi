# হৈচৈ · Hoichoi

Bangla viral-content **ephemeral** news desk — an auto-curated feed that ingests
public social pages *and* RSS/Atom news feeds, dedupes, redacts PII, classifies
into operator-owned categories, rewrites neutrally via a multi-provider LLM
resolver, double-approves sensitive content, and publishes on a rolling window.
Every post is archived or purged by policy.

Live site: <https://hoichoifeed.vercel.app> · Source: <https://github.com/bugsfreeweb/Hoichoi> (private)

```
Web (apps/web)        Next.js 15 public site (SSR feed, /sitemap, OG images, visitor
                      announcement bell + pinned banner, DB-driven footer) + admin shell
                      (/notices, /moderation, /comments, /posts, /providers, /reports,
                      /logs, /settings, /appearance, …), /desk preview, live /api/stats.
                      Home sections are gated by settings.app_config_json
                      (show_hero / show_ads / … / maintenance_mode / ai_hero_images);
                      admin Settings is a tabbed console (সাইট / ভিজিবিলিটি / বিজ্ঞাপন /
                      রক্ষণাবেক্ষণ / অপারেশন) with a single save → PATCH /api/settings.
                      /appearance is the section-variant switcher (default-only scaffold).
Scraper               Collection pipeline: ingest → dedup → classify → rewrite → moderate →
                      publish. Multi-platform: facebook (browser scrape) + news/magazine
                      (RSS/Atom fetch). AI fallback hero images for media-less posts.
Desktop (apps/desktop)  Tauri 2 desktop admin + local collector controller — Settings has
                      11 pill tabs incl. inline সোর্স/বিভাগ editing, AI প্রোভাইডার, নোটিশ,
                      a shared ওয়েব ভিজিবিলিটি ও থিম (app_config_json) panel with the
                      home/similar/comments count knobs, footer branding + per-category
                      footer visibility, এবং admin লগইন লগ panel. API ভল্ট কপি/ডাউনলোড
                      clipboard-plugin + Downloads ফাইলের মাধ্যমে।
DB/LLM/Types          packages/db (Turso/libSQL), packages/llm (multi-provider resolver),
                      shared-types.
Dash UI               packages/dash — shared admin-dashboard kit + 5-tab view (React 19 +
                      Tailwind v3, source-only) rendered by BOTH the web admin home and
                      the desktop Monitor so the two stay pixel-identical. The dashboard
                      header has a live ⟲ রিফ্রেশ + ▶ পাইপলাইন চালান (manual run with
                      progress polling and a completion toast on web and desktop).
```

## Quickstart

```bash
pnpm install
pnpm db:migrate      # creates data/hoichoi.db (Turso file: URL by default)
pnpm db:seed         # admin user, 20+ categories (with keywords), providers, blocklist
pnpm db:demo         # 9 demo posts + sample sources (optional)
pnpm dev             # web at http://localhost:3000, desktop at :1420
```

- **Public site:** http://localhost:3000
- **Desk preview:** http://localhost:3000/desk (in-browser mirror of the desktop console)
- **Admin console:** http://localhost:3000/admin — demo access
  `admin@hoichoi.local` (seeded; codes minted from the desktop app)
- **One-shot scrape:** `pnpm run scrape` (add `HOICHOI_MOCK=1` for an offline fake run)

## Repository layout

```
apps/
  web/        Next.js 15 public site + admin (the ONLY app deployed to Vercel)
  scraper/    Playwright + HTTP pipeline: ingest → dedup → classify → rewrite → publish
  desktop/    Tauri 2 native desktop controller (self-contained Windows installer)
              mockup-parity 8-tab desk console (Monitor … Ads) + live sync bar
packages/
  db/         Turso/libSQL client, migrations, seeds, shared archive/media helpers
  llm/        Multi-provider resolver (Gemini/Groq/OpenRouter/Ollama/…) with fail-over
  shared-types/  Post/RawPost/Source/Category types shared by all apps
  dash/       Shared dashboard: chart kit, `DashModel` contract, and the 5-tab
              DashboardView. Consumed by apps/web (admin home) and apps/desktop
              (Monitor); every panel maps to a real DB row — no fabricated telemetry.
docs/         All documentation (deploy, desktop build, design system, editorial policy)
mockup/       Static design reference (do not deploy; not part of the build)
.github/workflows/   ci · pipeline-cron (every 2h) · rolling-archive · keep-alive · deploy-web
```

## How a post travels through the pipeline

```
source ──▶ (facebook scrape | rss/atom fetch) ──▶ raw_posts ──▶ dedup (URL/phash/embedding)
   ──▶ classify: keyword maps read ONLY from category_configs.config.keywords (DB)
   ──▶ rewrite via multi-provider LLM (lenient output parser, PII redaction)
   ──▶ fact-gate: weak/unknown matches → pending_review (moderation queue)
   ──▶ publish on the rolling window; archives/purges by retention policy
```

- **Classification is DB-driven.** The classifier has no hard-coded keyword
  table: it scores against each category's `config.keywords`, editable from the
  web admin (`/admin` → categories) *and* the desktop desk (Settings → desk
  categories), and kept in sync because both sides share the `settings` DB. New
  categories added in the apps get their keywords stored as data — no deploy
  needed to correct the term pool.
- **Multi-platform sources.** `sources add --platform news|magazine` points a
  source's `page_url` at an RSS 2.0 / Atom / RDF feed; the adapter normalizes
  entries into the same shape as Facebook posts (stable id, permalink, text,
  media enclosures/`media:`/`<img>`), so *every downstream step is shared*.
  Other platforms (`facebook`, `x`, `social`, `other`) are ingested as before.
- **AI fallback hero images.** When a post reaches publish with no media at all,
  a Gemini image model generates one editorial hero (`ai_hero_images` app-config
  toggle, off when no `GOOGLE_API_KEY`). Sensitive categories
  (missing-children / child-sexual-abuse / extramarital-crime) are **always**
  excluded, and the prompt itself bans text, logos, real people and children.
  `media ai-fill` repairs already-published media-less posts.
- **Maintenance mode.** `maintenance_mode` (app_config_json) shows a full
  maintenance screen to logged-out visitors (mockup-faithful paper/ink design,
  Bangla+English copy blocks, countdown, progress bar, live site stats and last
  pipeline run), keeps full access for signed-in admins, and de-indexes the site
  meanwhile. Visitors can **subscribe for the return** or send a **contact
  message** — both POST to public `/api/maintenance/*` routes and land in new
  `maintenance_subscribers` / `maintenance_messages` tables, surfaced in the
  admin Settings → অপারেশন tab. The whole screen (colors, theme variant, copy,
  countdown, schedule, socials, effects, SEO) is editable live from the
  রক্ষণাবেক্ষণ tab with a real-time preview; toggling the mode off is one switch
  in the ভিজিবিলিটি tab.
- **Moderation split.** The admin console now has separate queues: **কনটেন্ট
  মডারেশন** (`/admin/moderation`) for posts and **মন্তব্য মডারেশন**
  (`/admin/comments`) for comments, each with pending/approved/blocked tabs and
  batch actions. `pending_comments` is a distinct urgent badge in the admin nav +
  notifications dropdown.
- **Visibility counts.** `home_post_count` (homepage pages, default 12),
  `detail_similar_count` (post-page related grid, default 3) and
  `comments_show_count` (approved comments shown before "আরও দেখুন", default 10)
  are admin-tunable in the ভিজিবিলিটি tab (web + desktop) and honored by the home
  page, post page and `/api/comments`.
- **One dashboard, two apps.** The web admin home (`/admin`) and the desktop
  **মনিটর** now render the *same* five-tab dashboard (সারসংক্ষেপ · বিশ্লেষণ ·
  পাইপলাইন · ইনসাইট · কনটেন্ট ডেস্ক) from the shared `@hoichoi/dash` package. The
  web builds the `DashModel` server-side from `@hoichoi/db`; the desk builds it
  client-side from the runner. Every panel is bound to real rows — no panel shows
  invented telemetry. Both consoles also have a one-click **⟲ ডিফল্টে রিসেট** for
  the `app_config_json` visibility/maintenance knobs (`DEFAULT_APP_CONFIG`); it is
  non-destructive and never touches content.
- **Live dashboard + manual run.** The shared dashboard header carries **⟲ রিফ্রেশ**
  (re-snapshots `GET /api/admin/dashboard?range=…`) and **▶ পাইপলাইন চালান**
  (`POST /api/admin/run-pipeline`). On the web a run is polled via
  `GET /api/admin/runs?limit=1` until a new terminal row appears, then a fixed
  toast reports success/failure; on the desktop the runner emits
  `pipeline://done` with the exit code and the same toast fires. When no deploy
  hook is configured the API answers `501` and the UI falls back to the local
  desktop runner (`pnpm scrape`).
- **Provider purpose + multi-key.** `llm_providers.purpose` is `text` (default)
  or `image`, so image models resolve through a dedicated `ImageResolver`
  independent of the text chain. An optional per-provider **API key override**
  is stored on the row (takes precedence over vault/env), and a provider may
  hold several keys; the text chain only ever considers `purpose = 'text'`.
- **Optional variant engine (scaffold).** The shipped design is the single
  `default` variant for every section. A registry
  (`SECTION_REGISTRY` in `@hoichoi/shared-types`) maps each public-site section
  (per `multi-style-web-mockup` slug) to its selectable variants, and the
  `sections` table + `settings.default_variant` persist the choice. Admin →
  **ডিজাইন ভ্যারিয়েন্ট** (`/admin/appearance`) exposes the switcher, but only
  `default` is available today; mockup variants are catalogued and disabled until
  ported, so **the live design never changes**.
- **Light theme everywhere.** `html[data-theme="light"]` is honored across the
  web public site, the `.hoichoi-dash` kit (web dashboard + desktop Monitor) and
  the desktop shell, and the admin notification bell + maintenance preview are
  theme-aware. Horizontal overflow is clipped at the page/chrome level so the
  maintenance grain overlay and ticker no longer create stray scrollbars.

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
| `GOOGLE_API_KEY` + `GEMINI_IMAGE_MODEL` | AI hero images (default `gemini-2.5-flash-image`) |
| `FB_SESSION_COOKIE` | Optional `c_user`/`xs` cookie for logged-in Facebook scraping |
| `ARCHIVE_VISIBLE_DAYS` `ARCHIVE_RETENTION_DAYS` | Rolling policy |

> **GitHub Actions secrets নিয়ে বিস্তারিত, প্রতিটির কোথা থেকে পাবেন, খরচ ও
> "না দিলে কী হবে" — সব [`docs/SECRETS.md`](docs/SECRETS.md)-তে। ওয়েব অ্যাডমিনের
> `/admin/setup` পেজে একই তথ্য বাংলায় দেখা যায়, এবং ডেস্ক অ্যাপের
> Settings → Secrets প্যানেলেও।

Provider keys can also be registered per-provider from the admin `AI প্রোভাইডার`
page: an optional **API key override** is stored on the `llm_providers` row
(takes precedence over vault/env) and the **⚡ মডেল অটো-ফেচ** button pulls the
provider's `/v1/models` list (OpenRouter auto-filtered to free models) so you can
pick without hand-typing. Providers are tagged **text** or **image** (`--purpose`
on the CLI, a select in the admin form) so the rewrite chain and the AI hero-image
generator resolve independently. Custom OpenAI-compatible providers get automatic
`/v1`/`/openai/v1` endpoint fallback, and rewrite output is parsed leniently
(fences, bold/bullet labels, Bangla aliases and value shorthands).

## CLI cheat-sheet

Run from anywhere with `npx tsx --env-file=.env apps/scraper/src/cli.ts <cmd>`.

| Command | What it does |
| --- | --- |
| `scrape [--mock] [--max-sources N] [--max-posts N]` | Run the full pipeline |
| `archive` | Rolling archive/purge pass |
| `categories list` / `categories add --slug … --keywords "a,b"` | Category catalog (keywords stored as data) |
| `sources add --page-url <url> --page-name <n> --category <slug> --platform <p>` | Add a source; `news`/`magazine` use RSS/Atom |
| `media status` / `media backfill [--recover]` / `media cleanup` | Remote-media storage, redownload missing media |
| `media ai-fill [--limit N] [--dry-run]` | Generate AI hero images for media-less posts |
| `settings set <key> <value>` / `settings show` | Read/update the shared settings row |
| `sync push` / `sync pull` | Copy content tables between DBs (includes `llm_providers`) |
| `export` / `import` | Encrypted vault backups |
| `providers list` / `providers add --base-url … [--purpose text\|image]` | LLM provider registry |

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

Copy the artifacts from `src-tauri/target/release/` into `releases/`:
`Hoichoi Desk.exe` (portable launcher), `…_x64-setup.exe` (NSIS), `…_x64_en-US.msi`,
plus the **portable package** — a `…_x64-portable/` folder holding `Hoichoi Desk.exe`
next to its `runner/` (and a matching `…_x64-portable.zip`). The portable EXE resolves
the bundled runner from its own folder, so it runs without installing. Upload the same
artifacts to the GitHub release (`releases/` at the repo root is gitignored).

> After any change to `packages/db/migrations/` you **must** re-run `bundle:runner`
> before `tauri build` — the EXE/installers embed a snapshot of the runner + migrations
> (latest e.g. `010_llm_temperature.sql`).

## Editorial & safety

- No verified users under 18; absolute block on child-sexual-abuse content.
- Approved pedo-adjacent titles are **double-approved** before publication.
- AI hero images are never generated for the missing-children /
  child-sexual-abuse / extramarital-crime categories; the generation prompt
  bans text, logos, recognizable people and children.
- PII (phone numbers, national IDs, street addresses) is redacted during rewrite.
- Every post follows the rolling retention policy (`ARCHIVE_VISIBLE_DAYS` /
  `ARCHIVE_RETENTION_DAYS`).
- Facebook content is scraped only for **non-personal, public** pages/blogs
  (group pages, personal profiles, and private content are hard-blocked).
  Logged-in scraping requires accepting Meta's ToS at first-run setup.

Full editorial standard: [`docs/editorial-policy.md`](docs/editorial-policy.md).