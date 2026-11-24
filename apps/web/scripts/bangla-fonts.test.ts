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

import { BANGLA_FONTS, BANGLA_FONT_IDS, banglaFontById, banglaFontStack } from "../../../packages/bangla-fonts/src/index";

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
const rootLayout = read("apps/web/src/app/layout.tsx");
const desktopCss = read("apps/desktop/src/index.css");
const desktopSettings = read("apps/desktop/src/screens/Settings.tsx");
const adminGallery = read("apps/web/src/components/admin/settings/TypographySection.tsx");
const tailwind = read("apps/web/tailwind.config.ts");
const globals = read("apps/web/src/app/globals.css");

check("every family in the source folder is bundled once", () => {
  assert.equal(BANGLA_FONTS.length, 47);
  assert.equal(new Set(BANGLA_FONT_IDS).size, BANGLA_FONTS.length);
  assert.equal(BANGLA_FONTS.reduce((n, f) => n + f.faces.length, 0), 106);
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
  assert.match(rootLayout, /--font-serif-bn": banglaFontStack\(cfg\.typography\?\.headline/);
  assert.match(rootLayout, /--font-sans-bn": banglaFontStack\(cfg\.typography\?\.body/);
  assert.match(rootLayout, /--font-meta-bn": banglaFontStack\(cfg\.typography\?\.meta/);
  assert.match(desktopSettings, /--desk-font/);
  assert.match(read("apps/desktop/src/main.tsx"), /banglaFontStack\(id, "Hind Siliguri", "sans-serif"\)/);
  assert.match(desktopSettings, /desk_font: ""/);
  assert.match(desktopSettings, /ওয়েবসাইটের বাংলা ফন্ট/);
  assert.match(adminGallery, /setFont\("headline"/);
  assert.match(adminGallery, /setFont\("body"/);
  assert.match(adminGallery, /setFont\("meta"/);
  assert.match(adminGallery, /app_config_json: JSON\.stringify\(cfg\)/);
  assert.match(adminGallery, /ফন্ট সংরক্ষণ করুন/);
  // Tailwind used to hardcode the families, so writing the setting changed the
  // variable but not the rendered text. All three must resolve through the var.
  assert.match(tailwind, /"serif-bn": \[/);
  assert.match(tailwind, /"sans-bn": \[/);
  assert.match(tailwind, /"meta-bn": \[/);
  assert.match(globals, /\.page-chrome \{\s*font-family: var\(--font-sans-bn/);
  assert.match(read("apps/web/src/components/CategoryBadge.tsx"), /font-meta-bn/);
  assert.match(desktopSettings, /ট্যাগ ও বিভাগ/);
  const desktopTailwind = read("apps/desktop/tailwind.config.js");
  assert.match(desktopTailwind, /"meta-bn": \['var\(--font-meta-bn/);
  assert.match(read("apps/desktop/src/index.css"), /--fb: var\(--font-serif-bn/);
  assert.match(read("apps/desktop/src/App.tsx"), /applyTypography\(cfg\.typography\)/);
  assert.match(desktopSettings, /applyTypography\(vis\.typography\)/);
  assert.match(read("apps/web/src/app/mockup.css"), /--font-display: var\(--font-serif-bn/);
});

check("unknown ids fall back instead of leaving text unstyled", () => {
  assert.equal(banglaFontById("does-not-exist"), null);
  assert.equal(banglaFontStack("does-not-exist", "Hind Siliguri", "sans-serif"), "'Hind Siliguri', sans-serif");
  assert.equal(banglaFontStack("li-alinur-atithi", "Noto Serif Bengali"), "'Li Alinur Atithi', 'Noto Serif Bengali', serif");
});

check("every family keeps its source licence note", () => {
  assert.ok(BANGLA_FONTS.every((f) => f.licenseNote.length > 0));
  const fontbd = BANGLA_FONTS.find((f) => f.id === "fn-badhon-ikra");
  assert.ok(fontbd, "FontBD family should ship");
  assert.equal(fontbd?.license, "prohibited");
  const lipighor = BANGLA_FONTS.find((f) => f.id === "li-alinur-atithi");
  assert.equal(lipighor?.license, "web-with-attribution");
  assert.match(read("apps/web/src/components/Footer.tsx"), /lipighor\.com/);
  assert.match(read("packages/bangla-fonts/README.md"), /Every Unicode Bengali family/);
});

console.log(`\n[web] bangla fonts: ${passed} checks passed`);
