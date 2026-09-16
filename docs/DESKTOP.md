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
  primary key; `admin_sessions` is never copied.
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
  shared dependency is `@hoichoi/db` (Turso), `@hoichoi/llm`, and
  `@hoichoi/shared-types`.
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
- **Monitor** — 4 stat tiles (আজ সংগৃহীত / লাইভ প্রকাশিত / ডুপ্লিকেট ব্লকড / গড় রান)
  + the mockup **countdown ring**, pipeline-health and source-health panels, latest
  collector logs and the recent content queue (`screens/Dashboard.tsx`). A barley
  **activity-trend chart** (last 8 runs' published counts) sits below the queue.
  Panel labels match the mockup: "TAURI CONTROLLER · LIVE" and the pipeline row
  reads "AI Agent → Web · hoichoi-content · READY".
- **Scroll** — every tab scrolls independently (all roots are `scroll-slim
  overflow-auto`); Vault and Settings got root scroll containers too.
- **Watchlist** — real source CRUD against the runner
  (`sources list|add|toggle|remove`), search + kind filter + add form, health bars,
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
  reveal/copy per key + copy-all `.env` payload (`screens/Vault.tsx`).
- **Settings** — mockup preference panels (cron `0 */N * * *` → `pipeline_hours` via
  `settingsSet`, model/temp/gate/toggles persisted to `localStorage`) above the real
  functional panels (cloud sync, branding, admin codes, backup/reset/sync)
  (`screens/Settings.tsx`).
- **Moderation** — comment queue with pending/approved/blocked tabs and approve/block
  actions through the runner (`moderation list|set`) (`screens/Moderation.tsx`).
- **Runner desk CLI** — new subcommands `stats`, `sources`, `queue`, `moderation`
  (all `apps/scraper/src/cli.ts`). Backend passthrough `desk_call` (Rust) +
  wrapper `deskCall`/`deskSources`/`deskQueue`/`deskStats`/`deskModeration`/
  `deskModerationSet` (`src/lib/tauri.ts`). `sources` gained columns `kind`, `fb_id`,
  `topics`, `health` (added idempotently by `ensureDeskColumns` in
  `packages/db/src/client.ts`).

## Rebuilding the installer

```bash
pnpm --filter @hoichoi/desktop build          # tsc + vite
pnpm --filter @hoichoi/desktop bundle:runner  # stage self-contained runner → resources/runner
pnpm --filter @hoichoi/desktop tauri build    # NSIS + MSI into src-tauri/target/release/bundle
```

Copy the three artifacts from `src-tauri/target/release/` into `releases/`
(`Hoichoi Desk.exe`, `..._x64-setup.exe`, `..._x64_en-US.msi`). The installer
now bundles the runner (≈225 MB) and needs **no** `SODIUM_DIST_DIR` — libsodium
is no longer a dependency since the AES-256-GCM vault replaced Stronghold.