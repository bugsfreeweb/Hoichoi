import { NextRequest, NextResponse } from "next/server";
import {
  getPostById,
  listPostMediaCandidates,
  updatePost,
  getClient,
  nowIso,
} from "@hoichoi/db";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Cooldown per post so a stuck download can't be spammed into the origin CDN. */
const SYNC_COOLDOWN_MS = 20_000;

const isImage = (u: string): boolean =>
  /^https?:\/\//i.test(u) &&
  !/(?:facebook\.com\/(?:watch|reel|video|videos)|\.m3u8(?:\?|$))/i.test(u);

/**
 * GET — candidate images the collector already captured for this post.
 *
 * The admin editor shows these as one-click options instead of making an
 * operator hunt for a CDN URL by hand. `checkable` is reported per candidate so
 * the UI can grey out links that have since expired (fbcdn URLs are signed and
 * time-limited), rather than writing a dead URL into media_path.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  const { id } = await ctx.params;
  if (!(await getPostById(id))) {
    return NextResponse.json({ error: "post not found" }, { status: 404 });
  }

  const info = await listPostMediaCandidates(id);
  const candidates = info.media_urls.filter(isImage).slice(0, 12);

  // Probe in parallel and cap the work per request: these are remote origin
  // fetches, and an editor opening the panel should not trigger 12 sequential
  // multi-MB downloads.
  const probed = await Promise.all(
    candidates.map(async (url) => {
      try {
        const res = await fetch(url, {
          method: "HEAD",
          signal: AbortSignal.timeout(6000),
          headers: { "user-agent": "Mozilla/5.0 Hoichoi/1.0" },
        });
        const type = res.headers.get("content-type") ?? "";
        return {
          url,
          ok: res.ok && type.startsWith("image/"),
          status: res.status,
          contentType: type || null,
        };
      } catch {
        return { url, ok: false, status: 0, contentType: null };
      }
    }),
  );

  return NextResponse.json({
    current: info.current,
    kind: info.kind,
    source_url: info.source_url,
    candidates: probed,
  });
}

/**
 * POST — attach one of the candidate images (or any http(s) URL) to the post.
 *
 * This is the "sync" half of the image workflow: the operator confirms an
 * image, and it is written through the same validated `updatePost` path the
 * text fields use, so it lands in `admin_actions` with an audit trail.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  const { id } = await ctx.params;
  const client = getClient();
  const post = await getPostById(id);
  if (!post) return NextResponse.json({ error: "post not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { url?: unknown } | null;
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  // Cheap abuse guard: refuse a re-sync of the same post inside the cooldown so
  // a stuck client cannot turn this into a request amplifier against the origin.
  const recent = await client.execute({
    sql: `SELECT 1 FROM admin_actions
          WHERE target_table = 'posts' AND target_id = ? AND action = 'post.media'
            AND created_at > ?
          LIMIT 1`,
    args: [id, new Date(Date.now() - SYNC_COOLDOWN_MS).toISOString()],
  });
  if (recent.rows.length > 0) {
    return NextResponse.json(
      { error: `একই ছবিটি সদ্য যুক্ত হয়েছে। ${SYNC_COOLDOWN_MS / 1000} সেকেন্ড পর আবার চেষ্টা করুন।` },
      { status: 429 },
    );
  }

  let applied: string;
  try {
    await updatePost(id, { media_path: url });
    applied = url;
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  await client.execute({
    sql: "INSERT INTO admin_actions (id, admin_user_id, action, target_table, target_id, details, created_at) VALUES (?, ?, ?, 'posts', ?, ?, ?)",
    args: [
      crypto.randomUUID(),
      user.user_id,
      "post.media",
      id,
      JSON.stringify({ media_path: applied, by: user.email }),
      nowIso(),
    ],
  });

  return NextResponse.json({ ok: true, media_path: applied });
}
