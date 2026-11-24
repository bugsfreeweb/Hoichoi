/**
 * POST /api/generate-poster
 *
 * The dynamic poster service: one Bengali article in, one complete, unique,
 * editorial-grade 16:9 poster out.
 *
 * The pipeline is deliberately four separable steps, because each one has a
 * different failure mode and a different guarantee:
 *
 *   1. art direction  — an LLM (Gemini structured output) reads the story and
 *                       returns Bengali copy + design tokens. Best-effort: a
 *                       deterministic planner answers if the model cannot.
 *   2. focal visual   — the image model draws only the picture. It is told, and
 *                       re-told, to put no letters in it. If it fails, the
 *                       renderer draws a branded textured wash instead.
 *   3. composition    — five HTML/CSS layouts, palette variables, a seeded SVG
 *                       texture, Bengali fonts inlined, rendered by Chromium at
 *                       1920×1080 @2×. This is where Bengali stays correct.
 *   4. memory         — the rendered design is recorded and the next call reads
 *                       the last five, so consecutive posters cannot repeat a
 *                       layout/palette pair.
 *
 * Body (either an explicit article or a saved post):
 *   { postId?, title?, content?, summary?, category?, source?, publishedAt?,
 *     regenerate?, attach?, format?, inline?, brand?, site?, accent?, bg? }
 *
 * Response: JSON with the encoded image as a data URL plus its design tokens,
 * or the raw bytes when `format=image`.
 */
import { NextRequest, NextResponse } from "next/server";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  banglaDate,
  deskForCategory,
  getClient,
  getPostById,
  nowIso,
  randomMediaName,
  recentPosterDesigns,
  recordPosterDesign,
  updatePost,
} from "@hoichoi/db";
import { uploadBufferRemote, writeGeneratedMedia } from "@hoichoi/db/storage";
import {
  DESIGN_IMAGE_NEGATIVE,
  directPosterDesign,
  extensionForMime,
  generateImage,
  paletteSummary,
  type PosterArticle,
} from "@hoichoi/llm";
import {
  DESIGN_FRAME,
  DESIGN_SCALE,
  PosterBrowserUnavailable,
  focalAspectFor,
  renderDesignPoster,
} from "@hoichoi/poster";
import {
  POSTER_DESIGN_LAYOUTS,
  POSTER_PALETTES,
  POSTER_TEXTURES,
  POSTER_VISUAL_STYLES,
  isHexColor,
} from "@hoichoi/shared-types";
import { forbidden, requireApiRole } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

/** Where the local web server reads committed media from. */
function publicUploadsDir(): string {
  return path.join(process.cwd(), "public", "uploads");
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function bool(v: unknown, fallback = false): boolean {
  if (v === undefined || v === null) return fallback;
  return v === true || v === "true" || v === 1 || v === "1";
}

/** Persist bytes locally for dev and return the relative media path. */
async function writeLocalMirror(rel: string, bytes: Uint8Array): Promise<void> {
  const dir = publicUploadsDir();
  const full = path.resolve(dir, rel);
  if (!full.startsWith(path.resolve(dir))) throw new Error(`illegal media path: ${rel}`);
  await fs.promises.mkdir(path.dirname(full), { recursive: true });
  await fs.promises.writeFile(full, bytes);
}

/** GET — the vocabulary and the recent design window, for the CMS. */
export async function GET() {
  const guard = await requireApiRole("editor");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  let recent: Awaited<ReturnType<typeof recentPosterDesigns>> = [];
  try {
    recent = await recentPosterDesigns(5);
  } catch {
    /* a fresh database may not have the table until migrate runs */
  }
  return NextResponse.json({
    ok: true,
    frame: { ...DESIGN_FRAME, scale: DESIGN_SCALE },
    layouts: POSTER_DESIGN_LAYOUTS,
    palettes: POSTER_PALETTES,
    visualStyles: POSTER_VISUAL_STYLES,
    textures: POSTER_TEXTURES,
    recent,
  });
}

export async function POST(req: NextRequest) {
  const guard = await requireApiRole("editor");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const postId = str(body?.postId);

  // A saved post is the normal CMS path; an explicit article makes the route
  // usable from a webhook or a CLI without inventing a post row first.
  const post = postId ? await getPostById(postId) : null;
  if (postId && !post) {
    return NextResponse.json({ error: "post not found" }, { status: 404 });
  }

  const article: PosterArticle = {
    title: str(body?.title) || post?.title_bn || "",
    content: str(body?.content) || post?.body_bn || "",
    summary: str(body?.summary) || post?.summary_bn || "",
    category: str(body?.category) || post?.category || "",
    source: str(body?.source) || post?.source_name || "",
    publishedAt: str(body?.publishedAt) || post?.published_at || "",
  };
  if (!article.title) {
    return NextResponse.json(
      { error: "শিরোনাম প্রয়োজন (title অথবা postId পাঠান)" },
      { status: 400 },
    );
  }

  const accent = str(body?.accent);
  const bg = str(body?.bg);
  if (accent && !isHexColor(accent)) {
    return NextResponse.json({ error: "accent অবশ্যই #rrggbb হতে হবে" }, { status: 400 });
  }
  if (bg && !isHexColor(bg)) {
    return NextResponse.json({ error: "bg অবশ্যই #rrggbb হতে হবে" }, { status: 400 });
  }

  // The anti-repetition window. `regenerate` does not bypass it; it is the same
  // window read again, which is exactly what forces a fresh combination when
  // the editor clicks the button twice on one story.
  let recentlyUsed: Array<{ layout: string; palette: string }> = [];
  try {
    const recent = await recentPosterDesigns(5);
    recentlyUsed = recent.map((r) => ({ layout: r.layout_variant, palette: r.palette_id }));
  } catch {
    /* first run before migration: an empty window is a valid window */
  }

  const direction = await directPosterDesign(article, {
    recentlyUsed,
    signal: AbortSignal.timeout(45_000),
  });
  const plan = direction.plan;

  // The desk gives the masthead its date and lets the image prompt carry the
  // publication's own framing of the category.
  const desk = post?.category ? await deskForCategory(post.category) : null;
  const dateText = article.publishedAt && !Number.isNaN(new Date(article.publishedAt).getTime())
    ? banglaDate(new Date(article.publishedAt))
    : banglaDate();

  const warnings: string[] = [];
  if (direction.warning) warnings.push(direction.warning);

  let background: Buffer | null = null;
  let imageProvider: string | null = null;
  let imageModel: string | null = null;
  let imagePrompt = plan.imagePrompt;
  try {
    const result = await generateImage(
      {
        prompt: imagePrompt,
        aspectRatio: focalAspectFor(plan.layout),
        negativePrompt: DESIGN_IMAGE_NEGATIVE,
        count: 1,
      },
      AbortSignal.timeout(110_000),
    );
    background = Buffer.from(result.bytes);
    imageProvider = result.provider;
    imageModel = result.model;
    imagePrompt = result.prompt;
  } catch (err) {
    // A missing visual is not a missing poster: the textured wash is drawn in
    // the palette and the headline still publishes.
    warnings.push(
      `ফোকাল ছবি তৈরি হয়নি — টেক্সচার্ড পটভূমি ব্যবহার হয়েছে (${err instanceof Error ? err.message : String(err)})`,
    );
  }

  const format = str(body?.format) === "webp" ? "webp" : "png";
  let rendered: Awaited<ReturnType<typeof renderDesignPoster>>;
  try {
    rendered = await renderDesignPoster({
      plan,
      background,
      accent: accent || undefined,
      bg: bg || undefined,
      brand: str(body?.brand) || undefined,
      site: str(body?.site) || undefined,
      dateText,
      seed: post?.slug ?? post?.id ?? article.title,
      format,
      quality: 92,
    });
  } catch (err) {
    if (err instanceof PosterBrowserUnavailable) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "এই পরিবেশে Chromium নেই, তাই বাংলা টাইপোগ্রাফি নিরাপদে রেন্ডার করা যাবে না। সার্ভারে Playwright ব্রাউজার ইনস্টল করুন।",
          detail: err.message,
        },
        { status: 503 },
      );
    }
    throw err;
  }

  // Persist. The bytes are always returned inline as well, because a serverless
  // runtime may not be able to serve a file it just wrote — the CMS must still
  // be able to show and download the poster it asked for.
  const rel = randomMediaName("poster", extensionForMime(rendered.contentType));
  const attach = postId ? bool(body?.attach, true) : false;
  let mediaPath: string | null = null;
  let stored: "remote" | "local" | "none" = "none";
  try {
    const url = await uploadBufferRemote(rel, rendered.bytes, postId || "poster");
    if (url) {
      mediaPath = url;
      stored = "remote";
    }
  } catch (err) {
    warnings.push(`রিমোট স্টোরেজ: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!mediaPath) {
    try {
      await writeGeneratedMedia(rel, rendered.bytes);
    } catch {
      /* media root may be read-only; the public mirror below is enough locally */
    }
    try {
      await writeLocalMirror(rel, rendered.bytes);
      mediaPath = rel;
      stored = "local";
    } catch {
      warnings.push("ছবিটি সংরক্ষণ করা যায়নি — শুধু ইনলাইন ডেটা পাঠানো হয়েছে।");
    }
  }

  if (attach && mediaPath) {
    try {
      await updatePost(postId, { media_path: mediaPath, media_origin: "ai" });
    } catch (err) {
      warnings.push(`পোস্টে যুক্ত করা যায়নি: ${err instanceof Error ? err.message : String(err)}`);
    }
    try {
      const client = getClient();
      await client.execute({
        sql: "INSERT INTO admin_actions (id, admin_user_id, action, target_table, target_id, details, created_at) VALUES (?, ?, ?, 'posts', ?, ?, ?)",
        args: [
          crypto.randomUUID(),
          user.user_id,
          "post.generate_poster",
          postId,
          JSON.stringify({ layout: plan.layout, palette: plan.paletteId, media_path: mediaPath }),
          nowIso(),
        ],
      });
    } catch {
      /* the audit row is best-effort; the poster is already attached */
    }
  }

  // Memory is written only after a successful render, so a failed call cannot
  // poison the rotation with a design nobody ever saw.
  try {
    await recordPosterDesign({
      postId: postId || null,
      layout: plan.layout,
      palette: plan.paletteId,
      visualStyle: plan.visualStyle,
      texture: plan.texture,
      headline: plan.headline,
      mediaPath,
      createdBy: user.email,
    });
  } catch {
    warnings.push("ডিজাইন-ইতিহাস সংরক্ষণ করা যায়নি (মাইগ্রেশন ০৪০ চালান)।");
  }

  if (str(req.nextUrl.searchParams.get("format")) === "image") {
    return new Response(rendered.bytes as unknown as BodyInit, {
      headers: {
        "content-type": rendered.contentType,
        "content-disposition": `inline; filename="${rel}"`,
        "cache-control": "no-store",
      },
    });
  }

  return NextResponse.json({
    ok: true,
    design: {
      layout: plan.layout,
      palette: paletteSummary(plan),
      visual_style: plan.visualStyle,
      texture: plan.texture,
      headline: plan.headline,
      highlight_word: plan.highlightWord,
      bullets: plan.bullets,
      pull_quote: plan.pullQuote,
      badge_text: plan.badgeText,
      footer_text: plan.footerText,
      image_prompt: imagePrompt,
      directed_by: direction.source,
    },
    image: {
      media_path: mediaPath,
      stored,
      attached: attach && Boolean(mediaPath),
      content_type: rendered.contentType,
      width: rendered.width,
      height: rendered.height,
      bytes: rendered.bytes.length,
      provider: imageProvider,
      model: imageModel,
      used_fallback_visual: rendered.usedFallbackVisual,
      data_url: `data:${rendered.contentType};base64,${rendered.bytes.toString("base64")}`,
    },
    desk: desk?.label ?? null,
    warnings,
  });
}
