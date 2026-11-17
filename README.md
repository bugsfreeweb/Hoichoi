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

## Edge guards: CSRF, structured data, ad review, comment abuse (v1.1.28)

**Every cookie-bearing write must prove where it came from.** `apps/web/src/middleware.ts`
runs `lib/csrf.ts` over `/api`, `/admin` and `/portal`: a POST/PATCH/PUT/DELETE that carries
a session cookie has to show a matching `Origin` (or `x-forwarded-host` under a proxy, or a
same-origin `Sec-Fetch-Site`). `Origin: null` is refused outright. Bearer and desk-token
callers are unaffected — they never send the cookie — and reads always pass. The refusal is
a bare `403 {code:"csrf"}`; the reason goes to the `x-csrf-reason` header, not the body, so
an attacker learns nothing. 13 checks in `scripts/csrf.test.ts`.

**Search engines are told what the page is.** `components/JsonLd.tsx` emits a `NewsArticle`
for each post (`dateModified` from the row, falling back to `datePublished`; relative images
made absolute) and one `WebSite` for the site. The payload is escaped before it enters the
script tag, and the article block is only rendered *after* the 404 check — a taken-down story
carries no structured data. 7 checks in `scripts/json-ld.test.ts`.

**An advert cannot go live without a recorded review.** Migration 037 adds `ad_policy_reviews`.
"অনুমোদন ও চালু" now opens a five-point checklist (creative rights, landing page, claims,
prohibited categories, disclosure); every box must be ticked, the reviewer and their notes are
stored *before* the status flips, and a later rejection leaves the earlier approval in the
history. `ad.booking.activate` / `ad.booking.reject` are audited. 11 checks in
`packages/db/src/__tests__/ad-policy.test.ts`.

**Comment abuse is refused before it reaches the queue.** `lib/comment-guard.ts` caps a comment
at two links (bare domains included), refuses a 12+ character run of one letter, and refuses a
wall of phone numbers — each with a Bangla reason the reader can act on. Prices, emphasis and
opinions pass untouched. 11 checks in `scripts/comment-guard.test.ts`.

The roadmap is now **98 ✅ · 6 🟡 · 0 ⬜** — the six partials are named at the top of
`docs/roadmap.md` rather than hidden.

## Second factor, device access, media that leaves with the article (v1.1.27)

**A privileged account can now carry a second factor.** `packages/db/src/totp.ts`
implements RFC 6238 directly (base32, the 8-byte counter, and a ±1 step window so
a phone whose clock drifts still works) and is pinned to the RFC's own vectors.
`/admin/security` has a panel to enroll, confirm, disable and stash recovery
codes; the code is shown once, the secret is never readable again, a used step
cannot be replayed, and disabling needs a live code — a stolen session cannot
silently drop the factor.

**Guessing is not possible at HTTP speed.** Five bad attempts in fifteen minutes
lock that email for fifteen, answered with a 429 and `Retry-After`. The counter is
keyed on the *email hash*, so the attempts table is not a list of who tried to
sign in. The login route checks the lock **before** it spends the one-time code,
verifies the factor **before** it creates a session, and a wiring test fails if
that order ever changes.

**The desktop no longer carries the keys.** It authenticates as a device
(`hdc_…`, created in নিরাপত্তা → ডেস্কটপ ডিভাইস, only a SHA-256 stored) and asks
`/api/desk/session` for a 60-minute grant. Storing a device token clears any
Turso credential from the vault, so there is exactly one source of truth, and
revoking the device makes the very next call fail — the app shows
`ACCESS DENIED` rather than an empty newsroom, because "no content" and "no
access" must not look the same. The grant still travels to the machine (the
collector runs locally and needs the database), so the guarantee is a bound,
revocable, audited session — not magic.

**An article takes its pictures with it.** `purgePostMedia` captures the paths
*before* the row is deleted (the gallery cascades with it), skips remote URLs and
files another post still uses, unlinks every mirror, writes one `deletion_log`
row per outcome, and `retryMediaDeletions` retries a file Windows had locked on
the next reconcile pass. A taken-down article is a 404 on the public site
(`posts_current_window`) while the console can still inspect the record until
retention purges it.

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

**Nothing was publishing.** The publish `INSERT INTO posts` declared 20 columns
with 20 placeholders but bound 21 values — `media_origin` had been added to the
argument list and not to the column list. libsql rejects the statement with
`Number of arguments mismatch: expected 20, got 21`, the error is caught per
post as one dim `[rewrite] …` line, and the run still reported success. Every
crawl since 023 quietly published nothing. Fixed, and
`apps/scraper/src/__tests__/pipeline-post-insert.test.ts` now parses the three
post inserts and fails if columns ≠ placeholders ≠ bound arguments — the same
check was verified against the broken source.

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

## Admin sign-in security

The console signs in with **one-time codes**, never passwords. A code is
8 characters from an unambiguous alphabet, hashed before storage, valid for 10
minutes, and consumed atomically — a second request with the same code fails.

Two rules keep that model safe, and both are regression-tested in
`apps/web/scripts/auth-hardening.test.ts`:

1. **A code never creates an admin by itself.** Provisioning is gated on
   `ADMIN_ALLOWED_EMAILS`; an address that is neither invited nor already
   provisioned gets the same generic 401 as a bad code, so the endpoint cannot
   be used to discover which emails are admins. The very first account
   (empty `admin_users`) becomes the bootstrap `admin`; every later invited
   account starts as `editor` and is promoted deliberately.
2. **`/api/revalidate` fails closed.** With `REVALIDATE_SECRET` unset it returns
   503 instead of allowing an anonymous full-site cache purge, and the secret is
   compared in constant time.

Set `ADMIN_ALLOWED_EMAILS` in every environment, including production. With the
allow-list empty, only accounts that already exist in `admin_users` can sign in.

### Credential expiry

Nothing tracked when a key dies, so the first signal was a red pipeline run.
`/admin/security` → **ক্রেডেনশিয়ালের মেয়াদ** now stores a name, a scope and an
expiry date for anything the server cannot read (GitHub PAT, storage keys, Vercel
env secrets). **No secret value is stored** — only the label, so the table is not
a credential store.

`POST /api/cron/credentials` (dry run: `GET`) runs daily and mails one warning
when a credential is inside its `warn_days` window (default 7) or already
expired. `last_notified_at` is stamped after a successful send, so a retry or a
manual curl the same day sends nothing; renewing a credential clears the stamp.

The endpoint fails **closed** (503) without `CRON_SECRET` and requires
`Authorization: Bearer $CRON_SECRET`. The schedule lives in
`.github/workflows/credential-check.yml` (needs repo secrets `SITE_URL` and
`CRON_SECRET`; it skips politely when they are absent). Recipients come from each
row's `owner_email`, falling back to `SECURITY_CONTACT_EMAIL` then the first
`ADMIN_ALLOWED_EMAILS` entry.

### Advertiser isolation and manual billing

Two advertisers exist in this system and neither may ever see the other's rows.
The readers that the portal can reach take a **required** `clientId`
(`listAdCreatives`, `listAdBookings`, `getAdAnalytics`, `listAdEvents`,
`listInvoices`, `invoiceBalance`, `listPaymentsForClient`); cross-tenant reads
live in separate, explicitly named `listAll…`/`getAll…` functions that only the
admin console calls. `createAdBooking` also checks at the data layer that the
creative belongs to the client. 7 DB checks in
`packages/db/src/__tests__/advertiser-isolation.test.ts`, 7 call-site checks in
`apps/web/scripts/advertiser-isolation.test.ts` (the portal cannot import an
admin-wide reader and the signatures cannot go optional again).

Billing is **manual, because there is no gateway** and none is pretended:
`packages/db/src/ad-invoices.ts` issues numbered invoices (`HC-<year>-0001`,
monotonic via a counter table), records payments with method + reference, and
derives `paid` from the payment sums — a status column can never drift from the
ledger. Refused by the database, not by a form: overpayment, the same bank
reference twice, invoicing another client's booking, a second live invoice for
one booking, and voiding a settled invoice. Void is a flag that keeps the row and
the number. Admin-only route `/api/admin/ads/invoices` (`issue` / `payment` /
`void`) is rate-limited and audited with the amount and invoice number; the
advertiser's `/portal/payments` shows their own invoices, balance and payments.
13 checks in `packages/db/src/__tests__/ad-invoices.test.ts`.

### Performance and accessibility gates

Two gates run in `.github/workflows/web-quality.yml` against a **production**
build, on a throwaway file database so the job cannot touch production data:

- **axe accessibility audit** (`apps/web/scripts/a11y.ts`) over 12 public routes in
  **both** themes — the palette is a token set per theme, so a page that passes in
  one can fail in the other. It fails on serious/critical WCAG 2.1 AA violations
  and prints the rule and the element. `color-contrast` is never on the ignore
  list; only `color-contrast-enhanced` (AAA) and `video-caption` are.
- **Lighthouse budgets** (`lighthouserc.cjs`): accessibility ≥ 0.95 and
  CLS ≤ 0.1 are hard gates; LCP 4 s, TBT 600 ms and performance 0.7 are warnings,
  because a shared runner's CPU is not a product regression.

Running the audit found real defects and they are fixed, not suppressed:

| Was | Measured | Fixed by |
| --- | --- | --- |
| `text-ink-soft` on `paper-deep` | 4.07:1 | token darkened to `#625a49` (4.61:1) |
| `text-alizarin` on `paper-deep` | 3.57:1 | light-theme token to `#b3141f` (4.68:1) |
| `text-paper` on the `amberx` badge | 4.33:1 | `amberx` to `#9a4708` (5.53:1) |
| `text-ink-soft/70`, `text-white/40`, `text-bandline/55` | 2.87–3.78:1 | stepped to the plain tokens |
| `text-white` on `bg-alizarin` | 2.27:1 in dark | new `--color-on-accent` token that flips per theme |

Result: **24 page-checks, 0 serious violations** (12 routes × light/dark). Six
checks in `apps/web/scripts/quality-gate.test.ts` pin the gates themselves — that
the audit runs in CI, that it exits nonzero, that `color-contrast` is not ignored,
and that the quality job never sees a secret.

### AI task gateway (`POST /api/ai/task`)

The web console can draft a tip, summarise a body or propose a headline without
the desktop app running. It deliberately is **not** a chat endpoint:

- **Closed vocabulary** — `draft | summarise | headline`. `packages/llm/src/task.ts`
  rejects any extra field, so a `prompt` or `model` key is a 400 rather than a
  bypass.
- **The caller cannot choose a model.** `apps/web/src/lib/ai-task.ts` walks the
  active text providers by priority, exactly like the pipeline, and falls through
  to the next one when a provider times out (45 s budget, `AbortController`).
- **Same editorial rules as publishing.** Generation goes through
  `provider.rewrite()`, so the own-words rule, safety flags and redaction are the
  pipeline's, not a second policy. Keys are resolved server-side and never appear
  in a response.
- **One field back.** A `headline` call returns only `title_bn`; a headline
  request can never hand an operator a publishable body by accident.
- **Nothing is saved.** `saved: false` always — the result lands in the editor's
  form fields for a human to accept.
- **Budgeted and audited.** `LIMITS.aiTask` = 20/hour per caller, editor role and
  above, and each call writes `ai.task.<task>` with the provider and character
  count (`audit.ts`), never the tip's text.

11 checks in `packages/llm/src/__tests__/ai-task.test.ts`. Verified live against
the real provider: a `summarise` call returned Bangla prose in 14 s from Gemini,
`unverified_claim` flagged, `saved: false`, and the audit row recorded.

### Policies on the site

The policies ship as pages, not as files in a gitignored folder — a reader who
wants to know how corrections or disclosure work lands on the website.

| Page | Enforced by |
| --- | --- |
| `/about/editorial` | `apps/scraper/src/source-overlap.ts` (35-word verbatim ceiling) |
| `/about/ai` | `packages/llm/src/build.ts` (provider, task, human approval) |
| `/about/corrections` | `packages/db/src/verification.ts` (correction history) |
| `/about/security` | `SECURITY.md`, `security-headers.mjs` |
| `/privacy`, `/cookies` | `packages/db/src/guest.ts` (hashes, never raw) |
| `/terms`, `/dmca` | `apps/web/src/app/api/report-content` |

`/about` is the index: it lists each policy **and the file that implements it**,
because a policy that describes behaviour the code does not perform is worse than
no policy. `/about/security` carries the disclosure promise in Bangla first with
an English section below, and the footer links it alongside the rest.
7 checks in `apps/web/scripts/policy-pages.test.ts` keep the set complete, linked,
and honest about what enforces it. `docs/` stays gitignored.

### Health, logs and error reporting

**`GET /api/health`** answers "can this deployment serve a story right now?"
without a human reading logs. Public on purpose — the payload is booleans,
counts, versions and durations only.

| Probe | Critical | Meaning |
| --- | --- | --- |
| `db` | yes | `SELECT 1` succeeded |
| `migrations` | yes | `_migrations` count ≥ embedded migrations |
| `media` | no | how many image providers are *not* cooling down |
| `mail` | no | a transport is configured |

`unhealthy` (503) only when a critical probe fails; a broken optional dependency
is `degraded` (still 200, because readers are still served), and a probe slower
than 1.5 s downgrades itself. Absent config is `skipped`, never `fail`.

**`apps/web/src/lib/log.ts`** emits one JSON object per line and redacts at the
boundary — `password`/`secret`/`token`/`api_key`/`cookie`/`dsn` become
`[redacted]`, an email becomes `***@domain`, and IPs never appear. Levels follow
`LOG_LEVEL`. **`lib/observability.ts`** posts the same error to Sentry via its
plain HTTP envelope when `SENTRY_DSN` is set — no SDK dependency, 2 s timeout,
never throws. The health endpoint reports *unhealthy* and the alert cron reports a
failed digest, so both reach the error sink.

`.github/workflows/uptime.yml` probes the production endpoint every 15 minutes
(skips when `SITE_URL` is unset). 8 checks in `apps/web/scripts/health.test.ts`.

### Supply chain and disclosure

| File | What it does |
| --- | --- |
| `.github/dependabot.yml` | weekly npm (grouped minor/patch), cargo, actions; `next`/`react` majors are ignored so a framework migration stays a decision |
| `.github/workflows/codeql.yml` | `security-extended` queries over `javascript-typescript`, on push, PR and weekly |
| `.github/workflows/secret-scan.yml` | gitleaks with `fetch-depth: 0` — a shallow clone hides leaked history |
| `SECURITY.md` | contact, scope, 72 h acknowledgement, what we already do, no paid bounty |
| `.github/pull_request_template.md` | asks for the checks actually run, and flags migrations/CSP/desktop rebuilds |
| `apps/web/scripts/supply-chain.test.ts` | 8 checks — the configs stay effective (permissions, full history, ecosystem coverage) and **no `.env` is tracked** |

Report vulnerabilities to **security@hoichoi.io**; please do not open a public issue.

### Bilingual strings (`t()`)

`apps/web/src/i18n/` is the single dictionary for new user-facing text:
`DICTIONARY` holds `{ bn, en }` per key, `t(key, params, locale="bn")` is
Bangla-first with `{name}` substitution, and `tBoth()` returns both lines for
public statements. A missing key renders as the key itself, so a typo is visible
rather than an empty span.

New surfaces (media dashboard, notifications, privacy tooling, poll integrity)
go through `t()`. Existing screens are deliberately untouched — rewriting their
copy would risk changing a UI you asked me to preserve. 7 checks in
`apps/web/scripts/i18n.test.ts` enforce: both languages present, namespaced keys,
**placeholders identical across languages**, Bangla default, and no duplicate
Bangla string inside one surface.

### Poll integrity

A poll vote used to be (poll, option, session id) and nothing else, so clearing
the cookie was enough to vote again. Migration 032 adds `ip_hash`,
`invalidated_at`, `invalid_reason`, `invalidated_by` to `poll_votes`.

`packages/db/src/poll-integrity.ts` reports three falsifiable signals —
**peak votes/minute**, **sessions per hashed network**, and the **top option's
share** — and derives a 0–100 risk score (`clean` < 30 ≤ `flagged` < 60 ≤
`suspicious`). It computes from **validated votes only**, so a cleaned poll reads
clean again instead of staying permanently guilty.

**Invalidation is a flag, not a delete.** `GET/POST /api/admin/polls/[id]/integrity`
(moderator read, admin write, audited) invalidates every vote from one hashed
network with a required reason; the tally and `getPollResults()` exclude those
rows, but the rows keep the reason and the actor. `/admin/polls` shows the panel
inline; `/poll` carries a bilingual "ভোট কীভাবে গোনা হয়" block that says exactly
this, including that a poll is not a scientific survey. 7 checks in
`packages/db/src/__tests__/poll-integrity.test.ts`.

### Guest identity, trust and data-subject requests

Public forms no longer keep whatever the reader typed as their only handle.
Migration 031 adds four columns to `comments`, `reader_reports`,
`submitted_pages` and `removal_requests`:

| Column | What it is | What it is not |
| --- | --- | --- |
| `guest_id` | opaque 128-bit id in an httpOnly `hoichoi_guest` cookie | not a fingerprint, not an email |
| `email_hash` | HMAC-SHA256 of the normalised address | not reversible without `GUEST_HASH_SECRET` |
| `ip_hash` | HMAC of the IP truncated to /24 (v4) or /64 (v6) | not the raw address |
| `trust_score` | 0–100 from that guest's real moderation outcomes | not an auto-ban verdict |

`trustScoreFor()` returns **NULL** for a guest with no history rather than an
invented middle number; `computeTrustScore()` is pure (approved +5, rejected −8,
reports reviewed +3, dismissed −5, clamped 0…100).

**Data-subject tooling**: `/api/admin/privacy/subject` (admin only, audited,
rate-limited) exports every row belonging to a guest id *or* an email as JSON, or
erases them. Erasure by guest id also follows every email hash that guest ever
used, so it cannot leave hash-only rows behind; published posts, other people's
comments and audit rows are untouched. `/admin/security` → "ডেটা-সাবজেক্ট"
drives it, with a typed `ERASE` confirmation. 10 checks in
`packages/db/src/__tests__/guest-identity.test.ts`.

### Desk notifications

The bell used to show only queue *counts*, so events outside a queue — a provider
cooling down, a credential about to expire, a cron failing closed, a
reconciliation that deleted files — lived in a log nobody read.

`admin_notifications` (migration 030) holds real events. `notify()` is
**idempotent**: the same condition (`dedupe_key`) produces one row no matter how
often the job reports it, so the bell stays quiet instead of becoming noise.
Writers are wired where the events actually happen:

| Event | Writer | When |
| --- | --- | --- |
| provider cooldown | `recordProviderFailure` | 2nd consecutive failure, once per cooldown |
| credential due | credential cron | every expiry, stamped per day |
| media cleanup | `reconcileMedia` | after a run that deleted something |
| failed cron | `/api/cron/alerts` | alerts that could not be mailed |

**Surfaces**: the header bell shows `warn`/`critical` events under the queue
depths with one-tap "সব পড়া হয়েছে" (role-filtered — an admin-only alert is
invisible to a moderator); `/api/cron/alerts` emails a digest of never-emailed
`warn`/`critical` rows and fails closed without `CRON_SECRET` (GitHub workflow
`.github/workflows/alerts.yml`, every 6 h); the desktop app polls the same
endpoint and raises a native OS notification per new alert (`Notifier.tsx`, once
per id). 6 checks in `packages/db/src/__tests__/notifications.test.ts`.

### Media dashboard

`mediaDashboard()` (`media-dashboard.ts`) puts C12's health rows and C13's
registry on one screen — `/admin/media` (🗄️ মিডিয়া ও কোটা).

- **KPI strip**: total bytes, files, providers, problems (failing + cooldown + over quota).
- **One card per provider**: measured bytes, quota bar (only when an operator set
  one — an unlimited provider shows no bar), success/failure counts, the live
  streak, last error and last fallback reason.
- **14-day inline sparkline**, zero-filled so a quiet day reads as *nothing
  uploaded* instead of collapsing the chart — a stalled pipeline cannot look
  healthy by going blank.
- **Headline** picks the hardest condition first (quota full beats a cooldown,
  which beats mere failures) so the most blocking problem is the one you read.

All numbers come from the uploader's own rows, so the dashboard can never
disagree with the pipeline. 7 checks in
`packages/db/src/__tests__/media-dashboard.test.ts`.

### Media reconciliation

Media drifts out of sync in ways nobody sees: a file written just before a crash
that no post points at, a post archived while its blob stays, two registry rows
for one object double-counting a quota, or a remote object whose post is gone so
the retention job can never reach it.

`reconcileMedia()` classifies all four in one scan (`media-reconcile.ts`):

| Class | Meaning | What cleanup does |
| --- | --- | --- |
| `unreferenced_local` | file on disk that no post, `post_images` row or `raw_posts.screenshot_path` mentions | deleted **only** if older than the 6 h guard |
| `missing_local` | a post points at a relative path that neither disk nor registry has | reported, never "fixed" by inventing a file |
| `duplicate_remote_row` | two `media_objects` rows for one adapter+key | extras deleted, quota corrected |
| `remote_row_without_post` | row whose post is gone and which no live post references | deleted, quota corrected |

Two rules keep it safe: a path a post references is **never** touched, and files
younger than 6 hours are assumed to belong to an in-flight upload. External URLs
(Pexels, a source CDN) are not "missing local media" — only relative paths are
compared against the tree.

Admin: `/admin/backup` → **মিডিয়া মিলিয়ে দেখা**. Scan is a dry run (`GET`, changes
nothing); cleanup is a separate `POST` (admin only, audited). 9 checks in
`packages/db/src/__tests__/media-reconcile.test.ts` run against a real database and
a real temp directory, because the point of the pass is that it deletes files.

### Media provider health and quotas

Media uploads fail over between GitHub and S3 targets, so a dead target was
invisible from the outside: every upload still succeeded — on the backup. One row
per provider now carries the evidence (`media_provider_health`, migration 029).

| Column | Meaning |
| --- | --- |
| `used_bytes` / `objects` | grown only by uploads that actually succeeded, and given back on delete |
| `quota_bytes` | `NULL` until an operator sets one — never guessed from a plan |
| `consecutive_failures` · `last_error` | the real error text, clamped to 500 chars |
| `cooldown_until` | 2 min after the 2nd consecutive failure, doubling to a 1 h cap |
| `last_fallback_reason` | e.g. "upload failed; fell back to GitHub media" |

`applyProviderHealth()` demotes a provider that is cooling down or over quota
before the upload loop runs, and **never empties the chain**: if every target is
demoted the uploader tries them anyway, because a stale cooldown must not be the
reason nothing uploads. One failure is treated as noise (a flaky 502); two in a
row start the cooldown.

The same registry tracks image providers (`image:<provider_key>`), so a row stuck
on 429 stops being retried first on every generation.

Admin: `GET/POST /api/admin/providers/health` (moderator reads, admin writes;
every change is audited) plus a **MEDIA PROVIDER HEALTH** table on
`/admin/providers` showing measured bytes, quota, last error and the last fallback
reason. With no uploads yet it says so instead of showing a row of reassuring
zeroes — 11 checks in `packages/db/src/__tests__/provider-health.test.ts`.

### Security headers

`apps/web/security-headers.mjs` is the single source of the header policy, and
`next.config.mjs` just calls it, so the policy can be unit-tested (10 checks)
without booting Next.

| Header | Value |
| --- | --- |
| `Strict-Transport-Security` | 2 years, `includeSubDomains; preload` — **production only** (sending it from `http://localhost` pins localhost to https for a year) |
| `Content-Security-Policy` | report-only by default; `CSP_ENFORCE=true` promotes the identical policy to enforcing |
| `Permissions-Policy` | camera/microphone/geolocation/payment/usb/sensors `=()` — deny, never wildcard |
| `X-Content-Type-Options` · `X-Frame-Options` · `Referrer-Policy` | `nosniff` · `SAMEORIGIN` (the admin design studio frames the public site) · `strict-origin-when-cross-origin` |

The CSP allows only what the app actually uses: `self` scripts (no `unsafe-eval`
in production — the test fails if it appears), `https:` images and media, and
Facebook iframes for `FbPost`. `object-src`, `base-uri` and `form-action` are
locked to `'self'`/`'none'`.

Violations post to `/api/csp-report`, which is public by necessity: it is
rate-limited (300/min), size-capped (8 KB), refuses to throw on hostile JSON, and
**stores nothing** — a violation contains the reader's page URL, and persisting
that would be analytics wearing a security badge. Reports go to the platform log
only.

### Aggregation limits (publisher gate)

Summarising someone else's story is legitimate; republishing it is not. Two
mechanisms enforce the line:

- **Prompt**: the shared body contract asks for the story in our own words, at
  most one direct quote under 20 words, and no sentence copying.
- **Code** (`apps/scraper/src/source-overlap.ts`): `checkRepublication()` measures
  the longest verbatim run against the raw source text. Over 35 consecutive words
  and the post is **held for review** instead of published, with the copied run
  logged; `copiedShare()` catches a rearranged but fully copied story. 8 tests
  cover punctuation/case evasion, the strict ceiling, and genuine summaries.

The public policy pages state the same rules, so the promise and the pipeline
cannot drift apart: `/about/editorial`, `/about/ai`, `/about/corrections`
(linked from the footer alongside `/privacy`, `/terms`, `/cookies`, `/dmca`).

### Verification, claims and corrections

The site stamped every card **FACT-CHECKED** while nothing in the pipeline checked
a fact. That is gone: an aggregated story now says what it is — `AI REWRITE`
next to the existing `SOURCE · <outlet>` pill — and the trust badge is rendered
only from a stored record.

`migration 028` adds the record:

| Surface | Meaning |
| --- | --- |
| `posts.verification_status` | `unverified` · `single_source` · `multi_source` · `human_verified` · `corrected` |
| `claims` | individual checkable statements with an evidence link and a verdict (`supported` / `disputed` / `false`) |
| `correction_history` | every corrected field, old text, new text, reason and editor |

The grade is **derived, never typed**: `gradeFromEvidence()` refuses
`multi_source` with one source, refuses `human_verified` without a named editor,
and drops to `unverified` when any claim is disputed or false. The API clamps a
requested grade to the strongest thing the evidence supports (a weaker grade is
always allowed). `VerificationBadge` renders nothing for `unverified` and
`single_source`, so absence of evidence means absence of a badge — the Bangla
label always names the method (`একাধিক সূত্র`, `সম্পাদক যাচাইকৃত`, `সংশোধিত`).

Editors work in the post editor's **যাচাই ও সংশোধন** panel: add a claim + evidence,
recompute the grade, or record a correction (which flips the post to `corrected`
and shows the label publicly). `scripts/trust-claims.test.ts` fails the build if
`FACT-CHECKED` ever reappears in the source.

### Audit trail

Every privileged mutation writes a row to `admin_actions`, which `/admin/logs`
renders (filterable by action and by admin email). A row snapshots **who** acted
(`actor_email`, `actor_role`) instead of pointing at a user id that a later
delete would erase, plus the action, the object, a human sentence and a hashed
IP (HMAC of `ADMIN_AUTH_SECRET`, never the raw address).

Migration `026_admin_actions_actor.sql` adds those columns, backfills existing
rows from `admin_users`, and installs a trigger so any older `INSERT` that never
learned the new columns still records its actor. Writers live in
`apps/web/src/lib/audit.ts` (`audit(user, {...}, req)`), which never throws — a
failed audit write must not fail the action the operator already took.

### Abuse limits

Public write endpoints are throttled by a shared counter table
(`025_rate_limits.sql`, `packages/db/src/rate-limit.ts`, `apps/web/src/lib/rate-limit.ts`):

| Endpoint | Budget |
| --- | --- |
| `POST /api/auth/login` | 10 / 10 min per address, **and** 5 / 10 min per email |
| `POST /api/comments` | 8 / 10 min |
| `POST /api/report-content` | 5 / hour |
| `POST /api/submit-page` | 3 / hour |
| `POST /api/polls/[id]` (vote) | 12 / min |
| `POST /api/track` | 120 / min |
| `POST /api/platform-ads/event` | 120 / min |

Exceeding a budget returns `429` with `retry-after` and a bilingual message. The
window is fixed, the increment and the read are one SQL statement
(`ON CONFLICT … RETURNING count`) so concurrent lambdas cannot lose a hit, and
bucket keys are hashed — the table never stores a raw IP or email. The limiter
fails **open** on a database error: a broken counter must not take the site down,
and every guarded endpoint still validates input.

### Session lifetime and devices

A session is **not** permanent. It dies 30 days after it was created, whatever
happens, and 7 days after its last use (`apps/web/src/lib/session-policy.ts`,
unit-tested in `src/__tests__/session-policy.test.ts`). `last_used_at` is written
at most every 5 minutes so a polling dashboard does not become a write per
request. Signing out **revokes** the row (`revoked_at`) instead of deleting it —
a stolen copy of the cookie stops working immediately, and the history survives.

`/admin/security` (সিস্টেম → নিরাপত্তা ও ডিভাইস) lists every device with its
browser/OS, when it was last used, how many days remain, which one is current,
and one-click revocation; an `admin` can also see and evict every admin's
sessions. IP addresses and user agents are stored **hashed**
(HMAC-SHA256 keyed by `ADMIN_AUTH_SECRET`), never in the clear.

Migration `024_admin_credentials.sql` adds the device/revocation columns; the
Vercel build runs `pnpm db:migrate`, so a deploy applies it before serving.

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