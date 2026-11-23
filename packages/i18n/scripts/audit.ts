#!/usr/bin/env node
/**
 * How bilingual is each surface, measured.
 *
 * The migration from inline Bangla literals to a bilingual pair happens file by
 * file, so it needs a number that only goes down. This prints, per surface: files
 * that still contain a Bangla string literal in code, and how many such literals
 * remain.
 *
 *   npx tsx packages/i18n/scripts/audit.ts
 *   npx tsx packages/i18n/scripts/audit.ts --json
 *
 * A literal that is *data* (a category name, a Bangla date) is still counted —
 * this is a queue of places to look, not a verdict on each one.
 *
 * Text that already has an English half — `b("বাংলা", "English")` or a
 * `["বাংলা", "English"]` tuple — is not a queue entry: it is translated. Those
 * are counted separately as `pairs`, so the number that goes down is "Bangla with
 * nowhere to read it in English", not "bytes in the file".
 *
 * Counting is line by line on purpose. A single-line pair is unambiguous, and a
 * literal that truly spans lines is rare enough that charging it to its first
 * line keeps the number stable, which is the whole point of a progress meter.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname ?? ".", "../../..");
const BANGLA = /[\u0980-\u09FF]/;
const LITERAL = /"[^"\n]*[\u0980-\u09FF][^"\n]*"|'[^'\n]*[\u0980-\u09FF][^'\n]*'|`[^`]*[\u0980-\u09FF][^`]*`/g;

/** `b("বাংলা", "English")` — one call, one already-translated string. */
const PAIR_CALL = /b\(\s*(?:"[^"\n]*"|`[^`]*`|'[^'\n]*')\s*,\s*(?:"[^"\n]*"|`[^`]*`|'[^'\n]*')\s*,?\s*\)/g;
/** `["বাংলা", "English"]` — the same pair, held in a label table. */
const PAIR_TUPLE = /\[\s*(["'`][^"'`\n]*["'`])\s*,\s*(["'`][^"'`\n]*["'`])\s*\]/g;

const SURFACES = [
  {
    name: "site",
    roots: [
      "apps/web/src/app/(site)",
      "apps/web/src/app/post",
      "apps/web/src/app/category",
      "apps/web/src/components/mv",
    ],
  },
  {
    name: "admin",
    roots: [
      "apps/web/src/app/admin",
      "apps/web/src/components/admin",
      "apps/web/src/app/portal",
      "apps/web/src/app/advertise",
      "packages/dash/src",
    ],
  },
  { name: "desk", roots: ["apps/desktop/src"] },
] as const;

interface Row {
  surface: string;
  files: number;
  dirtyFiles: number;
  literals: number;
  /** Strings that are already in both languages. */
  pairs: number;
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

/** Comments are prose for us, not strings a reader ever sees. */
function codeLines(text: string): string[] {
  const out: string[] = [];
  let inBlock = false;
  for (const raw of text.split("\n")) {
    let line = raw;
    if (inBlock) {
      const end = line.indexOf("*/");
      if (end === -1) continue;
      line = line.slice(end + 2);
      inBlock = false;
    }
    const open = line.indexOf("/*");
    if (open !== -1 && line.indexOf("*/", open) === -1) {
      inBlock = true;
      line = line.slice(0, open);
    }
    if (/^\s*(\/\/|\*)/.test(line)) continue;
    out.push(line);
  }
  return out;
}

const rows: Row[] = [];
for (const surface of SURFACES) {
  let files = 0;
  let dirtyFiles = 0;
  let literals = 0;
  let pairs = 0;
  for (const root of surface.roots) {
    for (const file of walk(resolve(ROOT, root))) {
      const rel = relative(ROOT, file).split("\\").join("/");
      if (rel.includes("/__tests__/")) continue;
      const text = readFileSync(file, "utf8");
      if (!BANGLA.test(text)) continue;
      files++;
      let filePairs = 0;
      let queue = 0;
      for (const line of codeLines(text)) {
        filePairs += (line.match(PAIR_CALL) ?? []).length + (line.match(PAIR_TUPLE) ?? []).length;
        const bare = line.replace(PAIR_CALL, "''").replace(PAIR_TUPLE, '["", ""]');
        for (const hit of bare.match(LITERAL) ?? []) if (BANGLA.test(hit)) queue++;
      }
      pairs += filePairs;
      if (queue > 0) dirtyFiles++;
      literals += queue;
    }
  }
  rows.push({ surface: surface.name, files, dirtyFiles, literals, pairs });
}

const sum = (pick: (r: Row) => number): number => rows.reduce((n, r) => n + pick(r), 0);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ rows, total: sum((r) => r.literals) }, null, 2));
} else {
  console.log("surface   files   unreadable-in-English   literals   already bilingual");
  for (const r of rows) {
    console.log(
      `${r.surface.padEnd(9)} ${String(r.files).padStart(5)}   ${String(r.dirtyFiles).padStart(20)}   ` +
        `${String(r.literals).padStart(8)}   ${String(r.pairs).padStart(17)}`,
    );
  }
  console.log(
    `${"total".padEnd(9)} ${String(sum((r) => r.files)).padStart(5)}   ${"".padStart(20)}   ` +
      `${String(sum((r) => r.literals)).padStart(8)}   ${String(sum((r) => r.pairs)).padStart(17)}`,
  );
}
