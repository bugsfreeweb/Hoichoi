/**
 * One transient refusal must not cost the editor the picture.
 *
 * Measured on this deployment: `media generate` failed outright with
 * "Google: 429 quota exceeded | OpenAI: no credits | a shared free tier: 503 the classic
 * API is at its limit right now". The first two are real quota walls, but the
 * third is a "come back in ten seconds" — the same host answered every direct
 * request in between. Only 429 was ever retried, so a peak-load 503 turned a
 * click into "ছবি তৈরি ব্যর্থ".
 */
import assert from "node:assert/strict";
import { retryDelayFor } from "../image-resolver";
import { frameDims } from "../openai-compat";

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed++;
  console.log(`  ok ${name}`);
}

check("a per-minute rate limit waits four seconds, not ten", () => {
  assert.equal(retryDelayFor("429 rate limited: quota"), 4_000);
  assert.equal(retryDelayFor("Rate limit reached for images"), 4_000);
});

check("the provider's own advice is honoured", () => {
  const msg = '{"code":"SERVICE_UNAVAILABLE","message":"The Classic API is at its limit right now. Retry after 10s, or get full access"}';
  assert.equal(retryDelayFor(msg), 10_000);
});

check("a 503 without advice still gets a retry", () => {
  assert.equal(retryDelayFor("503 service unavailable"), 10_000);
  assert.equal(retryDelayFor("502 bad gateway"), 10_000);
  assert.equal(retryDelayFor("504 gateway timeout"), 10_000);
});

check("advice is capped: a provider must not park the request", () => {
  assert.equal(retryDelayFor("503 retry after 90s"), 15_000);
  assert.equal(retryDelayFor("503 retry after 1s"), 2_000);
});

check("a real error is not retried", () => {
  assert.equal(retryDelayFor("401 invalid api key"), 0);
  assert.equal(retryDelayFor("400 bad request: prompt too long"), 0);
  assert.equal(retryDelayFor("no image provider is active"), 0);
});

check("a number that merely contains 50x is not a server error", () => {
  assert.equal(retryDelayFor("quota 15032 exceeded"), 0);
  assert.equal(retryDelayFor("context window 1503 tokens"), 0);
});

check("a free-form host is asked for the frame the brief promised", () => {
  // 16:9 used to be sent as OpenAI's 1536x1024 (3:2) to every provider, so the
  // brief said "horizontal 16:9 frame" and the render came back 1.5:1.
  const dims = frameDims("1536x1024", "16:9");
  assert.ok(dims);
  assert.equal(dims.width, 1672);
  assert.equal(dims.height, 944);
  assert.ok(Math.abs(dims.width / dims.height - 16 / 9) < 0.02);
});

check("a portrait frame is honoured too", () => {
  const dims = frameDims("1536x1024", "9:16");
  assert.ok(dims);
  assert.ok(dims.height > dims.width, "9:16 must be taller than it is wide");
  assert.ok(dims.width % 8 === 0 && dims.height % 8 === 0, "diffusion wants multiples of 8");
});

check("no ratio or no size falls back to the size it was given", () => {
  assert.deepEqual(frameDims("1024x1024"), { width: 1024, height: 1024 });
  assert.deepEqual(frameDims("1024x1024", "square"), { width: 1024, height: 1024 });
  assert.equal(frameDims(undefined, "16:9"), null);
});

console.log(`\nimage-retry: ${passed} checks passed`);
