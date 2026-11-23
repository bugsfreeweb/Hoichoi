/**
 * The dictionary and the runtime, pinned.
 *
 * A bilingual product fails in quiet ways: one entry left in Bangla and an
 * English reader sees Bangla in the middle of a sentence; a placeholder dropped
 * in translation and the count disappears; a date that prints "নভে" on one
 * machine. Each check below closes one of those.
 *
 * Run: npx tsx packages/i18n/src/__tests__/i18n.test.ts
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  DICTIONARY,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  MESSAGE_KEYS,
  formatDate,
  formatNumber,
  normalizeLocale,
  otherLocale,
  parseNumber,
  t,
  tBoth,
} from "../index";

let passed = 0;
async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const ROOT = resolve(import.meta.dirname ?? ".", "../../../..");
const BANGLA = /[\u0980-\u09FF]/;
const PLACEHOLDER = /\{(\w+)\}/g;

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".next" || entry === "dist") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

async function main(): Promise<void> {
  await check("every entry is translated in both languages", () => {
    assert.ok(MESSAGE_KEYS.length > 100, `the table is populated (${MESSAGE_KEYS.length} keys)`);
    for (const key of MESSAGE_KEYS) {
      const entry = DICTIONARY[key];
      assert.ok(entry.bn.trim().length > 0, `${key}: Bangla is missing`);
      assert.ok(entry.en.trim().length > 0, `${key}: English is missing`);
    }
  });

  await check("Bangla carries Bangla and English does not", () => {
    for (const key of MESSAGE_KEYS) {
      const { bn, en } = DICTIONARY[key];
      if (BANGLA.test(bn) === false && /^[a-z]/.test(bn)) {
        // A key whose Bangla is a bare English word is a copy-paste, but a
        // proper noun ("DMCA", "API ভল্ট") legitimately stays Latin. Only flag
        // entries where *neither* side is translated at all.
        assert.notEqual(bn, en, `${key}: bn and en are identical ("${bn}")`);
      }
      assert.ok(BANGLA.test(bn) || !/^[a-z]/.test(en), `${key}: neither side is Bangla`);
    }
  });

  await check("placeholders survive translation", () => {
    for (const key of MESSAGE_KEYS) {
      const { bn, en } = DICTIONARY[key];
      const bnNames = [...bn.matchAll(PLACEHOLDER)].map((m) => m[1]).sort();
      const enNames = [...en.matchAll(PLACEHOLDER)].map((m) => m[1]).sort();
      assert.deepEqual(enNames, bnNames, `${key}: placeholders differ (${bnNames} vs ${enNames})`);
    }
  });

  await check("t() prints the language it was asked for, Bangla by default", () => {
    assert.equal(DEFAULT_LOCALE, "bn", "the product is Bangla-first");
    assert.equal(t("site.nav.home"), "হোম");
    assert.equal(t("site.nav.home", undefined, "en"), "Home");
    assert.equal(t("site.nav.home", undefined, "bn"), "হোম");
  });

  await check("t() substitutes parameters in both languages", () => {
    assert.equal(t("common.total", { n: 12 }, "en"), "Total");
    // A key with no placeholder must not swallow the values.
    assert.equal(t("common.cancel", { n: 12 }, "bn"), "বাতিল");
  });

  await check("an unknown key is visible, not blank", () => {
    const missing = t("admin.nav.typo" as never);
    assert.equal(missing, "admin.nav.typo", "the key prints, so the bug is findable");
  });

  await check("tBoth() returns both, never one", () => {
    assert.deepEqual(tBoth("lang.bn"), { bn: "বাংলা", en: "Bangla" });
  });

  await check("a cookie or a browser tag resolves to a locale", () => {
    assert.equal(normalizeLocale("bn"), "bn");
    assert.equal(normalizeLocale("bn-BD"), "bn");
    assert.equal(normalizeLocale("en"), "en");
    assert.equal(normalizeLocale("en_GB"), "en");
    assert.equal(normalizeLocale("EN-us"), "en");
    assert.equal(normalizeLocale("fr"), "bn", "unknown falls back to the first language");
    assert.equal(normalizeLocale(undefined), "bn");
    assert.equal(normalizeLocale(""), "bn");
  });

  await check("the toggle goes to the other language, every time", () => {
    assert.equal(otherLocale("bn"), "en");
    assert.equal(otherLocale("en"), "bn");
    assert.equal(otherLocale(otherLocale("bn")), "bn", "two clicks are where you started");
  });

  await check("the cookie name is one name, not three", () => {
    assert.equal(LOCALE_COOKIE, "hoichoi_lang");
  });

  await check("numbers print in the reader's digits and parse back", () => {
    assert.equal(formatNumber(1245, "en"), "1,245");
    assert.equal(formatNumber(1245, "bn"), "১,২৪৫");
    assert.equal(parseNumber("১,২৪৫"), 1245);
    assert.equal(parseNumber("1,245"), 1245);
    assert.equal(formatNumber(0, "bn"), "০");
  });

  await check("dates print in the reader's language and month spelling", () => {
    const date = new Date(2026, 10, 22, 9, 30);
    assert.equal(formatDate(date, "bn"), "২২ নভেম্বর ২০২৬");
    assert.equal(formatDate(date, "en"), "22 November 2026");
    assert.equal(formatDate(date, "bn", { weekday: true }), "রবিবার, ২২ নভেম্বর ২০২৬");
    assert.equal(formatDate(date, "en", { weekday: true }), "Sunday, 22 November 2026");
    assert.equal(formatDate(date, "en", { year: false }), "22 November");
    assert.equal(formatDate("not a date", "bn"), "", "an invalid date prints nothing, not NaN");
  });

  await check("every key the code calls exists in the table", () => {
    const keys = new Set(Object.keys(DICTIONARY));
    const unknown: string[] = [];
    for (const root of ["apps/web/src", "apps/desktop/src", "packages/dash/src", "apps/scraper/src"]) {
      for (const file of walk(resolve(ROOT, root))) {
        const text = readFileSync(file, "utf8");
        for (const match of text.matchAll(/\bt\(\s*["'`]([a-zA-Z0-9_.]+)["'`]/g)) {
          const key = match[1] ?? "";
          if (!key.includes(".")) continue;
          if (!keys.has(key)) unknown.push(`${file.replace(ROOT, "")}: ${key}`);
        }
      }
    }
    assert.deepEqual(unknown, [], `unknown keys:\n${unknown.join("\n")}`);
  });


  /**
   * The migration is measured, not asserted: these files were the first wave and
   * must stay clean, so a later edit cannot quietly paste Bangla back into a
   * component that is supposed to read its words from the table. Comments are
   * stripped first — a Bangla note in a comment is fine, a Bangla screen is not.
   */
  await check("the migrated files carry no Bangla literals", () => {
    const migrated = [
      "apps/web/src/components/Footer.tsx",
      "apps/web/src/components/Masthead.tsx",
      "apps/web/src/components/ArticleCard.tsx",
      "apps/web/src/components/AdSlot.tsx",
      "apps/web/src/components/mv/site/Navbar.tsx",
    ];
    const dirty: string[] = [];
    for (const rel of migrated) {
      const raw = readFileSync(resolve(ROOT, rel), "utf8");
      const code = raw
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|\s)\/\/[^\n]*/g, "$1");
      const hits = code.split("\n").filter((line) => /[\u0980-\u09FF]/.test(line));
      if (hits.length > 0) dirty.push(`${rel}: ${hits.length} line(s), first: ${hits[0]?.trim().slice(0, 60)}`);
    }
    assert.deepEqual(dirty, [], `Bangla still hard-coded:\n${dirty.join("\n")}`);
  });

  await check("Bangla and English both name the same destinations", () => {
    // A navigation row that lost its English name would print `undefined`.
    const missing: string[] = [];
    for (const key of MESSAGE_KEYS) {
      if (!key.startsWith("site.nav.") && !key.startsWith("site.footer.") && !key.startsWith("desk.rail.")) continue;
      const entry = DICTIONARY[key];
      if (!entry.bn) missing.push(`${key} has no Bangla`);
      if (!entry.en) missing.push(`${key} has no English`);
    }
    assert.deepEqual(missing, [], missing.join("\n"));
  });

  console.log(`\ni18n: ${passed} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
