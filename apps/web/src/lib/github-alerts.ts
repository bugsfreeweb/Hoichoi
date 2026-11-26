/**
 * Open code-scanning alerts, read from the repository they belong to.
 *
 * The console already shows what is happening inside the newsroom; this is the
 * one signal that lives outside it. A dismissed alert and a fixed alert look the
 * same on the site, so the only honest source is GitHub's own API.
 *
 * Auth: `GH_SECURITY_TOKEN` (a PAT/fine-grained token with "Code scanning
 * alerts: read"), falling back to `GH_TRIGGER_TOKEN`, which usually carries the
 * same repository scope. `GH_REPO` names the repository. A deployment without a
 * token is not broken — it reports `configured: false` and the panel explains
 * what to add.
 */

export type AlertSeverity =
  "critical" | "high" | "medium" | "low" | "warning" | "note";

export interface CodeAlert {
  number: number;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  path: string;
  startLine: number;
  title: string;
  description: string;
  htmlUrl: string;
  createdAt: string;
}

export interface SecurityAlerts {
  ok: boolean;
  configured: boolean;
  repo: string | null;
  open: number;
  bySeverity: Record<string, number>;
  alerts: CodeAlert[];
  fetchedAt: string;
  cached: boolean;
  truncated: boolean;
  error?: string;
}

type Cache = { repo: string; at: number; value: SecurityAlerts };

let cache: Cache | null = null;
const CACHE_MS = 5 * 60_000;
const TIMEOUT_MS = 6_000;

function token(): string {
  return (
    process.env.GH_SECURITY_TOKEN?.trim() ||
    process.env.GH_TRIGGER_TOKEN?.trim() ||
    ""
  );
}

function repoName(): string | null {
  const repo = process.env.GH_REPO?.trim();
  return repo && /^[\w.-]+\/[\w.-]+$/.test(repo) ? repo : null;
}

/** Security severity first; the rule's error/warning is the fallback. */
function severityOf(raw: {
  rule?: { security_severity_level?: string | null; severity?: string | null };
}): AlertSeverity {
  const security = (raw.rule?.security_severity_level ?? "").toLowerCase();
  if (
    security === "critical" ||
    security === "high" ||
    security === "medium" ||
    security === "low"
  ) {
    return security;
  }
  const rule = (raw.rule?.severity ?? "").toLowerCase();
  if (rule === "error") return "high";
  if (rule === "warning") return "medium";
  return "note";
}

const RANK: Record<AlertSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  warning: 4,
  note: 5,
};

interface GithubAlert {
  number?: number;
  state?: string;
  html_url?: string;
  created_at?: string;
  rule?: {
    id?: string;
    name?: string;
    description?: string;
    severity?: string | null;
    security_severity_level?: string | null;
  };
  most_recent_instance?: {
    location?: { path?: string; start_line?: number };
    message?: { text?: string };
  };
}

function normalise(raw: GithubAlert): CodeAlert {
  const severity = severityOf(raw);
  return {
    number: Number(raw.number ?? 0),
    ruleId: String(raw.rule?.id ?? "unknown"),
    ruleName: String(raw.rule?.name ?? raw.rule?.id ?? "unknown"),
    severity,
    path: String(raw.most_recent_instance?.location?.path ?? ""),
    startLine: Number(raw.most_recent_instance?.location?.start_line ?? 0),
    title: String(raw.rule?.description ?? raw.rule?.name ?? "Security alert"),
    description: String(raw.most_recent_instance?.message?.text ?? "").slice(
      0,
      500,
    ),
    htmlUrl: String(raw.html_url ?? ""),
    createdAt: String(raw.created_at ?? ""),
  };
}

function messageFor(status: number, body: string): string {
  if (status === 401)
    return "GitHub টোকেন গ্রহণ করেনি (401) — টোকেনের মেয়াদ বা স্কোপ দেখুন।";
  if (status === 403) {
    return "টোকেনে code-scanning অ্যালার্ট পড়ার অনুমতি নেই (403) — security_events / Code scanning alerts: read দিন।";
  }
  if (status === 404) {
    return "রিপোটি পাওয়া যায়নি বা CodeQL চালু নেই (404) — GH_REPO ও Code scanning সেটিংস দেখুন।";
  }
  return `GitHub API ${status}: ${body.slice(0, 180)}`;
}

/**
 * Fetch open alerts. Successful responses are cached for five minutes because
 * the header poll and the security page read the same list; a failure is never
 * cached, so a corrected token takes effect on the next request.
 */
export async function securityAlerts(
  opts: { refresh?: boolean } = {},
): Promise<SecurityAlerts> {
  const now = Date.now();
  const repo = repoName();
  const tokenValue = token();

  if (!repo || !tokenValue) {
    return {
      ok: false,
      configured: false,
      repo,
      open: 0,
      bySeverity: {},
      alerts: [],
      fetchedAt: new Date().toISOString(),
      cached: false,
      truncated: false,
      error: !repo
        ? "GH_REPO সেট করা নেই (যেমন bugsfreeweb/Hoichoi)।"
        : "GH_SECURITY_TOKEN বা GH_TRIGGER_TOKEN সেট করা নেই।",
    };
  }

  if (
    !opts.refresh &&
    cache &&
    cache.repo === repo &&
    now - cache.at < CACHE_MS
  ) {
    return { ...cache.value, cached: true };
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/code-scanning/alerts?state=open&per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${tokenValue}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "Hoichoi-Admin",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        configured: true,
        repo,
        open: 0,
        bySeverity: {},
        alerts: [],
        fetchedAt: new Date().toISOString(),
        cached: false,
        truncated: false,
        error: messageFor(res.status, body),
      };
    }

    const rows = (await res.json()) as GithubAlert[];
    const alerts = rows
      .filter((r) => (r.state ?? "open") === "open")
      .map(normalise)
      .sort((a, b) => {
        const bySev = RANK[a.severity] - RANK[b.severity];
        if (bySev !== 0) return bySev;
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      });
    const bySeverity: Record<string, number> = {};
    for (const a of alerts)
      bySeverity[a.severity] = (bySeverity[a.severity] ?? 0) + 1;

    const value: SecurityAlerts = {
      ok: true,
      configured: true,
      repo,
      open: alerts.length,
      bySeverity,
      alerts,
      fetchedAt: new Date().toISOString(),
      cached: false,
      truncated: rows.length >= 100,
    };
    cache = { repo, at: now, value };
    return value;
  } catch (e) {
    return {
      ok: false,
      configured: true,
      repo,
      open: 0,
      bySeverity: {},
      alerts: [],
      fetchedAt: new Date().toISOString(),
      cached: false,
      truncated: false,
      error: e instanceof Error ? e.message : "GitHub-এ পৌঁছানো যায়নি।",
    };
  }
}

export type DismissReason = "false positive" | "won't fix" | "used in tests";

export const DISMISS_REASONS: readonly DismissReason[] = [
  "false positive",
  "won't fix",
  "used in tests",
];

export interface DismissResult {
  ok: boolean;
  error?: string;
}

/**
 * Dismiss one code-scanning alert on GitHub.
 *
 * This is an operator decision, not a fix. GitHub keeps the alert in its
 * dismissed state with the reason and comment, and the next read drops it from
 * the open list, so the console and the bell agree with the repository.
 */
export async function dismissCodeAlert(input: {
  number: number;
  reason: DismissReason;
  comment?: string;
}): Promise<DismissResult> {
  const repo = repoName();
  const tokenValue = token();
  if (!repo || !tokenValue) {
    return {
      ok: false,
      error: !repo
        ? "GH_REPO সেট করা নেই।"
        : "GH_SECURITY_TOKEN বা GH_TRIGGER_TOKEN সেট করা নেই।",
    };
  }
  if (!Number.isInteger(input.number) || input.number <= 0) {
    return { ok: false, error: "অ্যালার্ট নম্বর সঠিক নয়।" };
  }
  if (!DISMISS_REASONS.includes(input.reason)) {
    return { ok: false, error: "dismiss করার কারণ সঠিক নয়।" };
  }
  const comment = (input.comment ?? "").trim().slice(0, 280);

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/code-scanning/alerts/${input.number}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenValue}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "Hoichoi-Admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          state: "dismissed",
          dismissed_reason: input.reason,
          ...(comment ? { dismissed_comment: comment } : {}),
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 403) {
        return {
          ok: false,
          error:
            "টোকেনে Code scanning alerts লেখার অনুমতি নেই (403) — fine-grained টোকেনে Code scanning alerts: write দিন।",
        };
      }
      if (res.status === 404) {
        return {
          ok: false,
          error: "অ্যালার্টটি পাওয়া যায়নি বা ইতিমধ্যে বন্ধ (404)।",
        };
      }
      if (res.status === 422) {
        return {
          ok: false,
          error: `GitHub কারণটি গ্রহণ করেনি (422): ${body.slice(0, 160)}`,
        };
      }
      return {
        ok: false,
        error: `GitHub API ${res.status}: ${body.slice(0, 180)}`,
      };
    }

    cache = null;
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "GitHub-এ পৌঁছানো যায়নি।",
    };
  }
}
