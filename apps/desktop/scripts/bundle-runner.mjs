/**
 * Hoichoi Desk - build & stage a self-contained pipeline runner for the
 * Tauri bundle.
 *
 * Default mode (no env vars): builds the runner from this monorepo into
 * `apps/desktop/src-tauri/resources/runner/`:
 *
 *   runner/
 *     node.exe          <- copied from the local Node install
 *     app/cli.cjs       <- esbuild bundle of the scraper CLI
 *     app/migrations/*.sql
 *     node_modules/     <- runtime natives (sharp, @libsql/client, playwright,
 *                          ffmpeg-static) installed via npm
 *
 * The packaged app spawns `runner/node.exe runner/app/cli.cjs scrape` and uses
 * the system-installed Microsoft Edge (channel: msedge) as its browser, so no
 * Node, pnpm, or Playwright browser bundle is needed on the target machine.
 *
 * Legacy mode (HOICHOI_RUNNER / HOICHOI_RUNNER_NODE): copies a prebuilt runner
 * binary + node runtime dir as-is.
 *
 * Usage:
 *   pnpm --filter @hoichoi/desktop bundle:runner            # auto-build
 *   pnpm --filter @hoichoi/desktop bundle:runner -- --refresh
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..", "..");
const runner = path.resolve(here, "..", "src-tauri", "resources", "runner");
const appDir = path.join(runner, "app");
const refresh = process.argv.includes("--refresh");

const RUNTIME_DEPS = {
  "@libsql/client": "^0.14.0",
  "ffmpeg-static": "^5.2.0",
  playwright: "^1.49.1",
  sharp: "^0.33.5",
};
const RUNTIME_EXTERNALS = Object.keys(RUNTIME_DEPS);

// ---------------------------------------------------------------- legacy mode
const runnerSrc = process.env.HOICHOI_RUNNER;
if (runnerSrc && !refresh) {
  if (!fs.existsSync(runnerSrc)) {
    console.error(`[runner] HOICHOI_RUNNER does not exist: ${runnerSrc}`);
    process.exit(1);
  }
  fs.mkdirSync(runner, { recursive: true });
  fs.copyFileSync(runnerSrc, path.join(runner, path.basename(runnerSrc)));
  console.log(`[runner] staged prebuilt runner -> ${path.join(runner, path.basename(runnerSrc))}`);
  const nodeSrc = process.env.HOICHOI_RUNNER_NODE;
  if (nodeSrc) {
    if (!fs.existsSync(nodeSrc)) {
      console.error(`[runner] HOICHOI_RUNNER_NODE does not exist: ${nodeSrc}`);
      process.exit(1);
    }
    copyDir(nodeSrc, path.join(runner, "node"));
    console.log(`[runner] staged node runtime -> ${path.join(runner, "node")}`);
  }
  console.log("[runner] done. Run `pnpm --filter @hoichoi/desktop tauri build` to bundle it.");
  process.exit(0);
}

// ------------------------------------------------------------ build mode
console.log("[runner] building self-contained pipeline runner");

// 1. Bundle the scraper CLI (externals resolve from runner/node_modules at
//    runtime). ESM output keeps import.meta.url intact for path resolution.
fs.mkdirSync(appDir, { recursive: true });
await esbuild.build({
  entryPoints: [path.join(repo, "apps", "scraper", "src", "cli.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  // CJS so runtime-variable `require("node:...")` inside bundled CJS deps
  // (commander's shims) works; import.meta.url is only used by the migrations
  // default path which is dead code at runtime (HOICHOI_MIGRATIONS_DIR is set
  // by the Rust host), so a placeholder is safe here.
  format: "cjs",
  outfile: path.join(appDir, "cli.cjs"),
  define: { "import.meta.url": "\"file:///runner/app/cli.cjs\"" },
  external: RUNTIME_EXTERNALS,
  logLevel: "warning",
});
console.log(`[runner] bundled -> ${path.join(appDir, "cli.cjs")}`);

// 2. Migrations next to the bundle (HOICHOI_MIGRATIONS_DIR points here).
const migSrc = path.join(repo, "packages", "db", "migrations");
const migDst = path.join(appDir, "migrations");
// Rebuild this folder rather than copying over it. A merged directory keeps
// files that were deleted from the source, so a migration withdrawn from the
// repo (011_provider_google_openrouter.sql, which set Google to a model that
// 404s on generation) stayed in the bundle and would have been applied to
// every desktop database, re-introducing exactly the change it was removed for.
fs.rmSync(migDst, { recursive: true, force: true });
fs.mkdirSync(migDst, { recursive: true });
for (const f of fs.readdirSync(migSrc)) {
  fs.copyFileSync(path.join(migSrc, f), path.join(migDst, f));
}
console.log(`[runner] migrations -> ${migDst}`);

// 3. Node runtime (self-contained node.exe on Windows).
if (process.platform === "win32") {
  fs.copyFileSync(process.execPath, path.join(runner, "node.exe"));
  console.log(`[runner] node.exe <- ${process.execPath}`);
} else {
  fs.mkdirSync(path.join(runner, "node"), { recursive: true });
  fs.copyFileSync(process.execPath, path.join(runner, "node", "node"));
  chmod755(path.join(runner, "node", "node"));
  console.log("[runner] node <- " + process.execPath);
}

// 4. Runtime natives (only if missing or --refresh).
const wantInstall = refresh || !fs.existsSync(path.join(runner, "node_modules"));
if (wantInstall) {
  const pkg = { name: "hoichoi-runner", private: true, dependencies: RUNTIME_DEPS };
  fs.mkdirSync(runner, { recursive: true });
  fs.writeFileSync(path.join(runner, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  const res = spawnSync("npm", ["install", "--omit=dev", "--no-audit", "--no-fund", "--no-progress"], {
    cwd: runner,
    stdio: "inherit",
    shell: true,
  });
  if (res.status !== 0 && res.error) {
    console.error(`[runner] npm install failed: ${res.error.message}`);
    process.exit(res.status ?? 1);
  }
  console.log("[runner] runtime natives installed -> " + path.join(runner, "node_modules"));
} else {
  console.log("[runner] node_modules present (use --refresh to reinstall)");
}

// 5. Summary
function dirBytes(p) {
  let n = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else n += fs.statSync(full).size;
    }
  };
  walk(p);
  return n;
}
function mb(p) {
  return (dirBytes(p) / 1024 / 1024).toFixed(1);
}
console.log(
  `[runner] done. runner size ~${mb(runner)} MB. ` +
    "Run `pnpm --filter @hoichoi/desktop tauri build` to bundle it into the installer.",
);

function copyDir(srcP, dstP) {
  fs.mkdirSync(dstP, { recursive: true });
  for (const entry of fs.readdirSync(srcP, { withFileTypes: true })) {
    const from = path.join(srcP, entry.name);
    const toP = path.join(dstP, entry.name);
    if (entry.isDirectory()) copyDir(from, toP);
    else fs.copyFileSync(from, toP);
  }
}

function chmod755(p) {
  try {
    fs.chmodSync(p, 0o755);
  } catch {
    /* best effort on Windows */
  }
}