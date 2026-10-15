import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { postComments, posts, sections as sectionsTable, siteSettings } from "@/db/schema";
import { SEED_POSTS } from "@/lib/content";
import { resolvePostImage } from "@/lib/images";
import { SECTIONS, PRESETS, ACCENTS } from "@/lib/registry";
import { DEFAULT_BRAND } from "@/lib/settings";
import { renumber } from "@/lib/order";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.select().from(sectionsTable).orderBy(asc(sectionsTable.position));
    const brandRows = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
    const postCount = await db.select({ n: posts.id }).from(posts).limit(1);
    return NextResponse.json({
      ok: true,
      db: true,
      sections: renumber(rows),
      brand: brandRows[0]?.brand ?? DEFAULT_BRAND,
      motion: brandRows[0]?.motion ?? true,
      seeded: postCount.length > 0,
      meta: { sections: SECTIONS, presets: PRESETS, accents: ACCENTS },
    });
  } catch {
    return NextResponse.json({
      ok: true,
      db: false,
      sections: SECTIONS.map((s, i) => ({
        key: s.key,
        scope: s.scope,
        zone: s.zone,
        label: s.label,
        labelEn: s.labelEn,
        description: s.description,
        variant: s.defaultVariant,
        visible: s.defaultVisible,
        position: i,
        config: {},
      })),
      brand: DEFAULT_BRAND,
      motion: true,
      seeded: false,
      meta: { sections: SECTIONS, presets: PRESETS, accents: ACCENTS },
    });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === "reset" ? "reset" : "ensure";
  try {
    const existing = await db.select().from(sectionsTable);
    const existingKeys = new Set(existing.map((e) => e.key));
    const defaults = SECTIONS.map((s, i) => ({
      key: s.key,
      scope: s.scope,
      zone: s.zone,
      label: s.label,
      labelEn: s.labelEn,
      description: s.description,
      variant: s.defaultVariant,
      visible: s.defaultVisible,
      position: i,
      config: {},
    }));

    if (mode === "reset") {
      await db.delete(sectionsTable);
      await db.insert(sectionsTable).values(defaults);
    } else {
      const missing = defaults.filter((d) => !existingKeys.has(d.key));
      if (missing.length) await db.insert(sectionsTable).values(missing);
    }

    // make positions unique (older databases have duplicates, which breaks reordering)
    const current = await db.select().from(sectionsTable);
    for (const row of renumber(current)) {
      const before = current.find((c) => c.key === row.key);
      if (before && before.position !== row.position) {
        await db.update(sectionsTable).set({ position: row.position }).where(eq(sectionsTable.key, row.key));
      }
    }

    const brandRow = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
    if (!brandRow.length) {
      await db
        .insert(siteSettings)
        .values({ id: 1, brand: DEFAULT_BRAND as unknown as Record<string, unknown>, motion: true });
    }

    const postCount = await db.select({ id: posts.id }).from(posts);
    let insertedPosts = 0;
    if (!postCount.length) {
      for (const p of SEED_POSTS) {
        await db.insert(posts).values({
          slug: p.slug,
          hash: p.hash,
          title: p.title,
          titleEn: p.titleEn,
          dek: p.dek,
          rawFeed: p.rawFeed,
          category: p.category,
          categorySlug: p.categorySlug,
          source: p.source,
          sourceUrl: p.sourceUrl,
          author: p.author,
          location: p.location,
          image: resolvePostImage(p.slug, p.categorySlug),
          tags: p.tags,
          body: p.body as unknown as Array<Record<string, unknown>>,
          keyPoints: p.keyPoints,
          timeline: p.timeline as unknown as Array<Record<string, unknown>>,
          facts: p.facts as unknown as Array<Record<string, unknown>>,
          metrics: p.metrics as unknown as Record<string, unknown>,
          factScore: p.factScore,
          views: p.views,
          shares: p.shares,
          comments: p.comments,
          readMinutes: p.readMinutes,
          featured: p.featured,
          publishedAt: new Date(p.publishedAt),
        });
        insertedPosts += 1;
      }
    }

    const existingComments = await db.select({ id: postComments.id }).from(postComments).limit(1);
    if (!existingComments.length) {
      await db.insert(postComments).values([
        {
          postSlug: "mrbeast-4-35e7b1",
          author: "মৌসুমি আক্তার",
          body: "মূল পোস্ট আর প্রতিবেদনের তথ্য আলাদা করে দেখানো হয়েছে—এতে খবরটি বুঝতে সুবিধা হলো।",
          status: "published",
        },
        {
          postSlug: "mrbeast-4-35e7b1",
          author: "রায়হান কবির",
          body: "“২০২ দিন” দাবিটি পুরো সময় বিরতিহীন ছিল কি না, সেটি আরও যাচাই করা দরকার।",
          status: "published",
        },
        {
          postSlug: "missing-child-rangpur-8d2c41",
          author: "তানিয়া রহমান",
          body: "ভাইরাল ছবিটি পুরোনো বলে চিহ্নিত করার তথ্যটি গুরুত্বপূর্ণ। যাচাই ছাড়া ছবি শেয়ার করা উচিত নয়।",
          status: "published",
        },
      ]);
    }

    return NextResponse.json({ ok: true, db: true, mode, insertedPosts });
  } catch (err) {
    return NextResponse.json(
      { ok: false, db: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 200 },
    );
  }
}
