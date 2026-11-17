/**
 * Print what actually moved, from the Lighthouse reports LHCI just wrote.
 *
 * The assert step only tells you "CLS was 0.206"; the LHR already has the culprit
 * elements, and on a shared runner that is the difference between a five-minute
 * fix and a week of guessing. Always exits 0 — this is a reporter, not a gate.
 *
 * Usage: node scripts/cls-report.mjs [.lighthouseci]
 */
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2] ?? ".lighthouseci";
if (!fs.existsSync(dir)) {
  console.log(`cls-report: ${dir} not found — nothing to report`);
  process.exit(0);
}

const files = fs
  .readdirSync(dir)
  .filter((f) => /^lhr-.*\.json$/.test(f))
  .sort();

if (files.length === 0) {
  console.log(`cls-report: no lhr-*.json in ${dir}`);
  process.exit(0);
}

for (const file of files) {
  let lhr;
  try {
    lhr = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  } catch (err) {
    console.log(`cls-report: ${file} unreadable (${err instanceof Error ? err.message : err})`);
    continue;
  }

  const cls = lhr.audits?.["cumulative-layout-shift"];
  console.log(`\n=== ${lhr.finalUrl ?? lhr.finalDisplayedUrl ?? file} — CLS ${cls?.displayValue ?? "?"}`);

  const items = lhr.audits?.["layout-shifts"]?.details?.items ?? [];
  if (items.length === 0) {
    console.log("    no shift elements recorded");
    continue;
  }

  for (const item of items.slice(0, 8)) {
    const node = item.node ?? {};
    const score = typeof item.score === "number" ? item.score.toFixed(4) : "?";
    console.log(`    ${score}  ${node.selector ?? "(no selector)"}`);
    if (node.snippet) console.log(`            ${String(node.snippet).slice(0, 160)}`);
  }

  // The font audit explains the classic cause: a webfont swapping in after first
  // paint reflows every line of text on the page at once.
  const fontDisplay = ["font-display", "font-size", "font-family"]
    .map((id) => lhr.audits?.[id])
    .find((a) => a && a.score !== null && a.score < 1);
  if (fontDisplay) {
    console.log(`    font audit: ${fontDisplay.id} scored ${fontDisplay.score}`);
  }
}
