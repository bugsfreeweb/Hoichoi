/**
 * Text you cannot see is not there.
 *
 * Two live regressions are pinned here:
 *
 *  1. The language toggle painted its selected half with `bg-current` while the
 *     same element also set `color` to near-black ink. `currentColor` therefore
 *     resolved to the ink, so the pill was dark-on-dark and the active language
 *     disappeared. A selected control needs a background that does not derive
 *     from its own text colour.
 *  2. The admin bell kept white/xx classes inside a console that can run on a
 *     cream paper palette, so the icon vanished (and hover made it worse). Text
 *     in a themed shell must be expressed in theme tokens, never literal white.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string): string => fs.readFileSync(path.join(APP, rel), "utf8");

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed++;
  console.log(`  ok ${name}`);
}

/** WCAG relative luminance for #rrggbb. */
function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const toggle = read("src/components/i18n/LanguageToggle.tsx");
const adminBell = read("src/components/admin/NotificationBell.tsx");
const publicBell = read("src/components/NotificationsBell.tsx");

check("the selected language cannot paint itself with its own ink", () => {
  assert.doesNotMatch(toggle, /bg-current\/90/, "a solid bg-current resolves to the element's own text colour");
  assert.match(toggle, /bg-\[#f3eee1\]/, "the selected pill needs a fixed light surface");
  assert.match(toggle, /text-\[#0b0b0b\]/, "and near-black text on it");
});

check("the selected language pair clears WCAG AAA", () => {
  const r = ratio("#f3eee1", "#0b0b0b");
  assert.ok(r >= 7, `contrast is ${r.toFixed(2)}:1, expected at least 7:1`);
});

check("both languages remain real, pressable states", () => {
  assert.match(toggle, /aria-pressed=\{locale === code\}/, "a group of buttons needs a pressed state");
  assert.match(toggle, /setLocale\(code\)/, "each button must actually switch the locale");
  assert.match(toggle, /\(\["bn", "en"\] as const\)/, "the control offers both languages, not a one-way link");
});

check("the admin bell uses theme ink, not literal white, on the header", () => {
  const button = adminBell.slice(adminBell.indexOf("<button"), adminBell.indexOf("<Bell"));
  assert.doesNotMatch(button, /text-white/, "white disappears on the light console palette");
  assert.doesNotMatch(button, /hover:text-white/, "so does a white hover state");
  assert.match(button, /text-ink-soft/, "the icon follows the shell's ink token");
  assert.match(button, /hover:text-ink/, "and becomes full ink on hover");
});

check("bell timestamps and secondary labels are readable, not faint ghosts", () => {
  // /30–/45 white on the public dark panel is below 3:1 at these sizes.
  assert.doesNotMatch(publicBell, /text-white\/30/, "timestamp must not sit at 30% white");
  assert.doesNotMatch(publicBell, /text-white\/45/, "body copy must not sit at 45% white");
  assert.match(publicBell, /text-white\/55|text-white\/60|text-white\/70/, "secondary copy keeps a readable step");
});

check("the public bell follows the language toggle", () => {
  assert.match(publicBell, /useBi\(\)/, "its chrome must be bilingual");
  assert.match(publicBell, /timeAgo\(n\.updated_at, locale\)/, "relative ages must use the selected language");
  assert.doesNotMatch(publicBell, /function bnTime/, "a Bangla-only formatter defeats the toggle");
});

check("the admin bell's chrome follows the toggle too", () => {
  assert.match(adminBell, /useT\(\)/, "translated keys are bound to the current locale");
  assert.match(adminBell, /useLocale\(\)/, "numerals and ages need the locale");
  assert.match(adminBell, /const en = locale === "en"/, "and must branch from it");
});

console.log(`\nvisibility: ${passed} checks passed`);
