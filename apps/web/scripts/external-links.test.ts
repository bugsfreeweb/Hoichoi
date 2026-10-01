import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const ADMIN = join(process.cwd(), "src");
const EXEMPT = new Set(["node_modules", ".next", "ExternalLink.tsx"]);

function files(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...files(full));
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

test("outbound admin links open in a new tab and cannot reach back", () => {
  const offenders: string[] = [];

  for (const file of files(ADMIN)) {
    const src = readFileSync(file, "utf8");

    // Drop comments before scanning. The prose in these files documents the
    // anchor pattern we are enforcing, and matching inside a doc comment would
    // flag the documentation as a violation of itself. String contents are left
    // alone so a `<a>` inside a template literal is still inspected.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
      .replace(/(^|[^:\\])\/\/[^\n]*/g, (_m, p1: string) => p1);

    const lines = code.split(/\r?\n/);

    lines.forEach((line, i) => {
      // `<a` anywhere on the line, but not `<abbr` / `<article` / etc.
      if (!/(?:^|\W)<a[\s/>]/.test(line)) return;

      // Take the whole element so multi-line anchors are judged as a unit.
      const start = i;
      let depth = 0;
      let element = "";
      for (let j = i; j < lines.length; j++) {
        element += lines[j]! + "\n";
        depth += (lines[j]!.match(/<a[\s>]/g) ?? []).length;
        depth -= (lines[j]!.match(/<\/a>/g) ?? []).length;
        if (depth <= 0 && element.includes("</a>")) break;
      }

      const href = element.match(/href=\{?["'`]([^"'`]+)["'`}]/)?.[1] ?? "";
      if (!/^https?:\/\//i.test(href)) return;

      const rel = element.match(/rel="([^"]*)"/)?.[1] ?? "";
      const target = element.match(/target="([^"]*)"/)?.[1] ?? "";

      if (target !== "_blank" || !/\bnoopener\b/.test(rel)) {
        offenders.push(
          `${file.slice(ADMIN.length + 1)}:${start + 1} ` +
            `target=${target || "(none)"} rel=${rel || "(none)"} -> ${href}`,
        );
      }
    });
  }

  assert.deepEqual(
    offenders,
    [],
    "external admin links must be target=\"_blank\" with rel=\"noopener noreferrer\".\n" +
      "Use <ExternalLink> from components/admin/ExternalLink.tsx instead of a raw <a>.\n\n" +
      offenders.join("\n"),
  );
});
