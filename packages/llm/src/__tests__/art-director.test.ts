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
import { publicFigureFor, storyAnchors } from "../image-prompt";
import { extractVisualSubjects, visualBriefLine } from "../visual-brief";
import { POSTER_DESIGN_LAYOUTS, POSTER_PALETTES } from "@hoichoi/shared-types";

let passed = 0;
function check(name: string, fn: () => void | Promise<void>): void {
  const out = fn();
  if (out instanceof Promise)
    throw new Error("use awaitCheck for async checks");
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
  assert.notEqual(
    `${second.layout}|${second.paletteId}`,
    `${first.layout}|${first.paletteId}`,
  );
});

check("avoidRepetition walks to the first unused combination", () => {
  const recent = [
    { layout: "split_left_media" as const, palette: "tech_navy_cyan" },
  ];
  const result = avoidRepetition(
    { layout: "split_left_media", paletteId: "tech_navy_cyan" },
    recent,
  );
  assert.equal(result.changed, true);
  assert.notEqual(
    `${result.layout}|${result.paletteId}`,
    "split_left_media|tech_navy_cyan",
  );
});

check(
  "a headline longer than the limit is trimmed without cutting a word",
  () => {
    const long = normalisePlan(
      {
        headline:
          "এটি একটি অত্যন্ত দীর্ঘ বাংলা শিরোনাম যা পোস্টারের সীমা ছাড়িয়ে যাবে এবং কেটে ফেলা দরকার",
      },
      article,
    );
    assert.ok(long.headline.length <= 45);
  },
);

check(
  "a highlight word absent from the headline is replaced by one inside it",
  () => {
    const plan = normalisePlan(
      { headline: "নতুন সড়ক উদ্বোধন", highlight_word: "সম্পূর্ণ ভিন্ন" },
      article,
    );
    assert.ok(plan.headline.includes(plan.highlightWord));
  },
);

check("quote mode drops bullets; bullet mode fills to three", () => {
  const quote = normalisePlan(
    {
      headline: "মনে রাখার দিন",
      content_mode: "quote",
      pull_quote: "এই মুহূর্তটি ইতিহাস",
    },
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
  const props = ART_DIRECTOR_SCHEMA.properties as Record<
    string,
    { enum?: readonly string[] }
  >;
  assert.deepEqual(
    [...(props.layout_variant?.enum ?? [])],
    [...POSTER_DESIGN_LAYOUTS],
  );
  assert.deepEqual(
    [...(props.palette_id?.enum ?? [])],
    POSTER_PALETTES.map((p) => p.id),
  );
});

check(
  "a portrait render re-aims the prompt without touching the landscape one",
  () => {
    const wide =
      "A wide 16:9 editorial illustration of a data centre, no text.";
    assert.equal(orientImagePrompt(wide, "16:9"), wide);
    const tall = orientImagePrompt(wide, "4:5");
    assert.match(tall, /vertical 4:5 composition/i);
    assert.ok(!/wide/i.test(tall));
    assert.ok(!/16:9/.test(tall));
    assert.equal(
      orientImagePrompt(tall, "4:5"),
      tall,
      "already-oriented prompts are not stacked",
    );
  },
);

check("paletteSummary reports real tokens, not the model's prose", () => {
  const plan = normalisePlan(null, article, []);
  const summary = paletteSummary(plan);
  assert.match(summary.bg, /^#[0-9a-f]{6}$/i);
  assert.match(summary.accent, /^#[0-9a-f]{6}$/i);
});

const nvidia = {
  title: "নিভিডিয়ার কর্মীরা জেসেন হুয়াংকে হিরো হিসেবে স্বাগত জানান",
  summary:
    "নিভিডিয়ার কর্মীরা প্রতিষ্ঠাতা জেসেন হুয়াংকে প্রত্যাবর্তনের সময় হিরো হিসেবে স্বাগত জানিয়েছেন।",
  content:
    "জেসেন হুয়াং নিভিডিয়ার প্রধান নির্বাহী কর্মকর্তা হিসেবে প্রতিষ্ঠানের প্রধান কার্যালয়ে ফিরে এসেছেন। কর্মীরা তাকে হিরো হিসেবে স্বাগত জানিয়েছেন।",
  category: "corruption",
  source: "Techcrunch",
};

check(
  "a named subject reaches the image prompt instead of generic stock art",
  () => {
    const plan = normalisePlan(
      {
        image_prompt:
          "A confident CEO being applauded by enthusiastic employees in a modern office.",
      },
      nvidia,
    );
    assert.match(plan.imagePrompt, /GPU company/i);
    assert.match(plan.imagePrompt, /Jensen Huang/);
    assert.match(plan.imagePrompt, /black leather jacket/i);
    assert.match(plan.imagePrompt, /no text/i);
  },
);

check("a mis-filed category does not mislabel the story", () => {
  const plan = normalisePlan(null, nvidia, []);
  assert.equal(plan.badgeText, "প্রযুক্তি");
  assert.ok(
    !plan.imagePrompt.includes("নিভিডিয়ার"),
    "the image prompt is English, not a pasted Bangla title",
  );
});

check("the art director is told the visual anchors and the real desk", () => {
  const prompt = artDirectorPrompt(nvidia, []);
  assert.match(prompt, /VISUAL ANCHORS/);
  assert.match(prompt, /Jensen Huang/);
  assert.match(prompt, /NVIDIA/);
  assert.match(
    prompt,
    /DESK HINT \(derived from the article's own words\): tech/,
  );
});

check(
  "a truncated model headline is rebuilt from the title at a word boundary",
  () => {
    const plan = normalisePlan(
      { headline: "নিভিডিয়ার কর্মীরা জেসেন হুয়াংকে হিরো হিসেবে স্ব" },
      nvidia,
      [],
    );
    assert.ok(Array.from(plan.headline).length <= 48);
    assert.ok(
      !plan.headline.endsWith("স্ব"),
      "the last word is not half a conjunct",
    );
    assert.ok(plan.headline.includes("নিভিডিয়ার"));
  },
);

check("a fallback bullet ends on a word, not half a conjunct", () => {
  const plan = normalisePlan(null, nvidia, []);
  assert.ok(plan.bullets.length >= 1);
  for (const bullet of plan.bullets) {
    assert.ok(Array.from(bullet).length <= 72, `${Array.from(bullet).length}`);
    assert.ok(!bullet.endsWith("হ"), bullet);
  }
});

check(
  "an invented quote is replaced by a sentence the story actually contains",
  () => {
    const plan = normalisePlan(
      {
        content_mode: "quote",
        pull_quote: "‘আমি এখানে ফিরে এসে গর্বিত’ – জেসেন হুয়াং",
      },
      nvidia,
      [],
    );
    assert.ok(
      plan.pullQuote?.startsWith("নিভিডিয়ার কর্মীরা প্রতিষ্ঠাতা"),
      plan.pullQuote ?? "none",
    );
    assert.ok(!plan.pullQuote?.includes("গর্বিত"));
  },
);

check("a named public figure resolves to a real Wikipedia portrait", () => {
  assert.deepEqual(publicFigureFor(nvidia), {
    name: "Jensen Huang",
    wiki: "Jensen_Huang",
  });
  assert.equal(publicFigureFor({ title: "বাজেট ঘোষণা আজ" }), null);
});

async function asyncChecks(): Promise<void> {
  const offline = await directPosterDesign(article, {
    offline: true,
    recentlyUsed: [],
  });
  assert.equal(offline.source, "fallback");
  assert.ok(offline.plan.headline.length > 0);
  passed++;
  console.log("  ✓ offline direction never calls a provider");
}

await asyncChecks();
console.log(`\n[art-director] ${passed} checks passed`);

const carsArticle = {
  title: "Small cars gain popularity among young people in Europe",
  summary:
    "A recent post on Facebook highlights that small cars are rapidly gaining popularity among young people across Europe. Previously they were associated with older drivers or rural residents; now they are a preferred choice for urban youth.",
  content:
    "Traditionally small cars were a convenient mode of transport for older citizens and rural residents. Demand among young people in several European cities has risen. Automakers may refine designs and features to cater to young buyers. Urban planners might expand parking and charging infrastructure for smaller vehicles.",
  category: "business",
  source: "BBC Technology",
  publishedAt: "2026-11-25T08:00:00.000Z",
};

check("a story about people, cars and a continent keeps all three", () => {
  const subjects = extractVisualSubjects(carsArticle);
  assert.ok(subjects.people.some((p) => /young adults/.test(p)));
  assert.ok(subjects.objects.some((o) => /small compact/.test(o)));
  assert.ok(subjects.countries.some((c) => /European/.test(c)));
  assert.ok(subjects.exteriors.some((e) => /urban street/.test(e)));
  // The rural contrast in the article's history must not become the scene too.
  assert.ok(!subjects.exteriors.some((e) => /rural road/.test(e)));
  const brief = visualBriefLine(subjects);
  assert.match(brief, /young adults/);
  assert.match(brief, /small compact hatchback cars/);
  assert.match(brief, /European setting/);
});

check(
  "the poster prompt carries the ordinary subject, not just the category",
  () => {
    const plan = normalisePlan(null, carsArticle, []);
    assert.match(plan.imagePrompt, /young adults/);
    assert.match(plan.imagePrompt, /small compact hatchback cars/);
    assert.match(plan.imagePrompt, /European setting/);
    assert.match(plan.imagePrompt, /urban street/);
  },
);

check("a Bengali car story is read the same way", () => {
  const subjects = extractVisualSubjects({
    title: "ইউরোপে তরুণদের মধ্যে ছোট গাড়ির জনপ্রিয়তা বাড়ছে",
    summary: "শহরাঞ্চলে তরুণ-তরুণীরা এখন ছোট ও সাশ্রয়ী গাড়ি বেছে নিচ্ছেন।",
    body: "পার্কিং ও চার্জিং ব্যবস্থা বাড়ানোর পরামর্শ দিয়েছেন নগর পরিকল্পনাকারীরা।",
  });
  assert.ok(subjects.people.some((p) => /young adults/.test(p)));
  assert.ok(subjects.objects.some((o) => /small compact/.test(o)));
  assert.ok(subjects.countries.some((c) => /European/.test(c)));
});

check("clothing, rooms and materials reach the brief too", () => {
  const subjects = extractVisualSubjects({
    title: "কাচ আর ইস্পাতের অফিসে স্যুট পরা কর্মীরা",
    summary: "আধুনিক ওপেন-প্ল্যান অফিসে কর্মীদের জন্য নতুন নকশা।",
    body: "অ্যালুমিনিয়াম ও কাঠের আসবাব, কাপড়ের আপহোলস্টারি।",
  });
  assert.ok(subjects.wardrobe.some((w) => /suit/.test(w)));
  assert.ok(subjects.interiors.some((i) => /office/.test(i)));
  assert.ok(subjects.materials.some((m) => /glass/.test(m)));
  assert.ok(subjects.materials.some((m) => /steel/.test(m)));
});

check("a price story is not mistaken for a plate of rice", () => {
  const subjects = extractVisualSubjects({
    title: "চালের দাম বাড়ছে, বাজারে চাপ",
    summary: "report on price rises",
  });
  assert.ok(!subjects.objects.some((o) => /rice|food/.test(o)));
});

check(
  "the footer's source and date come from the article, not the model",
  () => {
    const plan = normalisePlan(
      { footer_text: "সূত্র: রিবিম টেকনালজি | ২৮ নভেম্বর ২০২৬" },
      article,
      [],
    );
    assert.match(plan.footerText, /হৈচৈ ডেস্ক/);
    assert.match(plan.footerText, /২৪ নভেম্বর ২০২৬/);
    assert.doesNotMatch(plan.footerText, /রিবিম|২৮ নভেম্বর/);
  },
);

check("a sentence-opening capital is not a named subject", () => {
  const a = storyAnchors({
    title: "Small cars gain popularity among young people in Europe",
    summary: "Europe's urban youth are buying compact hatchbacks.",
  });
  assert.ok(!a.includes("Small"), "the headline's first capital leaked in");
  assert.ok(a.some((x) => /young adults/.test(x)));
  assert.ok(a.some((x) => /compact hatchback/.test(x)));
  assert.ok(a.some((x) => /European/.test(x)));
});

check(
  "a flood story draws water, boats and families, not a living room",
  () => {
    const subjects = extractVisualSubjects({
      title: "Sylhet floods displace thousands as rivers swell",
      summary:
        "Heavy rain has swollen rivers, forcing families in rural villages to leave their homes.",
      body: "Volunteers in raincoats unload rice from wooden boats at a school relief camp.",
    });
    assert.ok(!subjects.interiors.some((x) => /living room/.test(x)));
    assert.ok(subjects.exteriors.some((x) => /floodwater/.test(x)));
    assert.ok(subjects.objects.some((x) => /rescue boats/.test(x)));
    assert.ok(subjects.people.some((x) => /family/.test(x)));
    assert.ok(subjects.places.some((x) => /relief camp/.test(x)));
  },
);

check("story content, not only the summary, reaches the anchors", () => {
  const a = storyAnchors({
    title: "Sylhet floods displace thousands",
    content:
      "Volunteers in raincoats unload sacks of rice from wooden boats at a relief camp.",
  });
  assert.ok(a.some((x) => /relief volunteers/.test(x)));
  assert.ok(a.some((x) => /rescue boats/.test(x)));
  assert.ok(a.some((x) => /sacks of rice/.test(x)));
  assert.ok(!a.some((x) => /receding toward the horizon/.test(x)));
});

check("a historical older generation is not in the present-tense cast", () => {
  const car = extractVisualSubjects({
    title: "Small cars gain popularity among young people in Europe",
    summary:
      "Previously, such vehicles were often associated with older individuals; now they are a preferred choice for urban youth.",
  });
  assert.ok(car.people.some((x) => /young adults/.test(x)));
  assert.ok(!car.people.some((x) => /elderly/.test(x)));

  const flood = extractVisualSubjects({
    title: "Sylhet floods displace thousands",
    body: "Elderly residents and families left their homes for a relief camp.",
  });
  assert.ok(flood.people.some((x) => /elderly/.test(x)));
});

check("the pull-quote never repeats the headline", () => {
  const plan = normalisePlan(
    {
      headline: article.title,
      content_mode: "quote",
      pull_quote: article.title,
      bullets: [],
    },
    article,
    [],
  );
  assert.notEqual(plan.pullQuote, plan.headline);
  assert.ok(plan.bullets.length > 0, "the empty block was not filled");
});

console.log(`
[art-director] ${passed} checks passed`);
