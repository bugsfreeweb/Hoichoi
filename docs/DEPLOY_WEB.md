# Deploying the Web App to Vercel (through GitHub)

The **web app is `apps/web`** — a Next.js (App Router) public site + admin. The
desktop app and scraper are deliberately **not** part of the web deploy. This
page explains the exact, unambiguous path from push → Vercel.

## What ships to Vercel (and what never does)

| Ships | Excluded (`.vercelignore`) |
|---|---|
| `apps/web` | `apps/desktop` (native app — separate product) |
| `packages/db`, `packages/llm`, `packages/shared-types`, `packages/dash` | `apps/scraper` (runs on the desktop/CI, not serverless) |
| `vercel.json`, `.vercelignore`, `pnpm.*`, `tsconfig.base.json` | `mockup` (static design reference) |

The web app no longer depends on `@hoichoi/scraper` — the two helpers it used
(`purgeExpired`, `mediaRoot`) now live in `@hoichoi/db`. So a web build never
pulls in Playwright/tsx/ffmpeg.

## Database

Uses **Turso (libSQL)**. Set these in Vercel (Project → Settings → Environment
Variables) and as GitHub secrets:

```
TURSO_DATABASE_URL   libsql://...(or file: for local-only; use remote on Vercel)
TURSO_AUTH_TOKEN     (only needed for remote libsql:// URLs)
NEXT_PUBLIC_SITE_URL https://your-domain
SITE_URL             https://your-domain
ADMIN_AUTH_SECRET    openssl rand -hex 32
ADMIN_ALLOWED_EMAILS admin@example.com
STORAGE_ADAPTER      local | r2
```

> **পূর্ণ সিক্রেত তালিকা ও প্রতিটির বিস্তারিত নির্দেশনা:** [`SECRETS.md`](./SECRETS.md)।
> সেখানে প্রতিটি সিক্রেট কোথা থেকে পাবেন, খরচ কত, এবং না দিলে ঠিক কী ভাঙবে — বাংলায়।

> `file:` URLs do not work on Vercel (ephemeral filesystem) — use a Turso
> `libsql://` database.

**Admin login** no longer uses a password. `/admin/login` accepts a desktop
**one-time code** (email + code from the Hoichoi Desk app → *Settings → Admin
access*); the code is consumed once and a normal 7-day session cookie starts.
`admin_users.email` must still exist (seeded as `ADMIN_BOOTSTRAP_EMAIL`,
default `admin@hoichoi.local`) and be in `ADMIN_ALLOWED_EMAILS`. codes live in
the `admin_login_codes` table (migration `002_admin_login_codes.sql`, applied by
the in-build `pnpm db:migrate`).

Every Vercel build now runs **`pnpm db:migrate` first** (a `prebuild` hook in
`apps/web/package.json`, mirrored in both `vercel.json` files) so the DB is
never missing — the very first deploy crashed prerendering `/about` with
`SQLITE_ERROR: no such table: settings` because the build box had an empty
ephemeral DB. With the migrate step the build always succeeds; **but set the
Turso env vars above or the live site shows seeded defaults and no real
posts** (runtime reads still need the remote DB).

## Option A — Deploy from GitHub Actions (recommended)

> **In place now.** `.github/workflows/deploy-web.yml` is committed. It runs on
> every push to `main` touching `apps/web/**`, `packages/**`, `pnpm-lock.yaml`
> or `vercel.json` — typechecks the web app, then `amondnet/vercel-action`
> deploys **production**. The job **skips itself** (never fails) until the
> Vercel secrets exist.

Live site: `https://hoichoifeed.vercel.app`.

1. Git push the repo.
2. In Vercel create a project, then grab `VERCEL_TOKEN` (Account → Tokens),
   `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` (`vercel pull`, or read them from
   `.vercel/project.json`).
3. Add these repo secrets under GitHub → Settings → Secrets and variables →
   Actions:
   - `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
   - `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`

   > Option A is **optional in practice**. If Vercel's own Git integration is
   > connected to the repo, a push to `main` already deploys production and none
   > of the three `VERCEL_*` secrets are needed. Add them only if you want GitHub
   > Actions to be the deploy path. The workflow skips itself (without failing)
   > when they are absent.

4. Push to `main` touching `apps/web/**` or `packages/**` → the
   `.github/workflows/deploy-web.yml` workflow typechecks then runs
   `amondnet/vercel-action` with `--prod`. Git push is the only trigger.
   The root `vercel.json` (`rootDirectory: "apps/web"`) drives the build.

## Option B — Vercel Git integration (no custom workflow)

1. Import the repo into Vercel.
2. Use the existing `vercel.json`:
   - Set **Root Directory = `apps/web`** → Vercel builds only the web app
     (build runs `prebuild` migrate, then `next build`).
   - Or use the root `vercel.json` (`rootDirectory: apps/web`,
     buildCommand `cd ../.. && pnpm db:migrate && pnpm --filter @hoichoi/web build`).
   - `outputDirectory: ".next"` (+ `/media/**` and `/_next/static/**` cache headers).
3. Add the env vars above. Vercel auto-detects Next.js.

## Common mistakes

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot find module '@hoichoi/db'` | Uploaded only `apps/web`, not the whole repo | Push the entire monorepo (packages/ must be present) |
| `Lockfile is up to date` build error | Frozen lockfile mismatch | Already handled (`--no-frozen-lockfile` in root `vercel.json`) |
| `file:./data/...` DB errors on Vercel | Used `file:` URL | Use a remote Turso `libsql://` URL |
| `ADMIN_AUTH_SECRET is required` | Missing env var | Add the env var to Vercel project settings |
| Build succeeds but site is blank | No posts yet / wrong DB | Run migrate + seed against the remote DB |

## Local pre-flight (matches CI)

```bash
pnpm install
pnpm --filter @hoichoi/web typecheck
pnpm --filter @hoichoi/web build
```

## Notes

- **Content manager:** `/admin/posts` lets editors update any post's title, body,
  summary, category, case status and published date/time, show/hide it
  (`published`/`removed`), or delete it (admin only). Every change is logged in
  `admin_actions` (target_table `posts`). Editing a title keeps the stable slug
  (URL unchanged). Content lives in the shared Turso DB, so edits reflect on the
  public site immediately.
- **Moderation split (posts vs comments):** the admin console has two separate
  queues — **কনটেন্ট মডারেশন** `/admin/moderation` (posts: pending/approved/blocked
  tabs, batch approve/block, the double-approval enforcement, inline edit) and
  **মন্তব্য মডারেশন** `/admin/comments` (same `ModerationTable` over the `comments`
  table). `pending_comments` is counted as its own urgent badge in the admin nav
  and the `/admin/notifications` dropdown, and appears in the desktop desk's
  pending badge too.
- **Data control:** `/admin/backup` (admin) adds a content-level export/import
  and a full reset. **Export** downloads a plain-JSON snapshot of all content
  tables (posts, sources, settings, configs, logs — never credentials); HTTPS is
  the transport encryption. **Restore** uploads such a JSON file and replaces
  the live tables row-by-row. **Reset** wipes content/logs and re-seeds
  settings/categories/providers/blocklist defaults while keeping the admin
  user. The desktop app offers the same operations plus credential-bearing,
  passphrase-encrypted backups and one-click local↔Turso sync (see
  `docs/DESKTOP.md`). Separately, the **ভিজিবিলিটি** tab's **⟲ ডিফল্টে রিসেট**
  button restores only the `app_config_json` visibility/maintenance knobs to
  `DEFAULT_APP_CONFIG` — it is non-destructive and never touches content,
  categories or providers (the desktop Settings panel has the same button).
- **Centralized branding:** the `settings` row (Turso) now carries the site
  identity — `site_name`, `slogan_bn`, `tagline`, `logo_url`, `favicon_url`,
  `accent_color` — edited from the web admin settings screen **or** the desktop
  (cloud sync), one shared source for web metadata, masthead and footer. Always
  run `pnpm --filter db migrate` (or the app's first boot) against the Turso DB
  once so the new branding columns are added to an existing `settings` table.
- **Advertisement slots:** four nullable `ad_*` columns on the same `settings`
  row (`ad_leaderboard_html`, `ad_strip_html`, `ad_infeed_html`,
  `ad_rect_html`). The web admin settings screen's *বিজ্ঞাপন স্লট (Ad slots)*
  section accepts raw ad-network HTML; an empty slot renders the default sponsor
  card (matches `mockup/src/components/ad-slot.tsx`), a filled one renders the
  pasted code live on the homepage leaderboard/strip/infeed and the article
  page's 300×250 rect. Admin-pasted `<script>` tags are re-injected client-side
  so AdSense/Adsterra-style units execute after hydration.
- **Live home graph** — the homepage renders the mockup *"হৈচৈ চলছে। দেখুন
  সংখ্যায়।"* analytics section. Endpoint `GET /api/stats?range=24h|7d|all`
  (this project's `/api/stats` route) recomputes an `AnalyticsSnapshot` from the
  database on every call (`packages/db::analyticsSnapshot`: collected/published
  trend series, content donut, per-category bars, collector status from the latest
  pipeline run, DB latency; approved-comment counts use `comments.created_at` —
  the `comments` table has no `reviewed_at` column). The client provider
  (`components/home/live-data.tsx`) polls it every 10 s with pause / range /
  refresh controls. Because the page has `revalidate = 300`, users see a
  stale-safe snapshot instantly on load, then the graph goes live after hydration.
- **Visitor announcements (bell + banner)** — a `notices` table (migration
  `008_notices.sql`, created by `ensureNoticesTable` and `pnpm db:migrate`) drives two
  public surfaces: the **NotificationsBell** in the TopBar (dropdown of every active,
  un-expired notice — dismissible, remembered in `localStorage["hoichoi.notice.read"]`)
  and the **NoticeBanner** above the masthead for the single *pinned* notice
  ("special notice", dismiss-cached in `localStorage["hoichoi.notice.dismissed"]`, both
  keyed by `updated_at`). Notices carry a tone (`info|success|warn|alert`), optional
  `url` and `expires_at`. Managed from the web admin **`/admin/notices`** page
  (`AdminNotices` + tone chips) via **`GET/POST /api/notices`** and
  **`PATCH/DELETE /api/notices/[id]`** (admin-only), or from the desktop app's
  Settings → নোটিশ tab (runner `notice` CLI, `created_by: "desktop"`). The
  `Notice`/`NoticeTone` types live in `@hoichoi/shared-types`.
- **Footer customization + admin login log (migration `009_footer_loginlog.sql`)** —
  two new settings surfaces share the same `settings`/`category_configs`/`admin_login_log`
  tables with the desktop app:
  - `settings.footer_about_bn` (blank = site default paragraph) and a per-category
    `category_configs.show_in_footer` flag drive the public site **Footer**: `<Footer />`
    now renders `getSettings()` + `listFooterCategories()` instead of the hard-coded
    category map, so editors can hide/show categories and rewrite the "about" blurb
    without a deploy. Columns/toggles are editable from the web admin
    (`SettingsForm` *ফুটার "সম্পর্কে" অনুচ্ছেদ*; `CategoryManager` *পাবলিক ফুটারে
    দেখান*) and from the desktop Settings → সাইট/বিভাগ tabs (runner passes
    `--footer`).
  - `admin_login_log` records **every** web-admin sign-in attempt (email, ok/fail,
    `x-forwarded-for`/`x-real-ip`, user-agent, message) from `POST /api/auth/login`
    via `logAdminLogin` in `@hoichoi/db`. The web admin **লগ** page
    (`/admin/logs`) gains a **LoginLogViewer** table (refresh / delete one / clear
    all) wired to `GET`/`DELETE /api/admin/login-log`; the desktop Settings → অ্যাডমিন
    tab reads the same rows through the runner `loginlog list|delete|clear`.
- **Web-visibility gating (`settings.app_config_json`)** — the `settings` row carries a
  JSON `SiteAppConfig` (fields `show_hero`, `show_live_graph`, `show_categories`,
  `show_ads`, `show_rewrite_engine`, `show_footer`,
  `theme_default`, `surge_threshold`, `ai_hero_images`, **`maintenance_mode`**,
  and the three feed-count knobs `home_post_count` / `detail_similar_count` /
  `comments_show_count`) parsed with `parseAppConfig` (deep-merging the nested
  `maintenance` subtree via `parseMaintenanceConfig`) in `@hoichoi/db`
  and honored by the public homepage — it gates the hero, the lead story, all three
  ad slots + the infeed (`ArticleGrid ads={cfg.show_ads}`), the live-analytics strip,
  the category chips, the pipeline/rewrite showcase band and
  the footer. "Off" hides the section entirely (ads included — not just the default
  sponsor card). The count knobs drive the homepage pagination size, the
  post-page "একই বিভাগে আরও" grid and `/api/comments` + the post page's initial
  approved-comment count. Edited from the web admin settings **tabbed console**
  (সাইট / ভিজিবিলিটি / বিজ্ঞাপন / রক্ষণাবেক্ষণ / অপারেশন — one PATCH to
  `/api/settings`) or the desktop's সাইট ও বিজ্ঞাপন tab; both persist the same
  `app_config_json` to the shared settings row.
- **Maintenance mode** — flipping `maintenance_mode` (ভিজিবিলিটি tab) renders the
  full mockup-faithful **maintenance screen** to logged-out visitors
  (`apps/web/src/components/maintenance/MaintenanceScreen.tsx` — self-contained
  `mc-*` CSS + tokens so the site theme can't wash it out) while signed-in admins
  keep normal access (checked in `(site)/layout.tsx`). The screen shows live stats
  (`statsSnapshot` collectedToday/published/duplicatesBlocked + `countReviewQueues`
  pending comments) and the last pipeline run. Two public forms let visitors
  **subscribe** (`POST /api/maintenance/subscribe`, unique email → `subscribed` /
  `duplicate`) or **send a message** (`POST /api/maintenance/contact`) into new
  `maintenance_subscribers` / `maintenance_messages` tables (`ensureMaintenanceTables`),
  whose counts appear on the admin Settings → অপারেশন tab as the রক্ষণাবেক্ষণ ইনবক্স
  snapshot. The screen's whole appearance and copy are editable live — colors,
  theme variant (`editorial`/`newsprint`/`midnight`/`aurora`), progress bar value/
  label, countdown datetime, ticker, contact/socials, effects, SEO — in the
  রক্ষণাবেক্ষণ tab (`MaintenanceEditor`, real-time `<MaintenanceScreen preview>`),
  and share a single `<SiteAppConfig>` save. `robots.txt` de-indexes while active.
- **Breaking-news ticker** reuses the mockup marquee: `.ticker-track` in
  `apps/web/src/app/globals.css` is `display:flex; width:max-content` with a
  52 s linear loop (hover pauses) so the headline strip scrolls seamlessly.
- **Theme toggle + default seeding** — both web and desktop now implement a
  dark/light theme switch (`localStorage["hoichoi-theme"]` = `dark`/`light`, honors
  `prefers-color-scheme: light` by default). The web uses CSS variables on
  `:root` / `html[data-theme="dark"]` (palette from `mockup/public/option-a.css`)
  and injects a no-FOUC inline script in `apps/web/src/app/(site)/layout.tsx`; a
  `ThemeToggle` component sits in the TopBar and in the admin TopBar. The **default
  theme is seeded** from `settings.app_config_json` (`theme_default`) whenever the
  visitor has no saved theme — the inline script sets `data-theme` from that setting,
  and `ThemeToggle` prefers an existing `data-theme` attribute over the OS preference.
  The desktop mirrors the same variable-based tokens
  (`apps/desktop/src/index.css` `:root` + `html[data-theme="light"]`) with a toggle
  in the TitleBar. Contrast: the bright `--lime #c8f65d` / `--amberx #f5b800` accents
  are replaced in **light** mode by web (`:root` → `#5f8f0e` / `#b45309`) and desktop
  (`.text-lime` / `.text-amberx` overrides) so green/amber chips stay readable on
  cream paper. Admin console remains dark-only by design.
- **Single admin link** — only one admin-console link exists (TopBar nav);
  the footer chip and the live-analytics footnote link were removed to satisfy
  the "one link" rule.
- **Admin console shell** — `/admin/*` renders inside a persistent `AdminShell`
  sidebar (dashboard, sources, **কনটেন্ট মডারেশন**, **মন্তব্য মডারেশন**, posts, providers,
  notices, submissions, removals, reports, archive, backup, logs, **tabbed settings** —
  with a "মন্তব্য মডারেশন" jump link on the sidebar top); the category editor lives on
  a standalone `/admin/categories` page (same `CategoryManager` component the desktop
  desk uses). The sidebar/notification badges are driven by `countReviewQueues()`,
  which now includes a separate `pending_comments` count. `/admin` is the
  dashboard home: the shared `@hoichoi/dash` five-tab dashboard (সারসংক্ষেপ ·
  বিশ্লেষণ · পাইপলাইন · ইনসাইট · কনটেন্ট ডেস্ক) built server-side from
  `@hoichoi/db` and rendered by the same `DashboardView` the desktop **মনিটর**
  tab uses; the shell mirrors the desktop desk chrome and
  its TopBar has the `ThemeToggle` + logout. Reader reports from `/api/reports`
  (public post) land in the `/admin/reports` queue with open → reviewed/dismissed
  transitions.
- **Public report + comments parity** — the post page uses the mockup reader
  report form (nobody but the admin queue sees it) and the mockup comments block;
  the `/api/reports` route validates the shared `REPORT_REASONS` list; `/api/comments`
  accepts an optional mandatory email and drops honeypot-filled submissions.
- **Desk preview (`/desk`)** — `apps/web/src/app/desk/page.tsx` renders the
  desk-console chrome (`DeskShell` with the `--ds-*` desk palette) as an
  in-browser preview of the Tauri desktop app. It is linked from the TopBar nav,
  the home hero, the footer, and the admin shell sidebar. It is decorative client
  chrome (no runner access in the browser) — the same UI in `apps/desktop` is the
  real controller.
- **Admin login auto-provisions** — `/api/auth/login` now upserts an `admin_users`
  row on first successful code login (`INSERT OR IGNORE ... role='admin'`),
  so newly minted desktop codes work immediately without a pre-seeded email row.
- The public rolling-window pages use ISR (`revalidate = 300`, matching the
  `ARCHIVE_VISIBLE_DAYS` / ISR window from the docs), so Vercel serves cached
  HTML and revalidates in the background.
- Sitemap: `apps/web/src/app/sitemap.ts` lists static + category + live post
  URLs; add a production `SITE_URL` so links are absolute.

---

## v1.1.9 — dashboard live controls, variant switcher, provider purpose

- **Dashboard ⟲ রিফ্রেশ / ▶ পাইপলাইন চালান:** `/admin` (the shared
  `@hoichoi/dash` home) now re-snapshots via `GET /api/admin/dashboard?range=24h|7d|all`
  and can start a run via `POST /api/admin/run-pipeline`. Without a configured
  deploy hook that route returns `501 { local: true, setupGuide: "/admin/setup" }`
  and the UI points to the desktop runner. A started run is polled through
  `GET /api/admin/runs?limit=1` until a new terminal `completed`/`failed` row
  appears, then a toast fires. Range changes push `/admin?range=…` (server-rendered).
- **Section variant switcher:** the switcher now lives in Settings → **ডিজাইন**
  (`/admin/settings?tab=design`; `/admin/appearance` redirects there), rendered
  full-width with a **live preview**. Previewing writes a short-lived cookie via
  `PUT /api/admin/preview` and overlays the preset in memory (no DB write); saving
  persists the per-section rows (`GET`/`PUT /api/admin/sections`) and **⟲ ডিফল্টে
  ফিরুন** resets both `settings.default_variant` and every section row. The live
  design is the `default` variant until an operator opts into a ported variant.
  `PUT` is admin-role only.
- **Provider purpose:** `/admin/providers` tags each provider `text` or `image`
  (and supports a multi-key `api_key` override), storing `llm_providers.purpose`
  so the rewrite chain and AI hero-image `ImageResolver` resolve independently.
- **Theme + overflow:** `html[data-theme="light"]` themes the shared `.hoichoi-dash`
  dashboard; page/chrome overflow is clipped so the maintenance overlay and ticker
  no longer create a stray horizontal scrollbar.
- **Self-hosted fonts:** the four Google fonts (Noto Serif Bengali, Hind Siliguri,
  Space Grotesk, JetBrains Mono) are committed under `apps/web/public/fonts/` with
  their `@font-face` rules in `apps/web/src/app/fonts.css`, and the family tokens
  are declared in `globals.css` `:root`. `next/font/google` was removed so the
  Vercel build no longer fetches `fonts.googleapis.com` (that fetch failed
  intermittently and broke deploys). To refresh a font, re-pull its CSS from the
  Google Fonts API and re-download the `fonts.gstatic.com` woff2 files.

## v1.1.10 - first-party traffic analytics (no new env vars)

The web app now records anonymous traffic and serves an admin analytics console.
Nothing here needs configuring on Vercel:

- **Ingest.** The site layout renders `TrafficTracker`, which beacons page views to
  **`POST /api/track`**; `AdSlot` beacons ad `view`/`click` events to the same route.
  The route reads geography straight from Vercel's injected request headers
  (`x-vercel-ip-country` / `-country-region` / `-city`, `cf-ipcountry` fallback) — so
  country data is populated **only** when deployed on Vercel; elsewhere it degrades
  to "Unknown" but never errors. No raw IP is stored (a daily-rotating SHA-256
  fingerprint is used), so there is no cookie banner and no GDPR data-processor
  to add.
- **Tables.** `page_views` + `ad_events` are created by `ensureTrafficTables` during
  `ensureSchema`, so a fresh deploy self-migrates. For the explicit migration path
  run `pnpm --filter db migrate` (applies `migrations/011_traffic.sql`).
- **Read.** `GET /api/admin/traffic?range=24h|7d|30d` (admin-only) returns a
  `TrafficSnapshot`; it is rendered on the **admin dashboard** (`/admin`) inside the
  extra tab **ট্রাফিক ও স্টোরেজ** (dashboard tab id `traffic`), via the shared
  `TrafficView`. There is no standalone `/admin/traffic` route any more — the old
  page was folded into the dashboard so all five dashboard tabs plus traffic/storage
  live in one place.
- **No environment variables** are required for any of this. (Optional: if you ever
  front the site with Cloudflare instead of Vercel's edge, the `cf-ipcountry`
  fallback keeps country reporting working.)

## v1.1.10 - storage analytics, default image, gallery, and settings updates

- **Storage analytics.** The dashboard's **ট্রাফিক ও স্টোরেজ** tab renders the shared
  `StorageView` (below the traffic panels) from `GET /api/admin/storage`
  (`storageSnapshot`): DB size + largest tables, the on-disk media tree with a
  daily byte series, and remote blob counts per adapter. Remote byte sizes are
  estimates; the panel says so.
- **Default post image + brand animation.** Settings → সাইট exposes
  `default_post_image` (stamped onto media-less posts at the data layer by
  `withDefaultImage(s)`) and `brand_animation` (`none|fade|typewriter|shimmer|slide`,
  applied to the home Hero wordmark/logo). Both persist in `app_config_json`.
- **Multi-image posts.** New `post_images` table (`ensurePostImagesTable` during
  `ensureSchema`; `migrations/012_post_images.sql` for `pnpm --filter db migrate`).
  The pipeline mirrors every source image (cap 8), operators manage extras in the
  post editor (`POST/PATCH/DELETE /api/posts/[id]/images`), and the public post
  page shows a thumbnail strip + full-page lightbox under its unchanged hero.
- **Admin shell.** The admin sidebar is now grouped and collapsible (persisted
  state) with a mobile drawer.