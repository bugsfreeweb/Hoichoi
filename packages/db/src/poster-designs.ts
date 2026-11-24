/**
 * The poster design memory.
 *
 * Why a table and not a Redis key: the anti-repetition rule has to survive a
 * deploy, a lambda cold start and the desktop runner, and this newsroom already
 * keeps its durable state in SQLite/Turso. A row per rendered design also gives
 * the CMS a history, which is the thing an editor actually asks for ("which
 * frame did we publish this story in?").
 *
 * The scheduler only ever asks for the recent signatures; the full row is
 * written after the render succeeds, so a failed generation does not poison the
 * rotation.
 */
import { randomBytes } from "node:crypto";
import { getClient, nowIso } from "./client";

export interface PosterDesignRecord {
  id: string;
  post_id: string | null;
  layout_variant: string;
  palette_id: string;
  visual_style: string;
  texture: string | null;
  headline: string;
  media_path: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PosterDesignInput {
  postId?: string | null;
  layout: string;
  palette: string;
  visualStyle: string;
  texture?: string | null;
  headline: string;
  mediaPath?: string | null;
  createdBy?: string | null;
}

const uid = () => randomBytes(16).toString("hex");

function mapRow(row: Record<string, unknown>): PosterDesignRecord {
  return {
    id: String(row.id),
    post_id: row.post_id == null ? null : String(row.post_id),
    layout_variant: String(row.layout_variant),
    palette_id: String(row.palette_id),
    visual_style: String(row.visual_style),
    texture: row.texture == null ? null : String(row.texture),
    headline: String(row.headline),
    media_path: row.media_path == null ? null : String(row.media_path),
    created_by: row.created_by == null ? null : String(row.created_by),
    created_at: String(row.created_at),
  };
}

/** The newest design first; the anti-repetition window is the first five. */
export async function recentPosterDesigns(limit = 5): Promise<PosterDesignRecord[]> {
  const client = getClient();
  const safe = Math.max(1, Math.min(50, Math.floor(limit)));
  const res = await client.execute({
    sql: "SELECT * FROM poster_designs ORDER BY created_at DESC LIMIT ?",
    args: [safe],
  });
  return res.rows.map((r) => mapRow(r as unknown as Record<string, unknown>));
}

/** Designs for one post, newest first — the CMS history strip. */
export async function posterDesignsForPost(postId: string, limit = 10): Promise<PosterDesignRecord[]> {
  const client = getClient();
  const safe = Math.max(1, Math.min(50, Math.floor(limit)));
  const res = await client.execute({
    sql: "SELECT * FROM poster_designs WHERE post_id = ? ORDER BY created_at DESC LIMIT ?",
    args: [postId, safe],
  });
  return res.rows.map((r) => mapRow(r as unknown as Record<string, unknown>));
}

/** Write one rendered design. Never throws for a null post id. */
export async function recordPosterDesign(input: PosterDesignInput): Promise<PosterDesignRecord> {
  const client = getClient();
  const row: PosterDesignRecord = {
    id: uid(),
    post_id: input.postId ?? null,
    layout_variant: input.layout,
    palette_id: input.palette,
    visual_style: input.visualStyle,
    texture: input.texture ?? null,
    headline: input.headline,
    media_path: input.mediaPath ?? null,
    created_by: input.createdBy ?? null,
    created_at: nowIso(),
  };
  await client.execute({
    sql: "INSERT INTO poster_designs (id, post_id, layout_variant, palette_id, visual_style, texture, headline, media_path, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: [
      row.id,
      row.post_id,
      row.layout_variant,
      row.palette_id,
      row.visual_style,
      row.texture,
      row.headline,
      row.media_path,
      row.created_by,
      row.created_at,
    ],
  });
  return row;
}
