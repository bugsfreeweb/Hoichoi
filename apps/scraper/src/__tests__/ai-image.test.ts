import assert from "node:assert/strict";
import { aiHeroEligible, aiHeroPrompt } from "../ai-image";

/* Safety boundary: sensitive categories never get AI imagery. */
assert.equal(aiHeroEligible("missing-children"), false, "missing-children excluded");
assert.equal(aiHeroEligible("child-sexual-abuse"), false, "child-sexual-abuse excluded");
assert.equal(aiHeroEligible("extramarital-crime"), false, "extramarital-crime excluded");
assert.equal(aiHeroEligible("crime-safety"), true, "general category allowed");
assert.equal(aiHeroEligible(""), true, "empty category allowed");
assert.equal(aiHeroEligible(null), true, "null category allowed");

/* The prompt must never ask for captions/logos/recognizable people/children. */
const p = aiHeroPrompt("রেলপথে বাধা", "রেল যোগাযোগ তিন ঘণ্টা বন্ধ ছিল।");
assert.ok(p.includes("no text") && p.includes("no logos") && p.includes("no watermarks"), "bans text/logo/watermark");
assert.ok(p.includes("never depict children"), "bans children");
assert.ok(p.includes("never recognizable") || p.includes("NEVER recognizable"), "bans recognizable faces");
assert.ok(p.includes("রেলপথে বাধা"), "carries the article subject");
assert.ok(p.includes("রেল যোগাযোগ"), "carries the summary");

/* Long subjects are truncated so the request stays small. */
const huge = new Array(3000).fill("খ").join("");
const trimmed = aiHeroPrompt(huge, huge);
assert.ok(trimmed.length < 2000, `prompt stays bounded (${trimmed.length})`);

console.log("ai-image checks passed");