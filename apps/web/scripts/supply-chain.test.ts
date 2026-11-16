/**
 * Supply-chain guard rails.
 *
 * These files have no runtime effect, which is exactly why they rot silently: a
 * dependabot config that stops covering cargo, or a CodeQL job without the
 * security-events permission, looks fine in review and does nothing.
 *
 * This test asserts the properties that matter, and that no .env file is tracked.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const read = (rel: string): string => readFileSync(resolve(root, rel), "utf8");

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

check("dependabot covers npm, cargo and actions", () => {
  const yml = read(".github/dependabot.yml");
  for (const ecosystem of ["npm", "cargo", "github-actions"]) {
    assert.ok(yml.includes(`package-ecosystem: ${ecosystem}`), `dependabot must watch ${ecosystem}`);
  }
  assert.ok(/interval: weekly/.test(yml), "weekly cadence keeps the PR count reviewable");
});

check("dependabot does not let a framework major in as a minor", () => {
  const yml = read(".github/dependabot.yml");
  assert.ok(yml.includes("dependency-name: next"), "next majors need a deliberate migration");
  assert.ok(yml.includes("semver-major"));
});

check("CodeQL runs security-extended and may write findings", () => {
  const yml = read(".github/workflows/codeql.yml");
  assert.ok(yml.includes("github/codeql-action/init"));
  assert.ok(yml.includes("security-extended"), "the default query pack misses most real issues");
  assert.ok(yml.includes("security-events: write"), "findings cannot be uploaded without it");
  assert.ok(yml.includes("javascript-typescript"));
});

check("secret scanning sees full history and runs on PRs", () => {
  const yml = read(".github/workflows/secret-scan.yml");
  assert.ok(yml.includes("gitleaks"), "gitleaks is the scanner");
  assert.ok(/fetch-depth:\s*0/.test(yml), "a shallow clone hides leaked history");
  assert.ok(yml.includes("pull_request"), "a PR is where a key usually arrives");
});

check("SECURITY.md states a contact, a scope and an SLA", () => {
  const md = read("SECURITY.md");
  assert.ok(/security@hoichoi\.io/.test(md), "a policy without an address is decoration");
  assert.ok(/72 hours/.test(md), "reporters need to know when to expect a reply");
  assert.ok(/out of scope/i.test(md));
});

check("the PR template asks for verification, not intentions", () => {
  const md = read(".github/pull_request_template.md");
  assert.ok(/pnpm typecheck/.test(md));
  assert.ok(/pnpm test/.test(md));
  assert.ok(/migration/i.test(md), "a migration is the highest-risk change in this repo");
});

check("no .env file is tracked", () => {
  const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter((f) => /(^|\/)\.env(\.|$)/.test(f) && !/\.example$/.test(f));
  assert.deepEqual(tracked, [], `tracked env files: ${tracked.join(", ")}`);
});

check("the ignore rules still cover build output and secrets", () => {
  const ignore = read(".gitignore");
  for (const pattern of ["node_modules", ".env", "releases/", "data/"]) {
    assert.ok(ignore.includes(pattern), `.gitignore must keep ignoring ${pattern}`);
  }
});

assert.ok(existsSync(resolve(root, ".github/workflows/secret-scan.yml")));
console.log(`[web] supply chain: ${passed} checks passed`);
process.exit(process.exitCode ?? 0);
