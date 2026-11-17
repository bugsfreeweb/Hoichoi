/**
 * Watermark trimming.
 *
 * The keyless Pollinations hosts stamp a `pollinations.ai` mark in the corner and
 * keep doing it with `nologo=true` and a referrer set — measured, twice. A news
 * desk cannot publish a third party's logo inside its own hero, so the caller
 * trims a thin band. This test pins the arithmetic and the guard rails: it only
 * ever removes a capped fraction, it leaves a non-watermarked render untouched,
 * and it never produces a zero-height image.
 */
import assert from "node:assert/strict";
import sharp from "sharp";
import { MAX_TRIM_FRACTION, trimWatermark } from "../src/lib/image-trim";
import { watermarkTrimFraction } from "@hoichoi/llm";

const W = 160;
const H = 90;

async function sample(): Promise<Uint8Array> {
  return new Uint8Array(await sharp({ create: { width: W, height: H, channels: 3, background: "#334455" } }).png().toBuffer());
}

let passed = 0;
async function check(name: string, fn: () => Promise<void> | void) {
  await fn();
  passed++;
  console.log(`  ok ${name}`);
}

await check("a Pollinations render is trimmed; anything else is not", () => {
  assert.equal(watermarkTrimFraction("Pollinations (keyless)"), 0.08);
  assert.equal(watermarkTrimFraction("pollinations"), 0.08);
  assert.equal(watermarkTrimFraction("Google Gemini Image"), 0);
  assert.equal(watermarkTrimFraction("Cloudflare Workers AI — FLUX.1 schnell"), 0);
  assert.equal(watermarkTrimFraction(null), 0);
  assert.equal(watermarkTrimFraction(""), 0);
});

await check("a zero fraction returns the bytes untouched", async () => {
  const bytes = await sample();
  const out = await trimWatermark(bytes, 0);
  assert.equal(out, bytes, "no fraction must mean no work, not a re-encode");
});

await check("the trim removes the band and keeps the width", async () => {
  const bytes = await sample();
  const out = await trimWatermark(bytes, 0.08);
  const meta = await sharp(Buffer.from(out)).metadata();
  assert.equal(meta.width, W);
  assert.equal(meta.height, Math.round(H * 0.92));
});

await check("the fraction is capped at a quarter of the frame", async () => {
  const bytes = await sample();
  const out = await trimWatermark(bytes, 2);
  const meta = await sharp(Buffer.from(out)).metadata();
  assert.equal(meta.height, Math.round(H * (1 - MAX_TRIM_FRACTION)));
});

await check("a tiny image is returned unchanged rather than destroyed", async () => {
  const tiny = new Uint8Array(await sharp({ create: { width: 16, height: 16, channels: 3, background: "#000" } }).png().toBuffer());
  const out = await trimWatermark(tiny, 0.08);
  assert.equal(out, tiny);
});

await check("a broken render does not take the request down", async () => {
  // The route wraps this in try/catch; the guard here is that the *fraction*
  // logic cannot itself produce a bad extract for a valid image shape.
  const bytes = await sample();
  const again = await trimWatermark(await trimWatermark(bytes, 0.08), 0.08);
  const meta = await sharp(Buffer.from(again)).metadata();
  assert.ok((meta.height ?? 0) > 0);
});

console.log(`\nimage-trim: ${passed} checks passed`);
