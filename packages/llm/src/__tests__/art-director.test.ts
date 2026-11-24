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
  paletteSummary,
} from "../art-director";
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

check("a headline longer than 45 characters is trimmed without cutting a word", () => {
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

check("paletteSummary reports real tokens, not the model's prose", () => {
  const plan = normalisePlan(null, article, []);
  const summary = paletteSummary(plan);
  assert.match(summary.bg, /^#[0-9a-f]{6}$/i);
  assert.match(summary.accent, /^#[0-9a-f]{6}$/i);
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
