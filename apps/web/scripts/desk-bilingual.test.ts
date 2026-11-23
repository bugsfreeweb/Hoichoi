/**
 * The desk's migrated screens must be measured, not declared.
 *
 * Three screens were converted to inline bilingual pairs (`b("বাংলা", "English")`)
 * plus the shared table. This test re-reads the sources and fails if Bangla
 * survives outside a pair — the exact failure mode of a half-finished migration,
 * where an English operator meets one Bangla sentence in an otherwise English
 * screen.
 *
 * It also counts the pairs it stripped, so the test cannot pass by finding
 * nothing to check (an empty file, or a helper renamed out from under it).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Repo root, from this file's own location (these scripts run as ESM). */
const ROOT = resolve(fileURLToPath(import.meta.url), "../../../..");
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

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  if (!existsSync(path)) throw new Error(`missing file: ${rel}`);
  return readFileSync(path, "utf8");
}

/** Comments out first: a Bangla sentence in a note is fine, on screen is not. */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1");
}

/**
 * Remove every `b("bn", "en")` / `useBi()("bn", "en")` call and every
 * `["bn", "en"]` tuple, so what is left is text that never went through a pair.
 */
function stripPairs(code: string): { rest: string; pairs: number } {
  let pairs = 0;
  const rest = code
    // tuples used by label tables: `all: ["সব", "All"],`
    .replace(/\[\s*(["'`][^"'`]*["'`])\s*,\s*(["'`][^"'`]*["'`])\s*\]/g, (m) => {
      pairs++;
      return '["", ""]';
    })
    // calls, allowing a multi-line argument list
    .replace(/\bb\(\s*(?:"[^"]*"|`[^`]*`|'[^']*')\s*,\s*(?:"[^"]*"|`[^`]*`|'[^']*')\s*,?\s*\)/gs, () => {
      pairs++;
      return "''";
    });
  return { rest, pairs };
}

const SCREENS = [
  "apps/desktop/src/screens/Traffic.tsx",
  "apps/desktop/src/screens/Moderation.tsx",
  "apps/desktop/src/screens/Archive.tsx",
];

check("the three desk screens are migrated", () => {
  for (const rel of SCREENS) {
    const { rest, pairs } = stripPairs(stripComments(read(rel)));
    const left = rest
      .split("\n")
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) => /[\u0980-\u09FF]/.test(line) && !line.startsWith("*"));
    if (left.length > 0) {
      throw new Error(`${rel}: ${left.length} line(s) still Bangla, first (${left[0]?.n}): ${left[0]?.line.slice(0, 70)}`);
    }
    if (pairs < 4) throw new Error(`${rel}: only ${pairs} bilingual pair(s) — is the guard reading the right file?`);
  }
});

check("the desk rail and window chrome read from the shared table", () => {
  const app = read("apps/desktop/src/App.tsx");
  // One row shape: icon, dictionary key, Bangla fallback for logs.
  const rows = [...app.matchAll(/icon: "([a-z]+)", key: "(desk\.rail\.[a-z]+)", label: "([^"]*)"/g)];
  if (rows.length !== 10) throw new Error(`expected ten rail rows, found ${rows.length}`);
  const keys = new Set(rows.map((r) => r[2]));
  if (keys.size !== 10) throw new Error("two rail rows share one key");
  for (const [, icon, key, label] of rows) {
    if (!/[\u0980-\u09FF]/.test(label ?? "")) throw new Error(`${key}: the Bangla fallback is not Bangla`);
    if (!icon) throw new Error(`${key}: no icon`);
  }
});

check("the desk remembers one language, under the same key as the web", () => {
  const locale = read("apps/desktop/src/lib/locale.tsx");
  if (!/LOCALE_STORAGE_KEY/.test(locale)) throw new Error("the desk invents its own storage key");
  if (!/readStoredLocale/.test(locale)) throw new Error("a saved choice is never read back");
  // Bangla is the fallback, not English: the desk is a Bangla newsroom tool.
  if (!/return "bn"/.test(locale)) throw new Error("missing Bangla fallback");
  const main = read("apps/desktop/src/main.tsx");
  if (!/<DeskLocaleProvider>/.test(main)) throw new Error("the provider is not above the app");
});

console.log(`[web] desk bilingual: ${passed} checks passed`);
