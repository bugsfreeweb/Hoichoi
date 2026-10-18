import assert from "node:assert/strict";
import { resolvePostImage, PLACEHOLDER_IMAGE } from "../src/lib/mv/images";
import { mediaUrl } from "../src/lib/media";

/**
 * Cover-image regression for the design-variant (mockup) themes.
 *
 * `posts.media_path` is stored relative (e.g. `2026-09-15/img_….webp`). The
 * default design resolves it through `mediaUrl` → `/uploads/…`, but the mockup
 * themes used the raw value, so every cover was requested relative to the
 * current route and 404'd — the non-default designs looked "image-less" while
 * the default design stayed intact. The fallback list also pointed at JPEGs
 * that were never shipped under `apps/web/public`.
 */

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

check("a report's own media always wins", () => {
  assert.equal(resolvePostImage("s", "c", "/uploads/a.webp", "/uploads/fallback.webp"), "/uploads/a.webp");
});

check("the admin default image is used when the report has no media", () => {
  assert.equal(resolvePostImage("s", "c", "", "/uploads/fallback.webp"), "/uploads/fallback.webp");
  assert.equal(resolvePostImage("s", "c", "   ", " /uploads/fallback.webp "), "/uploads/fallback.webp");
});

check("neither media nor a default yields the shipped placeholder, never a dead path", () => {
  assert.equal(resolvePostImage("s", "c"), PLACEHOLDER_IMAGE);
  assert.equal(resolvePostImage("s", "c", "", ""), PLACEHOLDER_IMAGE);
});

check("a relative media_path is resolved to the /uploads public prefix", () => {
  assert.equal(mediaUrl({ media_path: "2026-09-15/img_a.webp", media_kind: "image" }), "/uploads/2026-09-15/img_a.webp");
});

check("rooted and absolute media paths pass through unchanged", () => {
  assert.equal(mediaUrl({ media_path: "/uploads/a.webp", media_kind: "image" }), "/uploads/a.webp");
  assert.equal(mediaUrl({ media_path: "https://cdn.example/a.webp", media_kind: "image" }), "https://cdn.example/a.webp");
});

console.log(`\n[web] mv-images: ${passed} checks passed`);
process.exit(process.exitCode ?? 0);
