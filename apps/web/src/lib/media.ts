import type { Post } from "@hoichoi/shared-types";

/**
 * Media URL resolution. External URLs (e.g. mock/demo data on pexels) pass
 * through; local store paths map to the /media/… public route.
 */
export function mediaUrl(post: Pick<Post, "media_path" | "media_kind">): string | null {
  if (!post.media_path) return null;
  if (/^https?:\/\//.test(post.media_path)) return post.media_path;
  return `/media/${post.media_path.replace(/\\/g, "/")}`;
}