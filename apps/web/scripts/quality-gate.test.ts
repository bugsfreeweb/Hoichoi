/**
 * Guard the quality gates themselves.
 *
 * The budget config and the a11y script have no runtime effect in this repo, so
 * left to themselves they rot: the config stops being read, the audit stops
 * being run, or a rule gets silently disabled. These checks pin the gates the
 * same way theme-audit pins the admin palette.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(APP, "../..");

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

check("the a11y script exists and is run in CI", () => {
  const script = fs.readFileSync(path.join(APP, "scripts/a11y.ts"), "utf8");
  assertContain(script, "chromium.launch()", "it drives a real browser");
  assertContain(script, 'localStorage.setItem("hoichoi-theme", t)', "it checks both palettes");
  assertContain(script, "serious", "it looks at serious+critical violations");

  const workflow = fs.readFileSync(path.join(ROOT, ".github/workflows/web-quality.yml"), "utf8");
  assertContain(workflow, "scripts/a11y.ts", "the workflow runs it");
  assertContain(workflow, "pnpm --filter @hoichoi/web start", "against the production build, not dev");
});

check("the a11y audit does not silently hide colour-contrast", () => {
  const script = fs.readFileSync(path.join(APP, "scripts/a11y.ts"), "utf8");
  const ignore = script.match(/IGNORE_RULES = \[([^\]]*)\]/)?.[1] ?? "";
  assertContain(ignore, "video-caption", "a legitimately ignorable rule is listed");
  // Match the rule by its exact quoted name: `color-contrast-enhanced` is a
  // different (AAA) rule and is legitimately too strict for this project.
  if (/["']color-contrast["']/.test(ignore)) {
    throw new Error("color-contrast must never be ignored — that is the whole point of the audit");
  }
});

check("the a11y audit fails, it does not just report", () => {
  const script = fs.readFileSync(path.join(APP, "scripts/a11y.ts"), "utf8");
  assertContain(script, "process.exit(failures.length === 0 ? 0 : 1)", "nonzero exit on violations");
});

check("Lighthouse config exists and gates what it must", () => {
  const lhci = fs.readFileSync(path.join(ROOT, "lighthouserc.cjs"), "utf8");
  assertContain(lhci, "categories:accessibility", "a11y score asserted");
  assertContain(lhci, '"error"', "the gate can fail the run");
  assertContain(lhci, "cumulative-layout-shift", "CLS is a hard gate — shift is within our control");
  assertContain(lhci, "largest-contentful-paint", "LCP is budgeted");
  assertContain(lhci, "total-blocking-time", "TBT is budgeted");
  assertContain(lhci, "throttlingMethod", "it throttles, otherwise every score is meaningless");
});

check("Lighthouse runs against the production server in CI", () => {
  const workflow = fs.readFileSync(path.join(ROOT, ".github/workflows/web-quality.yml"), "utf8");
  assertContain(workflow, "@lhci/cli", "lhci is invoked");
  assertContain(workflow, "pnpm build", "a production build precedes the run");
  assertContain(workflow, "http://localhost:3070", "server URL matches the config's locked port");
});

check("the web-quality workflow never touches production secrets", () => {
  const workflow = fs.readFileSync(path.join(ROOT, ".github/workflows/web-quality.yml"), "utf8");
  assertContain(workflow, "TURSO_DATABASE_URL: file:", "the throwaway DB is a local file");
  if (workflow.includes("TURSO_DATABASE_URL: libsql://")) {
    throw new Error("quality job must not use the production libSQL URL");
  }
  if (workflow.includes("SENTRY_DSN") || workflow.includes("REVALIDATE_SECRET")) {
    throw new Error("quality job must run without prod/secret env");
  }
});

function assertContain(haystack: string, needle: string, why: string): void {
  if (!haystack.includes(needle)) throw new Error(`missing ${JSON.stringify(needle)} — ${why}`);
}

console.log(`[web] quality gates: ${passed} checks passed`);
process.exit(process.exitCode ?? 0);