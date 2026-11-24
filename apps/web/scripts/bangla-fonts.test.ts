/**
 * The bundled Bangla type library.
 *
 * These checks protect the things that broke silently before: a family whose
 * file did not ship, a generated CSS rule pointing at a missing WOFF2, a
 * surface that forgot to import the library, and a setting that never reaches
 * the public site.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { BANGLA_FONTS, BANGLA_FONT_IDS, EXCLUDED_BANGLA_FONTS, banglaFontById, banglaFontStack } from "../../../packages/bangla-fonts/src/index";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel: string): boolean => fs.existsSync(path.join(ROOT, rel));

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const css = read("packages/bangla-fonts/fonts.css");
const layout = read("apps/web/src/app/(site)/layout.tsx");
const rootLayout = read("apps/web/src/app/layout.tsx");
const desktopCss = read("apps/desktop/src/index.css");
const desktopSettings = read("apps/desktop/src/screens/Settings.tsx");
const adminGallery = read("apps/web/src/components/admin/settings/TypographySection.tsx");
const tailwind = read("apps/web/tailwind.config.ts");
const globals = read("apps/web/src/app/globals.css");

check("every cleared family is bundled once", () => {
  assert.equal(BANGLA_FONTS.length, 18);
  assert.equal(new Set(BANGLA_FONT_IDS).size, BANGLA_FONTS.length);
  assert.equal(BANGLA_FONTS.reduce((n, f) => n + f.faces.length, 0), 36);
  for (const font of BANGLA_FONTS) {
    assert.ok(font.id.length > 0);
    assert.ok(font.family.length > 0);
    for (const face of font.faces) {
      const file = `packages/bangla-fonts/files/${face.file}`;
      assert.ok(exists(file), `missing ${file}`);
      const head = fs.readFileSync(path.join(ROOT, file)).subarray(0, 4).toString("latin1");
      assert.equal(head, "wOF2", `${face.file} is not WOFF2`);
    }
  }
});

check("the stylesheet declares every face and a usable class", () => {
  for (const font of BANGLA_FONTS) {
    assert.match(css, new RegExp(`font-family:'${font.family.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`));
    assert.match(css, new RegExp(`\\.bnfont-${font.id}\\{`));
    for (const face of font.faces) {
      assert.ok(css.includes(`./files/${face.file}`), `no @font-face for ${face.file}`);
    }
  }
});

check("web, admin and desktop import the library", () => {
  assert.match(rootLayout, /@hoichoi\/bangla-fonts\/fonts\.css/);
  assert.match(desktopCss, /@hoichoi\/bangla-fonts\/fonts\.css/);
  assert.match(adminGallery, /BANGLA_FONTS/);
  assert.match(adminGallery, /বাংলা ফন্ট লাইব্রেরি/);
  const webPkg = JSON.parse(read("apps/web/package.json")) as { dependencies: Record<string, string> };
  const deskPkg = JSON.parse(read("apps/desktop/package.json")) as { dependencies: Record<string, string> };
  assert.equal(webPkg.dependencies["@hoichoi/bangla-fonts"], "workspace:*");
  assert.equal(deskPkg.dependencies["@hoichoi/bangla-fonts"], "workspace:*");
});

check("the chosen families reach the site and the desk", () => {
  assert.match(layout, /--font-serif-bn": banglaFontStack\(cfg\.typography\?\.headline/);
  assert.match(layout, /--font-sans-bn": banglaFontStack\(cfg\.typography\?\.body/);
  assert.match(desktopSettings, /--desk-font/);
  assert.match(read("apps/desktop/src/main.tsx"), /banglaFontStack\(id, "Hind Siliguri", "sans-serif"\)/);
  assert.match(desktopSettings, /desk_font: ""/);
  assert.match(desktopSettings, /ওয়েবসাইটের বাংলা ফন্ট/);
  assert.match(adminGallery, /setFont\("headline"/);
  assert.match(adminGallery, /setFont\("body"/);
  assert.match(adminGallery, /app_config_json: JSON\.stringify\(cfg\)/);
  assert.match(adminGallery, /ফন্ট সংরক্ষণ করুন/);
  // Tailwind used to hardcode the two families, so writing the setting changed
  // the variable but not the rendered text. Both must resolve through the var.
  assert.match(tailwind, /"serif-bn": \['var\(--font-serif-bn/);
  assert.match(tailwind, /"sans-bn": \['var\(--font-sans-bn/);
  assert.match(globals, /\.page-chrome \{\s*font-family: var\(--font-sans-bn/);
});

check("unknown ids fall back instead of leaving text unstyled", () => {
  assert.equal(banglaFontById("does-not-exist"), null);
  assert.equal(banglaFontStack("does-not-exist", "Hind Siliguri", "sans-serif"), "'Hind Siliguri', sans-serif");
  assert.equal(banglaFontStack("li-alinur-atithi", "Noto Serif Bengali"), "'Li Alinur Atithi', 'Noto Serif Bengali', serif");
});

check("uncleared families are excluded, not bundled", () => {
  assert.equal(EXCLUDED_BANGLA_FONTS.length, 29);
  for (const f of BANGLA_FONTS) assert.equal(f.license, "web-with-attribution");
  const banned = EXCLUDED_BANGLA_FONTS.find((f) => f.id === "fn-badhon-ikra");
  assert.ok(banned, "FontBD family should be listed as excluded");
  assert.equal(banned?.license, "prohibited");
  assert.match(banned?.reason ?? "", /webfont/i);
  for (const f of EXCLUDED_BANGLA_FONTS) {
    assert.ok(!exists(`packages/bangla-fonts/files/${f.id}-400.woff2`), `${f.id} leaked into files/`);
    assert.ok(!css.includes(`.bnfont-${f.id}{`), `${f.id} leaked into fonts.css`);
  }
  assert.match(adminGallery, /EXCLUDED_BANGLA_FONTS/);
  assert.match(read("apps/web/src/components/Footer.tsx"), /lipighor\.com/);
  assert.match(read("packages/bangla-fonts/README.md"), /Why only 18 of 47 families/);
});

console.log(`\n[web] bangla fonts: ${passed} checks passed`);
