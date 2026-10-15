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
  const p = post.media_path;
  if (!p) return null;
  if (/^https?:\/\//.test(p)) return p;
  // Already-rooted public path (e.g. a settings-provided default image at
  // `/uploads/…` or `/media/…`): use as-is. Stored media paths are always
  // relative, so this branch never changes existing behaviour.
  if (p.startsWith("/")) return p;
  return `/uploads/${p.replace(/\\/g, "/")}`;
}

/**
 * Normalise a remote/relative URL for a site-level image setting (e.g. the
 * default post image) into something an `<img>` can load: absolute http(s)
 * URLs and `/…` paths pass through; a bare filename is mapped under
 * `/uploads/`. Empty string → null.
 */
export function settingImageUrl(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v) || v.startsWith("/")) return v;
  return `/uploads/${v.replace(/\\/g, "/")}`;
}

/**
 * Stamp a default image onto a post that has none of its own, so every render
 * path (cards, hero, article detail, variant skins) shows the admin-configured
 * fallback without threading a prop through each component. Posts that already
 * carry media are returned untouched.
 */
export function withDefaultImage<T extends Pick<Post, "media_path" | "media_kind">>(
  post: T,
  fallback: string | null | undefined,
): T {
  const raw = (fallback ?? "").trim();
  if (!raw) return post;
  if (post.media_path && post.media_kind !== "none") return post;
  return { ...post, media_path: raw, media_kind: "image" };
}

/** Map {@link withDefaultImage} across a list. */
export function withDefaultImages<T extends Pick<Post, "media_path" | "media_kind">>(
  posts: T[],
  fallback: string | null | undefined,
): T[] {
  if (!fallback?.trim()) return posts;
  return posts.map((p) => withDefaultImage(p, fallback));
}
