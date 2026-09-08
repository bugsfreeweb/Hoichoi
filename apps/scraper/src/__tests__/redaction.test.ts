import assert from "node:assert/strict";
import { redactText } from "../rewrite";
import { isBengaliScript } from "@hoichoi/llm";
import { isPersonalProfileUrl, isAllowedPageUrl } from "../facebook";
import { imagePhash, hammingDistance, isNearDuplicate } from "../hash";
import sharp from "sharp";

let passed = 0;
const results: Array<Promise<void>> = [];

function check(name: string, fn: () => void | Promise<void>) {
  results.push(
    (async () => {
      try {
        await fn();
        passed++;
        console.log(`  ok  ${name}`);
      } catch (err) {
        console.error(`FAIL ${name}: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    })(),
  );
}

check("personal profile URLs are blocked (the hard rule)", () => {
  assert.equal(isPersonalProfileUrl("https://www.facebook.com/photo.php?fbid=123"), true);
  assert.equal(isPersonalProfileUrl("https://www.facebook.com/profile.php?id=1000123"), true);
  assert.equal(isAllowedPageUrl("https://www.facebook.com/photo.php?fbid=123"), false);
  assert.equal(isAllowedPageUrl("https://www.facebook.com/watch/?v=42"), false);
  assert.equal(isAllowedPageUrl("https://www.facebook.com/dhwaminfo"), true);
});

check("bengali script detection", () => {
  assert.equal(isBengaliScript("আজ ঢাকায় বৃষ্টি হয়েছে।"), true);
  assert.equal(isBengaliScript("hello world"), false);
});

check("maximum redaction strips phones + suspect name markers", () => {
  const input =
    "আব্দুল করিম নামের এক ব্যক্তি মোঃ রহিমকে ফোন 01712345678 এ কল করে শিশুটিকে হুমকি দেয়।";
  const out = redactText(input, "maximum", [], { childHelpline: "১০৯" });
  assert.ok(!out.includes("01712345678"), "phone should be removed");
  assert.ok(!out.includes("করিম"), "name prefix should be redacted");
  assert.notEqual(out, input);
});

check("standard redaction replaces phone with child helpline", () => {
  const input = "যোগাযোগ: 01911111111";
  const out = redactText(input, "standard", [], { childHelpline: "১০৯" });
  assert.match(out, /১০৯/);
  assert.ok(!out.includes("01911111111"));
});

check("blocklist removes names regardless of mode", () => {
  const out = redactText("শেখ হাসিনা রহস্যময়", "standard", ["শেখ হাসিনা"], {});
  assert.ok(!out.includes("শেখ হাসিনা"), out);
});

function pngOfGray(width: number, height: number, fn: (i: number) => number): Promise<Buffer> {
  const pixels = new Uint8Array(width * height);
  for (let i = 0; i < pixels.length; i++) pixels[i] = Math.max(0, Math.min(255, fn(i)));
  return sharp(pixels, { raw: { width, height, channels: 1 } }).png().toBuffer();
}

check("pHash differs between distinct images but stays stable-ish for near dupes", async () => {
  // column gradient (intentional structure), plus a near-identical variant
  const srcA = await pngOfGray(32, 32, (i) => (i % 32) * 8);
  const srcB = await pngOfGray(32, 32, (i) => {
    const v = (i % 32) * 8;
    if (i === 14 || i === 300 || i === 777) return (v + 16) % 255;
    return v;
  });
  // row gradient — starkly different pattern
  const srcC = await pngOfGray(32, 32, (i) => Math.floor(i / 32) * 8);

  const a = await imagePhash(srcA);
  const b = await imagePhash(srcB);
  const c = await imagePhash(srcC);
  assert.equal(a.length, 16);
  assert.equal(isNearDuplicate(a, b), true, "nearly identical → duplicate");
  assert.equal(isNearDuplicate(a, c), false, "different content → not dup");
  assert.ok(hammingDistance(a, c) > 10, "distance large on different images");
});

await Promise.all(results);
console.log(`\n[test] ${passed} checks passed`);
if (process.exitCode) {
  console.error("[test] FAILURES PRESENT");
}