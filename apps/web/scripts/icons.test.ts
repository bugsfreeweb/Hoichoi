/**
 * One icon vocabulary, three surfaces.
 *
 * The console's navigation used emoji: twenty-one glyphs whose weight, colour and
 * rendering were chosen by the reader's operating system. The same row was a
 * colour photograph on Windows, a flat blob on Android and an outline elsewhere,
 * and none of it responded to the light theme. The desk had the opposite problem
 * — hand-drawn SVGs, each tuned at a different stroke weight, one of which was
 * literally the wrong icon ("shield" was a list).
 *
 * These checks pin the fix: a single catalogue, one component that decides size
 * and stroke weight, motion that is a transform and can be switched off, and a
 * scrollbar rule that appears only when the list genuinely does not fit.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { NAV_ICONS, isNavIconName } from "../../../packages/icons/src/catalog";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), "utf8");

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
const NAV_DATA = /icon: "([a-z]+)"/g;

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed++;
}

const shell = read("apps/web/src/components/admin/AdminShell.tsx");
const desk = read("apps/desktop/src/App.tsx");
const catalog = read("packages/icons/src/catalog.ts");
const navIcon = read("packages/icons/src/NavIcon.tsx");
const motion = read("packages/icons/src/styles.css");
const sidebarCss = read("apps/web/src/components/admin/sidebar-styles.css");

check("the console's navigation declares icons, never glyphs", () => {
  // The nav catalogue block is the only place that used to carry emoji.
  const navStart = shell.indexOf("const NAV_GROUPS:");
  const navEnd = shell.indexOf("const NAV: NavItem[] = NAV_GROUPS");
  assert.ok(navStart > 0 && navEnd > navStart, "nav catalogue found");
  const navBlock = shell.slice(navStart, navEnd);
  assert.ok(!EMOJI.test(navBlock), "no emoji left in the sidebar catalogue");
  assert.match(navBlock, /icon: "dashboard"/, "the first row names an icon");
  // Every row must carry one, or the rail renders an empty box.
  const rows = navBlock.match(/href: "\/admin[^"]*"/g) ?? [];
  const icons = navBlock.match(NAV_DATA) ?? [];
  assert.equal(icons.length, rows.length, "every nav row has exactly one icon");
});

check("every declared name resolves in the catalogue", () => {
  const declared = new Set<string>();
  for (const m of shell.matchAll(NAV_DATA)) declared.add(m[1]!);
  // The vocabulary lives in the catalogue, not in the nav row count: the sidebar
  // was cut from 15 rows to 11 when screens were grouped under tabs, and a
  // threshold tied to row count would have called the smaller menu a worse
  // vocabulary. What matters is that the catalogue is large and every name in it
  // is drawn, which the next assertion proves.
  const catalog = read("packages/icons/src/catalog.ts");
  const drawn = new Set([...catalog.matchAll(/^ {2}([a-z]+):/gm)].map((m) => m[1]!));
  assert.ok(drawn.size >= 20, `the icon catalogue is a real vocabulary (${drawn.size})`);
  assert.ok(declared.size >= 10, `the grouped menu still names ${declared.size} distinct icons`);
  for (const name of declared) {
    assert.equal(isNavIconName(name), true, `${name} is in NAV_ICONS`);
  }
});

check("the desk draws from the same catalogue, not its own paths", () => {
  // The old map was a `Record<string, React.ReactNode>` of hand-written <svg>.
  assert.ok(!/const icons: Record<string, React\.ReactNode>/.test(desk), "no private icon map");
  // Only the tab component is checked: the window's minimise/maximise/close
  // buttons are OS chrome and are correctly their own paths.
  const tabStart = desk.indexOf("function TabButton");
  const tabEnd = desk.indexOf("function MTabsButton");
  assert.ok(tabStart > 0 && tabEnd > tabStart, "tab component found");
  assert.ok(!/<svg className="ic"/.test(desk.slice(tabStart, tabEnd)), "no hand-drawn tab glyphs");
  assert.match(desk, /import \{ NavIcon, type NavIconName \} from "@hoichoi\/icons"/);
  assert.match(desk, /<NavIcon name=\{icon\}/);
  // Each row is `icon`, then the dictionary `key` it prints, then the Bangla
  // label kept for document titles and logs.
  const tabIcons = [...desk.matchAll(/icon:\s*"([a-z]+)",\s*key:\s*"[a-z.]+",\s*label:/g)].map(
    (m) => m[1]!,
  );
  assert.ok(tabIcons.length >= 9, "the tab strip still has its nine screens");
  for (const name of tabIcons) {
    assert.equal(isNavIconName(name), true, `desk tab "${name}" resolves`);
  }
});

check("size and stroke weight are decided once, not per call site", () => {
  assert.match(navIcon, /strokeWidth=\{1\.75\}/, "one stroke weight");
  assert.match(navIcon, /size=\{size\}/);
  assert.match(navIcon, /aria-hidden="true"/, "an icon never joins the accessibility tree twice");
  assert.match(navIcon, /focusable="false"/);
  // The catalogue is data only: a React component here would defeat the type check.
  assert.ok(!/<[A-Z]/.test(catalog), "no JSX in the catalogue");
});

check("the motion is a transform, and can be switched off", () => {
  assert.match(motion, /\.ic-lift/, "interactive glyphs have their own class");
  assert.match(motion, /transform: translateY\(-1px\) scale\(1\.09\)/);
  assert.match(motion, /@keyframes ic-settle/);
  assert.match(motion, /@media \(prefers-reduced-motion: reduce\)/);
  const reduced = motion.slice(motion.indexOf("@media (prefers-reduced-motion"));
  assert.match(reduced, /animation: none !important/, "no movement at all, not merely shorter");
  assert.match(reduced, /transform: none !important/);
});

check("the sidebar scrolls only when it has to, and says so with a thin bar", () => {
  assert.match(sidebarCss, /\.admin-sidebar \.adm-nav \{[^}]*scrollbar-width: thin/s);
  assert.match(sidebarCss, /::-webkit-scrollbar-thumb/);
  // A hidden bar is allowed for the icon rail only — never for the full list.
  const collapsedRule = sidebarCss.slice(sidebarCss.indexOf(".admin-sidebar.adm-collapsed .adm-nav {"));
  assert.match(collapsedRule, /scrollbar-width: none/, "the rail hides its bar");
  const fullRule = sidebarCss.slice(
    sidebarCss.indexOf(".admin-sidebar .adm-nav {"),
    sidebarCss.indexOf(".admin-sidebar.adm-collapsed .adm-nav {"),
  );
  assert.ok(!/display: none/.test(fullRule), "the full list never hides its scrollbar");
});

check("the rail is a full-height column, and the header and footer live beside it", () => {
  assert.match(shell, /admin-shell/, "the shell is the flex row");
  assert.match(shell, /sticky top-0 hidden h-dvh shrink-0 flex-col lg:flex/, "full-height rail");
  assert.match(shell, /admin-main-col flex min-w-0 flex-1 flex-col/, "one column holds header, main and footer");
  // The masthead moved into the top bar, so it must not be duplicated in the rail.
  const railStart = shell.indexOf("<SidebarNav");
  const railEnd = shell.indexOf("</aside>", railStart);
  assert.ok(!/হৈচৈ কন্ট্রোল/.test(shell.slice(railStart, railEnd)), "no second masthead in the rail");
});

console.log(`\n[web] icons: ${passed} checks passed`);
