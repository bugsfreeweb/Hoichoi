/**
 * Policies must exist, be linked, and name the code that enforces them.
 *
 * A policy page nobody links to is not a policy; a policy that describes
 * behaviour the code does not implement is worse, because a reader will trust it.
 * These checks keep the set complete and keep each page pointing at a real file.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const read = (rel: string): string => readFileSync(resolve(root, rel), "utf8");

const POLICIES = [
  { route: "about/editorial", file: "apps/web/src/app/(site)/about/editorial/page.tsx", enforcedBy: "apps/scraper/src/source-overlap.ts" },
  { route: "about/ai", file: "apps/web/src/app/(site)/about/ai/page.tsx", enforcedBy: "packages/llm/src" },
  { route: "about/corrections", file: "apps/web/src/app/(site)/about/corrections/page.tsx", enforcedBy: "packages/db/src/verification.ts" },
  { route: "about/security", file: "apps/web/src/app/(site)/about/security/page.tsx", enforcedBy: null },
  { route: "privacy", file: "apps/web/src/app/(site)/privacy/page.tsx", enforcedBy: "packages/db/src/guest.ts" },
  { route: "terms", file: "apps/web/src/app/(site)/terms/page.tsx", enforcedBy: null },
  { route: "cookies", file: "apps/web/src/app/(site)/cookies/page.tsx", enforcedBy: null },
  { route: "dmca", file: "apps/web/src/app/(site)/dmca/page.tsx", enforcedBy: null },
];

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

check("every policy page exists", () => {
  for (const policy of POLICIES) {
    assert.ok(existsSync(resolve(root, policy.file)), `${policy.route} is missing (${policy.file})`);
  }
});

check("every policy route is linked from the footer", () => {
  const footer = read("apps/web/src/components/Footer.tsx");
  for (const policy of POLICIES) {
    assert.ok(footer.includes(`href: "/${policy.route}"`) || footer.includes(`href="/${policy.route}"`), `${policy.route} is unreachable`);
  }
});

check("/about indexes the policies and names the enforcing code", () => {
  const about = read("apps/web/src/app/(site)/about/page.tsx");
  for (const policy of POLICIES.filter((p) => p.route.startsWith("about/"))) {
    assert.ok(about.includes(`href="/${policy.route}"`), `${policy.route} is not in the index`);
  }
  for (const policy of POLICIES.filter((p) => p.enforcedBy)) {
    assert.ok(about.includes(policy.enforcedBy!), `/about does not name ${policy.enforcedBy}`);
  }
});

check("each page that claims an enforcement path names a file that exists", () => {
  for (const policy of POLICIES.filter((p) => p.enforcedBy)) {
    const target = resolve(root, policy.enforcedBy!);
    assert.ok(existsSync(target), `${policy.route} claims ${policy.enforcedBy} which does not exist`);
  }
});

check("the security page carries a contact, an SLA and an English section", () => {
  const page = read("apps/web/src/app/(site)/about/security/page.tsx");
  assert.ok(/security@hoichoi\.io/.test(page));
  assert.ok(/৭২ ঘণ্টা/.test(page), "readers need the acknowledgement window in Bangla");
  assert.ok(/lang="en"/.test(page), "an English check must be possible on the same page");
});

check("Bangla comes before English on the security page", () => {
  const page = read("apps/web/src/app/(site)/about/security/page.tsx");
  const bn = page.indexOf("নিরাপত্তা ও দুর্বলতা জানানো");
  const en = page.indexOf('lang="en"');
  assert.ok(bn >= 0 && en > bn, "the Bangla statement must lead");
});

check("SECURITY.md and the site page agree on the address", () => {
  const md = read("SECURITY.md");
  assert.ok(/security@hoichoi\.io/.test(md));
});

console.log(`[web] policies: ${passed} checks passed across ${POLICIES.length} pages`);
process.exit(process.exitCode ?? 0);
