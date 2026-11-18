/**
 * The plate as the collector draws it — desk name, Bangla date, 16:9 frame.
 *
 * The poster package proves the drawing; this proves the facts written on it are
 * the newsroom's own vocabulary rather than an English slug or a Latin numeral
 * date, which is what an English-first pipeline would have produced by default.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { banglaDate, deskFor, composeStoryPlate, composeStoryPlateDetailed } from "../plate";

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
    const plate = await composeStoryPlateDetailed({
      background: null,
      title: "বাজেট ঘোষণার পর বাজারে দাম বাড়ল",
      category: "economy",
      source: "প্রথম আলো",
    });
    assert.ok(plate.bytes.byteLength > 4_000, "a real plate");
    const sharp = (await import("sharp")).default;
    const meta = await sharp(plate.bytes).metadata();
    // 1920×1080 is the poster frame the browser renderer draws; the SVG net keeps
    // its own 1600×900. Both are 16:9 and both are a picture.
    if (plate.engine === "html") {
      assert.equal(meta.width, 1920);
      assert.equal(meta.height, 1080);
    } else {
      assert.equal(meta.width, 1600);
      assert.equal(meta.height, 900);
    }
    assert.equal(meta.format, "webp");
    assert.equal(plate.usedFallbackBackdrop, true, "no provider bytes means the branded backdrop");
    fs.writeFileSync(".tmp-plate-scraper.webp", plate.bytes);
  });

  await check("a refused provider chain still produces a picture", () => {
    /**
     * Source-level, because the interesting behaviour is the control flow: the
     * manual generator must catch a chain that refused and compose the plate over
     * the branded backdrop, not rethrow. Comments are stripped first — a comment
     * that mentions the fallback is not the fallback.
     */
    const source = fs
      .readFileSync(path.resolve(import.meta.dirname, "..", "media-backfill.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    assert.match(source, /catch \(err\) \{[\s\S]{0,240}renderError =/, "the render is caught, not rethrown");
    assert.match(source, /background: rendered \? Buffer\.from\(rendered\.bytes\) : null/, "the plate is composed either way");
    assert.match(source, /media_origin: rendered \? "ai" : "plate"/, "the badge is told the truth about the picture");
    assert.ok(!/generateManualImage[\s\S]{0,2000}throw err/.test(source), "a provider failure does not escape the generator");
  });

  await check("Workers AI is sent no dimensions it would reject", () => {
    const source = fs
      .readFileSync(path.resolve(import.meta.dirname, "..", "..", "..", "..", "packages", "llm", "src", "openai-compat.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const body = source.slice(source.indexOf("const payload: Record<string, unknown> = { prompt"));
    assert.ok(!/payload\.(width|height|size)\s*=/.test(body.slice(0, 600)), "no width/height/size is sent to Workers AI");
  });

  console.log(`\nplate: ${passed} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
