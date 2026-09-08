Hoichoi Desk - bundled pipeline runner
======================================

This folder is a STAGING AREA, empty in git and filled by:

    pnpm --filter @hoichoi/desktop bundle:runner

The command builds a fully self-contained, portable pipeline runtime from the
monorepo. The packaged desktop app spawns it and needs no Node.js, pnpm, or a
Playwright browser download on the end-user machine:

    runner/
      node.exe              # portable Node runtime (same version as builder)
      app/cli.cjs           # esbuild bundle (@hoichoi/* source inlined)
      app/migrations/       # SQL migrations copied from packages/db
      node_modules/         # runtime natives: sharp, @libsql/client,
                            # playwright, ffmpeg-static (installed via npm)
      package.json          # generated dependency manifest

Browsing: `cli.cjs scrape` uses the system-installed Microsoft Edge
(HOICHOI_USE_SYSTEM_BROWSER=1, channel "msedge"), so no Chromium download is
required. The Rust host (src/commands.rs::run_pipeline) sets
HOICHOI_MIGRATIONS_DIR (-> app/), HOICHOI_MEDIA_ROOT and, by default,
TURSO_DATABASE_URL=file:<app_data_dir>/hoichoi.db unless the user configured a
Turso remote.

This folder is bundled into the installer via
`bundle.resources: { "resources/runner": "runner" }` in tauri.conf.json. It is
gitignored except for this README (cli.cjs/node_modules/node.exe are build
artifacts).