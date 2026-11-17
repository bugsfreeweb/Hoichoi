/**
 * Off-screen content must not be invisible to a contrast audit — or to a browser
 * whose script died.
 *
 * `.js .reveal { opacity: 0 }` armed every section at once, so anything below the
 * fold painted at 0 % opacity and every caption inside it "failed" colour contrast
 * (Lighthouse: 21 nodes, home page 0.92). Arming now happens per element, in the
 * component, and only for content that really starts below the fold.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), "utf8");

let passed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const css = read("src/app/globals.css");
const reveal = read("src/components/Reveal.tsx");
const topbar = read("src/components/TopBar.tsx");
const adslot = read("src/components/AdSlot.tsx");
const home = read("src/app/(site)/page.tsx");

check("the hidden state is not armed globally", () => {
  assert.ok(!/\.js \.reveal\s*\{/.test(css), "a document-level .js rule still arms every section");
  assert.match(css, /\.reveal\.reveal-armed\s*\{/);
});

check("the component arms it per element, after the in-view check", () => {
  const inViewAt = reveal.indexOf("r.top < window.innerHeight");
  const armAt = reveal.indexOf("setArmed(true)");
  assert.ok(inViewAt !== -1 && armAt !== -1);
  assert.ok(inViewAt < armAt, "already-visible content must never be hidden first");
  assert.match(reveal, /armed \? "reveal-armed"/);
});

check("reduced motion still shows everything", () => {
  assert.match(css, /prefers-reduced-motion: reduce\)[\s\S]{0,200}\.reveal\.reveal-armed/);
});

check("mobile icon-only nav links have an accessible name", () => {
  assert.match(topbar, /aria-label=\{label\}/);
});

check("the ad placeholder does not rename itself for screen readers", () => {
  // An aria-label that omits the visible Bangla text makes the name contradict
  // the label (WCAG 2.5.3).
  assert.ok(!/aria-label="বিজ্ঞাপন"/.test(adslot), "the ad button still overrides its visible text");
});

check("the 13px pipeline blurb uses the small-text token", () => {
  assert.ok(!/text-bandline\/55/.test(home.split("\n").filter((l) => !l.trim().startsWith("{/*")).join("\n")));
});

console.log(`\n${passed} reveal/a11y checks passed.`);
