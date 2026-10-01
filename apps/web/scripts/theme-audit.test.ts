import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Resolve repo-relative paths from this file so `pnpm test` works from any cwd. */
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Regression guard for the admin console's light theme.
 *
 * Admin components were authored against a dark surface using raw
 * `text-white` / `bg-white` / `border-ink` utilities. `globals.css` carries a
 * light-theme island block that remaps those onto dark ink, but the block and
 * the components drifted apart: any utility the block forgot kept rendering as
 * literal white on a now-light console, and the text on it vanished.
 *
 * This fails the build if a component uses one of those families at an opacity
 * the light block does not cover, so the gap cannot silently reopen.
 */

// Strip CSS escapes up front so both sides compare as plain class names.
const css = fs.readFileSync(path.join(APP, "src/app/globals.css"), "utf8").replace(/\\/g, "");
const lightBlock = css.slice(css.indexOf("ADMIN CONSOLE"));
if (!lightBlock) throw new Error("light-theme admin block not found in globals.css");

const FAM =
  "text-white|text-ink|text-paper|bg-white|bg-ink|bg-panel|bg-paper|border-white|border-ink";

const covered = new Set(
  [...lightBlock.matchAll(new RegExp(`\\.(${FAM})(?:\\/[0-9]+|\\[[^\\]]+\\])?`, "g"))].map((m) =>
    m[0].slice(1),
  ),
);

/**
 * `text-paper` is deliberately uncovered: it only ever sits on a `bg-ink` or
 * `bg-alizarin` fill, which stays dark in both themes, so light-on-dark is
 * already correct and remapping it would break those badges.
 */
const INTENTIONAL = new Set(["text-paper"]);

const roots = [path.join(APP, "src/components/admin"), path.join(APP, "src/app/admin")];
const used = new Map();
for (const root of roots) {
  for (const entry of fs.readdirSync(root, { recursive: true })) {
    const f = String(entry);
    if (!f.endsWith(".tsx")) continue;
    const text = fs.readFileSync(path.join(root, f), "utf8");
    for (const m of text.matchAll(new RegExp(`(${FAM})(?:\\/[0-9]+|\\[[^\\]]+\\])?`, "g"))) {
      if (!used.has(m[0])) used.set(m[0], path.join(root, f).replace(/\\/g, "/").replace(APP, "apps/web"));
    }
  }
}

const uncovered = [...used.entries()]
  .filter(([cls]) => !covered.has(cls) && !INTENTIONAL.has(cls))
  .map(([cls, file]) => `  ${cls}  (${file})`)
  .sort();

if (uncovered.length > 0) {
  console.error(
    "\n[web] these admin utilities have no light-theme override, so they render\n" +
      "       as literal white on a light console and take their text with them:\n" +
      uncovered.join("\n") +
      "\n       Add each to the ADMIN CONSOLE — LIGHT THEME block in globals.css.\n",
  );
  process.exit(1);
}

console.log(`[web] theme audit: ${used.size} admin colour utilities all covered in light theme`);
