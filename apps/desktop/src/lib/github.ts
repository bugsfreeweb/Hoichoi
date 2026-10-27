import sodium from "libsodium-wrappers";
import { getCredential } from "./vault";

/**
 * GitHub does not allow Actions secrets whose name starts with `GITHUB_`, so
 * the dedicated media credentials are mirrored under `MEDIA_*` names and the
 * workflow maps them back to the env var the runner reads.
 */
export function actionsSecretName(envName: string): string {
  if (envName === "GITHUB_TOKEN" || envName === "GITHUB_PAT") return "MEDIA_GITHUB_TOKEN";
  if (envName === "GITHUB_MEDIA_REPOS") return "MEDIA_GITHUB_REPOS";
  return envName;
}

/** GitHub Actions secrets API — mirror desktop keys to the cron mirror. */
export async function getGithubCredentials() {
  const pat = await getCredential("github_pat");
  const repo = await getCredential("github_repo");
  return { pat, repo };
}

async function api<T>(path: string, pat: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.github.com/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`.slice(0, 300));
  return res.json() as Promise<T>;
}

export async function pushGithubSecret(name: string, value: string): Promise<void> {
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
    body: JSON.stringify({ encrypted_value: sodium.to_base64(cipher), key_id: pub.key_id }),
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
  const res = await api<{ secrets?: Array<{ name: string; updated_at: string }> }>(
    `repos/${repo}/actions/secrets?per_page=100`,
    pat,
  );
  return res.secrets ?? [];
}