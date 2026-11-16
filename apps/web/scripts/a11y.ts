/**
 * Accessibility audit over the real pages (axe-core in a real browser).
 *
 * Lighthouse scores one page at a time and stops at a summary. This walks the
 * routes an editor actually ships and fails on what a keyboard or screen-reader
 * user would hit: serious and critical violations only, with the rule and the
 * element printed so the fix is obvious.
 *
 * Usage:  npx tsx apps/web/scripts/a11y.ts [baseUrl]
 * The workflow starts the production server first; locally, start `next dev`.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3070";

const ROUTES = [
  "/",
  "/poll",
  "/live",
  "/about",
  "/about/editorial",
  "/about/ai",
  "/about/security",
  "/privacy",
  "/terms",
  "/contact",
  "/submit",
  "/report",
];

/** Decorative media and third-party embeds are not our markup to fix. */
const IGNORE_RULES = ["color-contrast-enhanced", "video-caption"];

interface Violation {
  id: string;
  impact: string | null;
  help: string;
  nodes: Array<{ target: string[] }>;
}

async function audit(theme: "light" | "dark"): Promise<Violation[]> {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  // The palette is a token set per theme, so a page that passes in one can fail
  // in the other. Set the stored preference the toggle writes, then reload.
  await page.addInitScript((t) => {
    localStorage.setItem("hoichoi-theme", t);
    localStorage.setItem("hoichoi-theme-explicit", "1");
  }, theme);
  const failures: Violation[] = [];
  let checked = 0;

  for (const route of ROUTES) {
    const response = await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    // Client-only pills (theme toggles, live badges) restyle after hydration;
    // auditing mid-hydration reports their not-yet-theme text as a contrast
    // failure. Let the page settle so axe measures what a user actually sees.
    await page.waitForTimeout(1200);
    if (!response || !response.ok()) {
      console.log(`  skip ${route} (HTTP ${response?.status() ?? "no response"})`);
      continue;
    }
    // Load axe from the CDN: it is the maintained rule set, and pinning a copy in
    // this repo would quietly rot.
    await page.addScriptTag({ url: "https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js" });
    const result = (await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (window as any).axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      });
    })) as { violations: Violation[] };

    checked++;
    const serious = result.violations.filter(
      (v) => (v.impact === "serious" || v.impact === "critical") && !IGNORE_RULES.includes(v.id),
    );
    if (serious.length === 0) {
      console.log(`  ok  ${theme} ${route}`);
      continue;
    }
    for (const violation of serious) {
      console.error(`FAIL ${theme} ${route} — ${violation.id} (${violation.impact}): ${violation.help}`);
      for (const node of violation.nodes.slice(0, 3)) {
        console.error(`       ${node.target.join(" ")}`);
      }
    }
    failures.push(...serious);
  }

  await browser.close();
  console.log(`[web] a11y (${theme}): ${checked} page(s), ${failures.length} serious violation(s)`);
  return failures;
}

const failures = [...(await audit("light")), ...(await audit("dark"))];
process.exit(failures.length === 0 ? 0 : 1);
