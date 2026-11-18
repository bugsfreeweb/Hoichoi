/**
 * The console's sidebar has twelve templates and only one DOM.
 *
 * The design prototype (`hero-mockup`) offers twelve admin sidebar styles and
 * twelve hero templates, and the app previously described neither: the sidebar
 * had a single fixed look, and the hero picker used its own vocabulary for the
 * same twelve scenes. These checks pin the two things that keep the port honest:
 *
 *   1. the catalogue is the single source of twelve templates, and both surfaces
 *      read it instead of keeping their own list;
 *   2. every template the catalogue advertises has a real CSS block — a template
 *      that renders as "unstyled" is worse than a missing one;
 *   3. an unknown saved value is the default, never "no style".
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_SIDEBAR_STYLE,
  HERO_SCENE_STYLES,
  SIDEBAR_STYLES,
  SIDEBAR_STYLE_IDS,
  isSidebarStyleId,
  sidebarStyleMeta,
  sidebarStyleOr,
} from "../../../packages/shared-types/src/index";
import { parseAppConfig } from "../../../packages/db/src/index";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** Comments stripped: a comment may describe behaviour the code does not have. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed++;
}

const webCss = code(read("apps/web/src/components/admin/sidebar-styles.css"));
const deskCss = code(read("apps/desktop/src/index.css"));
const siteSection = code(read("apps/web/src/components/admin/settings/SiteSection.tsx"));
const adminShell = code(read("apps/web/src/components/admin/AdminShell.tsx"));
const deskSettings = code(read("apps/desktop/src/screens/Settings.tsx"));
const deskApp = code(read("apps/desktop/src/App.tsx"));

check("there are exactly twelve sidebar templates, with the prototype's names", () => {
  assert.equal(SIDEBAR_STYLES.length, 12);
  assert.equal(SIDEBAR_STYLE_IDS.length, 12);
  assert.equal(new Set(SIDEBAR_STYLE_IDS).size, 12, "no duplicate ids");
  const obsidian = sidebarStyleMeta("obsidian");
  assert.equal(obsidian.name, "অবসিডিয়ান গ্লাস");
  assert.equal(obsidian.latin, "OBSIDIAN GLASS");
  // The prototype's Option B default is the dark newsroom glass panel.
  assert.equal(DEFAULT_SIDEBAR_STYLE, "obsidian");
  // Every entry must be describable in the picker: a name, a latin line, a note.
  for (const style of SIDEBAR_STYLES) {
    assert.ok(style.name.length > 0 && style.latin.length > 0, `${style.id} is labelled`);
    assert.ok(style.note.length > 8, `${style.id} explains what it is`);
    assert.ok(style.swatch.accent.startsWith("#") || style.swatch.accent.includes("gradient"));
  }
});

check("an unknown or missing style is the default, never an unstyled panel", () => {
  assert.equal(sidebarStyleOr(null), "obsidian");
  assert.equal(sidebarStyleOr("not-a-style"), "obsidian");
  assert.equal(sidebarStyleOr("neon"), "neon");
  assert.equal(isSidebarStyleId("cards"), true);
  assert.equal(isSidebarStyleId("Card"), false);
  // The stored config is parsed through the same guard, so a hand-edited value
  // cannot reach the shell.
  const cfg = parseAppConfig(JSON.stringify({ admin_sidebar_style: "bogus" }));
  assert.equal(cfg.admin_sidebar_style, "obsidian");
  const kept = parseAppConfig(JSON.stringify({ admin_sidebar_style: "ledger" }));
  assert.equal(kept.admin_sidebar_style, "ledger");
});

check("every advertised template has a real CSS block on both surfaces", () => {
  for (const id of SIDEBAR_STYLE_IDS) {
    assert.match(webCss, new RegExp(`data-sidebar-style="${id}"`), `web CSS draws ${id}`);
    assert.match(deskCss, new RegExp(`data-sidebar-style="${id}"`), `desk CSS draws ${id}`);
  }
});

check("the web console reads the catalogue, it does not re-list the styles", () => {
  assert.match(adminShell, /data-sidebar-style=\{sidebarStyle\}/, "the shell applies the style");
  assert.match(adminShell, /adm-nav-link/, "nav rows carry the hook class the CSS styles");
  assert.match(adminShell, /adm-collapsed/, "the collapsed rail has its own hook");
  assert.match(siteSection, /SIDEBAR_STYLES\.map/, "the picker is built from the catalogue");
  assert.match(siteSection, /admin_sidebar_style/, "the picker writes the config key");
  // The design picker must not keep a second, hand-typed list of style ids.
  assert.ok(!/"(classic|obsidian|floating|dock|neon)"/.test(siteSection), "no inline style ids in the picker");
});

check("the desk applies the same template and writes the shared choice back", () => {
  assert.match(deskApp, /data-sidebar-style=\{sidebarStyle\}/, "the desk sidebar applies it");
  assert.match(deskSettings, /SIDEBAR_STYLES\.map/, "the desk picker is the same catalogue");
  assert.match(deskSettings, /admin_sidebar_style/, "choosing on the desk updates the shared config");
  // The local mirror is what makes the change visible offline, immediately.
  assert.match(deskSettings, /setDeskSidebarStyle\(/);
});

check("the hero picker now speaks the prototype's twelve templates", () => {
  assert.equal(HERO_SCENE_STYLES.length, 12);
  const names = HERO_SCENE_STYLES.map((s) => s.template);
  assert.equal(new Set(names).size, 12, "twelve distinct prototype templates");
  // Order is the prototype's order, so the picker reads like the design.
  assert.deepEqual(names, [
    "obsidian",
    "pipeline",
    "editorial",
    "mosaic",
    "radar",
    "kinetic",
    "tilt",
    "terminal",
    "spotlight",
    "constellation",
    "waveform",
    "timeline",
  ]);
  for (const style of HERO_SCENE_STYLES) {
    assert.ok(style.noteBn.length > 10, `${style.key} has the prototype's note`);
    assert.ok(style.en === style.en.toUpperCase(), `${style.key} has a LATIN name`);
    assert.ok(style.tone === "dark" || style.tone === "light");
  }
  // The scene keys stay the renderer's keys, so saved settings keep working.
  assert.deepEqual(new Set(HERO_SCENE_STYLES.map((s) => s.key)).size, 12);
  assert.match(siteSection, /st\.noteBn/, "the picker shows the note, not just the name");
});

console.log(`\n[web] sidebar templates: ${passed} checks passed`);
