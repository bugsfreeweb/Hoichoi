# হৈচৈ · Hoichoi

Bangla viral-content **ephemeral** news desk — an auto-curated feed that ingests
public social pages *and* RSS/Atom news feeds, dedupes, redacts PII, classifies
into operator-owned categories, rewrites neutrally via a multi-provider LLM
resolver, double-approves sensitive content, and publishes on a rolling window.
Every post is archived or purged by policy.

Live site: <https://hoichoifeed.vercel.app> · Source: <https://github.com/bugsfreeweb/Hoichoi> (public)

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
Desktop (apps/desktop)  Tauri 2 desktop admin + local collector controller — 10-tab desk
                       console incl. a ট্রাফিক analytics tab (shares the web TrafficView)
                       with a ট্রাফিক/স্টোরেজ sub-tab toggle (shares the web StorageView),
                       Settings has pill tabs incl. inline সোর্স/বিভাগ editing, AI প্রোভাইডার,
                       নোটিশ, a shared ওয়েব ভিজিবিলিটি ও থিম (app_config_json) panel with the
                       home/similar/comments count knobs, default post image + brand-animation
                       knobs, footer branding + per-category footer visibility, এবং admin
                       লগইন লগ panel. The content-row editor mirrors the web gallery strip
                       (add/remove/promote extra images). The tenth tab, আর্কাইভ, mirrors the
                       web archive: what left the seven-day window, everything past retention,
                       a per-row permanent delete and a guarded "delete the lot". API ভল্ট
                       কপি/ডাউনলোড clipboard-plugin + Downloads ফাইলের মাধ্যমে।
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
| `archive` | Rolling archive/purge pass (what the daily workflow runs) |
| `archive:list` | Archived posts + everything past the age line, as JSON (`--page`, `--older-than`) |
| `archive:delete` | Permanently delete one archived post (`--id`), refused on a legal hold |
| `archive:purge` | Delete everything older than N days (`--older-than`), guards kept |
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

## The tenth row answered to a key it did not have (desk 1.1.34)

The desk rail has ten rows and prints the key that reaches each one, but the tenth
row printed **10** while the handler only listened for `1`–`9`, so আর্কাইভ — the
screen this week's retention work lives on — showed a shortcut that did nothing.
A printed key is a promise, and this one was unkeepable: `Alt`/`Ctrl`/`Meta` were
correctly ignored, but no key at all selected the tenth view.

One table now feeds both halves (`apps/desktop/src/App.tsx`): `VIEW_KEYS` is
`1…9, 0` in `VIEW_ORDER`'s order, `viewForKey()` answers the keydown handler and
`keyForView()` answers the row's `kbd`, so the label and the behaviour cannot
disagree — the same rule the twelve sidebar templates already follow. The menubar
hint reads `1–9 · 0 TABS`. `apps/web/scripts/desk-rail-keys.test.ts` (8 checks)
recomputes the mapping from the two array literals in the source and fails if the
handler grows a hand-written digit list again, if a row prints its index, or if
`10` is ever treated as one key rather than two.

**The 1.1.33 screen was also checked, which the last pass had only proved over the
daemon protocol.** The built `releases/Hoichoi Desk_1.1.33.exe` was launched and
its window captured: the rail renders all ten rows (মনিটর → আর্কাইভ) from
`@hoichoi/icons`, `CONTROLLER ONLINE` is lit, and the monitor fills with the
runner's own numbers — **376** লাইভ প্রকাশিত, **83** ডুপ্লিকেট ব্লক, **2**
মডারেশন, one queue with two items, and 1,245 published in the category mix. What
is still not verified is the same thing as before and it is not code: the
Cloudflare image provider needs an account id and token, and `.env` carries
neither.

## Seven days, thirty days, and a comparison that was a string (v1.1.42)

The brief says two things: the public site shows **seven days**, and archived
content is **deleted after thirty**. Both were implemented, both were documented,
and neither was true. This release is the measurement that proved it, the fix, and
the two delete controls that make the retention rule usable from either console.

**The bug was a type, not a policy.** SQLite's `strftime('%s', …)` returns
**TEXT**; `strftime('%s','now') - 86400 * 7` is a **number**. SQLite compares by
storage class before it compares by value, and every text sorts above every
number, so the view's `>=` was true for *every* row and the rollover's `<` was
false for every row. The daily `rolling-archive.yml` run therefore reported
`success` with `rolledOver: 0` for a month while the live site served **1,454**
posts, the oldest **58 days** old, and nothing had ever been archived.

Measured on the live Turso database before the fix:

| What was measured | Result |
|---|---|
| `posts` | 1,454 (all `published`, all `archived_at IS NULL`) |
| posts in `posts_current_window` | **1,451** — the view matched everything |
| posts actually younger than 7 days | 394 |
| `ttl_ms` on a 58-day-old row | **−4,422,083,000** (negative, and served anyway) |

`039_window_numeric.sql` recreates the view with
`CAST(strftime('%s', published_at) AS INTEGER)` on both sides *and* inside
`ttl_ms`, and backfills `published_at = created_at` for the three published rows
that had none; `checkAndArchive()` casts too. After applying it to the live
database:

| What was measured | Result |
|---|---|
| `SELECT COUNT(*) FROM posts_current_window` | **394** |
| oldest row in the window | **2026-11-13** — seven days |
| posts archived | **781** |
| posts purged (past retention) | **276** |
| posts still older than 30 days | 65 — inside the second clock below |

The public site now shows yesterday's stories and 404s the ones that left.

**Retention has two clocks, on purpose.** `purgeExpired()` used to measure only
from `archived_at`, which means a database that never rolled over would archive a
two-month-old post and then keep it another thirty days. It now deletes when
**either** `archived_at` is past retention **or** `published_at` is past
`visible + retention` — the catch-up path — while the legal-hold and
active-`missing-children` guards stay. On a local `file:` database with no
`vec0` module the `posts_vec` delete is skipped rather than throwing.

**Deleting is one implementation, three doorways.** `deleteArchivedPost()` and
`deletePostsOlderThan()` live in `packages/db/src/archive.ts`; a refused delete
raises `ArchiveDeleteRefused` with `not_found` / `not_archived` / `legal_hold` so
the API can answer 404 or a 409 with a Bangla reason. `POST
/api/admin/archive/delete` accepts `{ id }` for one post or `{ olderThanDays }`
for the age rule, and writes one deletion-ledger row per post plus one audit row
per action.

On the surfaces:

* **Web** — `/admin/archive` gains `ExpiredPanel`: the count is stated before the
  button (`341`, on the live database, before the pass), the confirmation repeats
  the number, and the result reports what the guards kept.
* **Desktop** — a tenth tab, **আর্কাইভ**, reads three new runner verbs
  (`archive:list`, `archive:delete`, `archive:purge`) through the existing
  `desk_call` passthrough. It shows the expired block *and* the archived block,
  pages the archive, marks a held row `সুরক্ষিত`, and deletes with the same guards
  — there is no second implementation to drift.

`packages/db/src/__tests__/archive-window.test.ts` (8 checks) runs the whole thing
against an in-memory libSQL database with real ISO-8601 `Z` timestamps: the window
is seven days and it is a number comparison, `ttl_ms` changes sign at the edge, a
rollover archives what the window let go and nothing else, a second rollover is a
no-op, the purge deletes what is older than the whole clock, every delete leaves a
ledger row, a held post is never purged, and a full pass reports what it did.

`/api/health` also stops reporting `1.1.26` from a hard-coded fallback; it now
reports the version that is deployed (`1.1.42`).

**One more door.** C3 promised a "Security & devices" screen on the desk and
delivered it only on the web, which left the desk able to drop *every* session of
an email at once and none individually. `sessions:list` and `sessions:revoke` now
run through the same runner passthrough, and Settings gains a **ডিভাইস ও সেশন**
block — device, admin, last used, `সক্রিয়` or `বাতিল · <who>`, and one revoke per
row with a confirmation that names the device. That is the one situation where a
browser is not available: the laptop you are trying to cut off.

**The scheduler was lying too.** After the migration, `rolling-archive.yml` was
dispatched by hand and finished `success` in 58 s with `rolledOver: 0`,
`purged: 0` — the honest answer for a database already rolled over — where for a
month it had said exactly the same thing while nothing at all had rolled over.

## The collector drafts without holding the keys (v1.1.29)

**A laptop should not carry the newsroom's provider keys.** The desktop runs the whole
collection pipeline locally, and until now that meant a Google or OpenRouter key sat
encrypted on an operator's disk — billed, unrevokable from the console, and gone with the
machine. Now a device token changes the route: `packages/llm/src/gateway.ts` sends each
rewrite to `POST /api/ai/task` and the server, which already holds the keys and the
editorial rules, answers. The runner still needs no prompt, no model and no key.

- `ResolverOptions.gateway` is tried **before any provider row is read**, with its own
  60-second budget. That separate budget is not decoration: a measured gateway draft took
  17 s, and the resolver's shared 15 s attempt timeout had been cutting the call and
  silently falling through to the local keys — the feature quietly not working while
  looking green.
- A gateway answer is refused if it has no headline or no body: a blank draft must never
  reach the queue. A non-JSON reply is a `bad_output`, a 401/403 is `auth`, a 429 is
  `rate_limit`, so cooldowns behave exactly as they do for a real provider.
- The endpoint accepts a verified `hdc_` device **before** the cookie guard (the desktop
  has no session) and ledgers the call as `desk:<label>` in both `ai_task_runs.actor` and
  `admin_actions.actor_email` — "which machine asked for this" is answerable.
- A device gets its own 400/hour bucket (`LIMITS.deskAiTask`, keyed per device) instead of
  the 20/hour authoring budget, which would have refused the second source of a single run.
- Both scraper entry points (`pipeline.ts`, `cli.ts`) pass `gatewayProviderFromEnv()`, and
  a test asserts the vault's `desk_token`/`desk_base_url` env names are the ones the client
  reads — a rename on either side would otherwise disable the gateway silently.
- **Honest limit:** embeddings (SEM-1 vectors) still run locally and still need a key. There
  is no embedding gateway yet; the desktop says so in the setup wizard rather than implying
  the disk is key-free.

Verified end to end on the local dev server: a device token returned a real draft
(`provider: হৈচৈ গেটওয়ে (সার্ভার)`), a bogus token and no token both got `401`, and the
ledger rows carried `desk:smoke-test-device`. 14 checks in
`packages/llm/src/__tests__/gateway.test.ts`, 5 in `gateway-resolver.test.ts`, 11 wiring
checks in `apps/web/scripts/ai-gateway-desk.test.ts`.

## Every story gets a newsroom plate, and Cloudflare is the default

**Pollinations is gone.** The dispatcher, the flavour builder, the watermark trim
(`watermarkTrimFraction`, `apps/web/src/lib/image-trim.ts`, `trimBottomFraction`) and its
seed row were deleted: the mark it stamps could not be removed honestly for a provider
that was not ours. Cloudflare Workers AI (`@cf/black-forest-labs/flux-1-schnell`) now
ships `priority 1`, active, and default — and a second and third Cloudflare row is simply
another provider, so a fleet of accounts shares the quota through the same fallback chain
that already handles a timeout. A conservative migration deactivates any leftover
`prov-pollinations-image` row instead of deleting someone's configuration.

**A picture is composed, not just fetched.** `@hoichoi/poster` builds every story image
from layers at one fixed frame — `1600×900`, 16:9, always landscape: the logo mark, the
Bangla wordmark and the newsroom line top-left, the desk chip top-right, the headline as
an auto-fitted caption with a kicker rule, the credit beneath it, and **related-topic
chips** bottom-right. (Superseded below by the browser-drawn `1920×1080` broadsheet; the
SVG plate survives as the no-browser fallback.) The chips are derived from the story itself (`topicCues`: the desk
first, then the longest distinctive words of the headline, stopwords dropped) and are
deterministic, so regenerating a story draws the same chips rather than a new guess.
The mark is composited as its own layer and cached once per process; if the asset is
missing the plate still renders, wordmark and all.

**"Never miss an image" is a property of the pipeline, not a hope.** The plate is composed
when the model answers, when the model fails (`renderPoster({background: null})` draws the
branded backdrop), when collection found no media at all (`pipeline.ts` STEP 2.6), and when
an editor presses generate. A provider being rate-limited changes the background; it does
not change whether the story ships with a picture.
Three faults were found by *running* it rather than reading it:

1. **Workers AI was sent fields its schema does not declare.** `400 AiError: Bad input:
   Additional or unevaluated properties '/width, /height' at '/' not allowed` — flux-1-schnell
   takes `prompt`, `steps` and `seed`, not dimensions, so asking for a 16:9 frame at the source
   made the one provider known to work reject every request. The payload is `{prompt, steps}`
   again and the landscape frame is guaranteed where it belongs, in the plate's `fit: cover`.
2. **A refused chain exited 1 and left the post pictureless.** Quota, a missing key and an
   auth failure in the same run produced `ok:false` and a red workflow. `generateManualImage`
   and `POST /api/posts/[id]/generate-image` now catch that and compose the plate over the
   branded backdrop, returning the provider's reason as a `warning` — and `media_origin`
   becomes `plate`, so the badge does not claim a render that never happened.
3. **The caption was the brief.** With no title passed, the plate's headline fell back to the
   English illustration prompt ("Hand-drawn editorial illustration, ink and gouache on
   paper…") and its topic chips came out as "illustration", "photograph". The generator now
   reads `title_bn` / `category` / `source_name` from the post itself, so a CLI render and a
   console render put the same Bangla headline and desk on the picture.


**The console reads like the dashboard.** `reports`, `polls`, `live`, `backup` and `setup`
moved to `PageHeading` + `Card` / `CardHead` / `StatTile`, so a queue, a poll and a live
event all open with a kicker, a title, the numbers that matter and then cards. `appearance`
is a redirect into Settings' ডিজাইন tab and stays one.

**The sidebar is a rail now.** The collapse handle is a 24 px control on the rail's own
edge instead of a row in the header, the active screen carries a red accent bar and
`aria-current="page"`, `[` toggles the rail from the keyboard (ignored while typing), the
width is remembered, and a screen filter sits under the logo — a 21-screen console should
be searchable before it is scrollable. No label tooltip is drawn beside the icons: the nav
is a scroll container, and `overflow-y: auto` clips anything that escapes it sideways, so
the name is carried by `title` and `aria-label` instead of a card that never appeared.

## The poster is a broadsheet now (v1.1.31)

**The old plate was mis-shaping Bengali, and that is measurable.** The plate drew its
headline as `<text>` inside an SVG and let librsvg shape it. Reading the output was not
enough to see the fault; rendering the same sentence twice was. `ক্ষুদ্র`, `ব্যান্ড`,
`স্ট্রাইক`, `রাষ্ট্রপক্ষ` came back from librsvg with conjuncts broken apart and vowel
signs adrift, while Chromium (HarfBuzz) shaped every one of them correctly. Measured, not
argued: the identical 100 px cluster set advances to `110.4 / 165.4 / 174.7 px` in
Chromium and `96.9 / 137.6 / 164.2 px` in the Skia canvas — the ratios are not even
proportional, so it is shaping, not scale. **SVG `<text>` and node-canvas are both out.
The typography is HTML/CSS, drawn by Chromium.**

**One frame, four shapes, two papers.** `planPoster` is a pure function of the desk, so a
story's poster is reproducible and testable with no provider in the loop:

| desk | layout | theme | accent |
| --- | --- | --- | --- |
| breaking, politics, crime, disaster | `breaking-banner` (red bar, full-bleed, bottom-left type) | dark | `#DC2626` |
| economy, technology, science | `split-left` (type on the left 45 %, subject right) | dark | `#1D4ED8` / `#0D9488` |
| sports | `split-right` (picture leads, type on the right 45 %) | dark | `#EA580C` |
| culture, literature, opinion, local | `editorial-card` (warm paper, framed photograph, column rule) | light-paper | `#B45309` |

**The layout moves the picture, not just the CSS.** The same plan returns `subjectSide`,
which is handed to the image brief, so a `breaking-banner` story asks for its subject away
from the bottom-left corner where the headline will sit — instead of discovering the
collision after the render.

**Dynamic, but not by asking a model.** The brief proposed an LLM art-director returning
JSON (`layout`, `theme`, `accentColor`, `imagePrompt`). The image prompt does need
understanding and is still written per story; the *frame* does not. A desk map cannot drift
between two renders of one story, cannot return invalid JSON, costs no round trip and is
unit-testable, and "invalid JSON → default to `split-left` + `dark`" is already what the
map does. Headline size is the one dynamic number that genuinely depends on the words:
`64 px` under 35 characters, `54 px` to 60, `46 px` above.

**The Bengali line box is a contract, not a taste.** Every headline carries
`line-height: 1.38` and `padding-top: 6px` so `ি ী ু ৃ` and the reph never clip against a
tight box. Fonts are bundled (`Noto Serif Bengali` 600/700 for headlines, `Noto Sans
Bengali` 400/700 for the rest) and base64-inlined into the page — no CDN request, no
network flake, and `document.fonts.ready` is awaited before the screenshot so the capture
can never beat the font and land in a fallback face.

**Two engines, one promise.** A runtime with no Chromium (the deployed serverless
function) keeps the SVG plate instead of shipping nothing; `composeStoryPlateDetailed`
returns which engine drew the picture and `POST /api/posts/[id]/generate-image` reports it
as `plate_engine`. The renderers that matter — the collector, CI, the desktop runner — get
the browser.

**The medium changed too.** The image brief used to open "Hand-drawn editorial
illustration, ink and gouache on paper, not a photograph" so a render could never be
mistaken for a record of an event. The art direction is now front-page photography, and
the objection is answered differently: every subject is a *symbolic* scene (a shuttered
shopfront, a half-built span, two empty podiums), never an identifiable person or a
reconstruction of a specific event, the negative bans `cartoon`, `illustration`, `comic`
and `plastic 3d render` by name, and the finished poster carries a masthead and a barcode
that no wire photograph has.

Verified by rendering all four layouts in both themes with a real photograph and with the
branded wash (`1920×1080`, zero clipping, Bangla shaped correctly at every size), and by
`pnpm typecheck` 8/8, `pnpm test` 6/6, `pnpm build` green.

## The poster is art-directed now (five shapes, five moods)

**A poster is a design decision, not a template fill.** `POST /api/generate-poster` takes
one Bengali article and returns a 16:9 poster composed for *that* story. It is a separate
route from the manual image generator, because it is a separate promise: the image
generator puts a picture on a page; the poster service decides what kind of page the story
deserves.

**Step 1 — the art director.** A text model (Gemini structured output, with the free-first
provider chain behind it) is asked for Bengali copy and design tokens in one JSON object:
`headline` (≤ 45 characters), `highlight_word`, exactly three bullets *or* one pull-quote,
`badge_text`, `footer_text`, a `layout_variant`, a `palette_id`, a `visual_style`, a
procedural `texture`, and an English `image_prompt` that bans lettering. The schema lives
in `packages/llm/src/art-director.ts`. A model that answers badly is repaired, field by
field; a model that is down is replaced by a deterministic planner that still writes a
complete, story-specific plan. The poster never depends on the model being awake.

| layout_variant | shape |
| --- | --- |
| `split_left_media` | visual on the left 45 %, type column on the right 55 % |
| `split_right_media` | type column on the left 55 %, framed visual on the right 45 % |
| `hero_overlay_gradient` | full-bleed 16:9 visual, gradient veil, glassmorphic text card |
| `editorial_magazine_grid` | Swiss grid, top accent bar, framed visual, pull-quote box |
| `breaking_spotlight` | centred circular focal visual, crimson spotlight, bottom ticker |

**Step 2 — the visual has no words in it.** The image model draws only the focal picture,
at `1:1` for the split/grid layouts and `16:9` for the hero and spotlight (a portrait
request asks the same shapes for `9:16`). The negative
prompt (`DESIGN_IMAGE_NEGATIVE`) forbids text, letters, numbers, logos and identifiable
faces — and deliberately does *not* forbid illustration, because the art director may have
chosen one. If the image chain fails, the renderer draws the palette's textured wash.

**Step 3 — Bengali is HTML, never pixels from a model.** Five `1920×1080` layouts in
`packages/poster/src/design/` receive `--bg-color`, `--accent-color`, `--card-bg`,
`--text-primary` and `--text-muted` from the chosen palette. Each gets a seeded, code-drawn
SVG texture (dot grid, diagonal mesh, radial glow, topographic, mixed), so two stories do
not share a background. Fonts are the real Google families — **Hind Siliguri** for display,
**Noto Sans Bengali** as fallback, **Galada** for pull-quotes — bundled and base64-inlined,
so conjuncts are shaped by HarfBuzz with `document.fonts.ready` awaited before capture.
Chromium screenshots at `deviceScaleFactor: 2`: a `3840×2160` PNG or WebP from a
`1920×1080` frame, or `2160×2700` from the `1080×1350` portrait frame.

**Step 4 — no two neighbours look alike.** Every render writes a `poster_designs` row. The
next call reads the last five and passes them to the model as `recently_used_designs`; the
renderer then *enforces* the rule, moving a repeated `(layout, palette)` pair to the first
unused combination and barring the immediately previous palette. The CMS panel offers
**🎲 রিজেনারেট স্টাইল** beside **⬇ পোস্টার ডাউনলোড**, so an editor can cycle the whole
design in one click.

**Step 5 — one direction, two frames.** `aspects: ["16:9", "4:5"]` renders the same
art-directed page twice: the web/YouTube card and the uncropped Facebook/Instagram feed
post. The LLM runs once, not twice — a story has one mood, and 4:5 is the same page in a
different shape. Portrait is a CSS recomposition of the same semantic markup (masthead,
badge, headline, support, footer), so there is no second template tree to keep in sync.
The route caches the focal visual by ratio (split/grid reuse one `1:1` image; hero and
spotlight get a `9:16` render for portrait), stores both files, and returns a `posters`
array with per-frame dimensions. In the CMS the **৪:৫ পোর্ট্রেটও তৈরি করুন** checkbox is
on by default; both previews appear, and the download button follows the selected frame.
`poster_designs.aspect` (migration `041`) records which frame was published, while the
anti-repetition window de-duplicates the shared design pair.

The newest 4:5 row now feeds the story's share preview: `generateMetadata` asks
`latestPosterDesign(postId, "4:5")` and uses that file as `og:image` with its real
`1080×1350` dimensions, so Facebook and Instagram get an uncropped card. Twitter keeps
the post's 16:9 image because `summary_large_image` is a landscape slot, and the
NewsArticle JSON-LD uses the same share image as the OG tag.

The choice is per post, not global: **ফেসবুক / ইনস্টাগ্রামে ৪:৫ শেয়ার কার্ড** in the CMS
PATCHes `posts.social_share_aspect` (migration `042`) immediately, so a story whose
landscape art is stronger can keep the 16:9 card while its portrait poster stays stored.
The preference is honest about absence — choosing 4:5 with no portrait falls back to the
post's own image rather than shipping a broken preview.

Verified by rendering all five layouts at `3840×2160` (zero clipped lines measured in the
DOM), by a live art-direction call and a live FLUX render (WebP, 450 KB), and by
`design-poster` (8 checks) and `art-director` (10 checks) test files.

## Twelve ways to draw the same menu, and one place that decides (v1.1.34)

The console's sidebar had one look, and the design prototype had twelve. Porting the
twelve as twelve components would have been twelve chances for the navigation to drift
apart — a shortcut number missing from one template, a group caption renamed in another.
So the templates are variables, not components. `packages/shared-types/src/sidebar-templates.ts`
is the only list: `classic, obsidian, floating, rail, editorial, dock, neon, minimal,
aurora, ledger, split, cards`, each with a Bangla name, a latin line, a one-sentence note
and a swatch for the picker. The default is `obsidian`, the prototype's own dark newsroom
glass.

`AdminShell` sets `data-sidebar-style` on the panel and puts `adm-nav-link`,
`adm-nav-caption`, `adm-nav-group` and `adm-collapsed` on the markup it already had, and
one scoped stylesheet paints all twelve from those hooks. Nothing about the menu changed
— same rows, same order, same keyboard shortcuts, same `aria-current`. Choosing a
template is a colour-and-shape decision, and the shape of a decision is all it can be.

The picker lives in `সেটিংস → ডিজাইন` and writes `admin_sidebar_style` into the site
config. The admin layout reads that value **on the server**, so the panel is right on the
first paint; a client fetch would show the default and then swap on every navigation. An
unknown or hand-edited value is parsed through `sidebarStyleOr` and becomes the default
rather than an unstyled panel — "no style" is indistinguishable from a broken build.

The desktop app reads the same value, mirrored into local storage by
`apps/desktop/src/lib/desk-ui-prefs.ts` so the desk is right instantly and right with no
network, and its Settings picker writes both the mirror and the shared config. When that
save fails the desk says so instead of leaving the operator believing the browser console
agrees with it. Its twelve `[data-sidebar-style]` blocks override variables only, so the
same navigation component and the same shortcuts survive.

The hero picker was describing the same twelve scenes in its own words. `HERO_SCENE_STYLES`
now maps the twelve existing renderers onto the prototype's twelve template identities, in
the prototype's order, with the prototype's Bangla notes — `obsidian, pipeline, editorial,
mosaic, radar, kinetic, tilt, terminal, spotlight, constellation, waveform, timeline`. The
scene *keys* are untouched, so every saved `hero_scene_style` still resolves; only the
names and the explanation the editor reads changed.

Verified by rendering all twelve styles in a browser harness and reading the result (every
template legible, every template visibly different, the rail's labels hidden only when
collapsed by width and not by a second component), by `apps/web/scripts/sidebar-templates.test.ts`
(6 checks: twelve unique templates, the prototype's names, the default, the unknown-value
fallback through `parseAppConfig`, a real CSS block for every id in **both** stylesheets,
and that neither surface keeps its own hand-typed list), and by `pnpm typecheck` 8/8,
`pnpm test` 6/6.

## The queues are a wall of covers, and a backlog clears in one decision (v1.1.32)

**Six across, and the picture owns its frame.** Both the post editor and the moderation
queue put a fixed-size thumbnail (`h-28 w-44`) inside a 16:9 box, so every photograph was
letterboxed in a frame that was sometimes wider and sometimes narrower than the image —
which is what made card view look unfinished. A card is now a cover: `object-cover` at the
box's own ratio, a solid paper chip for the desk, a status pill and a provenance glyph on
top of it, then the Bangla headline, one line of standfirst, and the two actions. The grid
is `2 → 3 → 4 → 5 → 6` columns, six up on a wide console, the same on both pages.

**One detail moved because it could not be read.** The updated-at stamp used to sit on the
photograph at 9 px, in whatever colour the photo happened to be. It lives in the card's
footer next to the regenerate button now.

**A backlog clears in one decision, without becoming a bypass.** The review queue rendered
one card, two buttons and one reload per draft, which is why a backlog stayed a backlog.
`ModerationGrid` holds a whole queue's selection and sends it once to
`POST /api/moderation/bulk`. Three promises survive the shortcut:

1. **Bulk approve is not bulk publish.** The endpoint accepts `approve` and `reject` only;
   nothing in it can write `published`.
2. **A desk that needs a second signature is skipped, not folded in.** A checkbox is not a
   signature, so those cards cannot be selected, and the server refuses them as well with
   `দ্বিতীয় অনুমোদন প্রয়োজন — কার্ডে আলাদাভাবে স্বাক্ষর করুন`. The UI explains, the server
   enforces.
3. **Every post in a batch gets its own audit row** (`details.bulk = true`), so the log
   answers "who approved these twenty" with twenty rows, not one summary.

A batch is capped at 100 ids and de-duplicated, and the response is per post —
`approved`, `skipped` (with a reason), `failed` (with an error) — so the toast says
"৩টি সম্পন্ন · ১টি বাদ" instead of reloading and letting the operator infer it. Verified
against the running console: three `economy` drafts approved in one call with three audit
rows, and a `child-sexual-abuse` draft refused with the Bangla reason and left untouched.

## Provider errors, readable alerts, the console's own shape (v1.1.30)

Four reports from the admin console, each with a cause rather than a symptom:

**A provider failure has to say what to do.** A Cloudflare row returned
`404 {"code":7003,"message":"Could not route to /client/v4/accounts/ACCOUNT_ID/ai/run/…"}`
and another returned a whole HTML interstitial inside the panel. `summarizeProviderError`
(`packages/llm/src/openai-compat.ts`) now prefers a JSON `message`, reduces HTML to its
title, names the Cloudflare codes in Bangla, and clamps the result to one line —
`classifyStatus` passes that text through and maps 400/422 to `bad_output`. The seeded
Cloudflare row keeps a placeholder nobody can be expected to hand-edit, so
`resolveAccountPlaceholder` substitutes a 32-hex `CLOUDFLARE_ACCOUNT_ID`, the row editor
validates and rewrites the URL, and a row that still carries the placeholder refuses the
call with instructions instead of spending a round trip to learn it from a 404. Those two
helpers live in `@hoichoi/shared-types`: importing `@hoichoi/llm` from a client component
pulls `node:crypto` into the browser bundle and 500s the page.

**An alert is a line, not a paragraph.** The bell rendered every notification body, so
eight events filled the viewport and the panel grew without bound. Rows are one line —
severity dot, title, age — with the body on demand, a per-row dismiss, and clear that
removes only what has been read unless unread is explicitly included. `/admin/notifications`
holds the alerts the bell cannot (`apps/web/src/components/admin/NotificationList.tsx`,
`notify-ux.test.ts`, 8 checks).

**The providers page is laid out like the dashboard it lives in.** Stat tiles, a fleet
card, a health card and a sticky guide column; adding a provider is a modal, so no
permanent form column can stretch the page (`ProviderAddPanel.tsx`, `ui/Card.tsx`).

## Pictures that belong to the story (v1.1.29)

**A generated hero used to be a stock image of a mood, not a picture of the news.** Three
separate faults, all measured:

1. **The brief was a style sentence with the Bangla headline stapled on.** Models that do
   not read Bengali rendered the style and nothing else, so every article got the same
   illustration; models that do read Bengali sometimes drew the headline *as lettering inside
   the drawing*. `packages/llm/src/image-prompt.ts` now builds the newspaper brief an
   illustrator is given: Central idea → Visual metaphor → Subject → Setting → Style →
   Composition → Colour palette → Mood → Avoid, in English, with the Bangla used only as a
   source of meaning. A ~22-entry metaphor bank (bribery, price rises, flood, verdict, heat,
   going-viral, aid, harvest, …) is selected from the story's own words and its category, so
   a corruption story draws a hand and an envelope and a flood story draws a rooftop in
   brown water.
2. **The medium was a word in the middle of the paragraph.** Image models weight early
   tokens hardest: a render of a corruption brief came back as *"a softly lit vintage
   still-life photograph"* of papers — the style word was read, the medium was not. The
   prompt now **opens** with `Hand-drawn editorial illustration, ink and gouache on paper,
   not a photograph`, and the empty-space instruction names what the space *is*
   ("a plain uncluttered wash of background colour" on one third) because "generous empty
   space" was filled with props.
3. **The only working provider stamped a logo on the render and ignored the brief.** Google
   Gemini Image answers `429 quota exceeded` on this account and OpenAI/Agnes are not
   configured, so the keyless Pollinations host won every fallback — and it keeps its
   `pollinations.ai` corner mark even with `nologo=true` **and** a referrer set (verified on
   two renders). Nothing watermarked by a third party may sit inside a story, so
   `watermarkTrimFraction(provider)` marks the trim and `apps/web/src/lib/image-trim.ts` /
   `processImage(..., { trimBottomFraction })` shave the band — verified: the logo is gone
   from the stored WebP, and every other provider is trimmed by exactly 0.

**Three more things that were wrong, found by running it rather than reading it.**
A 503 from the keyless host ("the Classic API is at its limit right now, retry after
10s") was treated as a hard failure — only 429 was retried — so a peak-load moment turned
one click into "ছবি তৈরি ব্যর্থ" while the very next attempt succeeded;
`retryDelayFor()` now waits for the provider's own advice (capped at 15 s) and retries
once. `--ratio` was honoured in the prompt text but not in pixels, so a "horizontal 16:9
frame" rendered square: `generateManualImage` now derives the size from the ratio, and a
free-form host (`frameDims`) gets the true 16:9 frame with the same area instead of
OpenAI's 3:2. And a missing-child story fell through to whatever word it happened to
contain — "school" matched the harvest metaphor, so the render was a farmer in a paddy
field. The sensitive desks (`missing-children`, `child-sexual-abuse`, `extramarital-crime`,
`abuse`) now pick from four still lifes (an empty school bag at a gate, a lit lamp and two
empty chairs, a closed file and a sealed envelope, slippers at a threshold) and their
`Avoid` line excludes people outright: the picture is the absence, not the person.

**Honest ceiling.** The keyless host does not follow a brief closely: three different
briefs came back as the same romantic "woman in a doorway / papers on a table" imagery, and
it drifted to photorealism regardless of the medium being stated first. The prompt, the
frame and the watermark are now right; matching the *content* reliably needs a provider
that follows instructions — which is exactly what the Cloudflare row above is for. Until
one is enabled, the desk logs and shows the provider it used (`toast`: "ছবি তৈরি হয়েছে ·
Pollinations (keyless)") rather than implying the picture came from the best model.

**The free path that actually follows a brief is seeded but switched off.** Cloudflare
Workers AI serves `@cf/black-forest-labs/flux-1-schnell` on a free daily Neuron allowance
(10,000 Neurons ≈ 250 images) with **no watermark**, and `openai-compat.ts` already speaks
its shape. Its base URL has to carry the operator's own account id, so the row ships as
`prov-cloudflare-image`, `is_active = 0`, base URL ending in `accounts/ACCOUNT_ID/ai/run/…`:
paste `CLOUDFLARE_API_TOKEN`, replace `ACCOUNT_ID`, switch it on, and it outranks the
watermarked host automatically (a keyless host is always tried last).

18 checks in `packages/llm/src/__tests__/image-prompt.test.ts` (structure, determinism,
variation, metaphor-by-story-word, no Bengali in the prompt, no children, sizes, trim
policy), 6 in `apps/web/scripts/image-trim.test.ts`, plus the safety boundary in
`apps/scraper/src/__tests__/ai-image.test.ts` and the seeded-row checks in
`packages/db/src/__tests__/image-providers-seed.test.ts`.

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

**The scroll reveal no longer hides the page from an audit.** `.js .reveal { opacity: 0 }`
armed every section at once, so everything below the fold painted transparent — Lighthouse
measured the background behind it and counted 21 colour-contrast failures (home page 0.92).
`Reveal.tsx` now arms one element at a time and only after checking that it really starts
below the fold; already-visible content is never hidden. Mobile nav links gained an
`aria-label` (their text is hidden under `sm`), the ad placeholder stopped overriding its own
visible text with `aria-label="বিজ্ঞাপন"`, and a 13 px blurb that measured 3.88:1 moved from
`text-bandline/55` to the palette's `ink-soft` (4.61:1). Lighthouse accessibility on a
production build: **1.00** for `/`, `/poll` and `/about`, CLS **0** on all three. 6 checks in
`scripts/reveal-a11y.test.ts`.

**The CLS budget is green because the cause was found, not because the threshold moved.**
"CLS 0.206" on `/poll` and `0.119` on `/about` never reproduced locally, so the workflow now
prints the culprit elements and uploads `.lighthouseci` — and the answer came from a local
Playwright probe under CDP throttling: every shifted node moved by ~4 px when a webfont
replaced its fallback. The two Bengali faces are now preloaded (`preload()` in the site
layout, which also pulls LCP forward), and the runner installs a Bengali font — a bare Ubuntu
image has none, so its pre-swap paint is tofu and the reflow is far larger than any reader
sees. CLS on CI: **0 / 0.001 / 0.004**. The same pass found `uptime.yml` was not valid YAML
(an inline heredoc at column 0), which GitHub had been reporting as a failed run on every
push that never executed a step; the probe's verdict now lives in `.github/scripts/uptime-check.mjs`.

The roadmap is now **104 ✅ · 6 🟡 · 0 ⬜** — the partials are named at the top of
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

## The story plate is a broadcast card (v1.1.40)

**A story's picture is met in a feed, so it is now a card, not a page.** The four
editorial layouts were the newsroom's answer to "a poster", and they read like an
article: tall, dark, columned. `packages/poster/src/html/broadcast.ts` replaces the
default with a 1200×675 broadcast frame drawn at 2× — a 2400×1350 PNG — carrying a
red desk badge and a logo badge on the top rail, a headline that reads white into
gold, a two-line standfirst in a translucent box, and a solid white footer bar with
"ব্রেকিং নিউজ" and the source. `headlineSizeForCard` steps the type down by length
and the frame cannot scroll, so no headline can overflow it. The archive layouts are
still one `layout` or `theme` away, which is what the console's frame picker passes.

**The story's own photo is inspiration, never the picture.** When a story has an
image, the card renders it at `blur(2px) saturate(1.35) hue-rotate(-8deg)` under a
`soft-light` blend with a guard fade: the scene's light and colour survive, the
photograph does not. A card with no image gets the branded motif.

**The same card from three doors.** The collector (`composeStoryPlateDetailed`), the
console route (`/api/posts/[id]/generate-image`) and a standalone CLI
(`packages/poster/scripts/social-card.ts --json card.json | --data '{…}' | --sample`)
all draw it, and all three keep the SVG net for a machine with no Chromium.
Fonts embed from the package by default; `fonts: "cdn"` additionally requests Hind
Siliguri and Noto Sans Bengali from Google Fonts, with the embedded faces kept
underneath so a failed request is never tofu.

**The desk on the badge comes from the database.** `/admin/categories` is
operator-editable, so the live installation holds 39 desks while the code-level
seed lists name 22: `tech` (604 stories), `international`, `ai` and the rest were
all badged with the neutral "সংবাদ" because the plate asked a constant instead of
the table. `deskForCategory()` now reads `category_configs.display_name_bn` — the
same Bangla name the console shows — caches it per slug, and falls back to the
seeds only when there is no database.

**And CodeQL can read the desktop config again.** `apps/desktop/tailwind.config.js`
carried `import type` and `satisfies` inside a plain `.js` file. Vite tolerates that;
the JavaScript extractor does not, so the extractor failed and the scan with it. It
is now a JSDoc `@type` annotation and a plain object. The second half of that
failure was GitHub's *default* CodeQL setup being on at the same time, which makes
GitHub refuse SARIF from an advanced configuration; default setup is now off, so
the workflow in `.github/workflows/codeql.yml` is the single source.

## Light where the picture is, and the rail at glyph scale (v1.1.39)

**Every poster was the same dark breaking banner, and the cause was one field.**
The platter handed the renderer the desk *label* - `সংস্কৃতি`, `অর্থনীতি` - into
the slot `planPoster` matches on category *slugs*. Nothing matched, so every story
fell through to the `breaking` desk: dark theme, breaking banner, same shape,
whatever the article was about. `EditorialPosterOptions` now has both: `category`
(the slug, which picks the frame) and `deskLabel` (the Bangla desk, which is
printed). Fixed in the collector (`plate.ts`), the editor's manual path and the
console's generate-image route, with a poster test that asserts a culture story is
`editorial-card` + `light-paper` and that a Bangla label is not a slug.

**The scrim protects the words, not the frame.** With a photograph, the dark
theme held 0.96 opacity across the first 42% *and* 0.985 at the edge - a black
rectangle with a picture suggested behind it, which is what "too much dark on the
poster" actually was. The stops now reach zero by 88-100%, and the breaking
banner's dim is a horizontal fall-off only as wide as its 62% copy column, so the
right third of the image is left exactly as rendered. Where the words sit, they
bring their own contrast: a soft text shadow on the dark theme only, a tenth of
the dimming a full-frame scrim costs. The no-photo wash moved from #171B24 →
#090B10 to #263043 → #131926, so a story with no render reads as a dark navy card
with depth instead of black.

**The collapsed rail is a column of tiles.** A 16 px glyph floating in a 70 px
rail wasted the one thing the collapsed state has room for. `RAIL_ICON_SIZE`
(24 px) is drawn inside a 44 px tile that owns its own padding, declared after
every template block so dock/editorial/ledger cannot squeeze it back - the same
hit area the expanded row has.

## The picture after the story, and eleven screens in four rows (v1.1.38)

**The poster was written before the story existed.** In `apps/scraper/src/pipeline.ts`
the picture steps ran *before* the rewrite, so the brief that chose the scene was
built from the English source lede and the Facebook caption. A rewritten Bangla
story therefore got a plate whose headline was English and whose picture had
nothing to do with the article — exactly the report, and not a styling problem.
The picture block now runs after `rewritePost` and after the unusable-output
rejection (**STEP 5.5a** hero, **5.5b** plate), reading `title_bn`, `summary_bn`
and the resolved category.

**A plate carries the standfirst.** `composeStoryPlate` gains `summary` and
`source`; the collector passes the post's own `summary_bn`, its desk and the page
it came from, and the editor's manual path reads `summary_bn` from the row
(`plateFacts`). A headline over a photograph says nothing about the article;
headline + standfirst + desk + source is a picture *of* it.

**A provider that states its limit is obeyed.** Workers AI answered
`400 Bad input: Length of '/prompt' must be <= 2048` for the full editorial
brief — the Cloudflare row and the custom OpenAI-compatible row that proxies to
it both sat in the status board as permanent red failures for a character count.
`shortenImagePrompt()` drops whole clauses in a documented order (Mood → palette →
style → composition → setting) and never drops the medium line, the central idea,
the subject or the `Avoid:` list; `promptLimitFrom()` reads a ceiling out of a
provider's own refusal so any host gets one honest retry. `image-prompt-limit.test.ts`
pins 36 checks.

**Eleven screens, four menu rows.** Sources + categories, live events + notices +
polls, content + comment moderation, and submissions + removal requests + reader
reports are each one sidebar row now. `ui/sections.ts` holds the four groups once;
`SectionTabs` renders the strip on all ten screens **as links**, so a tab works
before hydration and every existing URL still resolves. The grouped rows keep
counting every queue they hide. And the row you are on is the row that is lit:
`rowOwns()` makes the dashboard an exact match (its `/admin` href is a prefix of
every console URL, so `startsWith` lit it on all twenty screens), and a sibling
screen highlights the row that owns its group — verified by fetching all eleven
routes and reading which row carries `is-active`.

**Cards are the same component.** Sources and categories gained `?view=card`
grids whose tiles are `SourceRow` / `CategoryRow` with a `variant` prop: the edit
form, the switches and the delete confirmation exist once, so the two views cannot
drift. `admin-sections.test.ts` (8 checks) pins the grouping, the tab routes, the
owner mapping and the single edit button.

## Four unfinished answers, finished (v1.1.37)

**A picture states what it is, not what its name says.** The media registry
recorded a byte count and nothing else, so the console could say "2.1 MB" about a
2400x1600 WebP and could not notice that an "image" it had just mirrored was an
HTML error page saved under a `.jpg` name. `media_objects` now carries `mime`,
`width` and `height`, read from the blob's own header by a pure parser in
`packages/shared-types/src/image-meta.ts` (PNG, JPEG, GIF, WebP VP8/VP8L/VP8X,
BMP, AVIF/HEIC by brand) - no decoder in the hot path, no image library pulled
into the registry. An unrecognised header records `null` and every reader says
"unknown": a wrong MIME type written into a row outlives the guess. `/admin/media`
shows the format mix with `অশ্রেণীবদ্ধ` as its own bucket, because a file the
console never parsed is not a file it may imply it understands.

**A claim proposal is a reading of the text, not a model's opinion.** The
verification grade has always been derived from rows, and the rows only existed if
an editor typed them - into a blank box, which is why most posts had none. The
obvious shortcut ("ask a model to extract the claims") is the wrong one: a
proposal that cannot be re-run cannot be audited, and it would carry the story's
names to a third party a second time. So extraction is deterministic: split the
body the row already holds, keep sentences that carry something checkable (a
figure, a sum, a date, a named party, a quotation), drop questions, appeals and
speculation, rank by evidence surface, and say *why* each line was offered. The
console shows them as proposals; keeping one fills the claim form, and only then
does a row exist. `scripts/claim-candidates.test.ts` (14 checks) pins the ranking,
the exclusions, the digit folding (`২ কোটি` and `2 কোটি` are one claim) and that a
candidate carries no confidence score to mistake for evidence.

**An approval is per image, and a rejection is a wall with a name on it.**
Moderation approved a *post*; a post can carry a gallery, and nothing recorded
which picture a human had actually looked at. Migration 038 adds `image_reviews`:
one row per decision, the newest row for a path is the standing verdict, a
rejection at the same instant beats an approval, and history is never deleted - a
later approval supersedes a rejection by order, so "who let this through" survives.
No row means `unreviewed`, which is not an approval. The post editor shows each
image with its verdict and two buttons; and publishing is refused with the
picture's name, the reason and who rejected it - a bare "cannot publish" is a
wall, not an instruction. Verified end to end: reject then `409 ছবি অনুমোদিত নয়:
img_....webp (নকল/ওয়াটারমার্ক) - admin@...`, approve then publish succeeds.

**One request validator, so every route answers the same way.** Hand-written
checks were fine at five routes and are wrong at dozens: some ignored an unknown
field, one crashed on a wrong type, and both are worse than they look - a route
that ignores what it does not know can be talked into reading a `role` out of a
body later, and a type crash turns a 400 into a 500. `apps/web/src/lib/validate.ts`
is a spec in and a typed value or one Bangla sentence out, with four deliberate
rules: unknown keys are refused rather than dropped, a wrong type is never
coerced, a bound is a refusal rather than a silent truncation, and an error names
the field but never the value (a value may be a secret). Bulk moderation and the
image-review route now validate through it; `scripts/request-validator.test.ts`
(14 checks) covers the cases that used to differ.

## The panel owns its ink, and apply means apply (v1.1.36)

**Twelve templates, and every one of them readable under the pointer.** The
sidebar had been "themed" by swapping CSS variables, but the row's colour was
still a Tailwind utility (`text-white/55`, `hover:text-white`) — invisible on a
light template in the dark console, and outranked by the console's light-theme
utility override on the obsidian panel, which painted dark-brown text on dark
green. The nav markup now carries no colour utilities at all; `.admin-sidebar`
owns its ink, and each of the twelve templates declares `--sb-fg`, `--sb-mute`
and its active pair. `scripts/sidebar-contrast.test.ts` parses both the web and
the desktop stylesheets and asserts 4.5:1 for every pair a row actually shows —
worst recorded 5.46:1. Two specific fixes worth naming: editorial's hover was
the accent (3.3:1 on cream, so the words vanished under the pointer — it now
keeps the ink and marks itself with an underlined accent rule), and a "current
page" row in the dark editorial theme inherited a light-theme value and hit
1.11:1.

**The dark-chips bug, and it was everywhere.** Inside the console, `bg-ink` is
deliberately pinned to a dark chip in *both* themes, but the label on those
chips was `text-paper` — which is #f3eee1 in light mode and #0a0c10 in dark
mode. So the active tab ("আমার ডিভাইস"), the active filter ("সব"), and buttons
like "টোকেন তৈরি করুন" and "পোল সংরক্ষণ করুন" all became dark text on a dark
pill the moment the operator switched to the dark console. The pair is now
defined exactly once in `globals.css` (`color: #f2efe6`) instead of re-argued
per component.

**Providers, honed to the label you can actually read.** The FREE badge flipped
its own contrast with the theme (`bg-lime text-ink`, 3.14:1 light / 1.03:1 dark
— invisible); it now has a fixed two-end pair via `.badge-free`. Muted labels at
30–40% white on dark cards measured 2.7:1 and were raised to 55–60%. And the
**desktop** app mirrored the same mistake — its templates swapped hover and
active colours but the words still used the *window's* text token, so every dark
panel showed near-black labels in the light theme. Each desktop template now
declares `--side-fg` / `--side-mute` and the nav reads them.

**Settings → Site was one scroll; now it is four views.** The tab held every
section in one column, so the save button was a scroll away from the edit and
the hero preview box was escaping its section. Site splits into পরিচয় /
ব্র্যান্ড ও মিডিয়া / হিরো / সেটআপ ও অপারেশন (same sections, grouped), the
hero picker cells are div-with-button-semantics (the old `<button>` wrapped
panels that themselves contain links and tabs, which React refuses to hydrate —
that was the visible console error), and every preview is clipped by `contain:
paint` and a fixed aspect so no template paints past its own card.

**Apply is no longer "refresh by hand."** `SettingsConsole` re-renders the
current route after a successful save (`router.refresh()`), so the new sidebar
template appears in place and the hero's server-side defaults update without a
manual reload. The public side already revalidated `/` on save.

**The hero panels, ported from the prototype.** The mockup's twelve hero
instruments are now the real home-page right column (driven by the same
`hero_scene_style` setting), and they are bound to real rows: the lead stories,
the collected/published/duplicate counts, the event stream and the source
switches all come from the database — a panel with nothing to show says so rather
than drawing a decorative number. Links go to `/post/<slug>`, timestamps are
absolute clock times (a relative string differs between the server and client
passes and trips hydration), and all motion is CSS that switches off under
`prefers-reduced-motion`.

## One rail, one icon set, one honest fleet view (v1.1.35)

**The sidebar is a rail again.** The console used to draw its navigation as a card
sitting under a header, so the list stopped 140 px short of the window, the
masthead appeared twice, and the whole left edge read as a boxed-in panel. It is
now a full-height `<aside>` flush to the left edge with the header, working area
and footer sharing the column beside it; the drawer opener and the rail toggle are
the same three-line gesture. The masthead and the build stamp live in that top bar
and the footer, and the "keys are encrypted" claim moved to `/admin/security`
where it belongs. Two CSS facts had to be written down rather than remembered:
`.admin-console` is a *column* (so the sticky footer works) and the shell is the
one element that is a row — a stale column put the rail above the page — and the
sidebar's `max-height` still subtracted a header it is no longer under.

**One icon vocabulary, three surfaces.** Navigation glyphs were emoji: the same
row was a colour photograph on Windows, a flat blob on Android and an outline
elsewhere, and none of it responded to the theme. The desk had the opposite
problem — hand-drawn SVGs at four different stroke weights, one of which was
literally the wrong icon. `packages/icons` is now the only source: a
`NAV_ICONS` catalogue, one `NavIcon` component that decides size and stroke
weight (1.75) once, `aria-hidden` so an icon never joins the accessibility tree
twice, and a motion layer that is a transform and switches fully off under
`prefers-reduced-motion`. The desk's tab strip draws from the same catalogue, so
"traffic" is the same shape in both apps.

**Provider status for the fleet, not the page.** The tiles and the health panel
were computed from the twenty rows on screen, so the headline numbers moved when
an operator turned the page, and a dead provider on page two was invisible.
`listAiProviderStatus()` now reads every row once and reports what was *measured*:
success rate, p50/p95 latency and a 24-hour bar chart from `ai_task_runs`, the
resolver's own `last_ok_at / last_error_at / error_count`, and the declared
`rate_limit_rpm` compared with the calls the ledger recorded in the last minute
(remaining = ceiling − actual; "ঘোষিত নয়" when no ceiling is declared). Each
provider carries a verdict — জীবিত / ব্যর্থ হচ্ছে / কল হয়নি / বন্ধ — as a green or
red strip, glow and tinted pill, with the reason in Bangla underneath, and TEXT
and IMAGE are drawn in their own groups. A provider that has never been called
says so instead of showing a reassuring 100% over an empty sample, and an hour
with no calls is a faint baseline rather than a healthy-looking bar.

**A Cloudflare model is an id, not a word.** A row saved as `flux-1-schnell`
produced `400 No route for that URI` — a message that reads like a broken account
and is neither. Workers AI routes are `…/ai/run/@cf/<vendor>/<model>`, so the
short names are mapped (`normalizeCloudflareModel`), the API refuses to store a
name it cannot route, the console's pre-flight names the model before spending a
round trip, and the call itself expands what an existing row already stores — so
the broken row starts working without anyone editing it.

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