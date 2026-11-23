#!/usr/bin/env node
/**
 * How bilingual is each surface, measured.
 *
 * The migration from inline Bangla literals to `t()` happens file by file, so it
 * needs a number that only goes down. This prints, per surface: files that still
 * contain a Bangla string literal in code, and how many such literals remain.
 *
 *   npx tsx packages/i18n/scripts/audit.ts
 *   npx tsx packages/i18n/scripts/audit.ts --json
 *
 * A literal that is *data* (a category name, a Bangla date) is still counted —
 * this is a queue of places to look, not a verdict on each one.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname ?? ".", "../../..");
const BANGLA = /[\u0980-\u09FF]/;
const LITERAL = /"[^"\n]*[\u0980-\u09FF][^"\n]*"|'[^'\n]*[\u0980-\u09FF][^'\n]*'|`[^`]*[\u0980-\u09FF][^`]*`/g;

const SURFACES = [
  { name: "site", roots: ["apps/web/src/app/(site)", "apps/web/src/app/post", "apps/web/src/app/category", "apps/web/src/components/mv"] },
  { name: "admin", roots: ["apps/web/src/app/admin", "apps/web/src/components/admin", "apps/web/src/app/portal", "apps/web/src/app/advertise", "packages/dash/src"] },
  { name: "desk", roots: ["apps/desktop/src"] },
] as const;

interface Row {
  surface: string;
  files: number;
  dirtyFiles: number;
  literals: number;
}

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".next" || entry === "dist") continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const rows: Row[] = [];
for (const surface of SURFACES) {
  let files = 0;
  let dirtyFiles = 0;
  let literals = 0;
  for (const root of surface.roots) {
    for (const file of walk(resolve(ROOT, root))) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (rel.includes("/__tests__/")) continue;
      const text = readFileSync(file, "utf8");
      if (!BANGLA.test(text)) continue;
      files++;
      const hits = text.match(LITERAL) ?? [];
      // A line that is only a comment is still text someone must read, but it is
      // not a string a user ever sees; strip full-line comments before counting.
      const codeHits = hits.filter((hit) => !hit.trim().startsWith("//") && !hit.trim().startsWith("*"));
      if (codeHits.length > 0) dirtyFiles++;
      literals += codeHits.length;
    }
  }
  rows.push({ surface: surface.name, files, dirtyFiles, literals });
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ rows, total: rows.reduce((n, r) => n + r.literals, 0) }, null, 2));
} else {
  console.log("surface   files   with Bangla literals   literals");
  for (const r of rows) {
    console.log(
      `${r.surface.padEnd(9)} ${String(r.files).padStart(5)}   ${String(r.dirtyFiles).padStart(20)}   ${String(r.literals).padStart(8)}`,
    );
  }
  console.log(`${"total".padEnd(9)} ${String(rows.reduce((n, r) => n + r.files, 0)).padStart(5)}   ${"".padStart(20)}   ${String(rows.reduce((n, r) => n + r.literals, 0)).padStart(8)}`);
}
