/**
 * The plate as the collector draws it — desk name, Bangla date, 16:9 frame.
 *
 * The poster package proves the drawing; this proves the facts written on it are
 * the newsroom's own vocabulary rather than an English slug or a Latin numeral
 * date, which is what an English-first pipeline would have produced by default.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { banglaDate, deskFor, composeStoryPlate } from "../plate";

let passed = 0;
function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve(fn()).then(() => {
    passed++;
    console.log(`  ok ${name}`);
  });
}

async function main(): Promise<void> {
  await check("the date is written in Bangla numerals", () => {
    assert.equal(banglaDate(new Date(2026, 10, 17)), "১৭ নভেম্বর ২০২৬");
    assert.equal(banglaDate(new Date(2025, 0, 1)), "১ জানুয়ারি ২০২৫");
  });

  await check("a desk is named in Bangla and keeps its own colour", () => {
    const politics = deskFor("politics");
    assert.equal(politics.label, "রাজনীতি");
    assert.match(politics.accent, /^#[0-9a-f]{6}$/i);
    const sports = deskFor("sports");
    assert.equal(sports.label, "খেলাধুলা");
    assert.notEqual(sports.accent, politics.accent, "each desk keeps its identity");
  });

  await check("an unknown category is not invented", () => {
    assert.equal(deskFor("not-a-desk").label, null);
    assert.equal(deskFor(null).label, null);
    assert.equal(deskFor("").accent, "#e8552d", "the newsroom accent is the fallback");
  });

  await check("a story with no render still gets a landscape plate", async () => {
    const bytes = await composeStoryPlate({
      background: null,
      title: "বাজেট ঘোষণার পর বাজারে দাম বাড়ল",
      category: "economy",
      source: "প্রথম আলো",
    });
    assert.ok(bytes.byteLength > 4_000, "a real plate");
    const sharp = (await import("sharp")).default;
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.width, 1600);
    assert.equal(meta.height, 900);
    assert.equal(meta.format, "webp");
    fs.writeFileSync(".tmp-plate-scraper.webp", bytes);
  });

  console.log(`\nplate: ${passed} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
