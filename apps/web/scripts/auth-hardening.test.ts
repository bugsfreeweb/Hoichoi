import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, sep } from "node:path";

/**
 * Auth hardening guards.
 *
 * Two live defects are pinned here because both are "a guard line is missing"
 * bugs: `tsc` cannot see them, they have no visible symptom in the UI, and each
 * one hands an unauthenticated stranger a production power.
 *
 * 1. `POST /api/auth/login` used to insert an `admin_users` row with
 *    `role = 'admin'` for *any* email whose one-time code validated. The only
 *    brake was `ADMIN_ALLOWED_EMAILS`, checked later in `currentUser()` — and
 *    skipped entirely when the variable was unset. One leaked code therefore
 *    became a superuser account. Account creation must be gated on the invite
 *    list at *creation* time, and the eligibility check must happen before the
 *    code is consumed.
 *
 * 2. `GET /api/revalidate` was guarded by
 *    `if (expectedSecret && secret !== expectedSecret)`, i.e. it failed *open*:
 *    with `REVALIDATE_SECRET` unset (the state of this repo's env) any anonymous
 *    request could flush the whole site cache.
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(here, "..", "src", "app", rel), "utf8");

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

const login = read("api/auth/login/route.ts");
const revalidate = read("api/revalidate/route.ts");

/** Code only — a comment that *describes* the old guard must not satisfy (or
 *  break) an assertion about the guard, which is exactly how the theme audit
 *  once failed on its own documentation. */
const stripComments = (src: string) =>
  src
    .split(/\r?\n/)
    .filter(
      (line) =>
        !line.trim().startsWith("//") &&
        !line.trim().startsWith("*") &&
        !line.trim().startsWith("/*"),
    )
    .join("\n");

check("login: account creation is gated on the invite list", () => {
  assert.match(login, /ADMIN_ALLOWED_EMAILS/, "login must read ADMIN_ALLOWED_EMAILS");
  assert.match(
    login,
    /!existing\s*&&\s*!invited/,
    "login must refuse an email that is neither provisioned nor invited",
  );
  // The refusal must not reveal whether the address is an admin.
  const refusal = login.slice(login.indexOf("!existing && !invited"));
  assert.match(refusal, /GENERIC_ERROR/, "the uninvited refusal must use the generic error");
});

check("login: eligibility is checked before the code is consumed", () => {
  const inviteCheck = login.indexOf("!existing && !invited");
  const consume = login.indexOf("await consumeAdminLoginCode");
  assert.ok(inviteCheck > -1 && consume > -1, "both steps must exist");
  assert.ok(
    inviteCheck < consume,
    "the invite check must run BEFORE consumeAdminLoginCode so a wrong attempt cannot burn a real code",
  );
});

check("login: no implicit superuser — only the bootstrap account is role admin", () => {
  assert.match(login, /bootstrap\s*\?\s*"admin"\s*:\s*"editor"/, "new invited accounts must start as editor");
  assert.ok(
    !/INSERT OR IGNORE INTO admin_users[\s\S]{0,400}?'admin',\s*\n?\s*new Date/.test(login),
    "the insert must not hardcode the admin role",
  );
});

check("revalidate: fails closed when the secret is not configured", () => {
  assert.match(revalidate, /configuredSecret/, "revalidate must read the secret through one helper");
  assert.match(revalidate, /status:\s*503/, "an unconfigured secret must return 503");
  const revalidateCode = stripComments(revalidate);
  assert.ok(
    !/if\s*\(\s*expectedSecret\s*&&/.test(revalidateCode),
    "the old `expected && mismatch` fail-open guard must be gone",
  );
  assert.match(revalidate, /timingSafeEqual/, "the secret comparison must be constant-time");
});

const auth = readFileSync(join(here, "..", "src", "lib", "auth.ts"), "utf8");
const authCode = stripComments(auth);

check("auth: session lifetime comes from the policy module, not a 365-day literal", () => {
  assert.match(authCode, /session-policy/, "auth.ts must import the session policy");
  assert.match(authCode, /sessionState\(/, "auth.ts must classify sessions with sessionState()");
  assert.match(authCode, /nextExpiry\(/, "auth.ts must compute expiry with nextExpiry()");
  assert.match(
    authCode,
    /SESSION_MAX_AGE_MS = 30 \* 24/,
    "the cookie lifetime constant must be 30 days (the device-id cookie keeps its own, longer life)",
  );
  assert.match(
    authCode,
    /maxAge: SESSION_MAX_AGE_MS \/ 1000/,
    "the session cookie must use the 30-day constant",
  );
});

check("auth: logout revokes the row instead of deleting it", () => {
  assert.match(
    authCode,
    /UPDATE admin_sessions SET revoked_at/,
    "logout must stamp revoked_at so a stolen copy of the cookie stops working and the history survives",
  );
  assert.ok(
    !/DELETE FROM admin_sessions WHERE token_hash = \?[\s\S]{0,40}store\.delete/.test(authCode),
    "logout must not fall back to a silent DELETE",
  );
});

check("auth: ip and user agent are hashed before storage", () => {
  assert.match(authCode, /hashValue\(/, "device metadata must go through hashValue()");
  assert.ok(!/args: \[[^\]]*ip[^\]]*\]/.test(authCode), "raw ip must not be bound as a session argument");
});

/* ---------- role enforcement (C6) ---------- */

function routeFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...routeFiles(full));
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

const API = join(here, "..", "src", "app", "api");
const allRoutes = routeFiles(API);
const guardedRoles = new Map<string, string>();
for (const file of allRoutes) {
  const src = stripComments(readFileSync(file, "utf8"));
  const match = /requireApiRole\("(admin|editor|moderator)"\)/.exec(src);
  if (match) guardedRoles.set(file.slice(API.length + 1).split(sep).join("/"), match[1]!);
}

check("every admin API route declares a minimum role", () => {
  const missing = allRoutes
    .filter((f) => f.includes(join("api", "admin") + sep))
    .map((f) => f.slice(API.length + 1).split(sep).join("/"))
    .filter((rel) => !guardedRoles.has(rel));
  assert.deepEqual(missing, [], `admin routes without requireApiRole(): ${missing.join(", ")}`);
});

check("destructive and credential routes require the admin role", () => {
  const expected: Record<string, string> = {
    "admin/purge/route.ts": "admin",
    "admin/archive/delete/route.ts": "admin",
    "admin/mail/route.ts": "admin",
    "admin/maintenance/route.ts": "admin",
    "admin/login-log/route.ts": "admin",
    "providers/route.ts": "admin",
    "providers/[id]/route.ts": "admin",
    "reset/route.ts": "admin",
    "import/route.ts": "admin",
    "export/route.ts": "admin",
    "settings/route.ts": "admin",
  };
  for (const [rel, role] of Object.entries(expected)) {
    assert.equal(guardedRoles.get(rel), role, `${rel} must require "${role}", got "${guardedRoles.get(rel)}"`);
  }
});

check("a route that imports the guard actually calls it", () => {
  const liars = allRoutes
    .filter((f) => /requireApiRole/.test(readFileSync(f, "utf8")) && !/requireApiRole\("/.test(readFileSync(f, "utf8")))
    .map((f) => f.slice(API.length + 1).split(sep).join("/"));
  assert.deepEqual(liars, [], `imported but never called: ${liars.join(", ")}`);
});

check("the provider list is not readable without an admin session", () => {
  const src = stripComments(readFileSync(join(API, "providers", "route.ts"), "utf8"));
  const get = /export async function GET\(\)([\s\S]*?)\n}/.exec(src);
  assert.ok(get, "providers GET must exist");
  assert.match(get[1]!, /requireApiRole\("admin"\)/, "providers GET must require the admin role");
});

check("editorial writes require at least the editor role", () => {
  for (const rel of ["posts/[id]/route.ts", "sources/route.ts", "notices/route.ts", "moderation/[postId]/route.ts"]) {
    const role = guardedRoles.get(rel);
    assert.ok(role === "editor" || role === "admin", `${rel} must require editor or admin, got "${role}"`);
  }
});

/* ---------- rate limiting (C5) ---------- */

check("high-abuse public endpoints are throttled", () => {
  const expected: Record<string, string> = {
    "auth/login/route.ts": "LIMITS.loginIp",
    "comments/route.ts": "LIMITS.comment",
    "report-content/route.ts": "LIMITS.report",
    "submit-page/route.ts": "LIMITS.submission",
    "polls/[id]/route.ts": "LIMITS.pollVote",
    "track/route.ts": "LIMITS.track",
    "platform-ads/event/route.ts": "LIMITS.adEvent",
  };
  for (const [rel, spec] of Object.entries(expected)) {
    const src = stripComments(readFileSync(join(API, rel), "utf8"));
    assert.ok(src.includes(spec), `${rel} must consume ${spec}`);
    assert.ok(src.includes("limitRequest("), `${rel} must call limitRequest()`);
  }
});

check("login is throttled per account as well as per address", () => {
  const src = stripComments(readFileSync(join(API, "auth", "login", "route.ts"), "utf8"));
  assert.ok(src.includes("LIMITS.loginIp"), "login must consume the per-IP budget");
  assert.match(src, /limitRequest\(req, \{ \.\.\.LIMITS\.loginAccount, discriminator: body\.email \}\)/);
});

check("the limiter answers 429 with a retry hint", () => {
  const src = stripComments(readFileSync(join(here, "..", "src", "lib", "rate-limit.ts"), "utf8"));
  assert.match(src, /status: 429/);
  assert.match(src, /"retry-after"/);
  assert.match(src, /try \{/, "the limiter must be wrapped in try/catch so infrastructure failure cannot 500 the site");
});

/* ---------- audit trail (C7) ---------- */

check("every privileged mutation writes an audit row", () => {
  const mustAudit = [
    "posts/[id]/route.ts",
    "posts/[id]/media/route.ts",
    "providers/route.ts",
    "providers/[id]/route.ts",
    "settings/route.ts",
    "admin/purge/route.ts",
    "admin/maintenance/route.ts",
    "admin/archive/delete/route.ts",
    "admin/mail/route.ts",
    "admin/login-log/route.ts",
    "admin/sections/route.ts",
    "admin/sessions/route.ts",
    "import/route.ts",
    "moderation/[postId]/route.ts",
    "sources/route.ts",
    "notices/route.ts",
  ];
  const missing: string[] = [];
  for (const rel of mustAudit) {
    const src = readFileSync(join(API, rel), "utf8");
    if (!/(audit\(|INSERT INTO admin_actions)/.test(src)) missing.push(rel);
  }
  assert.deepEqual(missing, [], `mutations with no audit row: ${missing.join(", ")}`);
});

check("the audit helper never takes secrets and never throws", () => {
  const src = readFileSync(join(here, "..", "src", "lib", "audit.ts"), "utf8");
  assert.match(src, /try \{/, "audit() must be wrapped so a storage failure cannot fail the action");
  assert.match(src, /createHmac/, "the stored IP must be hashed, not raw");
  assert.ok(!/api_key|apiKey|password/i.test(src), "no credential field may be written to the trail");
});

/* ---------- credential expiry (C4) ---------- */

check("the credential cron fails closed and warns once per day", () => {
  const src = stripComments(readFileSync(join(API, "cron", "credentials", "route.ts"), "utf8"));
  assert.match(src, /CRON_SECRET/, "the job must require CRON_SECRET");
  assert.match(src, /status: 503/, "an unconfigured secret must refuse to run, not send mail");
  assert.match(src, /markNotified/, "a successful send must stamp last_notified_at so retries do not spam");
});

check("credential routes are role-guarded and audited", () => {
  const src = stripComments(readFileSync(join(API, "admin", "credentials", "route.ts"), "utf8"));
  assert.match(src, /requireApiRole\("admin"\)/, "writes must require the admin role");
  assert.match(src, /action: "credential\.save"/, "saving a credential must be audited");
});

check("no credential route accepts a secret value", () => {
  const src = readFileSync(join(API, "admin", "credentials", "route.ts"), "utf8");
  assert.ok(!/api_key|apiKey|password|secret_value/i.test(src), "only a name and an expiry date may be stored");
});

console.log(`[web] auth-hardening: ${passed} checks passed`);
