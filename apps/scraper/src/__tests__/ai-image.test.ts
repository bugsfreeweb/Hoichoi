/**
 * The scraper's side of the image brief: the safety boundary (which categories
 * may never be illustrated), and the hard rules appended to the shared brief.
 *
 * The brief's own structure is tested where it lives
 * (`packages/llm/src/__tests__/image-prompt.test.ts`), so this file only pins what
 * the pipeline adds on top — and the fact that it adds nothing that contradicts it.
 */
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
const p = aiHeroPrompt("রেলপথে বাধা", "রেল যোগাযোগ তিন ঘণ্টা বন্ধ ছিল।", undefined, "national");
assert.ok(p.includes("no text") && p.includes("no logos") && p.includes("no watermarks"), "bans text/logo/watermark");
assert.ok(p.includes("never depict children"), "bans children");
assert.ok(p.includes("NEVER recognizable"), "bans recognizable faces");

/* It carries the editorial structure rather than a style sentence + headline. */
assert.ok(p.includes("Central idea:"), "carries the central idea");
assert.ok(p.includes("Visual metaphor:"), "carries a visual metaphor");
assert.ok(p.includes("Composition:"), "carries a composition with headline space");
assert.ok(p.includes("Color palette:"), "carries a palette");
assert.ok(!/[\u0980-\u09FF]/.test(p), "no Bengali text may reach the image model");

/* Two different stories must not produce the same image. */
const other = aiHeroPrompt("বন্যার পানি বাড়ছে", "উপকূলীয় এলাকায় জলোচ্ছ্বাস", undefined, "environment");
assert.notEqual(p, other, "different stories must differ");

/* A story the metaphor bank does match draws its own scene. */
assert.ok(/rooftop|floodwater|boat/i.test(other), "a flood should visualise water, not a briefing room");

/* Long subjects are truncated so the request stays small. */
const huge = new Array(3000).fill("খ").join("");
const trimmed = aiHeroPrompt(huge, huge);
assert.ok(trimmed.length < 4000, `prompt stays bounded (${trimmed.length})`);

console.log("ai-image checks passed");
