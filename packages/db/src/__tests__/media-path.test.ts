/**
 * media_path validation. `normalizeMediaPath` is the gate every write to
 * posts.media_path passes through (updatePost), so it is the single place where
 * a hostile value can be rejected before it reaches an <img src> on the public
 * site.
 *
 * Run with: tsx src/__tests__/media-path.test.ts
 */
import assert from "node:assert/strict";
import { normalizeMediaPath } from "../index";

const cases: Array<{ label: string; run: () => unknown }> = [
  { label: "empty string clears the image", run: () => assert.equal(normalizeMediaPath(""), null) },
  { label: "whitespace only clears the image", run: () => assert.equal(normalizeMediaPath("   "), null) },
  {
    label: "absolute https URL passes through",
    run: () => assert.equal(normalizeMediaPath("https://cdn.example.com/a.jpg"), "https://cdn.example.com/a.jpg"),
  },
  {
    label: "absolute http URL passes through",
    run: () => assert.equal(normalizeMediaPath("http://cdn.example.com/a.jpg"), "http://cdn.example.com/a.jpg"),
  },
  {
    label: "relative store path is preserved",
    run: () =>
      assert.equal(
        normalizeMediaPath("2026-10-05/img_ab12cd34.webp"),
        "2026-10-05/img_ab12cd34.webp",
      ),
  },
  {
    label: "javascript: URL is rejected",
    run: () => assert.throws(() => normalizeMediaPath("javascript:alert(1)"), /unsupported media scheme/),
  },
  {
    label: "data: URL is rejected",
    run: () =>
      assert.throws(
        () => normalizeMediaPath("data:image/svg+xml;base64,AAAA"),
        /unsupported media scheme/,
      ),
  },
  {
    label: "relative traversal is rejected",
    run: () => assert.throws(() => normalizeMediaPath("../../etc/passwd"), /invalid path segment/),
  },
  {
    label: "embedded traversal is rejected",
    run: () => assert.throws(() => normalizeMediaPath("2026/../../secret"), /invalid path segment/),
  },
  {
    label: "backslash traversal is rejected",
    run: () => assert.throws(() => normalizeMediaPath("..\\..\\secret"), /backslashes/),
  },
  {
    label: "leading slash is rejected",
    run: () => assert.throws(() => normalizeMediaPath("/uploads/a.webp"), /must be relative/),
  },
  {
    label: "empty path segment is rejected",
    run: () => assert.throws(() => normalizeMediaPath("2026//a.webp"), /invalid path segment/),
  },
  {
    label: "control characters are rejected",
    run: () => assert.throws(() => normalizeMediaPath("a\u0000b"), /control characters/),
  },
  {
    label: "over-long value is rejected",
    run: () => assert.throws(() => normalizeMediaPath("a".repeat(2001)), /too long/),
  },
];

let failed = 0;
for (const c of cases) {
  try {
    c.run();
    // eslint-disable-next-line no-console
    console.log(`  ok  ${c.label}`);
  } catch (err) {
    failed += 1;
    // eslint-disable-next-line no-console
    console.error(`FAIL  ${c.label}\n      ${(err as Error).message}`);
  }
}
// eslint-disable-next-line no-console
console.log(`\nmedia-path: ${cases.length - failed}/${cases.length} passed`);
if (failed > 0) process.exitCode = 1;
