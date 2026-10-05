import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Resolve repo-relative paths from this file so `pnpm test` works from any cwd. */
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Two guards for the admin console's light theme.
 *
 * Admin components were authored against a dark surface using raw
 * `text-white` / `bg-white` / `border-ink` utilities. `globals.css` carries a
 * light-theme island block that remaps those onto dark ink. That block and the
 * components drifted apart twice, in two different ways:
 *
 *  1. COVERAGE — a utility the block forgot kept rendering as literal white on
 *     a now-light console and took its text with it.
 *  2. CONTRAST — even a covered utility could be illegible, because the remap
 *     inlined the same alpha as `rgba(26,20,13,N)`. Inverting white to black
 *     while keeping the transparency turned every "muted" step into grey mush:
 *     `text-white/35` measured 2.20:1 and `text-white/40` 2.51:1, against a
 *     4.5:1 WCAG AA floor. Presence alone would never have caught that, which
 *     is why the sticky header looked broken while every class was "covered".
 *
 * So this checks coverage AND measures the composite colour of every light
 * theme text rule against the console surface.
 */

// Strip CSS escapes up front so both sides compare as plain class names.
const css = fs.readFileSync(path.join(APP, "src/app/globals.css"), "utf8").replace(/\\/g, "");

const lightStart = css.indexOf("LIGHT THEME");
if (lightStart < 0) throw new Error("light-theme admin block not found in globals.css");
const lightBlock = css.slice(css.lastIndexOf("/*", lightStart));

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
const used = new Map<string, string>();
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

/* ---------------- contrast gate ---------------- */

const hex = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const composite = (
  rgb: [number, number, number],
  bg: [number, number, number],
  a: number,
): [number, number, number] =>
  rgb.map((c, i) => Math.round(c * a + (bg[i] ?? 0) * (1 - a))) as [number, number, number];

const channel = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (rgb: [number, number, number]): number =>
  0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
const contrast = (a: [number, number, number], b: [number, number, number]): number => {
  const sorted = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((sorted[0] ?? 0) + 0.05) / ((sorted[1] ?? 0) + 0.05);
};

/** The console background set by `html[data-theme="light"] .admin-console`. */
const SURFACE: [number, number, number] = hex("#f3eee1");
const MIN = 4.5;

const measured: { cls: string; ratio: number }[] = [];

/**
 * Inverse utilities: these are painted on a saturated/dark fill that stays that
 * way in both themes, so "dark ink on the light console" is the wrong question
 * to ask about them. Map each to the background it actually sits on and measure
 * there instead of silently exempting them — `text-night/60` used to measure
 * 1.00:1 against the page and would otherwise hide behind an exemption.
 */
const INVERSE: Record<string, [number, number, number]> = {
  // `text-night` / `text-night/60` are the label and count on a `bg-white` pill
  // (the active queue tab). `bg-white` remaps to dark ink under the light theme,
  // so these sit on #1a140d — not on lime, which is the other `text-night` use.
  "text-night": hex("#1a140d"),
  "text-night/60": hex("#1a140d"),
  // `text-paper` only ever sits on `bg-ink`, which stays dark in both themes.
  "text-paper": hex("#1a140d"),
};

// Parse the block into (selector, declarations) rules. Only rules whose colour
// lands on the element itself are measured: a selector carrying a `bg-` compound
// (`.bg-alizarin .text-white`) is white-on-red, and a `:` compound
// (`.hover\:text-white:hover`, `::placeholder`) is not the resting state. Neither
// should be judged as if it painted the bare console surface.
//
// The lookbehind anchors each selector to the previous rule's closing brace
// without consuming it — a consumed `}` would make every other rule invisible to
// the scan and silently under-report how many rules were checked.
const RULES = /(?<=[}])\s*([^{}]+?)\s*\{([^{}]*)\}/g;
for (const m of lightBlock.matchAll(RULES)) {
  const selector = m[1];
  const body = m[2];
  if (!selector || !body) continue;
  if (selector.includes(":") || /\.bg-/.test(selector)) continue;

  const textClasses = [...selector.matchAll(/\.(text-[a-z-]+(?:\/[\d.]+)?)/g)].map((x) => x[1]!);
  if (textClasses.length !== 1) continue; // compound groups like `.a .text-white, .b .text-x`
  const cls = textClasses[0]!;

  const value = body.match(/color:\s*([^};]+)/)?.[1];
  if (!value) continue;
  let rgb: [number, number, number];
  let alpha = 1;
  const fn = value.match(/rgba?\(([^)]+)\)/);
  if (fn) {
    const parts = fn[1]!.split(",").map((s) => parseFloat(s));
    alpha = parts.length > 3 ? parts[3]! : 1;
    rgb = [parts[0]!, parts[1]!, parts[2]!];
  } else if (value.trim().startsWith("#")) {
    rgb = hex(value.trim());
  } else {
    continue; // var(--…) or a keyword: not statically checkable, skip.
  }

  const against = INVERSE[cls] ?? SURFACE;
  const painted = alpha === 1 ? rgb : composite(rgb, against, alpha);
  measured.push({ cls, ratio: contrast(painted, against) });
}

const illegible = measured.filter((m) => m.ratio < MIN).sort((a, b) => a.ratio - b.ratio);
if (illegible.length > 0) {
  console.error(
    `\n[web] these light-theme text colours fall under the ${MIN}:1 WCAG AA floor\n` +
      "       against the #f3eee1 admin console, so they read as grey mush:\n" +
      illegible
        .map((m) => `  ${m.cls.padEnd(22)} ${m.ratio.toFixed(2)}:1`)
        .join("\n") +
      "\n       Use a solid ink that measures >= 4.5:1 instead of rgba(26,20,13,N).\n",
  );
  process.exit(1);
}

const worst = measured.reduce((a, b) => (a.ratio <= b.ratio ? a : b));
console.log(
  `[web] theme audit: ${used.size} admin colour utilities covered, ` +
    `${measured.length} light-theme text rules readable ` +
    `(lowest ${worst.cls} ${worst.ratio.toFixed(2)}:1)`,
);

/* ---------------- accent token gate ---------------- */

/**
 * The coverage check above can only see utilities that the light block overrides
 * by name. Accent text (`text-lime`, `text-amberx`, ...) is a Tailwind class
 * bound to a `--color-*` variable, so it resolves through a token — and tokens
 * are exactly what the contrast parser skips as "not statically checkable".
 *
 * That gap was not theoretical. `text-lime` shipped at 3.34:1 and `text-amberx`
 * at 4.33:1 against the light console across ~48 admin call sites, and
 * `text-sky-300` / `text-rose-300` / `text-cat-blue` had no light value at all,
 * so they kept their bright-on-dark values on a light background. Both themes
 * were affected: `--color-cat-blue` was 2.6:1 on the dark panels.
 *
 * So resolve the tokens each theme actually applies to the console and measure
 * them against that theme's own surface.
 */
const ACCENT_TOKENS: Record<string, string> = {
  "text-lime": "--color-lime",
  "text-amberx": "--color-amberx",
  "text-alizarin": "--color-alizarin",
  "text-sky-300": "--color-sky-300",
  "text-sky-400": "--color-sky-400",
  "text-rose-300": "--color-rose-300",
  "text-rose-400": "--color-rose-400",
  "text-cat-blue": "--color-cat-blue",
  "text-cat-teal": "--color-cat-teal",
};

const ACCENT = Object.keys(ACCENT_TOKENS).join("|");

/** Collects `--name: #hex;` declarations from the given css scopes, last wins. */
function tokensIn(...scopes: string[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const scope of scopes) {
    for (const m of scope.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-f]{6})\s*;/gi)) {
      out.set(m[1]!, m[2]!);
    }
  }
  return out;
}

const ruleBody = (selector: string, from = 0): string => {
  const at = css.indexOf(selector, from);
  if (at < 0) return "";
  const open = css.indexOf("{", at);
  if (open < 0) return "";
  return css.slice(open + 1, css.indexOf("}", open));
};

// The console blocks are more specific than :root and appear later in the sheet,
// so a token declared in both resolves to the console's own value.
//
// Dark mode needs both sources: `html[data-theme="dark"]` carries the brand
// palette, and `.admin-console {` later in the file re-declares the few tokens
// the console needs its own value for. Searching for `.admin-console {` from the
// top would land on the light block instead, whose selector also contains that
// substring — hence the explicit start offset.
const DARK_CONSOLE = css.indexOf("ADMIN CONSOLE (dark");
const rootTokens = tokensIn(ruleBody(":root"));
const lightConsoleTokens = tokensIn(ruleBody('html[data-theme="light"] .admin-console'));
const darkConsoleTokens = tokensIn(
  ruleBody('html[data-theme="dark"]'),
  ruleBody(".admin-console {", DARK_CONSOLE),
);

const THEMES = [
  {
    name: "light",
    surface: SURFACE,
    tokens: new Map([...rootTokens, ...lightConsoleTokens]),
  },
  {
    name: "dark",
    surface: hex("#0f131a"),
    tokens: new Map([...rootTokens, ...darkConsoleTokens]),
  },
];

const accentUsed = new Set<string>();
for (const root of roots) {
  for (const entry of fs.readdirSync(root, { recursive: true })) {
    const f = String(entry);
    if (!f.endsWith(".tsx")) continue;
    const text = fs.readFileSync(path.join(root, f), "utf8");
    for (const m of text.matchAll(new RegExp(`(${ACCENT})\\b`, "g"))) accentUsed.add(m[1]!);
  }
}

const accentProblems: string[] = [];
for (const theme of THEMES) {
  for (const cls of [...accentUsed].sort()) {
    const token = ACCENT_TOKENS[cls]!;
    const value = theme.tokens.get(token);
    if (!value) {
      accentProblems.push(
        `  ${theme.name.padEnd(5)} ${cls.padEnd(18)} ${token} is never defined in this theme`,
      );
      continue;
    }
    const ratio = contrast(hex(value), theme.surface);
    if (ratio < MIN) {
      accentProblems.push(
        `  ${theme.name.padEnd(5)} ${cls.padEnd(18)} ${value} on ${theme.name} console = ${ratio.toFixed(2)}:1`,
      );
    }
  }
}

if (accentProblems.length > 0) {
  console.error(
    `\n[web] these admin accent text colours resolve through a --color-* token, so\n` +
      `       the checks above cannot see them, and they fall under the ${MIN}:1 floor\n` +
      `       against their own theme's console surface:\n` +
      accentProblems.join("\n") +
      "\n       Re-declare the token on .admin-console (and its light counterpart).\n",
  );
  process.exit(1);
}

const accentWorst = THEMES.flatMap((theme) =>
  [...accentUsed]
    .map((cls) => {
      const value = theme.tokens.get(ACCENT_TOKENS[cls]!);
      return value
        ? { cls: `${theme.name}/${cls}`, ratio: contrast(hex(value), theme.surface) }
        : null;
    })
    .filter((x): x is { cls: string; ratio: number } => x !== null),
).reduce((a, b) => (a.ratio <= b.ratio ? a : b));

console.log(
  `[web] accent tokens: ${accentUsed.size} classes x ${THEMES.length} themes ` +
    `readable (lowest ${accentWorst.cls} ${accentWorst.ratio.toFixed(2)}:1)`,
);

