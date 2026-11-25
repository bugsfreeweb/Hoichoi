/**
 * Art direction without a model.
 *
 * The deterministic planner is not a debug path: it is the floor under every
 * live request, so these checks pin the two promises that survive a provider
 * outage — a complete Bengali plan, and a layout/palette pair that differs from
 * the recent window.
 */
import assert from "node:assert/strict";
import {
  ART_DIRECTOR_SCHEMA,
  artDirectorPrompt,
  avoidRepetition,
  directPosterDesign,
  normalisePlan,
  orientImagePrompt,
  paletteSummary,
} from "../art-director";
import { publicFigureFor } from "../image-prompt";
import { POSTER_DESIGN_LAYOUTS, POSTER_PALETTES } from "@hoichoi/shared-types";

let passed = 0;
function check(name: string, fn: () => void | Promise<void>): void {
  const out = fn();
  if (out instanceof Promise) throw new Error("use awaitCheck for async checks");
  passed++;
  console.log(`  ✓ ${name}`);
}

const article = {
  title: "প্রযুক্তি খাতে রেকর্ড বিনিয়োগ, নতুন কর্মসংস্থানের আশা",
  content:
    "দেশের প্রযুক্তি খাতে এ বছর রেকর্ড পরিমাণ বিনিয়োগ এসেছে। নতুন বিনিয়োগে হাজারো তরুণের কর্মসংস্থান হবে বলে জানিয়েছেন বিশেষজ্ঞরা। সরকারের নীতিও সহায়ক।",
  summary: "প্রযুক্তি খাতে বিনিয়োগ বেড়েছে। কর্মসংস্থান তৈরি হবে।",
  category: "technology",
  source: "হৈচৈ ডেস্ক",
  publishedAt: "2026-11-24T08:00:00.000Z",
};

check("offline direction is complete and Bengali", () => {
  const plan = normalisePlan(null, article, []);
  assert.ok(plan.headline.length > 0 && plan.headline.length <= 45);
  assert.ok(plan.badgeText.length > 0);
  assert.match(plan.footerText, /^সূত্র:/);
  assert.ok(POSTER_DESIGN_LAYOUTS.includes(plan.layout));
  assert.ok(POSTER_PALETTES.some((p) => p.id === plan.paletteId));
  assert.equal(plan.bullets.length, 3);
  assert.ok(plan.imagePrompt.toLowerCase().includes("no text"));
});

check("the model cannot repeat the most recent pair", () => {
  const first = normalisePlan(null, article, []);
  const second = normalisePlan(
    { layout_variant: first.layout, palette_id: first.paletteId },
    article,
    [{ layout: first.layout, palette: first.paletteId }],
  );
  assert.notEqual(`${second.layout}|${second.paletteId}`, `${first.layout}|${first.paletteId}`);
});

check("avoidRepetition walks to the first unused combination", () => {
  const recent = [{ layout: "split_left_media" as const, palette: "tech_navy_cyan" }];
  const result = avoidRepetition(
    { layout: "split_left_media", paletteId: "tech_navy_cyan" },
    recent,
  );
  assert.equal(result.changed, true);
  assert.notEqual(`${result.layout}|${result.paletteId}`, "split_left_media|tech_navy_cyan");
});

check("a headline longer than the limit is trimmed without cutting a word", () => {
  const long = normalisePlan(
    { headline: "এটি একটি অত্যন্ত দীর্ঘ বাংলা শিরোনাম যা পোস্টারের সীমা ছাড়িয়ে যাবে এবং কেটে ফেলা দরকার" },
    article,
  );
  assert.ok(long.headline.length <= 45);
});

check("a highlight word absent from the headline is replaced by one inside it", () => {
  const plan = normalisePlan(
    { headline: "নতুন সড়ক উদ্বোধন", highlight_word: "সম্পূর্ণ ভিন্ন" },
    article,
  );
  assert.ok(plan.headline.includes(plan.highlightWord));
});

check("quote mode drops bullets; bullet mode fills to three", () => {
  const quote = normalisePlan(
    { headline: "মনে রাখার দিন", content_mode: "quote", pull_quote: "এই মুহূর্তটি ইতিহাস" },
    article,
  );
  assert.ok(quote.pullQuote);
  assert.equal(quote.bullets.length, 0);
  const bullets = normalisePlan(
    { headline: "তিনটি বিষয়", content_mode: "bullets", bullets: ["এক", "দুই"] },
    article,
  );
  assert.equal(bullets.bullets.length, 3);
  assert.equal(bullets.pullQuote, null);
});

check("the prompt carries the recent window", () => {
  const prompt = artDirectorPrompt(article, [
    { layout: "split_left_media", palette: "tech_navy_cyan" },
    { layout: "breaking_spotlight", palette: "breaking_obsidian_crimson" },
  ]);
  assert.ok(prompt.includes("recently_used_designs"));
  assert.ok(prompt.includes("split_left_media / tech_navy_cyan"));
  assert.ok(prompt.includes("breaking_spotlight / breaking_obsidian_crimson"));
});

check("the schema enumerates the renderer's actual vocabulary", () => {
  const props = ART_DIRECTOR_SCHEMA.properties as Record<string, { enum?: readonly string[] }>;
  assert.deepEqual([...(props.layout_variant?.enum ?? [])], [...POSTER_DESIGN_LAYOUTS]);
  assert.deepEqual(
    [...(props.palette_id?.enum ?? [])],
    POSTER_PALETTES.map((p) => p.id),
  );
});

check("a portrait render re-aims the prompt without touching the landscape one", () => {
  const wide = "A wide 16:9 editorial illustration of a data centre, no text.";
  assert.equal(orientImagePrompt(wide, "16:9"), wide);
  const tall = orientImagePrompt(wide, "4:5");
  assert.match(tall, /vertical 4:5 composition/i);
  assert.ok(!/wide/i.test(tall));
  assert.ok(!/16:9/.test(tall));
  assert.equal(orientImagePrompt(tall, "4:5"), tall, "already-oriented prompts are not stacked");
});

check("paletteSummary reports real tokens, not the model's prose", () => {
  const plan = normalisePlan(null, article, []);
  const summary = paletteSummary(plan);
  assert.match(summary.bg, /^#[0-9a-f]{6}$/i);
  assert.match(summary.accent, /^#[0-9a-f]{6}$/i);
});

const nvidia = {
  title: "নিভিডিয়ার কর্মীরা জেসেন হুয়াংকে হিরো হিসেবে স্বাগত জানান",
  summary: "নিভিডিয়ার কর্মীরা প্রতিষ্ঠাতা জেসেন হুয়াংকে প্রত্যাবর্তনের সময় হিরো হিসেবে স্বাগত জানিয়েছেন।",
  content:
    "জেসেন হুয়াং নিভিডিয়ার প্রধান নির্বাহী কর্মকর্তা হিসেবে প্রতিষ্ঠানের প্রধান কার্যালয়ে ফিরে এসেছেন। কর্মীরা তাকে হিরো হিসেবে স্বাগত জানিয়েছেন।",
  category: "corruption",
  source: "Techcrunch",
};

check("a named subject reaches the image prompt instead of generic stock art", () => {
  const plan = normalisePlan(
    { image_prompt: "A confident CEO being applauded by enthusiastic employees in a modern office." },
    nvidia,
  );
  assert.match(plan.imagePrompt, /GPU company/i);
  assert.match(plan.imagePrompt, /Jensen Huang/);
  assert.match(plan.imagePrompt, /black leather jacket/i);
  assert.match(plan.imagePrompt, /no text/i);
});

check("a mis-filed category does not mislabel the story", () => {
  const plan = normalisePlan(null, nvidia, []);
  assert.equal(plan.badgeText, "প্রযুক্তি");
  assert.ok(!plan.imagePrompt.includes("নিভিডিয়ার"), "the image prompt is English, not a pasted Bangla title");
});

check("the art director is told the visual anchors and the real desk", () => {
  const prompt = artDirectorPrompt(nvidia, []);
  assert.match(prompt, /VISUAL ANCHORS/);
  assert.match(prompt, /Jensen Huang/);
  assert.match(prompt, /NVIDIA/);
  assert.match(prompt, /DESK HINT \(derived from the article's own words\): tech/);
});

check("a truncated model headline is rebuilt from the title at a word boundary", () => {
  const plan = normalisePlan(
    { headline: "নিভিডিয়ার কর্মীরা জেসেন হুয়াংকে হিরো হিসেবে স্ব" },
    nvidia,
    [],
  );
  assert.ok(Array.from(plan.headline).length <= 48);
  assert.ok(!plan.headline.endsWith("স্ব"), "the last word is not half a conjunct");
  assert.ok(plan.headline.includes("নিভিডিয়ার"));
});

check("an invented quote is replaced by a sentence the story actually contains", () => {
  const plan = normalisePlan(
    { content_mode: "quote", pull_quote: "‘আমি এখানে ফিরে এসে গর্বিত’ – জেসেন হুয়াং" },
    nvidia,
    [],
  );
  assert.ok(plan.pullQuote?.startsWith("নিভিডিয়ার কর্মীরা প্রতিষ্ঠাতা"), plan.pullQuote ?? "none");
  assert.ok(!plan.pullQuote?.includes("গর্বিত"));
});

check("a named public figure resolves to a real Wikipedia portrait", () => {
  assert.deepEqual(publicFigureFor(nvidia), { name: "Jensen Huang", wiki: "Jensen_Huang" });
  assert.equal(publicFigureFor({ title: "বাজেট ঘোষণা আজ" }), null);
});

async function asyncChecks(): Promise<void> {
  const offline = await directPosterDesign(article, { offline: true, recentlyUsed: [] });
  assert.equal(offline.source, "fallback");
  assert.ok(offline.plan.headline.length > 0);
  passed++;
  console.log("  ✓ offline direction never calls a provider");
}

await asyncChecks();
console.log(`\n[art-director] ${passed} checks passed`);
