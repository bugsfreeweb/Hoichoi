/**
 * The media registry states what a blob actually is.
 * ---------------------------------------------------------------------------
 * Two failures this file exists to prevent:
 *
 *  1. A registry that only knows a byte count. The console reported "2.1 MB" for
 *     a 2400×1600 WebP and could not notice that a mirrored "image" was really an
 *     HTML error page saved under a .jpg name.
 *  2. A guessed MIME type. A wrong value written into a row outlives the guess,
 *     so an unknown header records `null` and every reader says "unknown".
 *
 * The headers below are hand-built, so the parsers are tested against bytes
 * rather than against whatever sharp happens to return.
 *
 * Run: npx tsx scripts/media-metadata.test.ts
 */
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { __useClientForTests, ensureMediaObjectsTable } from "@hoichoi/db";
import {
  mediaFormatStats,
  recordMediaObject,
  listMediaObjects,
  imageMetaOf,
} from "@hoichoi/db";
import {
  describeImage,
  readImageSize,
  sniffImageMime,
} from "@hoichoi/shared-types";

let passed = 0;
async function check(
  name: string,
  fn: () => void | Promise<void>,
): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

/* ── Hand-built headers ──────────────────────────────────────────────────── */

function png(width: number, height: number): Uint8Array {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  b.set([0, 0, 0, 13], 8);
  b.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  const u32 = (at: number, v: number) => {
    b[at] = (v >>> 24) & 255;
    b[at + 1] = (v >>> 16) & 255;
    b[at + 2] = (v >>> 8) & 255;
    b[at + 3] = v & 255;
  };
  u32(16, width);
  u32(20, height);
  return b;
}

/** A baseline SOF0 segment after an APP0 (JFIF) segment. */
function jpeg(width: number, height: number): Uint8Array {
  const b = new Uint8Array(40);
  b.set([0xff, 0xd8], 0);
  // APP0, length 16
  b.set([0xff, 0xe0, 0x00, 0x10], 2);
  b.set([0x4a, 0x46, 0x49, 0x46, 0x00], 6); // "JFIF\0"
  // SOF0 at 20
  b.set([0xff, 0xc0, 0x00, 0x11, 0x08], 20);
  b[25] = (height >> 8) & 255;
  b[26] = height & 255;
  b[27] = (width >> 8) & 255;
  b[28] = width & 255;
  return b;
}

function gif(width: number, height: number): Uint8Array {
  const b = new Uint8Array(16);
  b.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 0); // GIF89a
  b[6] = width & 255;
  b[7] = (width >> 8) & 255;
  b[8] = height & 255;
  b[9] = (height >> 8) & 255;
  return b;
}

/** Lossy WebP: RIFF/WEBP, VP8 chunk, then the 14-bit dimensions. */
function webpLossy(width: number, height: number): Uint8Array {
  const b = new Uint8Array(40);
  b.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  b.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
  b.set([0x56, 0x50, 0x38, 0x20], 12); // "VP8 "
  b.set([0x9d, 0x01, 0x2a], 23);
  b[26] = width & 255;
  b[27] = (width >> 8) & 255;
  b[28] = height & 255;
  b[29] = (height >> 8) & 255;
  return b;
}

/* ── Sniffing ────────────────────────────────────────────────────────────── */

await check("each format is named from its own magic bytes", () => {
  assert.equal(sniffImageMime(png(10, 10)), "image/png");
  assert.equal(sniffImageMime(jpeg(10, 10)), "image/jpeg");
  assert.equal(sniffImageMime(gif(10, 10)), "image/gif");
  assert.equal(sniffImageMime(webpLossy(10, 10)), "image/webp");
  const avif = new Uint8Array(16);
  avif.set([0, 0, 0, 0x1c, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], 0);
  assert.equal(sniffImageMime(avif), "image/avif");
});

await check("a body that is not an image is named nothing at all", () => {
  const html = new TextEncoder().encode(
    "<html><body>404 Not Found</body></html>",
  );
  assert.equal(sniffImageMime(html), null);
  assert.deepEqual(describeImage(html), {
    mime: null,
    width: null,
    height: null,
  });
});

await check("dimensions come out of the header, not out of a decoder", () => {
  assert.deepEqual(readImageSize(png(2400, 1600)), {
    width: 2400,
    height: 1600,
  });
  assert.deepEqual(readImageSize(jpeg(1200, 800)), {
    width: 1200,
    height: 800,
  });
  assert.deepEqual(readImageSize(gif(320, 240)), { width: 320, height: 240 });
  assert.deepEqual(readImageSize(webpLossy(1080, 1920)), {
    width: 1080,
    height: 1920,
  });
});

await check("a truncated or nonsense header says unknown, never 0x0", () => {
  assert.equal(readImageSize(png(0, 0)), null);
  assert.equal(readImageSize(png(10, 10).slice(0, 18)), null);
  assert.equal(readImageSize(jpeg(10, 10).slice(0, 12)), null);
  assert.equal(readImageSize(new Uint8Array(0)), null);
});

await check("an absurd dimension is treated as a misparse", () => {
  assert.equal(readImageSize(png(200_000, 10)), null, "over the sane ceiling");
});

/* ── The row ────────────────────────────────────────────────────────────── */

const client = createClient({ url: ":memory:" });
__useClientForTests(client);
// `media_objects` has no foreign keys, so the registry can be built on its own.
await ensureMediaObjectsTable(client);

await check("the registry carries mime, width and height columns", async () => {
  const info = await client.execute("PRAGMA table_info(media_objects)");
  const names = new Set(
    info.rows.map((r) => String((r as unknown as { name: unknown }).name)),
  );
  for (const column of ["mime", "width", "height"]) {
    assert.ok(names.has(column), `media_objects.${column} must exist`);
  }
});

await check(
  "ensure is idempotent on a table that already has the columns",
  async () => {
    await ensureMediaObjectsTable(client);
    const info = await client.execute("PRAGMA table_info(media_objects)");
    const count = info.rows.filter(
      (r) => String((r as unknown as { name: unknown }).name) === "mime",
    ).length;
    assert.equal(count, 1);
  },
);

await check("an upload records what the bytes say they are", async () => {
  const bytes = png(2400, 1600);
  await recordMediaObject({
    adapter: "github:owner/media",
    key: "media/2026/a.png",
    url: "https://cdn/a.png",
    bytes: bytes.length,
    image: imageMetaOf(bytes),
  });
  const [row] = await listMediaObjects();
  assert.equal(row?.mime, "image/png");
  assert.equal(row?.width, 2400);
  assert.equal(row?.height, 1600);
});

await check(
  "a file whose header we could not read is unknown, not guessed",
  async () => {
    await recordMediaObject({
      adapter: "github:owner/media",
      key: "media/2026/b.jpg",
      url: "https://cdn/b.jpg",
      bytes: 42,
      image: describeImage(
        new TextEncoder().encode("<!doctype html><title>403</title>"),
      ),
    });
    const rows = await listMediaObjects();
    const row = rows.find((r) => r.key === "media/2026/b.jpg");
    assert.equal(row?.mime, null);
    assert.equal(row?.width, null);
  },
);

await check(
  "the format mix counts the unknown bucket instead of hiding it",
  async () => {
    const stats = await mediaFormatStats();
    const byMime = new Map(stats.map((s) => [s.mime, s]));
    assert.equal(byMime.get("image/png")?.files, 1);
    assert.equal(byMime.get("image/png")?.maxWidth, 2400);
    assert.equal(
      byMime.get("unknown")?.files,
      1,
      "an unreadable header is reported, not omitted",
    );
  },
);

await check(
  "a row written before the columns existed still lists",
  async () => {
    await client.execute({
      sql: "INSERT INTO media_objects (id, adapter, key, url, post_id, bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [
        "legacy",
        "github",
        "media/old.jpg",
        "https://cdn/old.jpg",
        null,
        1024,
        "2026-01-01T00:00:00.000Z",
      ],
    });
    const rows = await listMediaObjects();
    const row = rows.find((r) => r.id === "legacy");
    assert.equal(row?.bytes, 1024);
    assert.equal(row?.mime, null);
    assert.equal(row?.width, null);
  },
);

console.log(`\nmedia metadata: ${passed} checks passed`);
