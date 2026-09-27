/**
 * Remote media storage — multi-adapter with fallback + monthly retention.
 *
 * Every processed image/video is pushed to the FIRST *enabled* adapter that
 * has credentials configured; if that adapter fails, the next one in the chain
 * is tried (fallback). Uploaded blobs are registered in `media_objects` so the
 * monthly cleanup job can delete old objects even after the owning `posts`
 * rows have been purged by the archive window.
 *
 * Adapters:
 *   github     — Git repository (private or public) via the contents API.
 *                Env: GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH, GITHUB_MEDIA_PATH.
 *   idrivee2   — IDrive e2 object storage (S3-compatible, SigV4).
 *                Env: IDRIVEE2_ACCESS_KEY, IDRIVEE2_SECRET_KEY, IDRIVEE2_BUCKET,
 *                     IDRIVEE2_ENDPOINT, IDRIVEE2_REGION.
 *   backblaze  — Backblaze B2 (S3-compatible, SigV4).
 *                Env: B2_ACCESS_KEY, B2_SECRET_KEY, B2_BUCKET, B2_ENDPOINT, B2_REGION.
 *
 * The adapter chain + retention policy live in `settings.media_storage_json`
 * (edited from the desktop "মিডিয়া স্টোরেজ" panel). When that list is empty
 * the legacy single-adapter setup (`STORAGE_ADAPTER=github` + vault creds)
 * still works, so existing installs keep uploading without any config step.
 */
import { createHash, createHmac } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import {
  localMediaPath,
  getMediaStorageConfig,
  recordMediaObject,
  listMediaObjects,
  deleteMediaObjectRow,
  countMediaObjects,
  type MediaObjectRow,
} from "@hoichoi/db";

type AdapterId = "github" | "idrivee2" | "backblaze";

interface ResolvedAdapter {
  id: AdapterId;
  label: string;
  enabled: boolean;
  /* github */
  token?: string;
  repo?: string;
  branch: string;
  mediaPath: string;
  baseUrl: string | null;
  /* s3-compatible */
  endpoint?: string;
  bucket?: string;
  region: string;
  prefix: string;
  accessKey?: string;
  secretKey?: string;
}

/** URL-encode a single path segment per RFC3986 (leaves `/` untouched). */
function encSeg(seg: string): string {
  return encodeURIComponent(seg);
}

/** Path-style S3 key with URI-encoded segments (safest for both providers). */
function s3CanonicalKey(key: string): string {
  return key.split("/").map(encSeg).join("/");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function signingKey(secret: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

/** Minimal AWS SigV4 signer for the S3 REST API (PUT/DELETE, path-style). */
function signS3V4(opts: {
  method: "PUT" | "DELETE";
  endpoint: string;
  bucket: string;
  key: string;
  region: string;
  accessKey: string;
  secretKey: string;
  body?: Buffer;
}): { url: string; headers: Record<string, string> } {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const service = "s3";
  const region = opts.region || "us-east-1";
  const host = opts.endpoint.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const canonicalUri = `/${opts.bucket}/${s3CanonicalKey(opts.key)}`;
  const payloadHash = opts.body ? sha256Hex(opts.body) : sha256Hex("");
  const headers: Record<string, string> = {
    host,
    "content-type": "application/octet-stream",
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  const sortedKeys = Object.keys(headers).sort();
  const canonicalHeaders = sortedKeys.map((k) => `${k}:${headers[k]}`).join("\n") + "\n";
  const signedHeaders = sortedKeys.join(";");
  const canonicalRequest = [
    opts.method,
    canonicalUri,
    "", // canonical query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
  const signature = hmac(signingKey(opts.secretKey, dateStamp, region, service), stringToSign).toString("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${opts.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const url = `${opts.endpoint.replace(/\/+$/, "")}/${opts.bucket}/${opts.key.replace(/^\/+/, "")}`;
  return { url, headers: { ...headers, Authorization: authorization } };
}

/** S3 SigV4 DELETE (body-less). */
async function s3Delete(adapter: ResolvedAdapter, key: string): Promise<void> {
  if (!adapter.endpoint || !adapter.bucket || !adapter.accessKey || !adapter.secretKey) {
    throw new Error(`${adapter.label}: S3 creds missing`);
  }
  const { url, headers } = signS3V4({
    method: "DELETE",
    endpoint: adapter.endpoint,
    bucket: adapter.bucket,
    key,
    region: adapter.region,
    accessKey: adapter.accessKey,
    secretKey: adapter.secretKey,
  });
  const res = await fetch(url, { method: "DELETE", headers, signal: AbortSignal.timeout(120_000) });
  if (!res.ok && res.status !== 404) {
    throw new Error(`${adapter.label} delete failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
}

/** Upload a buffer to S3-compatible storage; returns the public URL. */
async function s3Upload(adapter: ResolvedAdapter, key: string, body: Buffer): Promise<string> {
  if (!adapter.endpoint || !adapter.bucket || !adapter.accessKey || !adapter.secretKey) {
    throw new Error(`${adapter.label}: S3 creds missing`);
  }
  const { url, headers } = signS3V4({
    method: "PUT",
    endpoint: adapter.endpoint,
    bucket: adapter.bucket,
    key,
    region: adapter.region,
    accessKey: adapter.accessKey,
    secretKey: adapter.secretKey,
    body,
  });
  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: new Uint8Array(body),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) {
    throw new Error(`${adapter.label} upload failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  return url;
}

/* ------------------------------------------------------------------ *
 * GitHub adapter (contents API)                                       *
 * ------------------------------------------------------------------ */

interface GitHubConfig {
  token: string;
  repo: string;
  branch: string;
  mediaPath: string;
  baseUrl: string | null;
}

const legacyGithub: GitHubConfig = (() => {
  // Accept both spellings: the runner/CLI docs and Actions use GITHUB_TOKEN, the
  // desktop .env ships GITHUB_PAT. Same secret, so resolve either.
  const token = process.env.GITHUB_TOKEN ?? process.env.GITHUB_PAT ?? "";
  const repo = process.env.GITHUB_REPO ?? "";
  const branch = process.env.GITHUB_BRANCH ?? "main";
  const mediaPath = process.env.GITHUB_MEDIA_PATH ?? "media/";
  const baseUrl = process.env.GITHUB_CDN_URL ?? null;
  return { token, repo, branch, mediaPath, baseUrl };
})();

function githubMediaUrl(key: string, cfg: GitHubConfig): string {
  const base = cfg.baseUrl ?? `https://cdn.jsdelivr.net/gh/${cfg.repo}@${cfg.branch}`;
  return `${base}/${key}`;
}

async function ghApi(cfg: GitHubConfig, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`https://api.github.com/repos/${cfg.repo}${path}`, {
    ...init,
    headers: {
      Authorization: `token ${cfg.token}`,
      Accept: "application/vnd.github+json",
      ...(init?.headers ?? {}),
    },
  });
}

async function ghGetSha(cfg: GitHubConfig, repoPath: string): Promise<string | null> {
  const res = await ghApi(cfg, `/contents/${repoPath}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = (await res.json()) as { sha: string };
  return data.sha;
}

async function ghUpload(cfg: GitHubConfig, key: string, body: Buffer): Promise<string> {
  if (!cfg.token || !cfg.repo) throw new Error("GitHub: creds missing");
  const sha = await ghGetSha(cfg, key);
  // The contents API wants the file inline as base64; without it GitHub happily
  // creates a 0-byte "successful" upload, which is what the images were before.
  const payload = JSON.stringify({
    message: `media: ${key} · ${new Date().toISOString()}`,
    content: body.toString("base64"),
    encoding: "base64",
    ...(sha ? { sha } : {}),
  });
  const res = await ghApi(cfg, `/contents/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  if (!res.ok) {
    throw new Error(`GitHub upload failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  return githubMediaUrl(key, cfg);
}

async function ghDelete(cfg: GitHubConfig, key: string): Promise<void> {
  if (!cfg.token || !cfg.repo) return;
  const sha = await ghGetSha(cfg, key);
  if (!sha) return;
  const res = await ghApi(cfg, `/contents/${key}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: `media delete: ${key} · ${new Date().toISOString()}`, sha }),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`GitHub delete failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
}

/** Project a resolved adapter back onto the GitHub client config. */
function ghConfig(a: ResolvedAdapter): GitHubConfig {
  return {
    token: a.token ?? "",
    repo: a.repo ?? "",
    branch: a.branch ?? "main",
    mediaPath: a.mediaPath ?? "media/",
    baseUrl: a.baseUrl ?? null,
  };
}

/* ------------------------------------------------------------------ *
 * Adapter chain resolution                                            *
 * ------------------------------------------------------------------ */

interface ProviderEnv {
  accessKey: string;
  secretKey: string;
  bucket: string;
  endpoint: string;
  region: string;
}

const S3_PROVIDERS: Record<"idrivee2" | "backblaze", { label: string; env: ProviderEnv }> = {
  idrivee2: {
    label: "IDrive e2",
    env: {
      accessKey: "IDRIVEE2_ACCESS_KEY",
      secretKey: "IDRIVEE2_SECRET_KEY",
      bucket: "IDRIVEE2_BUCKET",
      endpoint: "IDRIVEE2_ENDPOINT",
      region: "IDRIVEE2_REGION",
    },
  },
  backblaze: {
    label: "Backblaze B2",
    env: {
      accessKey: "B2_ACCESS_KEY",
      secretKey: "B2_SECRET_KEY",
      bucket: "B2_BUCKET",
      endpoint: "B2_ENDPOINT",
      region: "B2_REGION",
    },
  },
};

function defaultRegion(provider: "idrivee2" | "backblaze", endpoint?: string): string {
  if (provider === "backblaze" && endpoint) {
    const m = /\/\/s3\.([a-z0-9-]+)\.backblazeb2\.com/.exec(endpoint);
    if (m) return m[1] ?? "us-east-1";
  }
  return "us-east-1";
}

/** Build the ordered adapter chain (settings config + vault/env creds). */
export async function buildAdapters(): Promise<ResolvedAdapter[]> {
  const cfg = await getMediaStorageConfig();
  const adapters: ResolvedAdapter[] = [];

  for (const a of cfg.adapters) {
    if (!a.enabled) continue;
    if (a.kind === "github") {
      const token = process.env.GITHUB_TOKEN ?? process.env.GITHUB_PAT ?? "";
      const repo = process.env.GITHUB_REPO ?? "";
      adapters.push({
        id: "github",
        label: a.label || "GitHub",
        enabled: Boolean(token && repo),
        token,
        repo,
        branch: a.branch ?? "main",
        mediaPath: a.mediaPath ?? "media/",
        baseUrl: null,
        region: "us-east-1",
        prefix: a.mediaPath ?? "media/",
      });
    } else if (a.provider === "idrivee2" || a.provider === "backblaze") {
      const info = (a.provider === "idrivee2" ? S3_PROVIDERS.idrivee2 : S3_PROVIDERS.backblaze)!;
      const env = info.env;
      const accessKey = process.env[env.accessKey] ?? "";
      const secretKey = process.env[env.secretKey] ?? "";
      const bucket = process.env[env.bucket] ?? "";
      const endpoint = process.env[env.endpoint] ?? (a.provider === "backblaze" ? "" : "https://www.idrivee2.com");
      adapters.push({
        id: a.provider,
        label: a.label || info.label,
        enabled: Boolean(accessKey && secretKey && bucket && endpoint),
        endpoint,
        bucket,
        region: process.env[env.region] ?? a.region ?? defaultRegion(a.provider, endpoint),
        prefix: a.prefix ?? "media/",
        accessKey,
        secretKey,
        branch: "main",
        mediaPath: "media/",
        baseUrl: null,
      });
    }
  }

  // Legacy fallback: STORAGE_ADAPTER=github (vault) with no settings chain yet.
  if (adapters.length === 0 && process.env.STORAGE_ADAPTER === "github" && legacyGithub.token && legacyGithub.repo) {
    adapters.push({
      id: "github",
      label: "GitHub",
      enabled: true,
      ...legacyGithub,
      baseUrl: legacyGithub.baseUrl,
      region: "us-east-1",
      prefix: legacyGithub.mediaPath,
    });
  }

  return adapters;
}

export function remoteStorageEnabled(): boolean {
  return Boolean(
    (process.env.STORAGE_ADAPTER === "github" && legacyGithub.token && process.env.GITHUB_REPO) ||
      process.env.B2_BUCKET ||
      process.env.IDRIVEE2_BUCKET,
  );
}

/** True when the pipeline should try to push media to GitHub. */
export function githubStorageEnabled(): boolean {
  return Boolean(process.env.STORAGE_ADAPTER === "github" && legacyGithub.token && process.env.GITHUB_REPO);
}

export function storageRegistryCount(): Promise<number> {
  return countMediaObjects();
}

/** Derive the object key for the S3 or GitHub adapter from a rel media path. */
function adapterKey(a: ResolvedAdapter, rel: string): string {
  return a.id === "github" ? `${a.mediaPath}${rel}` : `${a.prefix}${rel}`;
}

async function deleteOnAdapter(a: ResolvedAdapter, key: string): Promise<void> {
  if (a.id === "github") {
    await ghDelete(ghConfig(a), key);
  } else {
    await s3Delete(a, key);
  }
}

/**
 * Upload a local media file through the enabled adapter chain (primary first,
 * fallback on failure). Returns the public URL, or null when no upload worked.
 */
export async function uploadRemote(rel: string, postId?: string | null): Promise<string | null> {
  const adapters = (await buildAdapters()).filter((a) => a.enabled);
  if (adapters.length === 0) return null;

  const body = await readFile(localMediaPath(rel));
  let lastErr: unknown = null;
  for (const a of adapters) {
    try {
      const key = adapterKey(a, rel);
      const url =
        a.id === "github" ? await ghUpload(ghConfig(a), key, body) : await s3Upload(a, key, body);
      await recordMediaObject({ adapter: a.id, key, url, post_id: postId ?? null });
      const cfg = await getMediaStorageConfig();
      if (cfg.purge_local_after_upload) {
        await unlink(localMediaPath(rel)).catch(() => undefined);
      }
      return url;
    } catch (err) {
      lastErr = err;
    }
  }
  void lastErr;
  return null;
}

/** Delete a remote object (used by cleanup / media panel). */
export async function deleteMediaObjectRowAndBlob(row: MediaObjectRow): Promise<void> {
  const adapters = await buildAdapters();
  const target = adapters.find((a) => (a.id === "github" ? row.adapter === "github" : a.id === row.adapter));
  if (target) {
    await deleteOnAdapter(target, row.key).catch(() => undefined);
  }
  await deleteMediaObjectRow(row.id);
}

/**
 * Monthly retention: delete remote blobs registered older than the configured
 * window. `dryRun` returns the plan without touching storage or rows.
 */
export async function cleanupMedia(opts: { dryRun?: boolean; months?: number } = {}): Promise<{
  dryRun: boolean;
  considered: number;
  removed: number;
  skipped: number;
  cutoff: string;
}> {
  const cfg = await getMediaStorageConfig();
  const months = opts.months ?? (cfg.retention_months || 1);
  const cutoff = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString();
  const rows = await listMediaObjects(cutoff);
  const adapters = await buildAdapters();

  let removed = 0;
  let skipped = 0;
  for (const row of rows) {
    const target = adapters.find((a) => row.adapter === (a.id === "github" ? "github" : a.id));
    if (!target) {
      skipped += 1;
      continue;
    }
    if (opts.dryRun) continue;
    await deleteMediaObjectRowAndBlob(row);
    removed += 1;
  }
  if (!opts.dryRun) removed = rows.length - skipped;
  return { dryRun: Boolean(opts.dryRun), considered: rows.length, removed, skipped, cutoff };
}