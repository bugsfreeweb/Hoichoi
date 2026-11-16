/**
 * The dictionary is only useful if it is complete and usable.
 *
 * Checks: every entry has both languages, nothing is empty, placeholders match
 * across languages (a `{n}` in Bangla but not English silently drops data), keys
 * are well formed, and `t()` falls back visibly rather than to a blank string.
 */
import { DICTIONARY, hasKey, t, tBoth } from "../src/i18n";

let passed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const entries = Object.entries(DICTIONARY);
const placeholders = (s: string): string[] => (s.match(/\{(\w+)\}/g) ?? []).sort();

check("every string has Bangla and English", () => {
  for (const [key, entry] of entries) {
    if (!entry.bn?.trim()) throw new Error(`${key}: missing Bangla`);
    if (!entry.en?.trim()) throw new Error(`${key}: missing English`);
  }
});

check("keys are namespaced so a grep finds the surface", () => {
  for (const [key] of entries) {
    if (!/^[a-z]+\.[A-Za-z.]+$/.test(key)) throw new Error(`bad key shape: ${key}`);
  }
});

check("placeholders match across languages", () => {
  for (const [key, entry] of entries) {
    const bn = placeholders(entry.bn);
    const en = placeholders(entry.en);
    if (bn.join(",") !== en.join(",")) {
      throw new Error(`${key}: bn has ${bn.join(",") || "none"}, en has ${en.join(",") || "none"}`);
    }
  }
});

check("t() returns Bangla by default and substitutes", () => {
  if (t("common.save") !== "সংরক্ষণ") throw new Error("default locale is not Bangla");
  const erased = t("privacy.erased", { n: 3 });
  if (!erased.includes("3")) throw new Error("placeholder not substituted");
  if (t("privacy.erased", { n: 3 }, "en") !== "3 rows erased.") throw new Error("english locale broken");
});

check("tBoth() gives both lines, Bangla first", () => {
  const both = tBoth("poll.verdict.clean");
  if (both.bn !== "পরিষ্কার" || both.en !== "Clean") throw new Error("tBoth returned the wrong pair");
});

check("an unknown key surfaces as the key, never as a blank", () => {
  if (hasKey("privacy.heading") !== true) throw new Error("hasKey missed a real key");
  // Deliberate widening: a typo must be visible in the UI, not invisible.
  const missing = t("not.a.key" as never);
  if (missing !== "not.a.key") throw new Error("a missing key must render as itself");
});

check("no duplicate Bangla strings across different keys in one surface", () => {
  // Two keys meaning the same thing is how translations drift apart.
  const bySurface = new Map<string, Map<string, string>>();
  for (const [key, entry] of entries) {
    const surface = key.split(".")[0]!;
    const seen = bySurface.get(surface) ?? new Map<string, string>();
    const prior = seen.get(entry.bn);
    if (prior) throw new Error(`${key} duplicates ${prior} in ${surface}`);
    seen.set(entry.bn, key);
    bySurface.set(surface, seen);
  }
});

console.log(`[web] i18n: ${passed} checks passed across ${entries.length} strings`);
process.exit(process.exitCode ?? 0);
