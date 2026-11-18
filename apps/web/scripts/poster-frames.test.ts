/**
 * A hand-picked poster frame, end to end.
 *
 * The layout used to be a pure function of the desk with no escape hatch. That is
 * still the default, but an operator looking at a story that reads wrong as a
 * breaking banner can now say so — and the whole point of these checks is that
 * the override travels the same road as every other generation option:
 *
 *   console → API (validated) → Actions runner → CLI (validated) → plate
 *
 * and that the vocabulary exists once. A second hand-typed list is how a picker
 * starts offering a layout the renderer does not have, which renders the desk
 * default while the operator believes the override applied.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import {
  POSTER_LAYOUTS,
  POSTER_THEMES,
  isPosterLayout,
  isPosterTheme,
} from "../../../packages/shared-types/src/index";
import {
  POSTER_LAYOUTS as POSTER_LAYOUTS_FROM_RENDERER,
  planPoster,
} from "../../../packages/poster/src/index";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), "utf8");

function check(name: string, fn: () => void): void {
  fn();
  passed++;
}
let passed = 0;

const route = read("apps/web/src/app/api/posts/[id]/generate-image/route.ts");
const cli = read("apps/scraper/src/cli.ts");
const backfill = read("apps/scraper/src/media-backfill.ts");
const generator = read("apps/web/src/components/admin/PostImageGenerator.tsx");
const workflow = read(".github/workflows/generate-image.yml");

check("there is one list of layouts and themes, and the renderer re-exports it", () => {
  assert.deepEqual([...POSTER_LAYOUTS], ["split-left", "split-right", "editorial-card", "breaking-banner"]);
  assert.deepEqual([...POSTER_THEMES], ["dark", "light-paper"]);
  // The renderer must not keep its own copy: it re-exports the same array.
  assert.equal(POSTER_LAYOUTS_FROM_RENDERER, POSTER_LAYOUTS);
  assert.equal(isPosterLayout("editorial-card"), true);
  assert.equal(isPosterLayout("editorial"), false);
  assert.equal(isPosterTheme("light-paper"), true);
  assert.equal(isPosterTheme("light"), false);
});

check("an override replaces the desk's frame; an absent one keeps it", () => {
  const desk = planPoster({ category: "crime", title: "একটি ঘটনা" });
  assert.equal(desk.layout, "breaking-banner", "crime is a banner by default");
  const forced = planPoster({ category: "crime", title: "একটি ঘটনা", layout: "editorial-card", theme: "light-paper" });
  assert.equal(forced.layout, "editorial-card");
  assert.equal(forced.theme, "light-paper");
  // The accent still comes from the desk, not from the override.
  assert.equal(forced.accent, desk.accent);
  const nulled = planPoster({ category: "crime", title: "একটি ঘটনা", layout: null, theme: null });
  assert.equal(nulled.layout, desk.layout);
  assert.equal(nulled.theme, desk.theme);
});

check("the API refuses an unknown frame before the runner ever sees it", () => {
  assert.match(route, /posterLayoutOverride\(body\?\.layout\)/);
  assert.match(route, /posterThemeOverride\(body\?\.theme\)/);
  assert.match(route, /isPosterLayout\(v\)/, "validated against the shared list");
  assert.match(route, /class BadOverride extends Error/);
  assert.match(route, /status: 400/, "a bad frame is a client error, not a silent default");
  // Both routes out of the API must carry the override.
  assert.match(route, /layout: opts\.layout \|\| undefined/, "the runner payload carries it");
  assert.match(route, /layout: \(opts\.layout \|\| null\) as PosterLayout \| null/, "the inline plate carries it");
});

check("the runner accepts the two values and passes them to the CLI", () => {
  assert.match(workflow, /IMG_LAYOUT: \$\{\{ github\.event\.client_payload\.layout \|\| '' \}\}/);
  assert.match(workflow, /IMG_THEME: \$\{\{ github\.event\.client_payload\.theme \|\| '' \}\}/);
  assert.match(workflow, /args\+=\( --layout "\$IMG_LAYOUT" \)/);
  assert.match(workflow, /args\+=\( --theme "\$IMG_THEME" \)/);
});

check("the CLI validates a typo instead of silently drawing the default", () => {
  assert.match(cli, /--layout <name>/);
  assert.match(cli, /--theme <name>/);
  assert.match(cli, /if \(layout !== null && !isPosterLayout\(layout\)\)/);
  assert.match(cli, /if \(theme !== null && !isPosterTheme\(theme\)\)/);
  assert.match(cli, /unknown --layout/);
  // And the two reach the plate composer.
  assert.match(backfill, /layout: opts\.layout \?\? null,/);
  assert.match(backfill, /theme: opts\.theme \?\? null,/);
});

check("the console offers the choices and defaults to the desk", () => {
  assert.match(generator, /POSTER_LAYOUTS\.map/);
  assert.match(generator, /POSTER_THEMES\.map/);
  assert.match(generator, /ডেস্ক অনুযায়ী/, "empty means the desk decides");
  assert.match(generator, /layout: layout \|\| undefined/);
  // A client component must not import the renderer: it carries sharp.
  assert.ok(!/from "@hoichoi\/poster"/.test(generator), "no native renderer in the browser bundle");
});

console.log(`\n[web] poster frames: ${passed} checks passed`);
