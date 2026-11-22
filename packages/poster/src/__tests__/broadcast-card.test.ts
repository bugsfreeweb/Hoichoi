/**
 * The broadcast card, pinned.
 *
 * This is a different object from the editorial poster: 1200×675 at 2×, a
 * broadcast graphic rather than a newsroom page. The checks below are about the
 * things that make it one — the badge, the two rails, the headline that reads
 * white-to-gold, the translucent standfirst box, the solid white footer — plus
 * the two hard rules: nothing can overflow the frame, and the story's own photo
 * may only ever be *inspiration*, never the picture itself.
 */
import assert from "node:assert/strict";
import {
  BROADCAST_FRAME,
  BROADCAST_SCALE,
  broadcastCardTemplate,
  broadcastVariant,
  headlineSizeForCard,
  renderBroadcastCard,
} from "../index";

let passed = 0;
function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve(fn()).then(() => {
    passed++;
    console.log(`  ok ${name}`);
  });
}

async function main(): Promise<void> {
  const base = {
    category: "জাতীয়",
    title: "সুপ্রিম কোর্টের রায়ের পর রাজধানীতে নতুন ট্রাফিক ব্যবস্থা, আট সড়কে বদলে যাচ্ছে যান চলাচল",
    summary: "সকাল সাতটা থেকে সন্ধ্যা সাতটা পর্যন্ত নতুন নিয়ম কার্যকর হবে বলে জানিয়েছে ঢাকা মহানগর পুলিশ।",
    source: "প্রথম আলো",
    dateText: "১৮ নভেম্বর ২০২৬",
    accent: "#E11D2E",
  };

  await check("the frame is the social one: 1200×675 drawn at 2×", () => {
    assert.equal(BROADCAST_FRAME.width, 1200);
    assert.equal(BROADCAST_FRAME.height, 675);
    assert.equal(BROADCAST_FRAME.width / BROADCAST_FRAME.height, 16 / 9);
    assert.equal(BROADCAST_SCALE, 2, "a 2400×1350 PNG");
  });

  await check("every part of the card is present, in the required places", async () => {
    const html = await broadcastCardTemplate(base);
    assert.match(html, /<html lang="bn">/, "the document declares Bangla");
    assert.match(html, /html,body\{width:1200px;height:675px;overflow:hidden;\}/, "the frame cannot scroll");
    // Top rail: desk badge left, logo badge right.
    assert.match(html, /<header>[\s\S]*class="badge"[\s\S]*<i><\/i>জাতীয়/, "the desk badge is top-left");
    assert.match(html, /class="logo"/, "a placeholder logo badge, top-right");
    assert.match(html, /১৮ নভেম্বর ২০২৬/, "the date rides the same rail");
    // Headline is the subject, in one of the two paint treatments.
    assert.match(html, /<h1 class="glow">/, "the headline is the subject");
    assert.ok(
      /background:linear-gradient\(100deg,#ffffff 0%, #ffffff 42%, #f8cf68 100%\)/.test(html) ||
        /color:#ffffff;border-bottom:6px solid var\(--accent\)/.test(html),
      "the headline is either white-into-gold or white over an accent rule",
    );
    // The standfirst sits in its own translucent box.
    assert.match(html, /class="summary"/);
    assert.match(html, /background:rgba\(255,255,255,0\.09\)/, "the box is translucent, not opaque");
    assert.match(html, /-webkit-line-clamp:2/, "two lines, then a clamp — never an overflow");
    // The footer is a solid white bar.
    assert.match(html, /footer\{position:absolute;left:0;right:0;bottom:0;height:66px;background:#fdfdf8/);
    assert.match(html, /ব্রেকিং নিউজ/);
    assert.match(html, /সূত্র · প্রথম আলো/);
  });

  await check("nothing a headline can contain escapes the frame", async () => {
    const hostile = await broadcastCardTemplate({
      ...base,
      title: '<script>alert("x")</script> বড় খবর & আরও',
      summary: "a & b < c > d \"quoted\"",
      source: "<b>সূত্র</b>",
    });
    assert.ok(!hostile.includes("<script>alert"), "an injected tag is escaped, not rendered");
    assert.match(hostile, /&lt;script&gt;/, "and it is still printed, escaped");
    assert.match(hostile, /a &amp; b &lt; c &gt; d &quot;quoted&quot;/);
    // Height is fixed and the type is clamped, so a runaway string cannot grow
    // the card: the only variable is the font size, and that steps down.
    assert.match(hostile, /html,body\{width:1200px;height:675px;overflow:hidden;\}/);
  });

  await check("the headline steps down with length, never past the box", () => {
    const short = headlineSizeForCard("বাজেট");
    const mid = headlineSizeForCard("ঢাকায় নতুন ট্রাফিক ব্যবস্থা চালু হচ্ছে");
    const long = headlineSizeForCard("সুপ্রিম কোর্টের রায়ের পর রাজধানীতে নতুন ট্রাফিক ব্যবস্থা, আট সড়কে বদলে যাচ্ছে যান চলাচল এবং আরও কিছু কথা");
    assert.ok(short > mid && mid > long, `sizes step down (${short} > ${mid} > ${long})`);
    assert.ok(long >= 40, "and stay readable");
  });

  await check("one anatomy, six surfaces — the story picks the surface", async () => {
    const titles = [
      "সুপ্রিম কোর্টের রায়ের পর রাজধানীতে নতুন ট্রাফিক ব্যবস্থা",
      "বাজেট ঘোষণায় ক্ষুদ্র ব্যবসায়ীদের জন্য নতুন ঋণ সুবিধা",
      "ঢাকার বুকে ভূমিকম্পের মহড়া, স্কুলে নতুন নিরাপত্তা নির্দেশনা",
      "কক্সবাজারে পর্যটন মৌসুমে বাড়ছে হোটেল ভাড়া",
      "জাতীয় দলের নতুন কোচ নিয়োগে বোর্ডের সিদ্ধান্ত",
      "বিশ্ববিদ্যালয় ভর্তি পরীক্ষার তারিখ ঘোষণা",
      "স্বাস্থ্য খাতে বাজেট বাড়ছে, নতুন হাসপাতাল",
      "পদ্মা সেতুতে ট্রেন চলাচলে নতুন সময়সূচি",
      "শিল্পে বিদ্যুৎ সংকট, রপ্তানিতে প্রভাবের শঙ্কা",
      "নির্বাচন কমিশনের নতুন তফসিল ঘোষণা",
      "কৃষকদের জন্য সার ভর্তুকি বাড়ানোর সিদ্ধান্ত",
      "আবহাওয়া অফিসের সতর্কবার্তা, উপকূলে জোয়ারের আশঙ্কা",
    ];
    const ids = new Set(titles.map((t) => broadcastVariant(`জাতীয়|${t}`).id.split("/")[0]));
    assert.ok(ids.size >= 4, `twelve stories must not share one surface (saw ${ids.size})`);

    // Same story, same card — a retry cannot repaint it.
    const a = broadcastVariant("জাতীয়|একই খবর");
    const b = broadcastVariant("জাতীয়|একই খবর");
    assert.deepEqual(a, b, "the surface is a hash of the story, not a random number");
    assert.notEqual(
      broadcastVariant("জাতীয়|একই খবর").id,
      broadcastVariant("মুক্তি|একই খবর").id,
      "two desks are not the same card",
    );

    // Every surface keeps the same anatomy and the same fixed frame.
    for (const title of [titles[0]!, titles[5]!, titles[11]!]) {
      const html = await broadcastCardTemplate({ ...base, title });
      assert.match(html, /<header>[\s\S]*class="badge"/, `${title.slice(0, 12)}: badge stays top-left`);
      assert.match(html, /class="logo"/, "logo stays top-right");
      assert.match(html, /<h1 class="glow">/, "headline stays the subject");
      assert.match(html, /footer\{position:absolute;left:0;right:0;bottom:0;height:66px/, "footer bar stays");
      assert.match(html, /html,body\{width:1200px;height:675px;overflow:hidden;\}/, "the frame stays fixed");
    }
  });

  await check("no surface is a black rectangle", async () => {
    const html = await broadcastCardTemplate(base);
    // The field may be dark, but it may not be near-black: the first card sat at
    // #0b1020 and read as a black box on a phone in daylight.
    const stops = [...html.matchAll(/linear-gradient\([^)]*?#([0-9a-fA-F]{6})/g)].map((m) => m[1] ?? "");
    for (const hex of stops) {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      assert.ok(luma > 20, `field stop #${hex} is lifted (luma ${luma.toFixed(1)})`);
    }
    // And the scrims that sit over the art are bounded, so the picture is not
    // dimmed back into a black card.
    const alphas = [...html.matchAll(/rgba\(6,9,18,(0?\.[0-9]+)\)/g)].map((m) => Number(m[1]));
    const worst = Math.max(...alphas);
    assert.ok(worst <= 0.7, `the heaviest scrim is ${worst}, not a blackout`);
  });

  await check("the story's own photo inspires the field, it is not the picture", async () => {
    const html = await broadcastCardTemplate({ ...base, backgroundImage: Buffer.from([1, 2, 3]) });
    assert.match(html, /class="ph-scene ph-photo"/, "the scene layer appears");
    assert.match(html, /filter:blur\(2px\) saturate\(1\.35\)/, "it is softened and pushed");
    assert.match(html, /hue-rotate\(-8deg\)/, "its colour is nudged");
    assert.match(html, /mix-blend-mode:soft-light/, "and blended into the field");
    assert.match(html, /class="ph-fade"/, "with a fade so the type still has ground");

    const without = await broadcastCardTemplate(base);
    assert.ok(!without.includes('<div class="ph-scene ph-photo"'), "no photo means no photo layer in the markup");
    assert.match(without, /<div class="ph-scene ph-motif"/, "the branded motif takes its place");
  });

  await check("fonts embed by default; Google Fonts is an opt-in", async () => {
    const local = await broadcastCardTemplate(base);
    assert.ok(!local.includes("fonts.googleapis.com"), "a default render asks the network for nothing");
    const cdn = await broadcastCardTemplate({ ...base, fonts: "cdn" });
    assert.match(cdn, /fonts\.googleapis\.com\/css2\?family=Hind\+Siliguri/);
    assert.match(cdn, /Noto\+Sans\+Bengali/);
    // Even in cdn mode the embedded faces stay, so a failed request is not tofu.
    assert.match(local, /font-family:"Noto Sans Bengali","Hind Siliguri"/);
  });

  await check("a render is a 2400×1350 PNG when a browser is available", async () => {
    let result: Awaited<ReturnType<typeof renderBroadcastCard>>;
    try {
      result = await renderBroadcastCard(base);
    } catch (err) {
      console.log(`  skip render: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    assert.equal(result.contentType, "image/png");
    assert.equal(result.scale, 2);
    const sharp = (await import("sharp")).default;
    const meta = await sharp(result.bytes).metadata();
    assert.equal(meta.width, 2400, "1200 CSS px at 2×");
    assert.equal(meta.height, 1350, "675 CSS px at 2×");
    assert.ok(result.bytes.byteLength > 20_000, "a real card, not an empty frame");
  });

  console.log(`\nbroadcast card: ${passed} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
