# হৈচৈ · Hoichoi

Bangla viral-content **ephemeral** news desk — an auto-curated feed that ingests
public social pages *and* RSS/Atom news feeds, dedupes, redacts PII, classifies
into operator-owned categories, rewrites neutrally via a multi-provider LLM
resolver, double-approves sensitive content, and publishes on a rolling window.
Every post is archived or purged by policy.

Live site: <https://hoichoifeed.vercel.app> · Source: <https://github.com/bugsfreeweb/Hoichoi> (private)

```
Web (apps/web)        Next.js 15 public site (SSR feed, /sitemap, OG images, visitor
                      announcement bell + pinned banner, DB-driven footer with
                      admin-editable social links) + admin shell (/notices, /moderation,
                      /comments, /posts, /providers, /reports, /logs, /settings, /live,
                      /ads, /portal,
                      /appearance, /setup, …), /desk preview, live /api/stats. First-party
                      cookie-less analytics (page_views + ad_events) power the dashboard's
                      ট্রাফিক ও স্টোরেজ tab with a /api/track beacon. Home sections are gated by settings.app_config_json
                      (show_hero / show_ads / show_live_polls / … / maintenance_mode / ai_hero_images /
                      default_post_image / brand_animation);
                      admin Settings is a tabbed console (সাইট / ভিজিবিলিটি / বিজ্ঞাপন /
                      রক্ষণাবেক্ষণ / অপারেশন / ডিজাইন) with a single save → PATCH /api/settings.
                      The first-party advertising platform has admin operations
                      (/admin/ads and its clients, bookings, slots, analytics and activity
                      views), email/password client signup with admin approval, a client
                      portal (/portal), five platform placements and delivery analytics
                      stored separately in platform_ad_events. Each shared placement can
                      serve platform ads, existing HTML/Google code, or both; booking
                      start/end dates gate client delivery. The legacy ad_events table
                      remains dedicated to page-traffic analytics.
                      The ডিজাইন tab folds in the section-variant switcher with a live
                      preview (cookie overlay, no DB write) and a one-click reset to default.
                      Admin shell has a grouped, collapsible sidebar with a persisted
                      collapsed state + mobile drawer. The dashboard's ট্রাফিক ও স্টোরেজ
                      tab also renders the shared storage analytics (DB size + per-storage
                      media breakdown).
Scraper               Collection pipeline: ingest → dedup → classify → rewrite → moderate →
                      publish. Multi-platform: facebook (browser scrape) + news/magazine
                      (RSS/Atom fetch). AI fallback hero images for media-less posts +
                      on-demand manual image generation (`media generate`).
Desktop (apps/desktop)  Tauri 2 desktop admin + local collector controller — 9-tab desk
                       console incl. a ট্রাফিক analytics tab (shares the web TrafficView)
                       with a ট্রাফিক/স্টোরেজ sub-tab toggle (shares the web StorageView),
                       Settings has pill tabs incl. inline সোর্স/বিভাগ editing, AI প্রোভাইডার,
                       নোটিশ, a shared ওয়েব ভিজিবিলিটি ও থিম (app_config_json) panel with the
                       home/similar/comments count knobs, default post image + brand-animation
                       knobs, footer branding + per-category footer visibility, এবং admin
                       লগইন লগ panel. The content-row editor mirrors the web gallery strip
                       (add/remove/promote extra images). API ভল্ট কপি/ডাউনলোড clipboard-plugin
                       + Downloads ফাইলের মাধ্যমে।
DB/LLM/Types          packages/db (Turso/libSQL, incl. the traffic + storage-report modules
                      and the post_images gallery layer), packages/llm (multi-provider
                      resolver + image generation), shared-types.
Dash UI               packages/dash — shared admin-dashboard kit + 5-tab dashboard view +
                      the shared TrafficView and StorageView (React 19 + Tailwind v3,
                      source-only) rendered by BOTH the web admin and the desktop Monitor
                      so the two stay pixel-identical. The dashboard header has a live
                      ⟲ রিফ্রেশ + ▶ পাইপলাইন চালান (manual run with progress polling and a
                      completion toast on web and desktop).
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
              mockup-parity 9-tab desk console (Monitor · Traffic … Ads) + live sync bar
packages/
  db/         Turso/libSQL client, migrations, seeds, shared archive/media + traffic helpers
  llm/        Multi-provider resolver (Gemini/Groq/OpenRouter/Ollama/…) with fail-over
              and on-demand image generation (`generateImage` / `listImageProviders`)
  shared-types/  Post/RawPost/Source/Category types shared by all apps
  dash/       Shared dashboard: chart kit, `DashModel` contract, and the 5-tab
              DashboardView. Consumed by apps/web (admin home) and apps/desktop
              (Monitor); every panel maps to a real DB row — no fabricated telemetry.
docs/         Local operating/reference guides (excluded from source pushes)
live-event-feature-mockup/   Live-event and poll design reference (local only)
ad-management-system-mockup/ Advertising portal design reference (local only)
maintenance-page-mockup/     Maintenance page design reference (local only)
multi-style-web-mockup/      Site theme design reference (local only)
.github/workflows/   ci · pipeline-cron (every 8h) · rolling-archive · keep-alive · deploy-web
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
  needed to correct the term pool. For a source assigned to multiple categories,
  classification only considers those selected categories; a source with one
  category retains the existing full-category classifier behavior.
- **Multi-platform sources.** `sources add --platform news|magazine` points a
  source's `page_url` at an RSS 2.0 / Atom / RDF feed; the adapter normalizes
  entries into the same shape as Facebook posts (stable id, permalink, text,
  media enclosures/`media:`/`<img>`), so *every downstream step is shared*.
  The collector runs Facebook Page, public profile/group, and RSS/Atom
  (`news`/`magazine`) sources. It tries Facebook anonymously first; an optional
  `FB_SESSION_COOKIE` can retry a Page source that returns a login wall.
  Profile/group sources remain anonymous-only, CAPTCHA/checkpoint challenges
  are not bypassed, and private content is out of scope. Invalid sources and
  per-source errors are logged without stopping other eligible sources.
  Facebook collection uses selector-based loading and at most two post-detail
  workers to reduce idle time while keeping requests bounded.
- **Live events.** `/admin/live` creates and edits persisted events with six
  layouts, stream channels, event controls, polls, moderation, analytics, and
  notices. The setup/editor uses grouped sections, direct edit links, and an
  expandable preview rendered from the actual event template in both color
  modes; the Studio remains intentionally dark. Public HLS/MP4 playback uses
  encrypted, expiring proxy tokens and rewrites HLS segment links; provider
  embeds can still expose their provider/video ID, so browser playback is not
  anonymity or access control.
- **Standalone polls.** Admins can edit and schedule polls, feature a poll, and
  allow single- or multiple-option voting. `/poll` presents featured, open,
  scheduled, and closed polls with inline voting. Polls appear on the homepage
  only when `show_live_polls` is enabled.
- **Unified ad placements.** Settings → Visibility controls all public ads.
  Settings → Ads keeps the existing HTML/Google snippets; `/admin/ads/slots`
  chooses HTML/Google, platform bookings, or both for each shared placement.
  Platform campaigns render only during their approved booking window. Advertiser
  signup supports show/hide password and an eight-character minimum. See
  `/advertise`, `/portal`, and `/admin/ads`.
- **Platform ad management.** `/advertise` links to the email/password client
  portal (`/portal/signup`, `/portal/login`). New accounts remain pending until
  an admin approves them. Approved clients can create and edit saved creatives
  with selectable layout/palette live previews, then request bookings; admins
  approve/activate or reject those requests at `/admin/ads`. Clients sign in
  through the web portal; a dedicated advertiser desktop app is not part of this
  release.
- **AI fallback hero images.** When a post has no media, the collector tries
  active image-purpose providers in free-tier/priority order; Gemini is no
  longer required. Cloudflare Workers AI, Together AI, Pollinations, and
  compatible custom image APIs are supported. Cloudflare currently publishes a
  limited daily free allocation; Together and Pollinations require paid usage
  credits. Sensitive categories (missing-children / child-sexual-abuse /
  extramarital-crime) remain excluded, and the branded Hoichoi prompt bans
  text, logos, identifiable people, and children. `media ai-fill` repairs
  existing media-less posts.
- **On-demand manual image generation (v1.1.10).** Beyond the automatic fallback,
  an operator can generate a hero for any post: `media generate <id>` on the CLI,
  the **AI ছবি তৈরি** panel in the admin post editor
  (`POST /api/posts/[id]/generate-image`), and the desktop কনটেন্ট সারি row action.
  `@hoichoi/llm` exposes an optional `generateImage` on the provider interface plus
  `composeImagePrompt` / `listImageProviders`; only `purpose = image` providers are
  eligible. Generated buffers flow through `packages/db`'s shared uploader
  (`writeGeneratedMedia`), so they land in the configured media storage
  (filesystem or GitHub/IDrive e2/Backblaze) as scraped media. Sensitive
  categories stay blocked here too.
- **First-party traffic analytics (v1.1.10).** A cookie-less telemetry layer —
  `page_views` + `ad_events` (migration `011_traffic.sql`) — captures anonymous
  page views and ad view/click events. No raw IP is stored: visitors are counted
  by a **daily-rotating `visitorFingerprint`** (`sha256(ip|UA|date).slice(0,16)`),
  sessions by a per-tab `sessionStorage` id, geography from Vercel's
  `x-vercel-ip-country/-region/-city` headers (null off-Vercel), and OS/browser by
  User-Agent sniff. Bots and `/admin`,`/desk`,`/api` paths are skipped, and bounce
  = sessions with exactly one page view. Aggregation is pure SQL. The beacon posts
  to `/api/track` from `(site)/layout.tsx`; the five admin groups (live visitors by
  country/flag, most-read content + countries, comments, page-view/OS/browser/device
  mix, ad views/clicks/CTR) render from `trafficSnapshot` via the shared
  `TrafficView` on the web admin dashboard's ট্রাফিক ও স্টোরেজ tab and the desktop
  **ট্রাফিক** tab (`traffic <range>` runner command). No new environment variables
  are required.
- **Storage analytics (v1.1.10).** A shared `StorageView` (`@hoichoi/dash`, built
  from `storageSnapshot` in `@hoichoi/db`) reports **DB size** (`PRAGMA page_count`
  × `page_size`), the **on-disk media tree** (walked under `mediaRoot()` /
  `HOICHOI_MEDIA_ROOT`, with a per-day byte series), the **remote blob registry**
  grouped by adapter (`github` · `idrivee2` · `backblaze`), and the largest DB
  tables. Remote-provider **byte sizes are estimates** (the `media_objects` table
  stores one row per blob but no size, so bytes = local-average × blob count);
  blob counts are exact. Rendered on the web in the dashboard's ট্রাফিক ও স্টোরেজ tab
  (below the traffic panels), on the desktop **ট্রাফিক → স্টোরেজ** sub-tab, and via
  `storage` on the CLI. Snapshots are cached ~15s.
- **Default post image + brand animation (v1.1.10).** `SiteAppConfig` gains
  `default_post_image` (a URL path) and `brand_animation`
  (`none|fade|typewriter|shimmer|slide`). `withDefaultImage(s)` stamps the default
  image onto media-less posts at the data layer so every render path (cards, hero,
  detail, variants) picks it up without a schema change; `settingImageUrl` resolves
  the admin-configured URL the same way `mediaUrl` resolves stored paths. The brand
  animation applies to the production home **Hero** wordmark (`হৈচৈ!`) — or the
  configured logo when set — via `.brand-motion` CSS (with a
  `prefers-reduced-motion` guard). Both are edited in admin → সেটিংস → সাইট (web)
  and Settings → ভিজিবিলিটি (desktop) with a live preview.
- **Multi-image posts + lightbox (v1.1.10).** A post keeps its single primary
  `posts.media_path`, and now also has a **gallery** (`post_images`,
  `012_post_images.sql`). The collector mirrors *every* image it can fetch from the
  source post (capped at 8, first = primary) with `source = "collector"`; operators
  add/remove/promote extras in the web post editor (`POST/PATCH/DELETE
  /api/posts/[id]/images`) and the desktop content-row editor with `source = "admin"`.
  `replaceCollectorImages` refreshes only the collector rows on re-collection, so
  admin additions survive. The public post page keeps its exact hero layout and adds
  a thumbnail strip beneath it; clicking any image opens a full-page **lightbox**
  with arrow/keyboard navigation.
- **Admin-editable footer socials (v1.1.10).** `SiteAppConfig.footer_socials`
  (`FooterSocialLink[]`) is edited in admin → সেটিংস → সাইট, parsed by
  `parseAppConfig`, and rendered by `FooterSocials.tsx` (inline SVG icon map) with a
  live Bangladesh-local-time zone stamp.
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
- **Optional variant engine.** The shipped design is the single `default` variant
  for every section; mockup variants remain catalogued and disabled until ported,
  so **the live design never changes** unless an operator opts in. A registry
  (`SECTION_REGISTRY` in `@hoichoi/shared-types`) maps each public-site section
  (per `multi-style-web-mockup` slug) to its selectable variants, and the
  `sections` table + `settings.default_variant` persist the choice. The switcher
  now lives in **অ্যাডমিন → সেটিংস → ডিজাইন** (`/admin/settings?tab=design`,
  `/admin/appearance` redirects there) as a full-width tab with a **live preview**
  — the preview sets a short-lived `preview` cookie that `loadLive(previewVariant?)`
  overlays in memory, so trying a variant never writes to the DB. Saving persists
  the per-section rows; **⟲ ডিফল্টে ফিরুন** resets both `settings.default_variant`
  *and* every per-section row back to `default` (the earlier bug left section rows
  non-default, so reverting appeared to do nothing). The admin shell itself is a
  grouped, collapsible sidebar with a persisted collapsed state and a mobile drawer.
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
| `MEDIA_GITHUB_TOKEN` | Optional GitHub media-repository write token; media targets are configured in Media Storage |
| `IDRIVEE2_ACCESS_KEY` `IDRIVEE2_SECRET_KEY` `B2_ACCESS_KEY` `B2_SECRET_KEY` | Optional credentials for configured IDrive e2 / Backblaze media targets |
| `GOOGLE_API_KEY` `GROQ_API_KEY` `OPENROUTER_API_KEY` `OLLAMA_BASE_URL` … | LLM resolver keys |
| image-purpose provider credentials | Automatic and manual AI image generation; configure in AI Providers (Cloudflare Workers AI has a limited daily free allocation) |
| `FB_SESSION_COOKIE` | Optional semicolon-separated Facebook session cookie; public scraping is attempted without it first |
| `SCRAPE_REQUEST_DELAY_MS` | Optional per-post delay for Facebook details (default 1000 ms, clamped to 500–10000 ms) |
| `ARCHIVE_VISIBLE_DAYS` `ARCHIVE_RETENTION_DAYS` | Rolling policy |

> **GitHub Actions secrets নিয়ে বিস্তারিত, প্রতিটির কোথা থেকে পাবেন, খরচ ও
> "না দিলে কী হবে" — সব [`docs/SECRETS.md`](docs/SECRETS.md)-তে। ওয়েব অ্যাডমিনের
> `/admin/setup` পেজে একই তথ্য বাংলায় দেখা যায়, এবং ডেস্ক অ্যাপের
> Settings → Secrets প্যানেলেও।

Provider keys can also be registered per-provider from the admin `AI প্রোভাইডার`
page: an optional **API key override** is stored on the `llm_providers` row
(takes precedence over vault/env) and the **⚡ মডেল অটো-ফেচ** button pulls the
provider's `/v1/models` list (OpenRouter auto-filtered to free models) so you can
pick without hand-typing. Providers are tagged **text** or **image** (`--purpose` on the CLI, a select in
the admin form) so rewriting and image generation resolve independently.
Custom OpenAI-compatible image providers include Together; Cloudflare
Workers AI and Pollinations use their documented image endpoints. Custom
OpenAI-compatible chat providers get automatic `/v1`/`/openai/v1` endpoint
fallback, and rewrite output is parsed leniently
(fences, bold/bullet labels, Bangla aliases and value shorthands).
Each collector run loads its provider chain once, bounds health probes and
per-provider rewrite/embedding attempts, and stops at `HOICHOI_LLM_TIMEOUT_MS`
(default 45 seconds for provider network attempts). A failed embedding is
best-effort and does not block a valid rewrite from being published; a failed
rewrite is reported in the run summary instead of leaving collection stuck.

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
| `media generate <postId>` | Generate one hero image on demand for a specific post |
| `traffic [--range 24h\|7d\|30d]` | First-party analytics snapshot as JSON (web admin + desk) |
| `storage` | DB + media storage snapshot as JSON (web admin + desk) |
| `queue images <list\|add\|remove\|primary> <postId> [url\|imageId]` | Manage a post's gallery images |
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
> (latest e.g. `012_post_images.sql`).

## Obsidian hero scene + queue fixes (v1.1.26)

**The hero panel is now an instrument, not a decoration.** It follows the
newsroom's own process illustration: a header (`FROM NOISE TO NEWS.`), a tilted
source card fed by a dashed connector into a `HASH VERIFIED` stamp, and the
published story card overlapping it — then a six-station strip
(`FEED · SHOT · HASH · LLM · GIT · DEPLOY`) along the bottom, which every one of
the twelve templates now shares.

**Stage state is derived, never invented.** `sceneStages()` marks a station as
done only from counters we actually have (`collected > 0` ⇒ feed/shot/hash,
`published + dups > 0` ⇒ llm, `published > 0` ⇒ git, `published > 0 &&
lastRunIso` ⇒ deploy), and the cursor sits on the first station that has not
produced anything. The pulse only runs while some stations are done and others
are not — an idle console stays still.

**Readability was a bug, not a taste question.** The panel is deliberately
obsidian in *both* themes, but the light-theme block used to remap `--hf-fg`
to dark ink while leaving the dark background — dark-on-dark. It now changes
only the outer edge. Muted tokens were raised to 0.88/0.70 alpha (above 4.5:1
against `#0b0e13`), the grain overlay was moved *under* the content, and the
templates were re-shot at 1440px in both themes until the labels measured
legible.

**Observability of the material.** Cards are glass (hairline border + inner
highlight + deep offset shadow), the panel gets one slow specular sweep
(`.hf-sheen`) and hairline corner ticks; all of it is transform/opacity and
switches off under `prefers-reduced-motion`.

**Admin queues actually opened.** `viewFromSearch()` lived in
`ViewToggle.tsx`, a `"use client"` module, and the queue pages called it from a
server component — Next throws *"Attempted to call … from the server but … is on
the client"*, which took down posts, moderation, removals and reports. The
parser now lives in `lib/view.ts` (server-safe), the toggle imports it, and all
five queues were verified with a real session (200, both views, plus the post
editor).

**Template picker tiles.** Previews have a shared 4:3 shape and a compressed
variant of each template, so no tile clips its own artwork and the twelve read
as one set.

## Pictures, provenance and card/list queues (v1.1.25)

**The desktop can finally show post images.** A Tauri window has no web server
behind it, so every DB-stored picture (`2025-01-01/img_ab12.jpg` → `/uploads/…`)
resolved to a 404 and the content screens looked image-less even for posts the
collector had mirrored. A new Rust command `media_bytes` reads the file from the
media roots (app-data, `HOICHOI_MEDIA_ROOT`, `<repo>/media`, `<repo>/data/media`,
`%APPDATA%/com.hoichoi.desk/media`) and returns raw bytes over IPC; the frontend
(`apps/desktop/src/lib/media.ts`, `components/DeskThumb.tsx`) caches a blob URL per
path. Remote URLs still pass straight through, and a missing file renders a
labelled placeholder instead of a broken image.

**Every queue shows what a post actually is.** `posts.media_origin`
(migration `023`) records where a picture came from — collector mirror, AI,
admin upload or an external link — and the admin console now renders it as a
badge (`মূল উৎস` / `AI তৈরি` / `অ্যাডমিন আপলোড` / `বাইরের লিংক` / `ছবি নেই`).
Legacy rows without the column are inferred from the path shape (`http(s)://` →
external, otherwise collector), which is what the migration backfills too.

**Card and list views everywhere.** Content manager, content moderation, comment
moderation, removal requests and reader reports all gained a `?view=card` switch
(`components/admin/ui/ViewToggle.tsx`): cards lead with the picture, the headline,
the summary and the provenance badge; the list keeps the dense row the desk already
scanned. Queue actions are identical in both. The choice is a URL parameter, so a
refresh or a shared link keeps it.

**One-click AI image from the list.** `QuickImageButton` posts to
`/api/posts/[id]/generate-image` with `useTitle`, reports the real provider and
path (or "queued for GitHub Actions"), and refreshes the list — no need to open the
editor for a queue of twenty.

**The desktop queue and watchlist say what is happening.** Both panes now receive
`loading` / `loadError` from the bootstrap: a slow or failed runner shows a
skeleton or the real error with a retry button instead of an authoritative "no
sources" / "no items". Both also have card and list views (`localStorage`-remembered),
and the queue's card shows the thumbnail, category, source, status and the same
edit/open/delete actions as the table.

## Editorial fidelity, consent and provider truth (v1.1.24)

**The hero finally shows how content is collected.** The right column of the home
hero is now `HeroPipelineScene`: three tilted "angled" cards on a dashed rail —
① the *original source* (platform glyph derived from the real `source_url`, the
real featured photo, skeleton text lines of the captured post), ② the SIMHASH
dedupe gate with a scanning beam and a `✓ NEW` / `dup%` verdict, ③ the published
Hoichoi card with the real rewritten title, summary, photo and category. The
footer counters are real collected/dups/published numbers, not decoration.

**Hero headline motion no longer breaks the headline.** The old code nested a
`brand-motion` span *inside* the `.headline-grad` `<h1>`, which destroyed
`background-clip: text` — so changing the masthead animation blanked the hero
headline. The motion class now lives on the `<h1>` itself (`hlfx hlfx--<motion>`)
and there are **13** pickable styles (none, sheen, aurora, metal, liquid,
cascade, reveal, glow, neon, skew, inkwash, spotlight, typewriter) with live
swatches in Admin → Settings → সাইট. Gradient stops are CSS vars
(`--hl-a…--hl-e`), so the light theme overrides colours only and every motion
still runs.

**Images are framed, not cropped and not floating.** New `MediaFrame` paints the
same file twice: a blurred, colour-matched ambient copy fills the box (no dead
bars) with a crisp `object-contain` copy on top (nothing cropped). Cards use
`fit="cover"` with a 16:10 ratio, the article hero caps at `76vh`.

**The archive tells the truth about the source.** `lib/source-meta.ts` derives the
platform (Facebook / X / YouTube / Instagram / RSS news / other) from
`source_url` + `source_name`. The detail-page archive, "at a glance" panel and
"original source link" all use it, and the fabricated engagement counts are gone.

**Wrong categories are much rarer.** Classifier scoring is now weight-based: longer
(=`more specific`) terms count more, and any keyword listed by **more than one**
candidate category counts half, so a generic word like "পুলিশ" or "ঢাকা" can no
longer re-file a post on its own. Confidence is the winner's share of the top two
candidates (what the fact-gate slider actually means). Regression tests cover the
ambiguity discount.

**AI images follow the article, and every provider is testable.** The pipeline,
CLI and web editor all build their prompt from the same `buildImageBrief`; the
brief's negative prompt is now always sent, and titles are clamped to 180 chars
so the style/negative tail is never truncated. Admin → Provider rows for image
providers gained a **টেস্ট** button (`/api/providers/test`) that runs *that row
only* (`strict: true`, no fallback) and shows provider, model, mime, size, elapsed
ms and a thumbnail — or the real error.

**Why every image had a Pollinations watermark.** The keyless Pollinations host
was reaching the front of the chain whenever a paid row hiccuped. It is now
ordered **last**, always, and never ahead of a provider that has a key. Its
`nologo` flag is honoured only with a referrer, so `referrer` is now sent too
(plus `enhance=false`, which was rewriting — and drifting — the prompt).

**Cookie & terms consent, done the standard way.** New `/cookies` policy page,
`lib/consent.ts` (versioned, `hc_consent` cookie + localStorage), a
`ConsentBanner` with "সব গ্রহণ" / "শুধু প্রয়োজনীয়", and the first-party
`/api/track` beacon now **only** fires after measurement consent. The submit form
requires an explicit terms/privacy/cookie checkbox. Footer (both chrome variants)
links all three documents.

**Desktop:** collector radar gained an obsidian instrument bed (micro-rings,
crosshair, 60 rim ticks) with real queue-derived blips; a single `desk bootstrap`
spawn replaces 6+ runner calls on refresh; Ads/Settings save buttons show
spinner → result toast with elapsed ms.

## Recovery, parity and pipeline honesty (v1.1.23)

**Advertiser entry point + global socials.** `/portal/login` is now reachable
from the public footer of every theme (`AdvertiserLoginLink`, plus a
`/portal/signup` link under the about box) instead of being an orphan URL. The
footer's social links are a single global setting (`footer_socials`) that
overrides the legacy `maintenance.socials`, and both are threaded through
`MvChrome`, every `mv/site/Footer` variant and `MaintenanceScreen` — so a change
in admin Settings shows up on all themes *and* on the maintenance page.

**Password recovery and mail.** New `password_resets` table plus
`apps/web/src/lib/mail.ts` (Resend, else SMTP, else "unconfigured" with a
copyable dev link) and `lib/password-reset.ts`. Advertisers get
`/portal/forgot` → emailed 60-minute single-use link → `/portal/reset`; admins
sign in with one-time codes, so `/admin/forgot` mails a fresh code instead of a
password link. Admin → Settings → **মেইল** shows the live transport, sends a real
test message, issues advertiser reset links and lists recent requests. Reset
links are claimed with a `used_at IS NULL` guard and end every existing session
for that principal.

**Content queue parity + honest refresh.** The desk asked the runner for
`LIMIT 80 ORDER BY created_at DESC` while the web list pages 20 by
`updated_at DESC`, so the two consoles disagreed on both order and quantity.
`queue list` now takes `--page/--page-size` and returns `{rows,total,page,pageSize}`
from the same ordering as the web, and Content Queue has real paging plus a
refresh button that shows spinner → result (total + elapsed) → error toast.

**`sources errors` exists on both dispatch paths.** The daemon understood
`sources errors list|dismiss|reopen`, but the commander one-shot path did not,
which is why Watchlist showed `runner failed: [fatal] unknown action: errors`.
Both paths are now in step.

**Image generation survives a quota error.** Pinning a provider used to shrink
the candidate list to that row alone, so a 429 from Gemini (or an OpenAI
`insufficient_quota`) failed the request even though the next row was healthy —
and the desktop, which pins nothing, worked with the same accounts. A pinned
provider is now a *preference*: it is tried first, then the rest of the chain. A
rate-limit error gets one short retry before failover, and inside CI the
repository secret wins over a stale `api_key` stored on the provider row (the
reason the same key worked on the desktop but 429'd in Actions).

**Category pages stop looking empty.** Category chips counted the page's own
single-category rows, so every other chip read ০. Chips on a department page now
navigate and show real per-category totals from `countWindowPostsByCategory()`.

**Hero pipeline scene.** The default theme's hero visual column is no longer a
collage of static "window" cards: `HeroPipelineScene` draws the actual pipeline
(feed → dedupe → fact-gate → rewrite → publish) as an obsidian SVG conveyor with
travelling packets and only the real collected/published/duplicate counts.
Transform/opacity only, and `prefers-reduced-motion` stills it.

## Real-time dashboards & ad-ops visibility (v1.1.22)

Both consoles render the same `@hoichoi/dash` components, and the live panels now
animate from real signals instead of a page-load snapshot:

- `packages/dash/src/realtime.tsx` adds `LivePulse`, `StreamArea`, `PipelineFlow`,
  `ActivityStream`, `HeatGrid` and `LiveNumber`. Motion only runs while a run is
  actually in flight (`DashModel.live.running`), so an idle desk is still.
- Desktop feeds `live` from the `pipeline://log` tail (stable ids per line, so
  polls never replay entrance animations) plus a `lastRefreshAt` heartbeat.
  `useDeferredValue` keeps a chatty run from rebuilding every chart per line.
- Web admin attaches `live` in `buildAdminDashboard` from the real audit trail and
  polls the snapshot every 15 s while the tab is visible.
- `ActivityStream` shows relative Bengali timestamps only when a line carries a
  real time; log lines without one are marked "just arrived" rather than stamped.
- Ads admin gained `AdsOverviewBoard`: live slot occupancy for 14 days, revenue by
  slot, delivery impressions/clicks and four clickable KPIs — all from
  `ad_bookings` / `platform_ad_events`.
- Client portal analytics was rebuilt as `ClientAnalyticsBoard` with an obsidian
  dual-scale delivery chart (impressions vs clicks on independent axes, because a
  shared axis flattened clicks), daily breakdown and the real delivery event log.

## Ad inventory and console feedback (v1.1.21)

- **16 platform ad slots** are seeded at runtime (`ensureAdSlotInventory`) and by
  migration `021_ad_slot_inventory_expansion.sql`: home (leaderboard, lead
  sponsor, two in-feed), article (leaderboard, in-article, endcap, sidebar sticky,
  sidebar card, related in-feed), category (top leaderboard, in-feed) and global
  chrome (footer strip, mobile anchor). New keys are `delivery_mode='platform'`,
  so they only render a real booking; flip a slot to `both` in
  `/admin/ads/slots` to bring back the house placeholder. `ad-slot-inventory.test.ts`
  fails if a rendered slot key has no row in either the seed or the runtime path.
- **Every console action reports what happened.** `ToastProvider` +
  `useAdminAction()` wrap the fetches in moderation, removals, reports,
  submissions, sources and backup/reset, so a 401/403/500 shows the server's
  message instead of a silent page reload.
- **Service strip** (`/api/admin/system-status` + `SystemStatusBar`) polls the DB,
  text/image providers, pipeline runner and media storage every 30 seconds and
  toasts when one goes down or recovers.
- **Images are not cropped** on articles: `PostGallery`/`PostFigure` keep the
  original framing (`object-contain`, capped at `75vh`).

## Desktop and media operations (v1.1.18)

- **Collector and categories:** the desktop collector uses the same bundled runner
  and supported-source checks as the web/CLI pipeline. A source must have an
  explicit category assignment; sources assigned to multiple categories are
  classified only among those categories.
- **Facebook collection:** public Page, profile, and group URLs are attempted
  anonymously first. A session cookie is optional and is only retried for eligible
  Page sources that show a login wall; private posts and CAPTCHA/checkpoint bypass
  are not supported. The desktop Settings → Secrets and web setup guides explain
  the optional cookie format and troubleshooting.
- **Collector feedback and speed:** desktop logs show the newest event first and
  keep the completion counters and detailed run result at the top. Facebook feed
  loading uses bounded waits and a small parallel detail-page limit rather than
  serial long waits.
- **Sync feedback:** desktop sync, smart resync, and refresh actions report
  completion or failure. With cloud sync enabled, refresh actions reload the
  shared database instead of copying potentially stale local records over cloud
  data. Local/cloud transfer remains available when cloud sync is disabled.
- **Media location:** the default filesystem root is `<repository>/media` for a
  working checkout; a packaged desktop install without a workspace uses its
  application-data media directory. Existing `data/media` and app-data files are
  retained as legacy read locations. Media settings display the effective CDN
  base URL for the selected repository and branch.
- **Remote media:** configure a GitHub repository in Media Storage and provide
  its media token in the desktop vault. A failed remote upload is reported and
  the local generated/downloaded copy is retained where possible; it is not
  treated as a successful remote upload.
- **Image generation:** desktop and web image tools require an active provider
  whose purpose is `image` and a compatible image-generation model. Desktop
  queue prompts are prefilled from the post; the web and desktop surfaces report
  provider/storage errors rather than silently presenting a blank or successful
  result. Automatic and manual generation use the configured provider fallback
  chain, including Cloudflare Workers AI, Together, Pollinations, and compatible
  custom APIs. Hosted web generation uses the GitHub Actions runner when configured.
- **Custom AI providers:** custom provider entries require a valid base URL.
  Multiple provider entries can coexist; configure image-purpose entries
  separately from text providers.
- **Live-event studio:** the homepage ticker uses the shared marquee animation and
  falls back to event title/summary text when there are no live updates.

## Editorial & safety

- No verified users under 18; absolute block on child-sexual-abuse content.
- Approved pedo-adjacent titles are **double-approved** before publication.
- AI hero images are never generated for the missing-children /
  child-sexual-abuse / extramarital-crime categories; the generation prompt
  bans text, logos, recognizable people and children.
- PII (phone numbers, national IDs, street addresses) is redacted during rewrite.
- Every post follows the rolling retention policy (`ARCHIVE_VISIBLE_DAYS` /
  `ARCHIVE_RETENTION_DAYS`).
- Facebook sources may be public Pages, public profiles, or public groups.
  Recognized profile/group links are fetched without cookies; optional sessions
  are only used to retry a Page login wall. Private content is out of scope and
  CAPTCHA/checkpoint or other access challenges are not bypassed.

Full editorial standard: [`docs/editorial-policy.md`](docs/editorial-policy.md).