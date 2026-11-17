/**
 * A bell you cannot read is a bell that does not ring.
 *
 * Measured on the console: every alert rendered its full body, so eight events
 * made the dropdown taller than the viewport, and the only action was "mark all
 * read" — so the panel grew monotonically and stopped meaning "something needs
 * you now". These checks pin the shape of the fix: compact rows, body on demand,
 * per-item dismissal, and a clear that never throws away something unread without
 * being asked to.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string): string => fs.readFileSync(path.join(APP, rel), "utf8");

/** Source with comments stripped: a comment may describe markup it does not do. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed++;
  console.log(`  ok ${name}`);
}

const bell = code(read("src/components/admin/NotificationBell.tsx"));
const list = code(read("src/components/admin/NotificationList.tsx"));
const api = code(read("src/app/api/admin/notifications/route.ts"));
const db = code(
  fs.readFileSync(
    path.resolve(APP, "../../packages/db/src/admin-notifications.ts"),
    "utf8",
  ),
);

check("the alert body is not rendered until the row is opened", () => {
  assert.match(bell, /expanded === a\.id|isOpen/, "rows must have an open state");
  assert.match(bell, /aria-expanded=\{isOpen\}/, "and say so to a screen reader");
  // The body appears inside the open branch only.
  const openBlock = bell.slice(bell.indexOf("{isOpen &&"), bell.indexOf("</div>", bell.indexOf("{isOpen &&")));
  assert.match(openBlock, /a\.body_bn/, "the body belongs to the expanded block");
});

check("the title is clamped to one line, so rows cannot stack into a wall", () => {
  assert.match(bell, /truncate/, "the bell's title line must truncate");
  assert.match(list, /text-\[13px\] font-semibold/, "the full list keeps one title line too");
});

check("the panel is bounded and scrolls instead of growing", () => {
  assert.match(bell, /max-h-\[/, "the alert list needs a maximum height");
  assert.match(bell, /overflow-y-auto/, "and its own scroll");
});

check("one alert can be dismissed, not just dimmed", () => {
  assert.match(bell, /method: "DELETE"/, "the bell must call the delete endpoint");
  assert.match(list, /method: "DELETE"/, "and so must the full list");
  assert.match(api, /export async function DELETE/, "which has to exist");
  assert.match(db, /export async function dismissNotification/, "and delete the row");
});

check("clearing removes only what has been read unless asked otherwise", () => {
  assert.match(db, /DELETE FROM admin_notifications WHERE read_at IS NOT NULL/, "the default is read rows");
  assert.match(api, /includeUnread === true/, "wiping unread is an explicit choice");
  assert.match(bell, /clear: true/, "the bell exposes the default");
});

check("there is a page for the alerts the bell cannot hold", () => {
  const page = read("src/app/admin/(console)/notifications/page.tsx");
  assert.match(page, /listNotifications/, "it reads the same table");
  assert.match(page, /limit: 50/, "with room for more than the bell's eight");
  assert.match(bell, /href="\/admin\/notifications"/, "and the bell links to it");
});

check("the bell keeps one poll, so badge and panel cannot disagree", () => {
  assert.match(bell, /useQueueCounts\(\)/);
  assert.match(bell, /refresh\(\)/);
});

check("severity is a dot plus a word, never colour alone", () => {
  assert.match(bell, /SEVERITY_STYLE/, "the bell carries a colour map");
  assert.match(list, /label: "জরুরি"|label: "সতর্কতা"/, "the full list names the severity in words");
  assert.match(bell, /aria-hidden="true"/, "the colour dot is decorative, not the message");
});

console.log(`\nnotify-ux: ${passed} checks passed`);
