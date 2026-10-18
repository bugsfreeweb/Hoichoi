import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The admin's ট্রাফিক ও স্টোরেজ tab polled `/api/admin/storage`, but no such route
 * existed — Next served its HTML 404 page and the client's `res.json()` died with
 * "Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON". A missing route is
 * invisible to `tsc` (the fetch is just a string), so this walks every `fetch()`
 * to an `/api/...` path in the admin surface and asserts a matching `route.ts`.
 */

const SRC = join(process.cwd(), "src");
const APP = join(SRC, "app");
const API = join(APP, "api");

// The admin surface — where a fetch to a missing route silently breaks a console
// panel. (The public `mv/*` design references a few endpoints that are still to
// be built; they are tracked separately, not asserted here.)
const ADMIN_DIRS = [join(SRC, "components", "admin"), join(APP, "admin")];

let passed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}

/** `/api/admin/[id]` style segments for a `route.ts` file. */
function routeSegments(file: string): string[] {
  const rel = file.slice(APP.length).replace(/\\/g, "/").replace(/\/route\.ts$/, "");
  return rel.split("/").filter(Boolean);
}

const ROUTES = walk(API, ["route.ts"]).map(routeSegments);
const isDynamic = (s: string) => /^\[.*\]$/.test(s) || s === "*";

function resolves(segments: string[]): boolean {
  return ROUTES.some(
    (route) =>
      route.length === segments.length && route.every((seg, i) => isDynamic(seg) || seg === segments[i]),
  );
}

/** Every `fetch("<literal /api/...>")` in the app source. */
function referenced(): { file: string; line: number; raw: string }[] {
  const out: { file: string; line: number; raw: string }[] = [];
  const re = /fetch\(\s*[`"'](\/api\/[^`"']*)[`"']/g;
  for (const dir of ADMIN_DIRS) {
    for (const file of walk(dir, [".ts", ".tsx"])) {
      const src = readFileSync(file, "utf8");
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        out.push({
          file: file.slice(SRC.length + 1).replace(/\\/g, "/"),
          line: src.slice(0, m.index).split("\n").length,
          raw: m[1]!,
        });
      }
    }
  }
  return out;
}

check("every /api path the admin fetches has a route handler", () => {
  const refs = referenced();
  // If the scanner itself breaks (e.g. a refactor moves fetches behind a helper),
  // fail loudly rather than silently passing an empty list.
  assert.ok(refs.length >= 20, `expected many admin fetch calls, found ${refs.length}`);

  const offenders = refs
    .filter((r) => {
      const segments = r.raw
        .split("?")[0]!
        .replace(/\$\{[^}]*\}/g, "*")
        .split("/")
        .filter(Boolean);
      return !resolves(segments);
    })
    .map((r) => `${r.file}:${r.line}  fetch("${r.raw}") has no src/app/api route`);

  assert.deepEqual(offenders, [], `fetch targets without a route handler:\n${offenders.join("\n")}`);
});

console.log(`\n[web] api-routes: ${passed} checks passed`);
process.exit(process.exitCode ?? 0);
