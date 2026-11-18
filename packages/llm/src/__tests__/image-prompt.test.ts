/**
 * The editorial illustration brief.
 *
 * This is the shape the old prompt lacked. It used to be a category scene plus
 * the Bangla headline pasted in after "বিষয়:", so models that do not read
 * Bengali rendered the style and ignored the story — every article got the same
 * picture — and models that do read Bengali sometimes rendered the headline
 * *as text inside the drawing*, which a newspaper never does.
 *
 * These checks pin the newspaper-shaped structure, the determinism that makes
 * regeneration stable, and the safety rules that keep lettering, logos,
 * watermarks, recognizable people and children out of the render.
 */
import assert from "node:assert/strict";
import {
  briefSeed,
  buildImageBrief,
  EDITORIAL_IMAGE_NEGATIVE,
  extractVisualCues,
  imageSizeFor,
  pickMetaphor,
  sceneForCategory,
  editorialImagePrompt,
} from "../image-prompt";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok ${name}`);
}

// ---------------------------------------------------------------------------
// Structure: every line an art director asks for, one paragraph each.
// ---------------------------------------------------------------------------
const politics = buildImageBrief({ title: "সংসদে বাজেট পাস", summary: "রাজস্ব ঘাটতি নিয়ে সংসদে বিতর্ক", category: "politics" });

check("the prompt is the full editorial structure", () => {
  const ordered = [
    "Editorial news photograph, not an illustration and not a drawing",
    "Central idea:",
    "Visual metaphor:",
    "Subject:",
    "Setting:",
    "Style: editorial news photograph",
    "Composition:",
    "Color palette:",
    "Mood:",
    "Avoid:",
  ];
  let at = 0;
  for (const line of ordered) {
    const i = politics.prompt.indexOf(line);
    assert.ok(i >= 0, `missing line ${line}`);
    assert.ok(i >= at, `out of order: ${line}`);
    at = i;
  }
});

check("different categories pick different metaphors", () => {
  const sports = buildImageBrief({ title: "বাংলাদেশ ক্রিকেটে জয়", category: "sports" });
  assert.notEqual(politics.prompt, sports.prompt);
  assert.ok(sports.prompt.includes("floodlight"), "a sports story should visualise the match");
  assert.ok(politics.prompt.includes("assembly hall") || politics.prompt.includes("podium"),
    "a politics story should visualise the chamber");
});

check("the Bangla text never enters the prompt", () => {
  // A model that reads Bangla used to render the headline as lettering; a model
  // that doesn't ignored the subject. Neither failure should be possible when
  // the prompt carries no Bengali at all.
  const all = politics.prompt;
  assert.ok(!/[\u0980-\u09FF]/.test(all), "no Bengali characters must reach the image model");
  const withBody = buildImageBrief({ title: "ঘটনা", summary: "পুলিশ চট্টগ্রামে তদন্ত করছে", category: "crime" });
  assert.ok(!/[\u0980-\u09FF]/.test(withBody.prompt));
});

check("determinism: the same story draws the same brief, every time", () => {
  const a = buildImageBrief({ title: "ঢাকায় তাপমাত্রা ৪০ ডিগ্রি", category: "weather" });
  const b = buildImageBrief({ title: "ঢাকায় তাপমাত্রা ৪০ ডিগ্রি", category: "weather" });
  assert.equal(a.prompt, b.prompt);
  assert.equal(a.seed, b.seed);
  assert.equal(briefSeed("x"), briefSeed("x"));
});

check("variation: different headlines do not collapse to one picture", () => {
  const titles = [
    "পদ্মা সেতুতে নতুন রেল সংযোগ",
    "ঢাকায় তাপমাত্রা ৪০ ডিগ্রি",
    "জাতীয় দলের ফুটবলারদের নতুন ক্যাম্প",
    "বৃহস্পতিবার সন্ধ্যায় বাজার দরপতন",
    "রাতে হাসপাতালে ভর্তি প্রধানমন্ত্রী",
    "সাইবার হামলায় সার্ভার অচল",
  ];
  const prompts = titles.map((title, i) =>
    buildImageBrief({ title, category: ["national", "weather", "sports", "economy", "health", "technology"][i] }).prompt);
  assert.ok(new Set(prompts).size >= 5, `only ${new Set(prompts).size} distinct briefs from 6 stories`);
  // The deterministic variant engine spreads the mediums too.
  const styles = new Set(prompts.map((p) => /Style: editorial news photograph, ([^,]+)/.exec(p)?.[1]));
  assert.ok(styles.size >= 2, `all six stories used one medium: ${[...styles]}`);
});

check("the composition reserves headline space on a specific side", () => {
  const h = buildImageBrief({ title: "ঘটনা", category: "national" });
  assert.match(h.prompt, /the (?:left|right) of the frame kept as quiet negative/);
  assert.equal(h.aspectRatio, "16:9");
  assert.equal(h.size, "1536x1024");
  const v = buildImageBrief({ title: "ঘটনা", category: "national", aspectRatio: "9:16" });
  assert.match(v.prompt, /vertical 9:16 frame/);
  assert.match(v.prompt, /the (?:top|bottom) of the frame kept as quiet negative/);
  assert.equal(v.size, "1024x1536");
});

// ---------------------------------------------------------------------------
// Metaphors are chosen by the article's own words, not by a style sentence.
// ---------------------------------------------------------------------------
check("the metaphor follows the story: a flood draws water, a verdict draws a gavel", () => {
  const flood = pickMetaphor("উপকূলে জলোচ্ছ্বাস, ঘরবাড়ি প্লাবিত", "environment");
  assert.match(flood.metaphor, /rooftop|floodwater|boat/i);
  const verdict = pickMetaphor("আদালতে রায়, আসামির কারাদণ্ড", "law-order");
  assert.match(verdict.metaphor, /gavel|paper|case files/i);
});

check("an unmatched story still gets a tone-appropriate metaphor, not a crash", () => {
  const m = pickMetaphor("একটি সাধারণ ঘটনা", "");
  assert.ok(m.metaphor.length > 0);
  assert.ok(["serious", "reflective", "hopeful"].includes(m.mood));
});

// ---------------------------------------------------------------------------
// Cues still work (names, places, figures) and feed the topic clause.
// ---------------------------------------------------------------------------
check("cues: known places and Latin names are extracted", () => {
  const cues = extractVisualCues("ঢাকায় NVIDIA এর নতুন অফিস, ৩০০ কোটি টাকা বিনিয়োগ");
  assert.ok(cues.includes("Dhaka"), `expected Dhaka in ${JSON.stringify(cues)}`);
  assert.ok(cues.includes("NVIDIA"), `expected NVIDIA in ${JSON.stringify(cues)}`);
  assert.ok(cues.some((c) => c.startsWith("figure")), `expected a figure cue in ${JSON.stringify(cues)}`);
});

check("unextracted categories fall back gracefully", () => {
  assert.match(sceneForCategory("no-such-category"), /editorial news scene/i);
  // The medium must open the prompt: models weight early tokens hardest, and a
  // medium placed after the subject produced photographs of drawings.
  assert.ok(editorialImagePrompt({}).startsWith("Editorial news photograph, not an illustration and not a drawing"));
  assert.match(editorialImagePrompt({}), /Avoid: readable text/);
});

// ---------------------------------------------------------------------------
// Safety, phrased both ways so every provider gets the point.
// ---------------------------------------------------------------------------
check("the negative prompt bans text, brands, people we can identify and clutter", () => {
  const neg = buildImageBrief({ title: "x" }).negative;
  assert.match(neg, /no text/i);
  assert.match(neg, /no logos/i);
  assert.match(neg, /no watermarks/i);
  assert.match(neg, /no recognisable faces/i);
  assert.match(neg, /no children/i);
  assert.match(neg, /cartoon/);
  assert.match(neg, /readable text/);
  assert.match(neg, /clutter/);
  assert.match(neg, /unrelated objects/);
  // The new medium bans the old one by name.
  assert.match(neg, /illustration/);
});

check("every renderable line avoids children and identifiable people", () => {
  // The Subject/Setting lines must never ask for a child or a portrait.
  const kidsPattern = /children|a child|young boy|young girl/i;
  for (const [title, category] of [
    ["ঘটনা", "corruption"],
    ["ঘটনা", "education"],
    ["ঘটনা", "obituary"],
    ["ঘটনা", "health"],
  ] as const) {
    const brief = buildImageBrief({ title, category });
    assert.ok(!kidsPattern.test(brief.subject), `${category}: subject mentions a child`);
    assert.ok(!kidsPattern.test(brief.setting), `${category}: setting mentions a child`);
  }
});

check("the composed prompt stays bounded for a paste-in headline", () => {
  const huge = new Array(3000).fill("খ").join("");
  const brief = buildImageBrief({ title: huge, summary: huge, category: "crime" });
  assert.ok(brief.prompt.length < 4000, `brief blew up to ${brief.prompt.length}`);
});

check("sizes: every frame maps to a size providers accept", () => {
  assert.equal(imageSizeFor("16:9"), "1536x1024");
  assert.equal(imageSizeFor("4:3"), "1024x768");
  assert.equal(imageSizeFor("1:1"), "1024x1024");
  assert.equal(imageSizeFor("9:16"), "1024x1536");
  // A garbled ratio is a 16:9 hero frame, never a blank.
  assert.equal(imageSizeFor("weird"), "1536x1024");
  assert.equal(imageSizeFor(""), "1536x1024");
});

// ---------------------------------------------------------------------------
// The old placeholder exports still exist, so third-party callers do not break.
// ---------------------------------------------------------------------------
check("back-compat surface", () => {
  const brief = buildImageBrief({ title: "ঘটনা", category: "national" });
  assert.equal(typeof brief.scene, "string");
  assert.ok(Array.isArray(brief.cues));
  assert.equal(typeof brief.subject, "string");
  assert.equal(brief.negative, EDITORIAL_IMAGE_NEGATIVE);
});

check("the medium opens the prompt", () => {
  const prompt = editorialImagePrompt({ title: "ঘুষ কেলেঙ্কারি", category: "corruption" });
  assert.ok(
    prompt.startsWith("Editorial news photograph, not an illustration and not a drawing"),
    "image models weight early tokens hardest; the medium leads every brief",
  );
  assert.match(prompt, /not an illustration/i);
});

console.log(`\nimage-prompt: ${passed} checks passed`);