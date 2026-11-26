/**
 * Trust claims the code must not make.
 *
 * The site used to stamp every card "FACT-CHECKED" while nothing in the pipeline
 * checked a single fact. This test fails if the claim returns, if a badge is
 * rendered without a grade, or if the verification grade is set by hand rather
 * than derived from records.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "..", "src");

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

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}

/** Strip JSX/JS comments so prose about the old claim does not fail the test. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const sources = walk(SRC, [".tsx", ".ts"]);

check("no surface claims fact-checking", () => {
  const offenders: string[] = [];
  for (const file of sources) {
    const code = stripComments(readFileSync(file, "utf8"));
    if (/FACT[- ]CHECKED/i.test(code))
      offenders.push(
        file
          .slice(SRC.length + 1)
          .split(sep)
          .join("/"),
      );
  }
  assert.deepEqual(
    offenders,
    [],
    `FACT-CHECKED returned in: ${offenders.join(", ")}`,
  );
});

check("the badge names the honest weak grades instead of hiding them", () => {
  const badge = readFileSync(
    join(SRC, "components", "VerificationBadge.tsx"),
    "utf8",
  );
  assert.match(
    badge,
    /site\.verify\.sourceClaimed/,
    "labels must come from the dictionary",
  );
  assert.match(
    badge,
    /LABEL\[status\]/,
    "the badge must look up its label, not build a key from a value",
  );
  assert.match(
    badge,
    /unverified: "border border-ink\/30 text-ink-soft"/,
    "unverified must stay visibly muted",
  );
  assert.match(
    badge,
    /source_claimed/,
    "a social-media claim needs its own state",
  );
  assert.match(
    badge,
    /disputed|retracted/,
    "dispute and retraction need visible states",
  );
});

check(
  "the grade is derived on the server, not accepted from the client",
  () => {
    const route = readFileSync(
      join(SRC, "app", "api", "admin", "verification", "[postId]", "route.ts"),
      "utf8",
    );
    assert.match(
      route,
      /gradeFromEvidence\(/,
      "the route must compute the grade from evidence",
    );
    assert.match(
      route,
      /VERIFICATION_ORDER\.indexOf\(chosen\) <= VERIFICATION_ORDER\.indexOf\(derived\)/,
      "a requested grade may be weaker than the evidence, never stronger",
    );
    assert.match(
      route,
      /evidenceUrls/,
      "only attached evidence URLs may support verification",
    );
  },
);

check("corrections are recorded with the old and new text", () => {
  const route = readFileSync(
    join(SRC, "app", "api", "admin", "verification", "[postId]", "route.ts"),
    "utf8",
  );
  assert.match(route, /recordCorrection\(/, "a correction must write history");
  assert.match(route, /oldValue/, "the replaced text must be kept");
});

check("AI rewrite quality is never an input to the verification grade", () => {
  const verification = readFileSync(
    join(here, "..", "..", "..", "packages", "db", "src", "verification.ts"),
    "utf8",
  );
  const grade = verification.slice(
    verification.indexOf("export function gradeFromEvidence"),
    verification.indexOf("export function showsBadge"),
  );
  assert.ok(
    !/ai_rewrite|aiQuality|qualityScore/i.test(grade),
    "AI score must not appear in the grade function",
  );
});

check("cards and article pages carry provenance and an original link", () => {
  const card = readFileSync(join(SRC, "components", "ArticleCard.tsx"), "utf8");
  assert.match(card, /SourceTypeBadge/);
  const post = readFileSync(
    join(SRC, "app", "(site)", "post", "[slug]", "page.tsx"),
    "utf8",
  );
  assert.match(post, /মূল পোস্ট দেখুন/);
  assert.match(post, /মূল সংবাদ পড়ুন/);
  assert.match(post, /ai_rewrite_quality_score/);
});

console.log(`[web] trust-claims: ${passed} checks passed`);
