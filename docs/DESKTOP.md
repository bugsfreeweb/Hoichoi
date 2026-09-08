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
   a Turso remote in the keychain.

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
`file:<repo>/data/hoichoi.db`, override with `TURSO_DATABASE_URL`).

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