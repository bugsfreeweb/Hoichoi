/**
 * Judge a `/api/health` body for the Uptime workflow.
 *
 * Kept as a file rather than an inline `run: | python3 - <<'PY'` heredoc: a heredoc
 * inside a YAML block scalar starts at column 0, which makes the whole workflow
 * file invalid — GitHub then shows a red run on every push that never executed a
 * single step. (That is exactly what happened before this file existed.)
 *
 * Usage: node .github/scripts/uptime-check.mjs <path-to-json>
 * Exit 1 only when the endpoint says it is not healthy.
 */
import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("uptime-check: no body file given");
  process.exit(2);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (err) {
  console.error(`uptime-check: body is not JSON (${err instanceof Error ? err.message : err})`);
  process.exit(1);
}

const status = report.status ?? "unknown";
console.log(`status: ${status}`);

const probes = Array.isArray(report.probes) ? report.probes : [];
for (const probe of probes) {
  console.log(`  ${probe.name ?? "?"}: ${probe.status ?? "?"}${probe.detail ? ` — ${probe.detail}` : ""}`);
}

if (status !== "healthy") {
  const bad = probes.filter((p) => p.status === "fail" || p.status === "degraded");
  console.error(`::error::health endpoint reports ${status}${bad.length ? ` (${bad.map((p) => p.name).join(", ")})` : ""}`);
  process.exit(1);
}
