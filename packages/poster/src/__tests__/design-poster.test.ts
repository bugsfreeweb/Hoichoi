/**
 * The dynamic poster, without a browser.
 *
 * These checks are about the contract the API and the CMS rely on: five layouts
 * exist, every one of them sets the palette variables and a seeded texture, the
 * highlighted word survives escaping, and the Bengali faces are inlined before
 * a screenshot is taken.
 */
import assert from "node:assert/strict";
import { POSTER_DESIGN_LAYOUTS, POSTER_PALETTES } from "@hoichoi/shared-types";
import {
  DESIGN_FRAME,
  DESIGN_PORTRAIT_FRAME,
  DESIGN_SCALE,
  frameFor,
  focalAspectFor,
  designHeadlineSizeFor,
  designPosterHtml,
  textureSvg,
  type DesignPosterContent,
} from "../index";
import { onAccent, resolvePalette } from "../design/tokens";

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

const palette = POSTER_PALETTES[0]!;
const base: DesignPosterContent = {
  headline: "প্রযুক্তি খাতে নতুন বিনিয়োগ",
  highlightWord: "বিনিয়োগ",
  bullets: ["প্রথম পয়েন্ট", "দ্বিতীয় পয়েন্ট", "তৃতীয় পয়েন্ট"],
  pullQuote: null,
  badgeText: "প্রযুক্তি",
  footerText: "সূত্র: হৈচৈ | ২৪ নভেম্বর ২০২৬",
  layout: "split_left_media",
  aspect: "16:9",
  palette,
  visualStyle: "3D isometric render",
  texture: "dot_grid",
  backgroundDataUrl: null,
  logoDataUrl: null,
  fonts: [
    {
      family: "Hind Siliguri",
      weight: 700,
      dataUrl: "data:font/ttf;base64,AAAA",
    },
    { family: "Galada", weight: 400, dataUrl: "data:font/ttf;base64,BBBB" },
  ],
  brand: "হৈচৈ",
  site: "hoichoifeed.vercel.app",
  dateText: "২৪ নভেম্বর ২০২৬",
  seed: "tech-investment",
};

check("the frame and scale are the brief's", () => {
  assert.deepEqual({ ...DESIGN_FRAME }, { width: 1920, height: 1080 });
  assert.equal(DESIGN_SCALE, 2);
});

check("all five layouts render a complete document", () => {
  for (const layout of POSTER_DESIGN_LAYOUTS) {
    const html = designPosterHtml({ ...base, layout });
    assert.match(html, /^<!doctype html>/);
    assert.ok(
      html.includes(`data-layout="${layout}"`),
      `${layout} must name its shape`,
    );
    assert.ok(html.includes("--bg-color:"), "palette variables are injected");
    assert.ok(html.includes("--accent-color:"), "accent variable is injected");
    assert.ok(
      html.includes("data:image/svg+xml"),
      "a procedural texture is embedded",
    );
    assert.ok(html.includes("@font-face"), "Bengali fonts are inlined");
    assert.ok(html.includes('class="hl"'), "the highlight word is marked");
  }
});

check(
  "the headline is escaped, and the highlight is not a random substring",
  () => {
    const html = designPosterHtml({
      ...base,
      headline: "নতুন <script> বিনিয়োগ",
      highlightWord: "বিনিয়োগ",
    });
    assert.ok(
      !html.includes("<script>"),
      "raw markup cannot enter the document",
    );
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(html.includes('<mark class="hl">বিনিয়োগ</mark>'));
  },
);

check(
  "split layouts ask for a square visual; hero and spotlight ask for 16:9",
  () => {
    assert.equal(focalAspectFor("split_left_media"), "1:1");
    assert.equal(focalAspectFor("split_right_media"), "1:1");
    assert.equal(focalAspectFor("editorial_magazine_grid"), "1:1");
    assert.equal(focalAspectFor("hero_overlay_gradient"), "16:9");
    assert.equal(focalAspectFor("breaking_spotlight"), "16:9");
  },
);

check("the 4:5 frame changes the visual ratio, not the design", () => {
  assert.equal(focalAspectFor("hero_overlay_gradient", "4:5"), "9:16");
  assert.equal(focalAspectFor("breaking_spotlight", "4:5"), "9:16");
  assert.equal(focalAspectFor("split_left_media", "4:5"), "1:1");
  assert.deepEqual(frameFor("16:9"), DESIGN_FRAME);
  assert.deepEqual(frameFor("4:5"), DESIGN_PORTRAIT_FRAME);
  assert.deepEqual(DESIGN_PORTRAIT_FRAME, { width: 1080, height: 1350 });
});

check("portrait overrides are present without a second markup tree", () => {
  const html = designPosterHtml({ ...base, aspect: "4:5" });
  assert.ok(html.includes('data-aspect="4:5"'));
  assert.ok(
    html.includes('[data-aspect="4:5"]'),
    "the portrait overrides are inlined",
  );
  assert.ok(html.includes('4:5"][data-layout="split_left_media"]'));
});

check(
  "portrait headline type is smaller than landscape for the same words",
  () => {
    assert.ok(
      designHeadlineSizeFor(
        "split_left_media",
        "প্রযুক্তি খাতে নতুন বিনিয়োগ",
        "4:5",
      ) <
        designHeadlineSizeFor(
          "split_left_media",
          "প্রযুক্তি খাতে নতুন বিনিয়োগ",
          "16:9",
        ),
    );
  },
);

check("headline type steps down as the headline grows", () => {
  assert.equal(designHeadlineSizeFor("split_left_media", "ছোট শিরোনাম"), 80);
  const medium = "এটি একটি মাঝারি দৈর্ঘ্যের বাংলা শিরোনাম";
  assert.ok(designHeadlineSizeFor("split_left_media", medium) < 80);
  assert.ok(
    designHeadlineSizeFor(
      "split_left_media",
      medium + " এবং আরও অনেক বেশি লেখা যোগ করা হলো এখানে",
    ) < designHeadlineSizeFor("split_left_media", medium),
  );
});

check("textures are deterministic per seed and differ across seeds", () => {
  const a = textureSvg("dot_grid", palette, "story-a");
  const b = textureSvg("dot_grid", palette, "story-a");
  const c = textureSvg("dot_grid", palette, "story-b");
  assert.equal(a, b);
  assert.notEqual(a, c);
});

check("a light accent gets dark ink, a dark accent gets white", () => {
  assert.equal(onAccent(palette), "#0B0F14");
  assert.equal(
    onAccent(resolvePalette("breaking_obsidian_crimson")),
    "#FFFFFF",
  );
});

check("posters carry the headline, not description paragraphs", () => {
  const html = designPosterHtml({
    ...base,
    pullQuote: "এটাই মূল কথা",
    bullets: ["প্রথম পয়েন্ট", "দ্বিতীয় পয়েন্ট"],
  });
  assert.ok(html.includes(base.headline));
  assert.ok(!html.includes("এটাই মূল কথা"));
  assert.ok(!html.includes("প্রথম পয়েন্ট"));
  assert.ok(!html.includes('<ul class="bullets">'));
  assert.ok(!html.includes('class="quote'));
});

console.log(`\n[design-poster] ${passed} checks passed`);
