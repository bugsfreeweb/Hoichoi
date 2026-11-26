/**
 * The code-scanning panel is a bridge between two systems, and the failure modes
 * are all silent: an admin-only route that every editor can call, a badge that
 * never reaches the bell, a desk banner that hides the alert number, or a token
 * read from the wrong environment variable. These checks read the real sources.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../../../..");
let passed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  if (!existsSync(path)) throw new Error(`missing file: ${rel}`);
  return readFileSync(path, "utf8");
}

check("the API is admin-only and refreshes on request", () => {
  const src = read("apps/web/src/app/api/admin/security-alerts/route.ts");
  if (!src.includes('requireApiRole("admin")'))
    throw new Error("no admin guard");
  if (!src.includes('searchParams.get("refresh") === "1"'))
    throw new Error("no refresh path");
  if (!src.includes("cache-control"))
    throw new Error("a stale cache could hide a fixed alert");
});

check("an admin can dismiss an alert without leaving the console", () => {
  const route = read("apps/web/src/app/api/admin/security-alerts/route.ts");
  if (!route.includes("export async function POST"))
    throw new Error("no dismiss action");
  if (!route.includes('user.role !== "admin"')) throw new Error("not admin-only");
  if (!route.includes("security.alert_dismiss"))
    throw new Error("a dismissal is not audited");
  const lib = read("apps/web/src/lib/github-alerts.ts");
  if (!lib.includes("dismissCodeAlert")) throw new Error("no GitHub writer");
  if (!lib.includes('state: "dismissed"'))
    throw new Error("wrong GitHub state");
  if (!lib.includes('"false positive"') || !lib.includes('"used in tests"'))
    throw new Error("dismiss reasons are incomplete");
  if (!lib.includes("cache = null"))
    throw new Error("a stale open count would survive the dismissal");
  const panel = read("apps/web/src/components/admin/SecurityAlertsPanel.tsx");
  if (!panel.includes("Dismiss on GitHub"))
    throw new Error("the panel has no dismiss control");
  if (!panel.includes("does not fix the code"))
    throw new Error("the panel does not say dismissal is not a fix");
});

check("the GitHub reader accepts both security and trigger tokens", () => {
  const src = read("apps/web/src/lib/github-alerts.ts");
  for (const name of ["GH_SECURITY_TOKEN", "GH_TRIGGER_TOKEN", "GH_REPO"]) {
    if (!src.includes(name)) throw new Error(`missing ${name}`);
  }
  if (!src.includes("code-scanning/alerts?state=open&per_page=100")) {
    throw new Error("wrong endpoint or unbounded page");
  }
  if (!src.includes("security_severity_level"))
    throw new Error("ignores the security severity");
});

check("the web panel explains the fix and links to the alert", () => {
  const src = read("apps/web/src/components/admin/SecurityAlertsPanel.tsx");
  if (!src.includes("FIX_HINT")) throw new Error("no rule-to-action mapping");
  if (!src.includes("a.htmlUrl")) throw new Error("an alert cannot be opened");
  if (!src.includes("?refresh=1"))
    throw new Error("no explicit refresh");
  if (!src.includes("GH_SECURITY_TOKEN"))
    throw new Error("unconfigured state does not say what to add");
  // A single backslash in a JS string is dropped by the runtime: the hint then
  // reads "s{0,64}", which is not a regex. It must be written escaped.
  if (!src.includes('\\s{0,64}'))
    throw new Error("the ReDoS hint lost its backslash");
});

check("the bell carries the count for admins only", () => {
  const src = read("apps/web/src/app/api/admin/notifications/route.ts");
  if (!src.includes("securityAlerts()"))
    throw new Error("bell never reads the alerts");
  if (!src.includes('user.role === "admin"'))
    throw new Error("editors can see repository findings");
  if (!src.includes("security_alerts")) throw new Error("no urgent row key");
  if (!src.includes("/admin/security#code-alerts"))
    throw new Error("row does not lead to the panel");
});

check("the desk shows the same findings without a new token", () => {
  const gh = read("apps/desktop/src/lib/github.ts");
  if (!gh.includes("listCodeScanningAlerts"))
    throw new Error("desk has no reader");
  if (!gh.includes("code-scanning/alerts?state=open&per_page=100"))
    throw new Error("wrong endpoint");
  const banner = read("apps/desktop/src/components/SecurityBanner.tsx");
  if (!banner.includes("listCodeScanningAlerts"))
    throw new Error("banner is not wired");
  if (!banner.includes("openAdmin(safeHttpUrl(a.htmlUrl)"))
    throw new Error("alert link cannot open");
  const app = read("apps/desktop/src/App.tsx");
  if (!app.includes("<SecurityBanner />"))
    throw new Error("banner is not mounted");
  const notifier = read("apps/desktop/src/components/Notifier.tsx");
  if (!notifier.includes("listCodeScanningAlerts"))
    throw new Error("no native notification");
  if (!notifier.includes("seenSecurity"))
    throw new Error("the same alert can ring twice");
});

console.log(`\nsecurity-alerts: ${passed} checks passed`);
