/**
 * A printed shortcut is a promise.
 *
 * The desk rail has ten rows and printed the tenth as "10", while the keydown
 * handler only listened for 1–9 — so the hint on the last row (আর্কাইভ) named a
 * key the rail could not answer. This pins the one table that now feeds both the
 * printed hint and the handler, so the two cannot drift apart again.
 *
 * The assertions are textual on purpose: `App.tsx` imports React and the Tauri
 * API, so it cannot be executed here, but the constants can be read and the
 * mapping recomputed from them.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repo = path.resolve(import.meta.dirname, "..", "..", "..");
const app = fs.readFileSync(path.join(repo, "apps", "desktop", "src", "App.tsx"), "utf8");

let passed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

/** The array literal assigned to `name`, evaluated as a plain JS array of strings. */
function stringArray(name: string): string[] {
  const m = app.match(
    new RegExp(`const ${name}[^=]*=\\s*\\[([\\s\\S]*?)\\](?:\\s*as const)?;`),
  );
  assert.ok(m, `${name} is declared as an array literal`);
  const raw = (m[1] ?? "").replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  return [...raw.matchAll(/"([^"]*)"/g)].map((x) => x[1] ?? "");
}

const views = stringArray("VIEW_ORDER");
const keys = stringArray("VIEW_KEYS");

check("the rail has ten rows and ten keys", () => {
  assert.equal(views.length, 10, `VIEW_ORDER has ${views.length} rows`);
  assert.equal(keys.length, 10, `VIEW_KEYS has ${keys.length} keys`);
});

check("the keys are 1–9 then 0", () => {
  assert.deepEqual(keys, ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]);
});

check("the archive row is the tenth and answers to 0", () => {
  const i = views.indexOf("archive");
  assert.equal(i, 9, `archive is row ${i + 1}`);
  assert.equal(keys[i], "0");
});

check("every row has a key, and every key a row", () => {
  for (let i = 0; i < views.length; i += 1) {
    assert.ok(keys[i], `${views[i]} prints a key`);
  }
  assert.equal(new Set(keys).size, keys.length, "no key is printed twice");
});

check("the handler reads the table instead of its own digit list", () => {
  assert.match(app, /const next = viewForKey\(e\.key\);/);
  assert.doesNotMatch(
    app,
    /indexOf\(e\.key\)/,
    "a hand-written key list in the handler can disagree with the printed hints",
  );
  assert.match(app, /export function viewForKey\(key: string\): View \| null/);
  assert.match(app, /export function keyForView\(view: View\): string/);
});

check("the row prints the table's key, not its index", () => {
  assert.match(app, /shortcut=\{keyForView\(v\)\}/);
  assert.doesNotMatch(app, /shortcut=\{String\(i \+ 1\)\}/);
});

check("the menubar hint matches what the keys do", () => {
  assert.match(app, /1–9 · 0 TABS/);
  assert.doesNotMatch(app, /1–9 TABS/);
});

check("viewForKey refuses a key that is not the rail's", () => {
  // Recompute the exported function's contract from the same two arrays.
  const pick = (key: string): string | null => {
    const i = keys.indexOf(key);
    return i < 0 ? null : (views[i] ?? null);
  };
  assert.equal(pick("1"), "dashboard");
  assert.equal(pick("9"), "ads");
  assert.equal(pick("0"), "archive");
  assert.equal(pick("10"), null, "the two digits of a '10' press are two keys, not one");
  assert.equal(pick("q"), null);
  assert.equal(pick(""), null);
});

console.log(`\nrail keys: ${passed} checks passed`);
