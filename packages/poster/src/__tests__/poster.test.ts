/**
 * The plate is the contract with the reader: a landscape frame, our name on it,
 * and the headline legible over whatever the model drew.
 *
 * These checks are pure geometry and text, plus one honest raster check that the
 * Bengali font actually shapes (a caption of tofu boxes would pass every string
 * assertion, so the task deliberately looks at the pixels' non-emptiness and the
 * font registration rather than pretending a unit test can read Bengali).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  POSTER_FRAME,
  backdropSvg,
  captionSvg,
  creditLine,
  fitCaption,
  fontsDir,
  kickerLine,
  renderPoster,
  topicCues,
  wrapCaption,
  POSTER_FONT_FAMILY,
} from "../index";

let passed = 0;
function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve(fn()).then(() => {
    passed++;
    console.log(`  ok ${name}`);
  });
}

const LONG = "সরকার আজ জাতীয় সংসদে নতুন বাজেট পেশ করেছে এবং এতে শিক্ষা ও স্বাস্থ্যখাতে বরাদ্দ বাড়ানোর ঘোষণা দিয়েছে";

async function main(): Promise<void> {
  await check("the frame is 16:9 and landscape, so a card never crops the subject", () => {
    assert.equal(POSTER_FRAME.width, 1600);
    assert.equal(POSTER_FRAME.height, 900);
    assert.equal(POSTER_FRAME.width / POSTER_FRAME.height, 16 / 9);
    assert.ok(POSTER_FRAME.width > POSTER_FRAME.height);
  });

  await check("the Bengali font ships with the package", () => {
    const dir = fontsDir();
    const files = fs.readdirSync(dir);
    assert.ok(files.some((f) => /NotoSansBengali-Bold\.ttf$/i.test(f)), "bold face");
    assert.ok(files.some((f) => /NotoSansBengali-Regular\.ttf$/i.test(f)), "regular face");
    assert.ok(files.some((f) => /OFL\.txt$/i.test(f)), "the licence must travel with the font");
  });

  await check("a headline is wrapped, not clipped", () => {
    const lines = wrapCaption(LONG, 62, 1424);
    assert.ok(lines.length > 1, "a long headline needs more than one line");
    assert.equal(lines.join(" ").replace(/\s+/g, " "), LONG, "no word may be dropped");
  });

  await check("the type size shrinks before the caption leaves the plate", () => {
    const fitted = fitCaption(LONG);
    assert.ok(fitted.lines.length <= 3, "at most three lines");
    assert.ok(fitted.fontSize >= 40 && fitted.fontSize <= 62);
    assert.ok(fitted.lines.every((line) => line.length > 0), "no empty line");
  });

  await check("an absurd headline is truncated rather than overflowing", () => {
    const fitted = fitCaption(`${LONG} ${LONG} ${LONG}`);
    assert.equal(fitted.lines.length, 3);
    assert.equal(fitted.truncated, true);
    assert.ok(fitted.lines[2]!.endsWith("…"), "the cut is visible");
  });

  await check("a short headline stays at the largest size", () => {
    const fitted = fitCaption("বাজেট পেশ");
    assert.equal(fitted.lines.length, 1);
    assert.equal(fitted.fontSize, 62);
  });

  await check("the caption carries the brand, the headline and the desk", () => {
    const svg = captionSvg({ title: "বাজেট পেশ", category: "সংবাদ", source: "প্রথম আলো", dateText: "১৭ নভেম্বর" });
    assert.match(svg, new RegExp(`font-family="${POSTER_FONT_FAMILY}"`), "the caption must ask for the bundled face");
    assert.match(svg, /হৈচৈ/, "the wordmark");
    assert.match(svg, /বাজেট পেশ/, "the headline");
    assert.match(svg, /প্রথম আলো/, "the source is the kicker");
    assert.ok(!/সংবাদ · প্রথম আলো/.test(svg), "the desk is not printed twice");
    assert.match(svg, new RegExp(`${POSTER_FRAME.width}" height="${POSTER_FRAME.height}`), "a 16:9 canvas");
  });

  await check("a headline containing markup cannot break the plate", () => {
    const svg = captionSvg({ title: 'বাজার <script>alert("x")</script> & শেষ' });
    assert.ok(!svg.includes("<script>"), "raw markup must be escaped");
    assert.match(svg, /&lt;script&gt;/);
    assert.match(svg, /&amp;/);
  });

  await check("the credit names the site and never repeats the headline", () => {
    assert.equal(creditLine({ title: "শিরোনাম", dateText: "১৭ নভেম্বর" }), "hoichoifeed.vercel.app · ১৭ নভেম্বর");
    assert.equal(kickerLine({ title: "শিরোনাম", category: "খেলা" }), "", "a desk alone is the chip, not the kicker");
    assert.equal(kickerLine({ title: "শিরোনাম", source: "প্রথম আলো" }), "প্রথম আলো");
    assert.equal(kickerLine({ title: "শিরোনাম" }), "");
  });

  await check("the fallback backdrop is deterministic and its own plate", () => {
    const a = backdropSvg("একই সংবাদ", "#2f9e76");
    const b = backdropSvg("একই সংবাদ", "#2f9e76");
    const c = backdropSvg("অন্য সংবাদ", "#2f9e76");
    assert.equal(a, b, "the same story must draw the same plate");
    assert.notEqual(a, c, "a different story must not");
    assert.match(a, /#2f9e76/, "the desk accent is used");
  });

  await check("a render composes the background and the caption at 16:9", async () => {
    const sharp = (await import("sharp")).default;
    const background = await sharp({
      create: { width: 1024, height: 1536, channels: 3, background: "#2b3a55" },
    })
      .jpeg()
      .toBuffer();
    const out = await renderPoster({
      background,
      spec: { title: "সংসদে নতুন বাজেট পেশ", category: "সংবাদ", dateText: "১৭ নভেম্বর ২০২৬" },
      format: "webp",
    });
    assert.equal(out.width, 1600);
    assert.equal(out.height, 900);
    assert.equal(out.usedFallbackBackdrop, false);
    assert.equal(out.contentType, "image/webp");
    assert.ok(out.bytes.byteLength > 8_000, "a real plate, not an empty canvas");
    const meta = await sharp(out.bytes).metadata();
    assert.equal(meta.width, 1600);
    assert.equal(meta.height, 900);
    fs.writeFileSync(path.resolve(".tmp-poster-test.webp"), out.bytes);
  });

  await check("no background still produces a publishable plate", async () => {
    const out = await renderPoster({
      background: null,
      spec: { title: "ছবি ছাড়া কোনো সংবাদ প্রকাশ পাবে না", category: "প্রযুক্তি" },
    });
    assert.equal(out.usedFallbackBackdrop, true);
    assert.equal(out.width, 1600);
    assert.ok(out.bytes.byteLength > 5_000);
    fs.writeFileSync(path.resolve(".tmp-poster-fallback.webp"), out.bytes);
  });

  await check("topic cues name the desk and the story's own subject words", async () => {
    const cues = topicCues({
      category: "রাজনীতি",
      title: "ঢাকায় নতুন মেট্রোরেল স্টেশন চালু হবে আগামী মাসে",
    });
    assert.equal(cues[0], "রাজনীতি", "the desk is always the first chip");
    assert.ok(cues.length >= 2 && cues.length <= 3, "two or three chips, never a wall of them");
    assert.ok(!cues.includes("আগামী"), "a stopword is not a topic");
    assert.equal(new Set(cues).size, cues.length, "no chip repeats");
  });

  await check("the same story always gets the same chips", async () => {
    const input = {
      category: "খেলা",
      title: "বাংলাদেশ ক্রিকেট দল সিরিজ জিতল শেষ ম্যাচে",
    };
    assert.deepEqual(topicCues(input), topicCues(input));
  });

  await check("chips are drawn on the plate, and only when given", async () => {
    const svg = captionSvg({
      title: "পরীক্ষামূলক শিরোনাম",
      category: "প্রযুক্তি",
      source: "একুশে",
      topics: ["প্রযুক্তি", "মেট্রোরেল"],
    });
    assert.ok(svg.includes("মেট্রোরেল"), "the topic is on the plate");
    const plain = captionSvg({ title: "পরীক্ষামূলক শিরোনাম" });
    assert.ok(!plain.includes("fill-opacity="), "no chips when there are none");
  });

  await check("the logo mark is a real layer in the plate", async () => {
    const out = await renderPoster({
      background: null,
      spec: {
        title: "ব্রান্ড মার্ক পরীক্ষা",
        category: "সংবাদ",
        topics: ["সংবাদ"],
      },
      format: "png",
    });
    const sharpLib = (await import("sharp")).default;
    const { data, info } = await sharpLib(out.bytes)
      .extract({ left: 88, top: 64, width: 68, height: 68 })
      .raw()
      .toBuffer({ resolveWithObject: true });
    let bright = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      if ((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0) > 360) bright++;
    }
    assert.ok(bright > 200, "the brand mark is composited, not missing: " + bright);
    fs.writeFileSync(path.resolve(".tmp-poster-branded.png"), out.bytes);
  });

  console.log(`\nposter: ${passed} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
