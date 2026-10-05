/**
 * Guard against the media-fetch timeout regression.
 *
 * `AbortSignal.timeout(ms)` starts counting when the signal object is
 * constructed. Both the pipeline and the backfill used to hold a module-level
 * `const MEDIA_FETCH_INIT: RequestInit = { ..., signal: AbortSignal.timeout(20_000) }`.
 * That one signal was created at import time, so by the time the scrape reached
 * its first image it had long expired: every download and every pHash fetch
 * failed instantly with "The operation was aborted due to timeout". Both call
 * sites swallowed the error, so posts published with `media_kind = 'none'` and
 * no image while the workflow still reported success.
 *
 * This asserts the call sites build a fresh init object per request. It reads
 * the source rather than exercising a live download so it stays a fast,
 * network-free check in `pnpm test`.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "..");

let failed = 0;
const check = (label: string, run: () => void) => {
  try {
    run();
    // eslint-disable-next-line no-console
    console.log(`  ok  ${label}`);
  } catch (err) {
    failed += 1;
    // eslint-disable-next-line no-console
    console.error(`FAIL  ${label}\n      ${(err as Error).message}`);
  }
};

for (const file of ["pipeline.ts", "media-backfill.ts"]) {
  const text = fs.readFileSync(path.join(SRC, file), "utf8");

  check(`${file}: no module-level MEDIA_FETCH_INIT object`, () => {
    assert.doesNotMatch(
      text,
      /const\s+MEDIA_FETCH_INIT\s*:\s*RequestInit/,
      "a shared RequestInit constant expires its AbortSignal at import time",
    );
  });

  check(`${file}: mediaFetchInit() returns a fresh object each call`, () => {
    const fn = text.match(/function\s+mediaFetchInit[\s\S]*?\n\}/)?.[0];
    assert.ok(fn, "mediaFetchInit factory not found");
    assert.match(fn, /return\s*\{/, "must construct the RequestInit per call");
    assert.match(
      fn,
      /signal:\s*AbortSignal\.timeout\(/,
      "the timeout signal must be created inside the factory",
    );
  });

  check(`${file}: every media fetch calls mediaFetchInit()`, () => {
    const stale = [...text.matchAll(/fetch\(\s*\w+\s*,\s*MEDIA_FETCH_INIT\s*\)/g)];
    assert.equal(stale.length, 0, `${stale.length} fetch call(s) still pass the shared init`);
    const fresh = [...text.matchAll(/fetch\(\s*\w+\s*,\s*mediaFetchInit\(\)\s*\)/g)];
    assert.ok(fresh.length > 0, "no media fetch found using the factory");
  });
}

// eslint-disable-next-line no-console
console.log(`\nmedia-fetch-init: ${failed === 0 ? "all checks passed" : `${failed} failed`}`);
if (failed > 0) process.exitCode = 1;
