/**
 * The console menu is grouped, and the grouping is real.
 *
 * Eleven screens were folded into four rows: sources + categories, live +
 * notices + polls, content + comment moderation, and the three-inbox row. The
 * folding is only correct if three things stay true together:
 *
 *   1. every tab in a section is an existing route (a tab that 404s is worse than
 *      a separate menu row),
 *   2. the sidebar no longer lists those siblings separately, and
 *   3. opening a sibling highlights the row that owns it — including the
 *      dashboard, whose `/admin` href is a prefix of every console URL and used
 *      to light itself up on all twenty screens.
 *
 * These checks read the source, so they fail the build rather than the operator.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const read = (rel: string): string =>
  fs.readFileSync(path.join(ROOT, rel), "utf8");

const sections = read("apps/web/src/components/admin/ui/sections.ts");
const shell = read("apps/web/src/components/admin/AdminShell.tsx");

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

/** Pull `{ href, label }` pairs out of a section block. */
function tabsOf(constName: string): string[] {
  const start = sections.indexOf(constName);
  assert.ok(start > 0, `${constName} exists`);
  const end = sections.indexOf("} as const", start);
  const block = sections.slice(start, end);
  return [...block.matchAll(/href: "(\/admin[^"]*)"/g)].map((m) => m[1]!);
}

const TAXONOMY = tabsOf("TAXONOMY_SECTION");
const PROGRAM = tabsOf("PROGRAM_SECTION");
const MODERATION = tabsOf("MODERATION_SECTION");
const INBOX = tabsOf("INBOX_SECTION");

check(
  "four sections, every one of them a group of at least two screens",
  () => {
    for (const [name, tabs] of [
      ["taxonomy", TAXONOMY],
      ["program", PROGRAM],
      ["moderation", MODERATION],
      ["inbox", INBOX],
    ] as const) {
      assert.ok(
        tabs.length >= 2,
        `${name} groups at least two screens (${tabs.length})`,
      );
    }
  },
);

check("every tab points at a page that exists", () => {
  for (const href of [...TAXONOMY, ...PROGRAM, ...MODERATION, ...INBOX]) {
    const dir = path.join(
      ROOT,
      "apps/web/src/app/admin/(console)",
      href.replace("/admin/", ""),
    );
    assert.ok(
      fs.existsSync(path.join(dir, "page.tsx")),
      `${href} has a page.tsx`,
    );
  }
});

check("each screen in a section renders the strip, with itself marked", () => {
  for (const [tabs, constName, label] of [
    [TAXONOMY, "TAXONOMY_SECTION", "TAXONOMY"],
    [PROGRAM, "PROGRAM_SECTION", "PROGRAM"],
    [MODERATION, "MODERATION_SECTION", "MODERATION"],
    [INBOX, "INBOX_SECTION", "INBOX"],
  ] as const) {
    for (const href of tabs) {
      const file = path.join(
        ROOT,
        "apps/web/src/app/admin/(console)",
        href.replace("/admin/", ""),
        "page.tsx",
      );
      const src = fs.readFileSync(file, "utf8");
      assert.match(src, /SectionTabs/, `${href} renders the tab strip`);
      assert.ok(src.includes(constName), `${href} uses ${label}'s own tabs`);
      assert.ok(
        src.includes(`current="${href}"`),
        `${href} marks itself as current`,
      );
    }
  }
});

const navStart = shell.indexOf("const NAV_GROUPS:");
const navEnd = shell.indexOf("const NAV: NavItem[] = NAV_GROUPS");
const navBlock = shell.slice(navStart, navEnd);
/** Sidebar rows, in menu order. */
const ROWS = new Set(
  [...navBlock.matchAll(/href: "(\/admin[^"]*)"/g)].map((m) => m[1]!),
);
/** The row that owns each group — the only member that is a menu row. */
const OWNERS = [TAXONOMY, PROGRAM, MODERATION, INBOX].map(
  (tabs) => tabs.filter((href) => ROWS.has(href))[0],
);

check("the sidebar lists each section once, not its siblings", () => {
  for (const [i, tabs] of [TAXONOMY, PROGRAM, MODERATION, INBOX].entries()) {
    const owned = tabs.filter((href) => ROWS.has(href));
    assert.equal(
      owned.length,
      1,
      `${tabs[0]}'s group has exactly one sidebar row (${owned.length})`,
    );
    assert.equal(owned[0], OWNERS[i], `${tabs[0]}'s row is the first tab`);
  }
});

check("a sibling screen highlights the row that owns its group", () => {
  for (const [i, tabs] of [TAXONOMY, PROGRAM, MODERATION, INBOX].entries()) {
    const owner = OWNERS[i]!;
    for (const href of tabs.filter((h) => h !== owner)) {
      assert.ok(
        shell.includes(`"${href}": "${owner}"`),
        `${href} maps to ${owner} for the active row`,
      );
    }
  }
});

check(
  "the dashboard matches exactly, so it cannot own every console URL",
  () => {
    assert.match(
      shell,
      /if \(n\.href === "\/admin"\) return here === "\/admin";/,
    );
    // And the helper that maps a path to its owner must use the same predicate,
    // or `/admin/categories` is claimed by the dashboard before the map is read.
    assert.match(shell, /NAV\.some\(\(n\) => rowOwns\(n, path\)\)/);
  },
);

check("a grouped row still counts every queue it hides", () => {
  assert.match(
    shell,
    /countKeys: \["pending_review", "approved", "pending_comments"\]/,
  );
  assert.match(
    shell,
    /countKeys: \["new_submissions", "open_removals", "open_reports"\]/,
  );
});

check("card and list views are a URL parameter, not client state", () => {
  for (const route of ["sources", "categories"]) {
    const src = read(`apps/web/src/app/admin/(console)/${route}/page.tsx`);
    assert.match(src, /searchParams/, `${route} reads the view from the URL`);
    assert.match(src, /view === "card"/, `${route} switches on ?view=card`);
    assert.match(src, /ViewToggle/, `${route} offers the switch`);
    assert.match(
      src,
      /variant=\{grid \? "card" : "row"\}/,
      `${route} hands the variant down`,
    );
  }
  // The row components keep their editing behaviour in both variants.
  for (const comp of ["SourceRow", "CategoryRow"]) {
    const src = read(`apps/web/src/components/admin/${comp}.tsx`);
    assert.match(
      src,
      /variant\?: "row" \| "card"/,
      `${comp} supports both variants`,
    );
    assert.equal(
      (src.match(/setEditing\(true\)/g) ?? []).length,
      1,
      `${comp} has one edit button, not one per variant`,
    );
  }
});

console.log(`\nadmin sections: ${passed} checks passed`);
