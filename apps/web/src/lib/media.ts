import type { Post } from "@hoichoi/shared-types";

/**
 * Media URL resolution. External URLs (e.g. mock/demo data on pexels) pass
 * through; local store paths map to the /uploads/… public folder.
 *
 * `/uploads/` and not `/media/`: `app/media/[...path]/route.ts` is a route
 * handler, and in the App Router a route handler shadows a same-named file in
 * `public/`. The handler can only read this machine's disk, which a serverless
 * deployment does not have — so committed media has to live under a prefix the
 * static file server owns.
 */
export function mediaUrl(post: Pick<Post, "media_path" | "media_kind">): string | null {
  if (!post.media_path) return null;
  if (/^https?:\/\//.test(post.media_path)) return post.media_path;
  return `/uploads/${post.media_path.replace(/\\/g, "/")}`;
}