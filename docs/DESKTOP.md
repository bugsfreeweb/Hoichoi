# Hoichoi Desk — Native Desktop App (self-contained)

`apps/desktop` is a **Tauri 2** native app (Rust backend + React/Vite frontend).
It is the desktop admin + local collector controller and is kept **separate**
from the web app (`apps/web`) so the web build you upload to Vercel never
touches desktop/scraper code (see `docs/DEPLOY_WEB.md`).

## How the app is self-contained

The desktop runs the collector pipeline **without any external tooling** (no
monorepo checkout, no `pnpm`, no Playwright browser download) because it ships a
**portable pipeline runtime** built into the installer:

1. `run_pipeline` (backend, `src-tauri/src/commands.rs`) spawns
   `runner/node.exe runner/app/cli.cjs scrape` when a runner is staged; in dev
   (no runner) it falls back to `pnpm run scrape` at the repo root.
2. The runner uses the **system-installed Microsoft Edge** (`channel: "msedge"`
   via `HOICHOI_USE_SYSTEM_BROWSER=1`), so no Chromium download is needed.
3. `tauri.conf.json` bundles the whole `resources/runner/` dir (`bundle.resources`
   map `"resources/runner": "runner"`) into the installer.
4. Runtime paths are set by the host: `HOICHOI_MIGRATIONS_DIR` (bundled SQL),
   `HOICHOI_MEDIA_ROOT` (app-data), and by default
   `TURSO_DATABASE_URL=file:<app_data_dir>/hoichoi.db` unless the user configured
   a Turso remote in the keychain (or a `.env` file is found — see below).

### Runner env precedence

Every runner spawn (`run_runner` in `src-tauri/src/commands.rs`) builds its env
in a strict order, so the desktop behaves like the web/CLI on the same machine:

1. **Keychain vault** values (human-friendly names mapped by `src/lib/vault.ts`
   — the table below) win for any key that is stored there.
2. **`.env` file fallback** for keys the vault does not provide — discovered at
   (in order) `cwd`, the monorepo root (dev), or next to the app exe (installed
   beside a `.env`). Simple `KEY=value` lines only; quoted values are unquoted.
3. **Local file DB default** — if still no `TURSO_DATABASE_URL`/`DATABASE_URL`,
   the runner targets `file:<app_data_dir>/hoichoi.db` (migrations seeded by the
   bundled SQL). Installed without any cloud config therefore runs fully local.

So in a dev checkout with a root `.env` containing `TURSO_DATABASE_URL` +
`TURSO_AUTH_TOKEN`, admin codes, moderation, queue/sources and `sync push/pull`
all hit the same **cloud** DB the web app reads — no keychain entry needed. Add
the creds to the keychain (*Settings → Keychain*) for machines without a `.env`.
The dev fallback spawn passes each CLI argument **verbatim**
(`cmd /D /S /C pnpm --filter @hoichoi/scraper exec tsx src/cli.ts "admin-code" …`
via `raw_arg`, no shell re-quoting), so commands like `admin-code`/`moderation`
are never mangled into `unknown command`.

### Keychain → runner env mapping

The Stronghold keychain stores human-friendly names; `src/lib/vault.ts`
translates them to the env vars the runner actually reads:

| Keychain name        | Runner env var        | Notes                         |
| -------------------- | --------------------- | ----------------------------- |
| `turso_url`          | `TURSO_DATABASE_URL`  | cloud DB when sync ON         |
| `turso_token`        | `TURSO_AUTH_TOKEN`    | cloud DB when sync ON         |
| `fb_session_cookie`  | `FB_SESSION_COOKIE`   | Facebook session for scraping |
| `GOOGLE_API_KEY`     | `GOOGLE_API_KEY`      | LLM                           |
| `GROQ_API_KEY`       | `GROQ_API_KEY`        | LLM                           |
| `OPENROUTER_API_KEY` | `OPENROUTER_API_KEY`  | LLM                           |
| `OLLAMA_BASE_URL`    | `OLLAMA_BASE_URL`     | LLM                           |
| `github_pat`         | — (not an env)        | pushed to GitHub Actions secret |
| `github_repo`        | — (not an env)        | Actions deploy repo           |
| `fb_cookie_expires`  | — (not an env)        | cookie expiry hint            |
| `use_cloud`          | — (toggle)            | `"1"` = cloud, `"0"` = local  |

## Centralized site settings & branding (web + desktop)

Site branding lives in the **same Turso `settings` row** the web app renders, so
editing it once reflects immediately on web **and** desktop (no GitHub upload):

- **Cloud sync toggle (default ON):** settings screen → *Database sync*.
  ON = the runner writes to the shared Turso DB the web app reads; OFF = the
  runner writes to the local file DB (manual/resync mode). Toggling just
  enables/disables `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` in the run env.
- **Branding editor:** settings screen → *Site branding* — `site_name`, `slogan`,
  `tagline`, `logo_url`, `favicon_url`, `accent_color` (hex). Saved through the
  runner (`settings:set`), so the web masthead/footer/metadata update immediately.
- **Ad slots:** settings screen → *বিজ্ঞাপন স্লট (Ad slots)* — paste raw ad-network
  HTML/JS for `ad_leaderboard_html` (homepg top), `ad_strip_html` (homepg bottom
  dark bar), `ad_infeed_html` (grid every 4th item), `ad_rect_html` (post page).
  Empty slot → default sponsor card; non-empty → the admin HTML renders live on
  web (scripts re-injected for AdSense/Adsterra-style tags). The dedicated
  **বিজ্ঞাপন (Ads)** tab (`screens/Ads.tsx`) is a larger mockup-style editor for
  the same four slots — toggle switches, per-slot HTML textareas, save (writes
  non-empty fields only) and reset-to-defaults.
- New runner CLI: `settings` (JSON dump) and `settings:set k=v …` (whitelisted
  keys, `key=` clears a nullable field).
- Backend commands: `settings_get` / `settings_set` (Rust) + `settingsGet` /
  `settingsSet` (`src/lib/tauri.ts`).

## Encrypted backup, reset & one-click sync (desktop)

The settings screen's *ব্যাকআপ, রিসেট ও সিঙ্ক* panel gives full data control
through the bundled runner (new CLI subcommands: `backup export`,
`backup import <file>`, `reset`, `sync <direction> --from <url> --to <url>`):

- **Export backup** — AES-256-GCM (scrypt PBKDF2) encrypted snapshot of settings,
  content, config **and keychain credentials** written to
  `<app_data>/hoichoi-backup-<epoch>.json`. The passphrase is typed in the UI and
  passed only via the `HOICHOI_BACKUP_PASS` env var (never argv/disk).
- **Restore backup** — decrypts + replaces the current DB row-by-row (`INSERT OR
  REPLACE`, parents first). Without a file it restores the most recent
  `hoichoi-backup-*.json`. Passphrase required.
- **Reset content** — wipes posts/actions/logs and resets settings + categories +
  AI providers + blocklist to seed defaults; the admin account is kept.
- **Push local → cloud / Pull cloud → local** — one-click table-level sync between
  the local file DB (`<app_data>/hoichoi.db`) and the shared Turso cloud DB
  (`TURSO_DATABASE_URL` from the keychain). Merges are `INSERT OR REPLACE` by
  primary key; `admin_sessions` is never copied. Since the multi-category fix,
  sync covers **14 tables** — `sources`, `category_configs`, `source_categories`,
  `llm_providers`, `redaction_blocklist`, `raw_posts`, `posts`, `comments`,
  `reader_reports`, `submitted_pages`, `removal_requests`, `admin_users`,
  `admin_actions`, `settings` (see `CONTENT_TABLES` in
  `packages/db/src/transfer.ts`).
- Backend commands: `backup_export` / `backup_import` / `reset_db` / `sync_db`
  (Rust, `src-tauri/src/commands.rs`) + matching `backupExport` / `backupImport`
  / `resetDb` / `syncDb` (`src/lib/tauri.ts`).
- The web admin console has a parallel content-level export/import/reset page
  (`/admin/backup`) that never includes credentials (see `docs/DEPLOY_WEB.md`).

The runner **must** be rebuilt for these commands to exist in the bundled app:
run `pnpm --filter @hoichoi/desktop bundle:runner` before `tauri build`.

## Admin access — one-time login codes (no password)

The web admin no longer uses a password. The desktop app mints **one-time login
codes** (desktop → browser flow):

- **Settings screen → *Admin access* panel** — enter an admin email
  (`admin_users` email, e.g. `admin@hoichoi.local`), optionally a label, and hit
  ✦ কোড তৈরি. The **8-character code** is shown once in the UI with a Copy
  button; it is stored as a SHA-256 hash in the new `admin_login_codes` table.
- Codes are valid **10 minutes**, usable **exactly once** (atomic guarded UPDATE),
  and can be revoked from the panel's list before use.
- Web login (`/admin/login`) takes **email + code** only; `/api/auth/login`
  consumes the code atomically, then creates the standard 7-day session cookie
  (`admin_sessions` + `hoichoi_session`). No `verifyPassword` call anymore —
  `password_hash` on `admin_users` is legacy/ignored.
- Runner CLI: `admin-code create <email> [--label]`, `admin-code list`,
  `admin-code revoke --id <id>`. Backend command: `admin_codes` (Rust) +
  `adminCodes` (`src/lib/tauri.ts`).
- DB migration `packages/db/migrations/002_admin_login_codes.sql`; `ensureSchema`
  also creates the table on the desktop / runner side.

## Dynamic categories (desktop + web)

Categories are no longer fixed to the original 3. The `category_configs` table is
the source of truth; `sources.category` retains a primary slug for backward
compat but the **`source_categories`** junction carries the full membership.

- **Desktop category manager:** Settings → বিভাগ tab → `<DeskCategoryManager />`
  component. CRUD through the runner CLI (`categories add --slug … --name-bn …
  --name-en … [--dot "#hex"] [--sort N]`, `categories update --slug …`, `categories
  delete --slug …`).
- **Web category manager:** `/admin/categories` → `<CategoryManager />`
  (`apps/web/src/components/admin/CategoryManager.tsx`). Same CRUD.
- **Source assignment:** Watchlist add-form shows per-category chips + "সব
  বিভাগ"; posts inherit category from the source's primary entry.
- **Schema upgrade:** `ensureNoStaticCategoryChecks()` in
  `packages/db/src/client.ts` idempotently rebuilds `sources`, `posts` and
  `submitted_pages` on legacy databases to drop the leftover
  `CHECK (category IN (...))` constraints that prevented custom categories
  (SQLite cannot ALTER DROP a constraint; the table is recreated). Fresh
  databases get the constraint-free `001_init.sql` directly. Applied by both
  `ensureSchema` (runner) and `pnpm db:migrate`.

## Building a standalone (bundled) desktop app

Prerequisites (one-time, on your machine — this needs the desktop toolchain):

```bash
cd <repo>                      # monorepo root
pnpm install

# 1) Build the web+mobile-ready frontend (React/Vite -> dist)
pnpm --filter @hoichoi/desktop build

# 2) Build & stage the portable pipeline runner (`bundle:runner` bundles the
#    scraper CLI with esbuild, copies node.exe + migrations, and installs the
#    runtime natives sharp/@libsql/client/playwright/ffmpeg-static via npm):
pnpm --filter @hoichoi/desktop bundle:runner

# 3) Build the native installer (Windows target on this machine)
pnpm --filter @hoichoi/desktop tauri build
```

Notes:
- `bundle:runner -- --refresh` reinstalls the runtime `node_modules`.
- A prebuilt runner can still be staged instead via `HOICHOI_RUNNER` (and
  `HOICHOI_RUNNER_NODE` for an embedded Node dir).
- Running the bundled `cli.cjs` by hand (outside the app) needs
  `HOICHOI_MIGRATIONS_DIR=<runner>/app/migrations` — the Tauri host sets it
  automatically, but standalone debug runs don't.

Output: `apps/desktop/src-tauri/target/release/bundle/{nsis,msi}/...` and
`target/release/*.exe`. The packaged app contains the runner + Node runtime and
runs fully standalone (only requires the Microsoft Edge WebView2 runtime, which
Windows 11 ships by default).

## Dev workflow (no bundling)

```bash
pnpm --filter @hoichoi/desktop dev        # Vite frontend (port 1420)
pnpm --filter @hoichoi/desktop tauri dev  # Tauri windows shell
```

In dev the pipeline button runs the repo scraper; configure keys via the
Stronghold keychain (Setup Wizard) and the Turso DB URL (default
`file:<repo>/data/hoichoi.db`, override with `TURSO_DATABASE_URL`). The vault
mapping table above still applies — older installs that entered `turso_url` /
`turso_token` under the old names now sync correctly to
`TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`.

## Layout

```
apps/desktop/
├── src/                 React + Vite frontend (screens, components, lib)
├── scripts/             build helpers (bundle-runner.mjs)
└── src-tauri/
    ├── src/             Tauri (Rust) backend commands
    ├── resources/runner  staged self-contained runner (bundled, gitignored)
    └── tauri.conf.json   window, bundle targets (nsis/msi), resources
```

## Keeping web & desktop separate

- The desktop **must not** be imported by the web app. The web app's only
  shared dependency is `@hoichoi/db` (Turso), `@hoichoi/llm`,
  `@hoichoi/shared-types`, and `@hoichoi/dash` (the shared dashboard UI).
- Vercel ignores `apps/desktop/` and `apps/scraper/` via `.vercelignore` and
  builds only `apps/web` (see `docs/DEPLOY_WEB.md`).

## Mockup parity (desk)

The desktop UI mirrors the `mockup/` desk controller exactly:

- **Theme toggle** — desktop mirrors the mockup `option-a` dark/light switch
  (same `localStorage["hoichoi-theme"]` key, same prefers-color-scheme fallback).
  Implemented as CSS-variable tokens (`night`, `night-grid`, `panel`, `window`,
  `main-tx`, `grid-line`, `field-bg`, `desk-bg`) on `:root` (dark) +
  `html[data-theme="light"]` in `apps/desktop/src/index.css`; no-FOUC script in
  `index.html`; a `ThemeToggle` component in the TitleBar. All hard-coded dark
  surfaces (`bg-[#...]`, `.desk-scene`, `.bg-night-grid`, `.titlebar`, scrollbars)
  flip via the light override block; live-log terminals (`bg-[#07090d]`) stay dark
  in both themes to preserve log-colour contrast.
- **Frameless window** — `decorations: false` + custom option-a chrome
  (traffic lights: close → opens the admin site, minimize / maximize via local
  state + `#dockRestore` docked restore button), min width 1100.
  `tauri.conf.json`, `capabilities/default.json` (window permissions).
  The window chrome (`win`/`titlebar`/`traffic`/`wintitle`/`winctl`/`menubar`/
  `winbody`/`side`/`sidenav`/`side-foot`/`maincol`/`mtabs`/`stage`/`statusbar`/`sb`)
  is ported verbatim from `mockup/public/option-a.css` into `apps/desktop/src/index.css`;
  there are no child console windows — every runner/spawn (pipeline, taskkill,
  admin link, `cmd` dev fallback) uses `CREATE_NO_WINDOW` (`commands.rs::hide_console`).
  The sidebar foot no longer shows a hard-coded `dataSrc` text line — the active
  DB (`TURSO`/`LOCAL`) badge lives in the statusbar, derived from the real
  `dbDriver` state (`src/lib/tauri.ts`).
- **8-tab console** — Monitor / Watchlist / Queue / Collector / Vault / Settings /
  Moderation / **Ads** with keyboard shortcuts **1–8** (inline `TabButton` in a
  `sidenav`), inline menubar (ফাইল/সোর্স/রান/ভল্ট/সাহায্য) and a statusbar
  (TAURI 2.1 · `TURSO`/`LOCAL` DB badge · Hoichoi clock). The titlebar `em`
  reads `TAURI 2.1` and the menubar shows a `1–8 TABS` kbd hint on the right —
  the older "· OPTION A" / "PURE HTML" badges are gone so the chrome matches
  `mockup/src/components/desk/shell.tsx` exactly. Shell: `src/App.tsx`
  (option-a classes).
- **Sync bar** — `components/DeskSyncBar.tsx` sits between the menubar and the
  console body, copying `mockup/src/components/desk/sync-controls.tsx`: a pending
  badge (counts queue rows whose status is `pending_review`/`approved`),
  স্মার্ট রিসিঙ্ক (auto — push when pending > 0, else pull), ডেস্ক → ওয়েব প্রকাশ
  (push), and ওয়েব → ডেস্ক (pull). Push/pull call `syncDb(direction, env)` from
  `lib/tauri` through the runner's `sync` command; last-push/last-pull times
  persist under `localStorage["hoichoi-sync-state"]` and the note shows the synced
  tables / rows affected / conflicts the runner returns.
- **Ads** — `screens/Ads.tsx` is the mockup "বিজ্ঞাপন ম্যানেজার" panel
  (`mockup/src/components/admin/ads-panel.tsx`) wired to the real `settings` ad
  slots via `settingsGet`/`settingsSet`: the four toggles, four HTML textareas,
  save and reset as described under *Centralized site settings & branding* above.
- **Monitor** — the মনিটর tab renders the **shared `@hoichoi/dash`
  `DashboardView`**, the exact same five-tab dashboard (সারসংক্ষেপ · বিশ্লেষণ ·
  পাইপলাইন · ইনসাইট · কনটেন্ট ডেস্ক) as the web admin home: KPI cards, area/bar/
  donut/radar/treemap/funnel charts, run history, source health, insights and the
  content queue. Unlike the web (which builds the model server-side from
  `@hoichoi/db`), the desk builds the `DashModel` **client-side**
  (`screens/Dashboard.tsx` → `lib/desk-model.ts`) from the runner's
  `stats`/`sources`/`queue`/`radar`/`categories` payloads, and its header actions
  map onto the App's existing run/refresh handlers. Every panel is bound to real
  rows — the old hardcoded pipeline-health list was removed.
- **Scroll** — every tab scrolls independently (all roots are `scroll-slim
  overflow-auto`); Vault and Settings got root scroll containers too.
- **Watchlist** — real source CRUD against the runner
  (`sources list|add|update|toggle|remove`), search + kind filter + add form, health bars,
  watching/paused states (`screens/Watchlist.tsx`). The add row offers **per-category
  chips + "সব বিভাগ"** (stored through the runner CLI's `--categories` into the
  `source_categories` junction, returned by `sources list` thanks to a new
  `GROUP_CONCAT` category subquery), each source renders its category sub-chips,
  dead sources (health `0`) show a red TriangleAlert pill, and the whole screen
  uses the `--ds-*` desk palette aliases in `apps/desktop/src/index.css` (defined
  for dark `:root` **and** `html[data-theme="light"]`) so it is mockup-identical
  in both themes.
- **Queue** — live status tabs (সব / প্রকাশিত / অপেক্ষমান / ডুপ্লিকেট) with real
  counts and a "view on site" link (`screens/Queue.tsx`).
- **Collector** — live stdout log (mockup log colors via `log-ok`/`log-warn`/
  `log-err`/`log-info` + `.log-warn` scan overlay) with Run / Stop; Stop terminates
  the child via `stop_pipeline` (Windows `taskkill /F /T`) (`screens/Collector.tsx`).
- **Vault** — KeyVault-style table of the AES-256-GCM credential store with
  reveal/copy per key, one-click copy-all `.env` (via the clipboard-manager plugin),
  **Download (.env)** writing to the Downloads folder through the `save_env_file`
  Rust command, and import of `.env` blobs (`screens/Vault.tsx`).
- **Settings** — mockup preference panels above the real functional panels (cloud
  sync, branding, admin codes, backup/reset/sync) (`screens/Settings.tsx`). The
  screen is organized into **11 pill tabs** (`.settings-tabs`, mirroring `.mtabs`)
  so the long settings page no longer scrolls endlessly:
  1. **প্রেফারেন্স** (Sliders) — cron, model, temperature, fact-gate and toggles.
     **Cron, temperature, and the fact-gate persist to the shared `settings` row**
     (via `settingsSet`) and have explicit **সংরক্ষিত করুন** buttons, so the web
     admin and the scheduled GitHub Actions run read the same values. This is a
     behavioural change from earlier versions, where all three lived only in
     `localStorage` and the providers hardcoded `temperature: 0.3` — the sliders
     looked live but changed nothing. `model` and the pipeline toggles remain
     local to the desk (they select which provider row the local runner uses).
  2. **সোর্স** (Rss) — inline source editing via `<DeskSourceManager />` (see below);
     the dedicated Watchlist screen still handles add/search.
  3. **বিভাগ** (Tags) — inline category CRUD via `<DeskCategoryManager />`:
     create (slug / Bn / En / description / dot color), edit, confirm-delete.
     Runs through the runner's `categories` CLI (`add`, `update`, `delete`,
     `list`).
  4. **AI প্রোভাইডার** (Cpu) — `<DeskProviderManager />` (see below).
  5. **নোটিশ** (Bell) — `<DeskNoticeManager />` — visitor announcements (see below).
  6. **ক্লাউড সিঙ্ক** (Database) — cloud/local toggle (`use_cloud` keychain
     entry) + One-Click Sync (`sync push` / `sync pull`). Push/pull now
     transfers **`source_categories`**, **`comments`** and **`reader_reports`**
     in addition to the original 10 tables (`CONTENT_TABLES` in
     `packages/db/src/transfer.ts`).
  7. **সাইট ও বিজ্ঞাপন** (Palette) — branding fields + four ad-slot HTML
     textareas (same as the old inline section) **+ the shared ওয়েব ভিজিবিলিটি ও থিম
     panel** (`app_config_json`). The panel has **Save visibility & theme** and a
     non-destructive **⟲ Reset to defaults** that restores `VIS_DEFAULTS`
     (`DEFAULT_APP_CONFIG` parity) and saves in one click — see below.
  8. **অ্যাডমিন** (UserCog) — one-time login codes **+ a লগইন লগ panel** (latest
     sign-in attempts through the runner `loginlog list|delete|clear`, same rows the
     web admin `/admin/logs` shows).
9. **ব্যাকআপ** (Archive) — backup / reset / resync (unchanged).
   10. **মিডিয়া স্টোরেজ** (Cloud) — media-adapter settings panel (unchanged).
   11. **API ভল্ট** (KeyRound) — vault fields table — see the Vault bullet's copy/
       download notes.
- **Moderation** — comment queue with pending/approved/blocked tabs and approve/block
  actions through the runner (`moderation list|set`) (`screens/Moderation.tsx`).
  Bulk approve/block counts progress (`done/total`) and reports **partial**
  results: each comment is a separate write, so a failure halfway through says
  how many landed rather than a blanket "failed" that hides which items still
  need attention.
- **GitHub Actions secrets panel** — Settings shows every credential the scheduled
  pipeline needs, with its presence, last-updated timestamp, and — crucially —
  **where to obtain it and what breaks when it is missing**, inline in Bangla.
  The catalogue is a standalone copy at `src/lib/secret-specs.ts` (the Tauri
  frontend is intentionally dependency-free) that mirrors
  `packages/shared-types/src/secrets.ts`, which backs the web `/admin/setup` page
  and [`docs/SECRETS.md`](./SECRETS.md). Update all three together.
- **Media capability is partial** — the Settings → মিডিয়া panel states this
  outright: **image** posts are fetched and stored under `/uploads`, **video**
  needs `yt-dlp` + `ffmpeg`, which the pipeline does not invoke, so video posts
  are skipped rather than failing. Previously a video post silently kept its
  Facebook URL with no error shown anywhere.
- **Inline source editing (`DeskSourceManager`)** — the Settings → সোর্স tab lets an
  editor open any existing source and edit its name, URL, kind, primary category,
  topics and Facebook id **in place** without re-creating the row (runs through the
  runner `sources update`); a `--is-active` flag soft-stops scraping. The Watchlist
  screen's add form remains the create path.
- **AI provider manager (`DeskProviderManager`)** — Settings → AI প্রোভাইডার mirrors
  the web admin provider table on the desk: list, add/upsert (preset key, display
  name, model, optional base-URL override, `api_key_env_var`, optional DB-stored key
  override, priority, free-tier/rewrite/embed flags, active toggle), enable/disable
  and delete. An **অটো-ফেচ** button probes the provider's `/v1/models` (Google's
  `v1beta/models`, OpenRouter filtered to `:free`) through the runner
  `providers models` and fills the model field — the identical flow to the web
  admin (see `ai-provider-strategy.md`).
- **Visitor announcement manager (`DeskNoticeManager`)** — Settings → নোটিশ CRUDs the
  shared `notices` table via the runner `notice` CLI (`add`/`update`/`toggle`/`remove`,
  tones `info|success|warn|alert`, optional link `--url`, auto-hide `--expires-at`).
  Pinned + active notices become the public site's header **special-notice banner**;
  all active notices feed the visitor **bell dropdown** — the same rows the web admin
  `/admin/notices` edits. Desktop-created notices set `created_by: "desktop"`. Requires
  migration `008_notices.sql` (bundled with the runner).
- **Footer branding + per-category footer visibility (migration `009_footer_loginlog.sql`)** —
  the Settings → সাইট ও বিজ্ঞাপন tab's branding editor gained
  `footer_about_bn` ("ফুটার `সম্পর্কে` অনুচ্ছেদ", multiline) and the Settings →
  বিভাগ tab (`DeskCategoryManager`) gained a **পাবলিক ফুটারে দেখান** toggle that
  passes `--footer true|false` to the runner `categories add|update`. Together they
  drive the public site's Footer nav (which categories appear) and its about blurb,
  exactly like the web admin's `SettingsForm`/`CategoryManager`.
- **Admin login log (migration `009_footer_loginlog.sql`)** — Settings → অ্যাডমিন tab
  lists the newest admin sign-in attempts (email, ok/fail, IP, message, time) read
  from the shared `admin_login_log` table via the runner `loginlog list`, with per-row
  delete and clear-all. Web-admin logins are recorded by `POST /api/auth/login`
  (`logAdminLogin` in `@hoichoi/db`); the web console's `/admin/logs` shows the same
  rows.
- **Web-visibility panel (`app_config_json`)** — the Settings → সাইট ও বিজ্ঞাপন tab
  includes a *ওয়েব ভিজিবিলিটি ও থিম* toggle grid (`show_hero`, `show_live_graph`,
  `show_categories`, `show_ads`, `show_rewrite_engine`, `show_footer`)
  plus `theme_default` (`light`|`dark`) and `surge_threshold`. Saving writes the whole
  `SiteAppConfig` JSON to the shared `settings.app_config_json` through
  `settingsSet { app_config_json: … }`, so the public web home sections switch
  instantly (and its sibling `VisibilityPanel` sits on the web admin settings page).
  Default theme seeds the site before hydration so first-time visitors don't flash.
- **Visibility count knobs** — the same panel gained three numbered inputs that
  drive the public feed sizes (clamped server-side to sane ranges on the web):
  `home_post_count` (home "আজকের সংগ্রহ" per page, 4–50),
  `detail_similar_count` (post-page "একই বিভাগে আরও" grid, 1–8) and
  `comments_show_count` (approved comments rendered before "আরও দেখুন", 1–50).
  These match the web admin's ভিজিবিলিটি tab and are saved with the same
  `app_config_json` blob.
- **API ভল্ট clipboard/download** — "সব কপি করুন (.env)" and the per-key copy
  buttons now write through the `tauri-plugin-clipboard-manager` (falling back to
  `navigator.clipboard`), which works reliably on the Windows webview. "Download
  (.env)" no longer tries a blocked webview blob download: a new Rust command
  `save_env_file` (`commands.rs`) writes the exported env to the user's
  **Downloads** folder and shows the written path in the vault header.
  (The Import/Download icons were also swapped so "Import" shows an upload arrow
  and "Download" a download arrow.)
- **Runner desk CLI** — new subcommands `stats`, `sources`, `queue`, `moderation`,
  `loginlog`, `cleanup temp` (all `apps/scraper/src/cli.ts`). Backend passthrough `desk_call`
  (Rust) + wrappers `deskCall`/`deskSources`/`deskQueue`/`deskStats`/`deskModeration`/
  `deskModerationSet`/`deskLoginLog`/`deskLoginLogDelete`/`deskLoginLogClear`
  (`src/lib/tauri.ts`). `sources` gained columns `kind`, `fb_id`,
  `topics`, `health` (added idempotently by `ensureDeskColumns` in
  `packages/db/src/client.ts`).

## Rebuilding the installer

```bash
pnpm --filter @hoichoi/desktop build          # tsc + vite
pnpm --filter @hoichoi/desktop bundle:runner  # stage self-contained runner → resources/runner
pnpm --filter @hoichoi/desktop tauri build    # NSIS + MSI into src-tauri/target/release/bundle
```

> **Re-run `bundle:runner` whenever `packages/db/migrations/` changes.** The EXE and
> installers embed a snapshot of the runner **and its migrations** (latest e.g.
> `009_footer_loginlog.sql`); a stale snapshot ships without the newest schema.

Copy the artifacts from `src-tauri/target/release/` into `releases/` (at the repo
root, gitignored) and upload the same set to the GitHub release:

- `Hoichoi Desk.exe` — the portable launcher (run from a folder that contains
  `runner/`; `bundled_runner()` resolves `<resource_dir>/runner`).
- `..._x64-setup.exe` — NSIS installer (per-user / machine-wide).
- `..._x64_en-US.msi` — MSI installer.
- **Portable package** — a `..._x64-portable/` folder containing `Hoichoi Desk.exe`
  **next to** its `runner/` directory, zipped as `..._x64-portable.zip`. Non-installed
  EXEs resolve the runner from their own folder, so the folder + zip is the
  "no-install" distribution.

> GitHub's release API stores asset names with spaces converted to dots
> (`Hoichoi.Desk_..._x64-setup.exe`); the local files keep the spaced names.

The installer bundles the runner (≈225 MB) and needs **no** `SODIUM_DIST_DIR` —
libsodium is no longer a dependency since the AES-256-GCM vault replaced Stronghold.

---

## v1.1.9 — Monitor live controls, pane resilience, provider purpose

- **Monitor ⟲ রিফ্রেশ / ▶ পাইপলাইন চালান:** the মনিটর tab is the shared
  `@hoichoi/dash` dashboard. `refresh()` re-snapshots the desk model and toasts;
  `runNow()` starts the bundled runner. When the runner finishes, `App.tsx`'s
  `pipeline://done` handler reads the exit code from the event payload and fires a
  success/failure toast (the web app gets the same result via run polling).
- **Pane error boundary:** every desk pane (`dashboard`, `watchlist`, `queue`,
  `collector`, `vault`, `settings`, `moderation`, `ads`) is wrapped in
  `PaneBoundary` (`apps/desktop/src/components/PaneBoundary.tsx`). A render error
  in one tab now shows a themed retry card instead of a white screen, and logs
  `[desk:pane:<name>]` to the dev console.
- **Monitor light theme:** the shared `.hoichoi-dash` light overrides (see
  `design-system.md`) make the Monitor legible under the desktop's
  `html[data-theme="light"]` toggle; the desk's own `index.css` already carried a
  broad `.text-white/*`, `.border-white/*`, `.bg-white/*` light block.
- **Provider purpose:** the desk provider manager can tag a provider `text`
  (default) or `image` and store a per-row API-key override, matching the web
  admin.

---

## v1.1.11 — 8-hour pipeline cadence

- **Pipeline cadence is now 8 hours (was 2).** The GitHub Actions workflow
  (`pipeline-cron.yml`), `PIPELINE_CRON`, the DB default/seed/migration and this
  app's default cron preference all step 8 hours (`17 */8 * * *` for the
  workflow, `0 */8 * * *` here) instead of 2, keeping the private repo well
  inside GitHub Actions' free minutes. Installers still read the cadence from
  `settings.pipeline_hours`; the live settings row was set to 8.
- **Web fixes shipped alongside.** The storage-tab sparkline no longer throws on
  an empty series (which blanked the tab with "Application error"), the admin
  studio's same-origin live preview is no longer blocked by `X-Frame-Options`,
  and the setup guide no longer reports a configured install as incomplete when
  the recent run window is all failures.

---

## v1.1.10 — Traffic tab, refresh feedback, manual image generation

- **New ট্রাফিক tab (9th tab, `apps/desktop/src/screens/Traffic.tsx`).** Renders the
  same first-party analytics as the web admin dashboard's ট্রাফিক ও স্টোরেজ tab via
  the shared `TrafficView` from `@hoichoi/dash`. Data comes from the runner's new
  **`traffic <range>`** command (`24h|7d|30d`) through
  `deskTraffic(env, range)` → `deskCall(["traffic", range])`. The tab sits directly
  after মনিটর; keyboard shortcuts are now **1–9**, and the run-command names live in
  `dispatchCmd` (so the long-lived `daemon` runner serves it, not just the one-shot
  CLI).
- **Truthful refresh feedback.** `refresh()` now returns `{ ok, error }`; the
  dashboard header button animates **REFRESH NOW → REFRESHING…** (`DashActions.refreshing`
  drives it in `packages/dash/src/views.tsx`) and the desk toasts success or the
  real runner error, so a failed refresh no longer looks like a healthy empty desk.
- **Manual AI image generation.** The কনটেন্ট সারি (Queue) rows expose an **AI ছবি
  তৈরি** action (`deskQueueGenerateImage` / `deskImageProviders`) that renders a hero
  for a single post through the same image-provider chain as the web editor and CLI
  (`media generate <id>`), subject to the category safety rules.
- **Storage sub-tab.** The ট্রাফিক tab now has a **ট্রাফিক / স্টোরেজ** segmented
  toggle; the স্টোরেজ side renders the shared `StorageView` from
  `deskStorage(env)` → `deskCall(["storage"])` (DB size, media tree + per-day bytes,
  remote blobs per adapter, largest tables).
- **Post gallery management.** The content-row editor mirrors the web gallery strip:
  it lists a post's `post_images` (`deskQueueImages`), adds a URL
  (`deskQueueImageAdd`), removes one (`deskQueueImageRemove`) and promotes one to the
  primary image (`deskQueueImagePrimary`) — all via the runner's new
  `queue images <list|add|remove|primary> <postId> …` command.
- **Settings additions.** The ভিজিবিলিটি panel now also edits `default_post_image`
  and `brand_animation`, matching the web সাইট panel.
- **Runner rebuild note.** Because `apps/scraper/src/cli.ts` gained the `traffic`,
  `storage` and `queue images` commands and `packages/db` gained the storage-report
  and post-images modules, `bundle:runner` **must** be re-run before `tauri build`;
  the embedded migrations snapshot now includes `011_traffic.sql` and
  `012_post_images.sql`.