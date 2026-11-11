/**
 * Regression: the image prompt must vary with the article.
 *
 * The old prompt was a constant style sentence plus "বিষয়: <headline>", which
 * image models that don't read Bangla (FLUX / Pollinations) rendered as one and
 * the same generic illustration for every story. These tests pin the fix: the
 * prompt leads with a concrete scene, carries extracted cues, and two different
 * articles must not collapse to the same string.
 */
import assert from "node:assert/strict";
import { buildImageBrief, extractVisualCues, sceneForCategory, editorialImagePrompt } from "../image-prompt";

// 1. Two different categories produce different scenes.
const politics = buildImageBrief({ title: "সংসদে বাজেট পাস", category: "politics" });
const sports = buildImageBrief({ title: "বাংলাদেশ ক্রিকেটে জয়", category: "sports" });
assert.notEqual(politics.prompt, sports.prompt, "different categories must yield different prompts");
assert.match(politics.prompt, /press conference/i);
assert.match(sports.prompt, /stadium/i);

// 2. The subject (headline) is preserved verbatim in the prompt.
assert.ok(politics.prompt.includes("সংসদে বাজেট পাস"), "headline must appear in the prompt");

// 3. Same category, different headlines → different prompts (the actual bug).
const a = buildImageBrief({ title: "পদ্মা সেতুতে নতুন রেল সংযোগ", category: "national" });
const b = buildImageBrief({ title: "ঢাকায় তাপমাত্রা ৪০ ডিগ্রি", category: "national" });
assert.notEqual(a.prompt, b.prompt, "same category with different subjects must differ");

// 4. Cues: known places and Latin names are extracted.
const cues = extractVisualCues("ঢাকায় NVIDIA এর নতুন অফিস, ৩০০ কোটি টাকা বিনিয়োগ");
assert.ok(cues.includes("Dhaka"), `expected Dhaka in ${JSON.stringify(cues)}`);
assert.ok(cues.includes("NVIDIA"), `expected NVIDIA in ${JSON.stringify(cues)}`);
assert.ok(cues.some((c) => c.startsWith("figure")), `expected a figure cue in ${JSON.stringify(cues)}`);

// 5. Unknown categories fall back to a neutral scene instead of throwing.
assert.match(sceneForCategory("no-such-category"), /editorial news scene/i);
assert.match(editorialImagePrompt({}), /editorial news scene/i);

// 6. The negative prompt always bans text and real people.
assert.match(buildImageBrief({ title: "x" }).negative, /no text/i);
assert.match(buildImageBrief({ title: "x" }).negative, /no recognisable faces/i);

// 7. Body text contributes to the prompt (not just the headline).
const withBody = buildImageBrief({
  title: "ঘটনা",
  summary: "সংক্ষিপ্ত",
  body: "পুলিশ জানিয়েছে ঘটনাটি চট্টগ্রামে ঘটেছে এবং তদন্ত চলছে।",
  category: "crime",
});
assert.ok(withBody.cues.includes("Chattogram"), `body cues missing: ${JSON.stringify(withBody.cues)}`);

console.log("image-prompt: all assertions passed");
