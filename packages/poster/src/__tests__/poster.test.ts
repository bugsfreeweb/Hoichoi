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
  barcodeBars,
  dataUrlForImage,
  headlineSizeFor,
  planPoster,
  posterHtml,
  renderEditorialPoster,
  PosterBrowserUnavailable,
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

  // -------------------------------------------------------------------------
  // The editorial poster: layout choice, Bengali line box, browser rendering.
  // -------------------------------------------------------------------------
  check("every desk gets its own shape and paper", () => {
    const culture = planPoster({ category: "culture", title: "শহরের শেষ বইয়ের দোকান" });
    assert.equal(culture.layout, "editorial-card");
    assert.equal(culture.theme, "light-paper");
    assert.equal(culture.accent, "#B45309");
    const crime = planPoster({ category: "crime", title: "মিরপুরে ভবন ধস" });
    assert.equal(crime.layout, "breaking-banner");
    assert.equal(crime.theme, "dark");
    assert.equal(crime.accent, "#DC2626");
    const tech = planPoster({ category: "technology", title: "সাইবার হামলা" });
    assert.equal(tech.layout, "split-left");
    assert.equal(tech.theme, "dark");
    // An unknown desk must land somewhere deliberate, not crash.
    const unknown = planPoster({ category: "no-such-desk", title: "ঘটনা" });
    assert.equal(unknown.layout, "breaking-banner");
    assert.equal(unknown.subjectSide, "bottom-left");
  });

  check("the subject sits opposite the type", () => {
    // The image prompt reserves the side the headline will occupy, so a layout
    // change must move the picture, not just the CSS.
    assert.equal(planPoster({ category: "economy", title: "x" }).subjectSide, "right");
    assert.equal(planPoster({ category: "sports", title: "x" }).subjectSide, "left");
    assert.equal(planPoster({ category: "culture", title: "x" }).subjectSide, "center");
    assert.equal(planPoster({ category: "politics", title: "x" }).subjectSide, "bottom-left");
  });

  check("headline size steps down with length", () => {
    assert.equal(headlineSizeFor("মিরপুরে ভবন ধস"), 64);
    assert.equal(headlineSizeFor("নিত্যপণ্যের বাজারে দাম বেড়েছে টানা তৃতীয় সপ্তাহে"), 54);
    assert.equal(
      headlineSizeFor(
        "বাজেট ঘোষণার পর নিত্যপণ্যের বাজারে দাম বেড়েছে টানা তৃতীয় সপ্তাহে, সরকারি হিসাবে মূল্যস্ফীতি কিছুটা কমেছে কিন্তু বাজারে চাল ও ডালের দাম কমেনি",
      ),
      46,
    );
  });

  check("the HTML keeps the Bengali line box open and never ships text as SVG", () => {
    const html = posterHtml(
      {
        title: "ক্ষুদ্র ব্যাংক রাষ্ট্রপক্ষ স্ট্রাইক",
        summary: "সংক্ষিপ্ত সারাংশ",
        category: "অর্থনীতি",
        dateText: "১৮ নভেম্বর ২০২৬",
        backgroundDataUrl: null,
        logoDataUrl: null,
        fonts: [{ family: "Noto Serif Bengali", weight: 700, dataUrl: "data:font/ttf;base64,AA==" }],
      },
      planPoster({ category: "economy", title: "ক্ষুদ্র ব্যাংক" }),
    );
    // The 1.38 line-height and the 6px top padding are what keep ি ী ু ৃ and the
    // reph from clipping; they are a contract with the font, not a taste.
    assert.match(html, /line-height:1\.38/);
    assert.match(html, /padding-top:6px/);
    assert.match(html, /font-family:"Noto Serif Bengali"/);
    assert.ok(html.includes("ক্ষুদ্র ব্যাংক রাষ্ট্রপক্ষ স্ট্রাইক"), "the Bangla headline is in the markup");
    assert.ok(!/<text/.test(html), "no SVG text: librsvg mis-shapes Bengali conjuncts");
  });

  check("the barcode is decoration with a stable pattern", () => {
    const a = barcodeBars("story-one");
    const b = barcodeBars("story-one");
    const c = barcodeBars("story-two");
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
    assert.equal(a.length, 34);
  });

  check("a browser draws the poster when one is available", async () => {
    let out;
    try {
      out = await renderEditorialPoster({
        background: null,
        title: "মিরপুরে ভবন ধস, উদ্ধার কাজ চলছে",
        summary: "ফায়ার সার্ভিসের ছয় ইউনিট ঘটনাস্থলে।",
        category: "রাজনীতি",
        dateText: "১৮ নভেম্বর ২০২৬",
        seed: "test",
        format: "png",
      });
    } catch (err) {
      if (err instanceof PosterBrowserUnavailable) {
        // A machine without Chromium keeps the SVG net; that is a supported state.
        console.log("  skip browser render: no chromium on this machine");
        return;
      }
      throw err;
    }
    assert.equal(out.width, 1920);
    assert.equal(out.height, 1080);
    assert.equal(out.layout, "breaking-banner");
    assert.equal(out.contentType, "image/png");
    assert.ok(out.bytes.length > 40_000, `suspiciously small render: ${out.bytes.length}`);
    fs.writeFileSync(path.resolve(".tmp-poster-editorial.png"), out.bytes);
  });

  check("a photograph is labelled with its real type, not assumed PNG", () => {
    /**
     * The black-poster bug: every background was sent as `data:image/png` no
     * matter what it was. A WebP photograph — what the media store writes and
     * what most providers return — is refused by Chromium under that label, so
     * the picture never painted and the plate was a black rectangle with a
     * headline on it. Sniffing the magic bytes is the fix; these are the formats
     * that matter in production.
     */
    const webp = Buffer.concat([
      Buffer.from("RIFF"),
      Buffer.from([0x24, 0x00, 0x00, 0x00]),
      Buffer.from("WEBPVP8 "),
      Buffer.alloc(8),
    ]);
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(8)]);
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(8)]);
    assert.match(dataUrlForImage(webp), /^data:image\/webp;base64,/);
    assert.match(dataUrlForImage(png), /^data:image\/png;base64,/);
    assert.match(dataUrlForImage(jpeg), /^data:image\/jpeg;base64,/);
  });

  check("the wash is drawn under the photograph, so a picture can never paint black", () => {
    const base = {
      title: "মিরপুরে ভবন ধস",
      summary: null,
      category: "অর্থনীতি",
      dateText: "১৮ নভেম্বর ২০২৬",
      logoDataUrl: null,
      fonts: [{ family: "Noto Serif Bengali", weight: 700, dataUrl: "data:font/ttf;base64,AA==" }],
    };
    const plan = planPoster({ category: "economy", title: "মিরপুরে ভবন ধস" });
    const withPhoto = posterHtml({ ...base, backgroundDataUrl: "data:image/webp;base64,AAAA" }, plan);
    const washAt = withPhoto.indexOf("photo--wash");
    const photoAt = withPhoto.indexOf("background-image:url(");
    assert.ok(washAt > 0, "the wash layer is present with a photograph");
    assert.ok(photoAt > washAt, "the photograph is stacked above the wash, not instead of it");

    // Without a photograph the plate gets a motif — rules, a large faint mark and
    // an accent corner — because one dark gradient reads as empty space.
    const noPhoto = posterHtml({ ...base, backgroundDataUrl: null }, plan);
    assert.match(noPhoto, /class="motif"/);
    assert.match(noPhoto, /class="motif-grid"/);
    assert.match(noPhoto, /class="motif-mark"/);
    assert.match(noPhoto, /class="motif-corner"/);
    // The wash is a graphic, not a photograph: it must not inherit the blur.
    assert.match(noPhoto, /\.photo--wash\{filter:none;transform:none;\}/);
  });

  console.log(`\nposter: ${passed} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
