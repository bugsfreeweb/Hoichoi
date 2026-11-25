import sodium from "libsodium-wrappers";
import { getCredential } from "./vault";

/**
 * GitHub does not allow Actions secrets whose name starts with `GITHUB_`, so
 * the dedicated media credentials are mirrored under `MEDIA_*` names and the
 * workflow maps them back to the env var the runner reads.
 */
export function actionsSecretName(envName: string): string {
  if (envName === "GITHUB_TOKEN" || envName === "GITHUB_PAT")
    return "MEDIA_GITHUB_TOKEN";
  if (envName === "GITHUB_MEDIA_REPOS") return "MEDIA_GITHUB_REPOS";
  return envName;
}

/** GitHub Actions secrets API — mirror desktop keys to the cron mirror. */
export async function getGithubCredentials() {
  const pat = await getCredential("github_pat");
  const repo = await getCredential("github_repo");
  return { pat, repo };
}

async function api<T>(
  path: string,
  pat: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`https://api.github.com/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok)
    throw new Error(
      `GitHub API ${res.status}: ${await res.text()}`.slice(0, 300),
    );
  return res.json() as Promise<T>;
}

export async function pushGithubSecret(
  name: string,
  value: string,
): Promise<void> {
  const { pat, repo } = await getGithubCredentials();
  if (!pat || !repo) throw new Error("GitHub PAT/repo not configured");
  await sodium.ready;
  const pub = await api<{ key: string; key_id: string }>(
    `repos/${repo}/actions/secrets/public-key`,
    pat,
  );
  const key = sodium.from_base64(pub.key, sodium.base64_variants.ORIGINAL);
  const valueBytes = sodium.from_string(value);
  const cipher = sodium.crypto_box_seal(valueBytes, key);
  await api(`repos/${repo}/actions/secrets/${name}`, pat, {
    method: "PUT",
    body: JSON.stringify({
      encrypted_value: sodium.to_base64(cipher),
      key_id: pub.key_id,
    }),
  });
}

/**
 * Names of the Actions secrets that actually exist in the repository, with the
 * time each was last written.
 *
 * The desk's cron cannot run without these, and a vault value only reaches the
 * workflow if the GitHub push succeeded. Showing the real list is the only way
 * to tell "I typed the hook URL" apart from "the hook URL reached GitHub".
 */
export async function listGithubSecrets(): Promise<
  Array<{ name: string; updated_at: string }>
> {
  const { pat, repo } = await getGithubCredentials();
  if (!pat || !repo) throw new Error("GitHub PAT/repo not configured");
  const res = await api<{
    secrets?: Array<{ name: string; updated_at: string }>;
  }>(`repos/${repo}/actions/secrets?per_page=100`, pat);
  return res.secrets ?? [];
}
/* ------------------------------------------------------------ code scanning */

export type CodeAlertSeverity =
  "critical" | "high" | "medium" | "low" | "warning" | "note";

export interface CodeScanningAlert {
  number: number;
  ruleId: string;
  ruleName: string;
  severity: CodeAlertSeverity;
  path: string;
  startLine: number;
  title: string;
  description: string;
  htmlUrl: string;
  createdAt: string;
}

export interface CodeScanningResult {
  repo: string;
  open: number;
  bySeverity: Record<string, number>;
  alerts: CodeScanningAlert[];
  truncated: boolean;
}

interface RawAlert {
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

function alertSeverity(raw: RawAlert): CodeAlertSeverity {
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

const ALERT_RANK: Record<CodeAlertSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  warning: 4,
  note: 5,
};

/**
 * Open code-scanning alerts, read with the same repository credentials the desk
 * already uses for Actions secrets. This is a direct GitHub call from the
 * operator's machine, so no security token has to be deployed to the web app for
 * the desk to show the list.
 */
export async function listCodeScanningAlerts(): Promise<CodeScanningResult> {
  const { pat, repo } = await getGithubCredentials();
  if (!pat || !repo) throw new Error("GitHub PAT/repo not configured");
  const rows = await api<RawAlert[]>(
    `repos/${repo}/code-scanning/alerts?state=open&per_page=100`,
    pat,
  );
  const alerts = rows
    .filter((r) => (r.state ?? "open") === "open")
    .map<CodeScanningAlert>((raw) => ({
      number: Number(raw.number ?? 0),
      ruleId: String(raw.rule?.id ?? "unknown"),
      ruleName: String(raw.rule?.name ?? raw.rule?.id ?? "unknown"),
      severity: alertSeverity(raw),
      path: String(raw.most_recent_instance?.location?.path ?? ""),
      startLine: Number(raw.most_recent_instance?.location?.start_line ?? 0),
      title: String(
        raw.rule?.description ?? raw.rule?.name ?? "Security alert",
      ),
      description: String(raw.most_recent_instance?.message?.text ?? "").slice(
        0,
        500,
      ),
      htmlUrl: String(raw.html_url ?? ""),
      createdAt: String(raw.created_at ?? ""),
    }))
    .sort((a, b) => {
      const bySeverity = ALERT_RANK[a.severity] - ALERT_RANK[b.severity];
      if (bySeverity !== 0) return bySeverity;
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
  const bySeverity: Record<string, number> = {};
  for (const a of alerts)
    bySeverity[a.severity] = (bySeverity[a.severity] ?? 0) + 1;
  return {
    repo,
    open: alerts.length,
    bySeverity,
    alerts,
    truncated: rows.length >= 100,
  };
}
