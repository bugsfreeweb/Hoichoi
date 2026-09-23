/**
 * Remote media storage adapter — GitHub repository.
 *
 * When STORAGE_ADAPTER=github is set, every processed image/video is uploaded
 * to a GitHub repository (via the GitHub REST API). The web app can then serve
 * the media via the public raw URL. Old blobs are pruned by Git automatically
 * (or via a scheduled GitHub Actions workflow).
 *
 * Env (set in the runner environment, e.g. the desktop vault):
 *   STORAGE_ADAPTER=github
 *   GITHUB_TOKEN             → PAT with repo scope (written by `git credential fill`)
 *   GITHUB_REPO              → owner/name, e.g. hoichoi/content
 *   GITHUB_BRANCH            → branch to upload to (default: main)
 *   GITHUB_MEDIA_PATH        → path within the repo, e.g. media/ (default: media/)
 *   GITHUB_ENABLE_COMMITS    → if "true", each upload creates a commit with a timestamp message
 *
 * The adapter is intentionally simple — no branch protection, no PRs, just
 * direct pushes. It is meant for a controlled runner environment where the
 * same machine that processes media also pushes to the repo.
 */
import { readFile } from "node:fs/promises";
import { localMediaPath } from "@hoichoi/db";

interface GitHubConfig {
  enabled: boolean;
  token: string;
  repo: string;
  branch: string;
  mediaPath: string;
  baseUrl: string | null;
}

/** Derive the GitHub raw URL for a media rel path. */
function githubMediaUrl(rel: string, cfg: GitHubConfig): string {
  const base = cfg.baseUrl ?? `https://cdn.jsdelivr.net/gh/${cfg.repo}@${cfg.branch}`;
  return `${base}/${cfg.mediaPath}${rel}`;
}

const github: GitHubConfig = (() => {
  const adapter = process.env.STORAGE_ADAPTER;
  if (adapter !== "github") return { enabled: false, token: "", repo: "", branch: "main", mediaPath: "media/", baseUrl: null, };

  const token = process.env.GITHUB_TOKEN ?? "";
  const repo = process.env.GITHUB_REPO ?? "";
  const branch = process.env.GITHUB_BRANCH ?? "main";
  const mediaPath = process.env.GITHUB_MEDIA_PATH ?? "media/";
  const baseUrl = process.env.GITHUB_CDN_URL ?? null; // e.g. jsDelivr CDN URL

  const enabled = Boolean(adapter === "github" && token && repo);
  return {
    enabled,
    token,
    repo,
    branch,
    mediaPath,
    baseUrl,
  };
})();

export function remoteStorageEnabled(): boolean {
  return github.enabled;
}

/**
 * Upload a local media file (rel path under the media root) to GitHub.
 * Returns the public URL when configured, else null.
 */
export async function uploadRemote(rel: string): Promise<string | null> {
  if (!github.enabled || !github.token) return null;

  const body = await readFile(localMediaPath(rel));
  const path = `${github.mediaPath}${rel}`;
  const sha = await getGitSha(path); // helper below

  const headers: Record<string, string> = {
    "Authorization": `token ${github.token}`,
    "Accept": "application/vnd.github+json",
  };

  const apiUrl = `https://api.github.com/repos/${github.repo}/contents/${path}`;

  try {
    // If the file already exists, get its SHA for an update; otherwise create.
    let response;
    if (sha) {
      response = await fetch(apiUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify({ message: `media: ${rel} · ${new Date().toISOString()}`, sha }),
      });
    } else {
      response = await fetch(apiUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify({ message: `media: ${rel} · ${new Date().toISOString()}` }),
      });
    }
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`GitHub upload failed: ${response.status} ${err}`);
    }
    // Return the public raw URL.
    return githubMediaUrl(rel, github);
  } catch (e) {
    // If GitHub is not reachable or rate-limited, fall back to the local path.
    return null;
  }
}

/** Get the current file SHA from GitHub, or null if the file doesn't exist. */
async function getGitSha(rel: string): Promise<string | null> {
  if (!github.token) return null;
  const path = `${github.mediaPath}${rel}`;
  const apiUrl = `https://api.github.com/repos/${github.repo}/contents/${path}`;
  const res = await fetch(apiUrl, {
    headers: {
      "Authorization": `token ${github.token}`,
      "Accept": "application/vnd.github+json",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = (await res.json()) as { sha: string };
  return data.sha;
}

/** True when the pipeline should try to push media to GitHub. */
export function githubStorageEnabled(): boolean {
  return github.enabled;
}