/**
 * The dynamic poster's wiring, asserted at rest.
 *
 * The renderer and the art director have their own tests; this one protects the
 * seams an editor can actually feel:
 *
 *   - the route exists at the URL the CMS posts to, behind the editor guard;
 *   - it reads the last five designs before it asks for a new one;
 *   - it renders through the HTML renderer rather than shipping the model's
 *     picture raw (the whole reason Bengali survives);
 *   - the panel offers "Regenerate Style" *and* "Download Poster";
 *   - the vocabulary has exactly the five layouts and five palettes the brief
 *     names, and the DB remembers them.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import {
  POSTER_ASPECTS,
  POSTER_DESIGN_LAYOUTS,
  POSTER_PALETTES,
} from "../../../packages/shared-types/src/index";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), "utf8");

function check(name: string, fn: () => void): void {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}
let passed = 0;

const route = read("apps/web/src/app/api/generate-poster/route.ts");
const panel = read("apps/web/src/components/admin/PostImageGenerator.tsx");
const postPage = read("apps/web/src/app/(site)/post/[slug]/page.tsx");
const posterDb = read("packages/db/src/poster-designs.ts");
const postApi = read("apps/web/src/app/api/posts/[id]/route.ts");
const postPreferenceMigration = read("packages/db/migrations/042_post_social_aspect.sql");
const adminPostPage = read("apps/web/src/app/admin/(console)/posts/[id]/page.tsx");
const postEditor = read("apps/web/src/components/admin/PostEditor.tsx");
const migration = read("packages/db/migrations/040_poster_designs.sql");
const aspectMigration = read("packages/db/migrations/041_poster_design_aspect.sql");
const embedded = read("packages/db/src/migrations.generated.ts");

check("the route is at the brief's URL and refuses anonymous callers", () => {
  assert.match(route, /export async function POST/);
  assert.match(route, /requireApiRole\("editor"\)/);
  assert.match(route, /role !== "admin" && user\.role !== "editor"/);
});

check("art direction runs before the image, and the image is not the poster", () => {
  const directed = route.indexOf("await directPosterDesign(");
  const drawn = route.indexOf("await generateImage(");
  const composed = route.indexOf("await renderDesignPoster(");
  assert.ok(directed > 0 && drawn > directed, "direction must precede the visual");
  assert.ok(composed > drawn, "the composed poster must follow the visual");
  assert.match(route, /focalAspectFor\(plan\.layout, aspect\)/, "the image ratio follows layout + aspect");
});

check("anti-repetition is read from the last five designs", () => {
  assert.match(route, /recentPosterDesigns\(5\)/);
  assert.match(route, /recentlyUsed/);
  assert.match(route, /recordPosterDesign\(/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS poster_designs/);
  assert.match(embedded, /040_poster_designs/);
  assert.match(aspectMigration, /ADD COLUMN aspect/);
  assert.match(embedded, /041_poster_design_aspect/);
});

check("the encoded poster and its design tokens both travel back", () => {
  assert.match(route, /data_url: `data:\$\{output\.rendered\.contentType\};base64,/);
  assert.match(route, /layout: plan\.layout/);
  assert.match(route, /palette: paletteSummary\(plan\)/);
  assert.match(route, /directed_by: directedBy/);
  assert.match(route, /posters: outputs\.map/);
});

check("the CMS offers regenerate style beside download poster", () => {
  assert.match(panel, /\/api\/generate-poster/);
  assert.match(panel, /রিজেনারেট স্টাইল/);
  assert.match(panel, /পোস্টার ডাউনলোড/);
  assert.match(panel, /downloadPoster/);
  assert.match(panel, /postId,\s*regenerate: true,\s*attach: true/s);
  assert.match(panel, /aspects: bothFrames \? \["16:9", "4:5"\]/);
  assert.match(panel, /৪:৫ পোর্ট্রেটও তৈরি করুন/);
  assert.match(panel, /setActiveAspect/);
});

check("the 4:5 poster becomes the social image, while Twitter keeps 16:9", () => {
  assert.match(postPage, /latestPosterDesign\(postRaw\.id, "4:5"\)/);
  assert.match(postPage, /const shareImage = portraitUrl \?\? webImage/);
  assert.match(postPage, /images: shareImage\s*\?/);
  assert.match(postPage, /width: 1080, height: 1350/);
  assert.match(postPage, /card: "summary_large_image"[\s\S]*?images: webImage \? \[webImage\]/);
  assert.match(postPage, /const shareSrc = portrait\?\.media_path/);
  assert.match(posterDb, /WHERE post_id = \? AND aspect = \? AND media_path IS NOT NULL/);
});

check("the editor can choose the share frame per post", () => {
  assert.match(postPreferenceMigration, /social_share_aspect TEXT NOT NULL DEFAULT '4:5'/);
  assert.match(embedded, /042_post_social_aspect/);
  assert.match(route, /focalAspectFor\(plan\.layout, aspect\)/);
  assert.match(postApi, /social_share_aspect !== "4:5" && body\.social_share_aspect !== "16:9"/);
  assert.match(postApi, /fields\.social_share_aspect = body\.social_share_aspect/);
  assert.match(postPage, /postRaw\.social_share_aspect \?\? "4:5"/);
  assert.match(postPage, /const wantsPortrait =/);
  assert.match(panel, /ফেসবুক \/ ইনস্টাগ্রামে ৪:৫ শেয়ার কার্ড/);
  assert.match(panel, /saveShareAspect/);
  assert.match(panel, /social_share_aspect: next/);
});

check("the editor sees the share card before publishing", () => {
  assert.match(adminPostPage, /latestPosterDesign\(id, "4:5"\)/);
  assert.match(adminPostPage, /portraitPath=\{portrait\?\.media_path \?\? null\}/);
  assert.match(adminPostPage, /shareDomain=\{new URL\(siteUrl\(\)\)\.host\}/);
  assert.match(postEditor, /shareTitle=\{title \|\| post\.title_bn\}/);
  assert.match(postEditor, /shareDescription=\{summary \|\| post\.summary_bn/);
  assert.match(panel, /লিংক প্রিভিউ/);
  assert.match(panel, /const sharePortrait = shareAspect === "4:5" && Boolean\(portraitSrc\)/);
  assert.match(panel, /৪:৫ পোস্টার নেই — পোস্টের মূল ছবি দেখানো হচ্ছে/);
  assert.match(panel, /aspectRatio: sharePortrait \? "4 \/ 5" : "1\.91 \/ 1"/);
  assert.match(panel, /p\.startsWith\("\/"\)/);
});

check("the vocabulary is the brief's, once", () => {
  assert.deepEqual([...POSTER_DESIGN_LAYOUTS], [
    "split_left_media",
    "split_right_media",
    "hero_overlay_gradient",
    "editorial_magazine_grid",
    "breaking_spotlight",
  ]);
  assert.deepEqual(
    POSTER_PALETTES.map((p) => p.accent),
    ["#00F5D4", "#F59E0B", "#EF4444", "#34D399", "#FB7185"],
  );
  assert.deepEqual([...POSTER_ASPECTS], ["16:9", "4:5"]);
});

console.log(`\n[web] generate-poster route: ${passed} checks passed`);
