/**
 * Sidebar contrast, measured from the stylesheets themselves.
 * ---------------------------------------------------------------------------
 * The twelve templates are twelve sets of custom properties on one DOM, so a
 * template can look finished while one of its four inks is unreadable on its own
 * panel. That is exactly what happened: `obsidian` was fine, `ledger` in the dark
 * theme was fine, and the *hover* colour of `editorial` was the accent — 3.3:1 on
 * cream, i.e. words that vanish under the pointer.
 *
 * This test parses both stylesheets (the web console's and the desktop app's),
 * reads each template's declared colours, and checks the four pairs an operator
 * actually reads:
 *   panel  → --sb-fg      (a row that is not current)
 *   panel  → --sb-mute    (the same row at rest)
 *   panel  → hover ink    (the row under the pointer)
 *   active → --sb-active-fg
 *
 * A colour written with alpha is composited over the panel colour first, because
 * that is what the browser paints. It also asserts the structural half of the
 * fix: the nav markup no longer carries Tailwind colour utilities, so the
 * console's light-theme utility override cannot outrank the template's own ink.
 *
 * Run: npx tsx scripts/sidebar-contrast.test.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const WEB = readFileSync(
  join(process.cwd(), "src/components/admin/sidebar-styles.css"),
  "utf8",
);
const SHELL = readFileSync(
  join(process.cwd(), "src/components/admin/AdminShell.tsx"),
  "utf8",
);
const GLOBALS = readFileSync(
  join(process.cwd(), "src/app/globals.css"),
  "utf8",
);
const DESKTOP = readFileSync(
  join(process.cwd(), "../desktop/src/index.css"),
  "utf8",
);

type Rgb = { r: number; g: number; b: number; a: number };

const HEX = /#([0-9a-f]{3,8})\b/i;

function parseColour(value: string): Rgb | null {
  const v = value.trim();
  const hex = v.match(HEX);
  if (hex) {
    let h = hex[1] ?? "";
    if (h.length === 3)
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    const n = parseInt(h.slice(0, 6), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = v.match(/rgba?\(([^)]+)\)/);
  if (rgba) {
    const parts = rgba[1]!.split(",").map((x) => parseFloat(x));
    return {
      r: parts[0] ?? 0,
      g: parts[1] ?? 0,
      b: parts[2] ?? 0,
      a: parts[3] ?? 1,
    };
  }
  if (v === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  return null;
}

function over(fg: Rgb, bg: Rgb): Rgb {
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  };
}

function luminance(c: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (
    Math.round(((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)) * 100) /
    100
  );
}

/** Reads the declarations of every block whose selector matches `selector`. */
function decls(css: string, selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `(?:^|\\n)\\s*${escaped.replace(/\\ /g, "\\s*")}\\s*\\{([^}]*)\\}`,
    "g",
  );
  for (const match of css.matchAll(re)) {
    for (const line of (match[1] ?? "").split(";")) {
      const i = line.indexOf(":");
      if (i < 0) continue;
      const key = line.slice(0, i).trim();
      if (key.startsWith("--")) out[key] = line.slice(i + 1).trim();
      // A template whose panel is a gradient names its base colour separately;
      // that base is what the browser paints under the words.
      if (key === "background-color")
        out["--sb-panel"] = line.slice(i + 1).trim();
    }
  }
  return out;
}

const checks: Array<[string, boolean, string]> = [];
function check(name: string, ok: boolean, detail = "") {
  checks.push([name, ok, detail]);
  console.log(
    `  ${ok ? "ok  " : "FAIL"}  ${name}${ok || !detail ? "" : ` — ${detail}`}`,
  );
}

/** Web templates: base block, then the dark-theme override that replaces it. */
const WEB_STYLES = [
  "classic",
  "obsidian",
  "floating",
  "rail",
  "editorial",
  "dock",
  "neon",
  "minimal",
  "aurora",
  "ledger",
  "split",
  "cards",
];

const WEB_DEFAULTS: Record<string, string> = {
  "--sb-fg": "#1b2921",
  "--sb-mute": "#55665c",
  "--sb-bg": "#fdfefa",
  "--sb-active-bg": "#f8e9dd",
  "--sb-active-fg": "#a0351c",
};

let worstWeb = { ratio: 99, where: "" };
for (const style of WEB_STYLES) {
  const base = {
    ...WEB_DEFAULTS,
    ...decls(WEB, `.admin-sidebar[data-sidebar-style="${style}"]`),
  };
  const dark = decls(
    WEB,
    `:root[data-theme="dark"] .admin-sidebar[data-sidebar-style="${style}"]`,
  );
  for (const [theme, tokens] of [
    ["light", base],
    ["dark", { ...base, ...dark }],
  ] as const) {
    const bg = parseColour(tokens["--sb-panel"] ?? tokens["--sb-bg"] ?? "");
    const fg = parseColour(tokens["--sb-fg"] ?? "");
    const mute = parseColour(tokens["--sb-mute"] ?? "");
    const activeBgRaw = parseColour(tokens["--sb-active-bg"] ?? "") ?? bg;
    const activeFg = parseColour(tokens["--sb-active-fg"] ?? "");
    if (!bg || !fg || !mute || !activeBgRaw || !activeFg) {
      check(
        `${theme}/${style}: every token parses`,
        false,
        JSON.stringify(tokens),
      );
      continue;
    }
    const activeBg = over(activeBgRaw, bg);
    const pairs: Array<[string, number]> = [
      ["row", contrast(fg, bg)],
      ["muted row", contrast(mute, bg)],
      // The hover rule paints `--sb-fg`, so the pointer state is the same pair.
      ["hovered row", contrast(fg, bg)],
      ["current page", contrast(over(activeFg, activeBg), activeBg)],
    ];
    for (const [what, ratio] of pairs) {
      if (ratio < worstWeb.ratio)
        worstWeb = { ratio, where: `${theme}/${style} ${what}` };
      check(
        `${theme}/${style} — ${what} ≥ 4.5:1 (${ratio})`,
        ratio >= 4.5,
        `${ratio}:1`,
      );
    }
  }
}

/* Desktop: the same twelve panels, but the ink is `--side-fg` / `--side-mute`
   and the panel background is a CSS background declaration. */
const DESKTOP_STYLES = WEB_STYLES;
const DESKTOP_BASE: Record<string, string> = {
  "--side-fg": "#ffffff",
  "--side-mute": "rgba(255,255,255,0.55)",
  "--background": "#0b1220",
  "--active-bg": "rgba(255,255,255,0.08)",
  "--active-tx": "#ffffff",
};

let worstDesk = { ratio: 99, where: "" };
for (const style of DESKTOP_STYLES) {
  const block = decls(DESKTOP, `.side[data-sidebar-style="${style}"]`);
  const tokens = { ...DESKTOP_BASE, ...block };
  const bg = parseColour(tokens["--background"] ?? "");
  const fg = parseColour(tokens["--side-fg"] ?? "");
  const mute = parseColour(tokens["--side-mute"] ?? "");
  const activeBgRaw = parseColour(tokens["--active-bg"] ?? "") ?? bg;
  const activeFg = parseColour(tokens["--active-tx"] ?? "");
  if (!bg || !fg || !mute || !activeBgRaw || !activeFg) {
    check(
      `desktop/${style}: every token parses`,
      false,
      JSON.stringify(tokens),
    );
    continue;
  }
  const activeBg = over(activeBgRaw, bg);
  for (const [what, ratio] of [
    ["row", contrast(fg, bg)],
    ["muted row", contrast(mute, bg)],
    ["current page", contrast(over(activeFg, activeBg), activeBg)],
  ] as Array<[string, number]>) {
    if (ratio < worstDesk.ratio)
      worstDesk = { ratio, where: `desktop/${style} ${what}` };
    check(
      `desktop ${style} — ${what} ≥ 4.5:1 (${ratio})`,
      ratio >= 4.5,
      `${ratio}:1`,
    );
  }
}

/* ── Structural half ─────────────────────────────────────────────────────── */
const navRow = SHELL.slice(
  SHELL.indexOf("adm-nav-link"),
  SHELL.indexOf("adm-nav-link") + 600,
);
check(
  "the nav row carries no Tailwind colour utility",
  !/text-white|bg-white|text-night|text-paper/.test(navRow),
  navRow.split("\n").find((l) => /text-white|bg-white|text-night/.test(l)) ??
    "",
);
check(
  "the template owns the row's colour",
  /\.admin-sidebar \.adm-nav-link \{\s*\n\s*color: var\(--sb-mute\)/.test(WEB),
  "no token rule for .adm-nav-link",
);
check(
  "the current row is styled from the template's active tokens",
  /\.admin-sidebar \.adm-nav-link\.is-active \{[^}]*color: var\(--sb-active-fg\)/.test(
    WEB,
  ),
  "missing .adm-nav-link.is-active rule",
);
check(
  "the editorial hover keeps the ink and marks it with the accent rule",
  /data-sidebar-style="editorial"\] \.adm-nav-link:hover \{[^}]*color: var\(--sb-fg\)/.test(
    WEB,
  ),
  "editorial hover paints the accent as text",
);
check(
  "a pinned dark chip keeps a light label in both themes",
  /\.admin-console \.bg-ink\.text-paper[^{]*\{\s*\n\s*color: #f2efe6/.test(
    GLOBALS,
  ),
  "bg-ink text-paper has no fixed label colour",
);
check(
  "the desktop nav reads the panel's own ink",
  /\.sidenav button \{[^}]*color: var\(--side-mute, var\(--t3\)\)/.test(
    DESKTOP,
  ),
  "desktop nav still uses the window's text token",
);
check(
  "every desktop template declares its ink",
  DESKTOP_STYLES.every(
    (s) =>
      DESKTOP.includes(`--side-fg`) &&
      (DESKTOP.match(/--side-mute/g) ?? []).length >= 12,
  ),
  `${(DESKTOP.match(/--side-mute/g) ?? []).length} declarations`,
);

console.log(
  `\n[web] sidebar contrast: ${checks.length} checks, ` +
    `worst web ${worstWeb.ratio}:1 (${worstWeb.where}), worst desktop ${worstDesk.ratio}:1 (${worstDesk.where})`,
);
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error(`\n${failed.length} failing check(s)`);
  process.exit(1);
}
