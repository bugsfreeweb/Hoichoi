import { desc, ilike, inArray, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { SEED_POSTS } from "@/lib/content";
import { resolvePostImage } from "@/lib/images";

export const dynamic = "force-dynamic";

interface Hit {
  slug: string;
  title: string;
  dek: string;
  category: string;
  image: string;
  readMinutes: number;
  publishedAt: string;
}

const clip = (v: string, n: number) => v.slice(0, n);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = clip((searchParams.get("q") ?? "").trim(), 80);
  const slugs = (searchParams.get("slugs") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);

  try {
    let rows;
    if (slugs.length) {
      rows = await db.select().from(posts).where(inArray(posts.slug, slugs));
    } else if (q) {
      const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      rows = await db
        .select()
        .from(posts)
        .where(or(ilike(posts.title, like), ilike(posts.dek, like), ilike(posts.category, like), sql`${posts.tags}::text ilike ${like}`))
        .orderBy(desc(posts.publishedAt))
        .limit(12);
    } else {
      rows = await db.select().from(posts).orderBy(desc(posts.publishedAt)).limit(5);
    }
    const hits: Hit[] = rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      dek: r.dek,
      category: r.category,
      image: resolvePostImage(r.slug, r.categorySlug, r.image),
      readMinutes: r.readMinutes,
      publishedAt: r.publishedAt.toISOString(),
    }));
    return NextResponse.json({ ok: true, hits });
  } catch {
    // database unavailable: search the bundled stories instead of failing
    const needle = q.toLowerCase();
    const pool = SEED_POSTS.filter((p) =>
      slugs.length ? slugs.includes(p.slug) : !needle || [p.title, p.dek, p.category, p.tags.join(" ")].join(" ").toLowerCase().includes(needle),
    ).slice(0, slugs.length ? 30 : needle ? 12 : 5);
    return NextResponse.json({
      ok: true,
      hits: pool.map((p) => ({
        slug: p.slug,
        title: p.title,
        dek: p.dek,
        category: p.category,
        image: resolvePostImage(p.slug, p.categorySlug),
        readMinutes: p.readMinutes,
        publishedAt: p.publishedAt,
      })),
    });
  }
}
