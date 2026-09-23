import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFile } from "node:fs/promises";
import { localMediaPath } from "@hoichoi/db";

/**
 * Remote media storage adapter (Cloudflare R2, S3-compatible).
 *
 * The web app runs serverless — the scraper's local disk is unreachable from
 * `apps/web/src/app/media/[...path]`. When STORAGE_ADAPTER=r2 is set the
 * pipeline uploads every processed image/video to R2 and stores the absolute
 * public URL as the post's media_path, so the deployed web app serves real
 * media instead of falling back to the placeholder.
 *
 * Env (set in the runner environment, e.g. the desktop vault):
 *   STORAGE_ADAPTER=r2
 *   R2_ACCOUNT_ID            → used to build the S3 endpoint
 *   R2_ENDPOINT              → optional override endpoint
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_MEDIA          → bucket holding media/…
 *   R2_PUBLIC_BASE_URL       → e.g. https://media.hoichoi.dev
 */

interface R2Config {
  enabled: boolean;
  client: S3Client | null;
  bucket: string;
  publicBase: string;
}

const r2: R2Config = (() => {
  const accountId = process.env.R2_ACCOUNT_ID ?? "";
  const endpoint =
    process.env.R2_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
  const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? "";
  const bucket = process.env.R2_BUCKET_MEDIA ?? "";
  const publicBase = (process.env.R2_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
  const enabled =
    process.env.STORAGE_ADAPTER === "r2" &&
    Boolean(endpoint && accessKeyId && secretAccessKey && bucket);
  return {
    enabled,
    client: enabled
      ? new S3Client({
          region: "auto",
          endpoint,
          forcePathStyle: true,
          credentials: { accessKeyId, secretAccessKey },
        })
      : null,
    bucket,
    publicBase,
  };
})();

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".m3u8": "application/vnd.apple.mpegurl",
};

function contentType(rel: string): string {
  const m = rel.match(/\.([a-z0-9]+)$/i);
  if (!m) return "application/octet-stream";
  return CONTENT_TYPES[`.${m[1]!.toLowerCase()}`] ?? "application/octet-stream";
}

/** True when the pipeline should try to push media to R2. */
export function remoteStorageEnabled(): boolean {
  return r2.enabled;
}

/**
 * Upload a local media file (rel path under the media root) to R2. Returns the
 * absolute public URL when configured, else null (kept as a local path).
 */
export async function uploadRemote(rel: string): Promise<string | null> {
  if (!r2.enabled || !r2.client) return null;
  const keyPath = `media/${rel}`;
  const body = await readFile(localMediaPath(rel));
  await r2.client.send(
    new PutObjectCommand({
      Bucket: r2.bucket,
      Key: keyPath,
      Body: body,
      ContentType: contentType(rel),
    }),
  );
  // Without a public base URL the object still uploads; callers simply keep the
  // local rel path for same-host serving.
  return r2.publicBase ? `${r2.publicBase}/${keyPath}` : null;
}