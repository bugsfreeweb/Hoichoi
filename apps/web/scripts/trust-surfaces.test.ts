/**
 * Trust surfaces.
 *
 * These are source-level gates for claims that are easy to regress: the
 * schedule shown to readers, the collector's honest online/offline copy, the
 * dedup number, the lead-story label, and the footer's demo disclaimer.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = import.meta.dirname;
const SRC = join(here, "..", "src");
const ROOT = join(here, "..", "..", "..");
const read = (...parts: string[]) => readFileSync(join(...parts), "utf8");

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

check("the donut and the KPI share one dedup number", () => {
  const db = read(ROOT, "packages", "db", "src", "index.ts");
  assert.match(db, /allArticles\.duplicate \+= totals\.duplicates/);
});

check(
  "the home page reads collector health and dedup counts from the DB",
  () => {
    const page = read(SRC, "app", "(site)", "page.tsx");
    assert.match(page, /collectorSnapshot\(\)/);
    assert.match(page, /dedupSummary\(\)/);
    assert.match(page, /dups=\{dedup\.blocked\}/);
    assert.match(page, /collector\?\.intervalHours \?\? 8/);
  },
);

check("the zero-touch claim is conditional on a healthy collector", () => {
  const page = read(SRC, "app", "(site)", "page.tsx");
  assert.match(page, /collector\?\.online/);
  assert.match(page, /মানুষের যাচাই/);
  assert.ok(
    !page.includes('zero manual touch."),\n                    </span>'),
    "zero-touch must not be unconditional",
  );
});

check("the lead badge never calls an unapproved story AUTO-FEATURED", () => {
  const page = read(SRC, "app", "(site)", "page.tsx");
  assert.match(page, /find\(\(p\) => p\.is_feature_eligible\)/);
  assert.match(page, /AWAITING HUMAN REVIEW/);
  assert.ok(
    !page.includes("AUTO-FEATURED"),
    "the lead label must not imply automatic featuring",
  );
});

check("no surface still advertises the old two-hour schedule", () => {
  const files = [
    join(SRC, "app", "(site)", "page.tsx"),
    join(SRC, "components", "mv", "home", "Pipeline.tsx"),
    join(SRC, "components", "maintenance", "MaintenanceScreen.tsx"),
  ];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    assert.ok(
      !/EVERY 2 HOURS|প্রতি ২ ঘণ্টায়/.test(text),
      `${file} still claims a 2-hour interval`,
    );
  }
  const ticker = read(SRC, "components", "mv", "site", "Ticker.tsx");
  assert.ok(
    !ticker.includes("সব তথ্য উৎস যাচাইকৃত"),
    "the ticker must not claim every item was verified",
  );
});

check(
  "the lead credit does not hide a real photo behind an illustrative label",
  () => {
    const page = read(SRC, "app", "(site)", "page.tsx");
    assert.ok(
      !page.includes('·{b("প্রতীকী", "illustrative")}'),
      "a collected photo must not be called illustrative",
    );
    assert.match(page, /সংগৃহীত ছবি/);
    const gallery = read(SRC, "components", "PostGallery.tsx");
    assert.ok(
      !gallery.includes('"প্রতীকী"'),
      "the gallery must not label every photo illustrative",
    );
    assert.match(gallery, /ছবি: সংগৃহীত/);
    const dict = read(ROOT, "packages", "i18n", "src", "dictionary.ts");
    assert.ok(
      !dict.includes("পুনর্লিখন · প্রতীকী"),
      "the card credit must not call an AI rewrite an illustrative photo",
    );
  },
);

check("the footer no longer calls the newsroom a fictional mockup", () => {
  const dict = read(ROOT, "packages", "i18n", "src", "dictionary.ts");
  assert.ok(
    !/fictional|কাল্পনিক|mockup|মকআপ/.test(dict),
    "footer copy must not disown the published news",
  );
  assert.match(dict, /AI সহায়তায় পুনর্লিখিত/);
  assert.ok(
    !dict.includes("প্রতিটি প্রতিবেদনে থাকে"),
    "no blanket claim that every report was human-reviewed",
  );
  assert.ok(
    !dict.includes("published after verification"),
    "the footer must not claim every story was verified",
  );
});

check(
  "the pipeline guards desks, gates sensitive posts and withholds eligibility",
  () => {
    const pipeline = read(ROOT, "apps", "scraper", "src", "pipeline.ts");
    assert.match(pipeline, /guardCategory\(/);
    assert.match(pipeline, /needsHumanReview\(/);
    assert.match(
      pipeline,
      /sourceType === "facebook" \? "source_claimed" : "unverified"/,
    );
    assert.match(pipeline, /is_feature_eligible/);
    assert.match(pipeline, /child-sexual-abuse/);
  },
);

check("the pipeline stores only fixed desks and gates by source", () => {
  const pipeline = read(ROOT, "apps", "scraper", "src", "pipeline.ts");
  assert.match(pipeline, /canonicalDesk\(guardedSlug\)/);
  assert.match(pipeline, /sourceCategory: source\.category/);
});

check("media repair never overwrites a generated poster", () => {
  const repair = read(ROOT, "apps", "scraper", "src", "media-backfill.ts");
  assert.match(repair, /p\.media_path NOT LIKE 'api\/posters\/%'/);
});

check("the schema carries trust metadata and a legacy-desk remap", () => {
  const trust = read(
    ROOT,
    "packages",
    "db",
    "migrations",
    "045_trust_metadata.sql",
  );
  for (const col of [
    "verification_evidence",
    "reviewer_id",
    "source_type",
    "ai_rewrite_quality_score",
    "is_human_reviewed",
    "is_feature_eligible",
  ]) {
    assert.ok(trust.includes(col), `045 must add ${col}`);
  }
  const remap = read(
    ROOT,
    "packages",
    "db",
    "migrations",
    "047_remap_legacy_desks.sql",
  );
  assert.match(remap, /category = 'technology'.*'tech'/s);
});

check("moderation can correct a wrong desk without leaving the queue", () => {
  const page = read(SRC, "app", "admin", "(console)", "moderation", "page.tsx");
  assert.match(page, /categoryOptions/);
  assert.match(page, /categories=\{categoryOptions\}/);
  const picker = read(SRC, "components", "admin", "CategoryPicker.tsx");
  assert.match(picker, /`\/api\/posts\/\$\{postId\}`/);
  assert.match(picker, /body: JSON\.stringify\(\{ category: next \}\)/);
  assert.match(picker, /router\.refresh\(\)/);
  // The desk editor already supports the same correction; the moderation
  // screen must at least offer a route to it.
  const desk = read(ROOT, "apps", "desktop", "src", "screens", "Moderation.tsx");
  assert.match(desk, /onOpenQueue/);
  const queue = read(ROOT, "apps", "desktop", "src", "screens", "Queue.tsx");
  assert.match(queue, /deskQueueUpdate\(env, row\.id, \{/);
  assert.match(queue, /category,/);
});

check("posters render the headline without description prose", () => {
  const layouts = read(ROOT, "packages", "poster", "src", "design", "layouts.ts");
  assert.ok(!layouts.includes("bullets"), "no bullet paragraph block");
  assert.ok(!layouts.includes("pullQuote"), "no pull-quote paragraph block");
  assert.match(layouts, /headline\(content\)/);
});

console.log(`[web] trust-surfaces: ${passed} checks passed`);
