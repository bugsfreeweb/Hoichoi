/**
 * POST /api/generate-poster
 *
 * The dynamic poster service: one Bengali article in, one complete, unique,
 * editorial-grade poster out — in 16:9, in 4:5, or in both from one direction.
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
 *                       1920×1080 @2× (or 1080×1350 @2×). This is where Bengali
 *                       stays correct.
 *   4. memory         — the rendered design is recorded and the next call reads
 *                       the last five, so consecutive posters cannot repeat a
 *                       layout/palette pair.
 *
 * Body (either an explicit article or a saved post):
 *   { postId?, title?, content?, summary?, category?, source?, publishedAt?,
 *     aspect?: "16:9" | "4:5", aspects?: ["16:9", "4:5"],
 *     regenerate?, attach?, format?, brand?, site?, accent?, bg? }
 *
 * Response: JSON with the encoded image as a data URL plus its design tokens.
 * With `aspects`, `posters` holds one entry per frame and `design`/`image` mirror
 * the first. `?format=image` (optionally `&aspect=4:5`) returns raw bytes.
 */
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
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
  imageSizeFor,
  orientImagePrompt,
  paletteSummary,
  publicFigureFor,
  type PosterArticle,
} from "@hoichoi/llm";
import {
  DESIGN_FRAME,
  DESIGN_FRAMES,
  DESIGN_SCALE,
  PosterBrowserUnavailable,
  focalAspectFor,
  renderDesignPoster,
  renderHtmlToPng,
} from "@hoichoi/poster";
import {
  POSTER_ASPECTS,
  POSTER_DESIGN_LAYOUTS,
  POSTER_PALETTES,
  POSTER_TEXTURES,
  POSTER_VISUAL_STYLES,
  isHexColor,
  isPosterAspect,
  type PosterAspect,
} from "@hoichoi/shared-types";
import { forbidden, requireApiRole } from "@/lib/auth";
import { publicFigurePortrait } from "@/lib/public-figure";
import { savePosterImage } from "@hoichoi/db";

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

/** Store one encoded poster: remote first, then the media root, then public. */
async function persistPoster(
  bytes: Buffer,
  contentType: string,
  postId: string,
  aspect: PosterAspect,
  warnings: string[],
): Promise<{
  rel: string;
  mediaPath: string | null;
  stored: "remote" | "local" | "db" | "none";
}> {
  const rel = randomMediaName("poster", extensionForMime(contentType));
  let mediaPath: string | null = null;
  let stored: "remote" | "local" | "db" | "none" = "none";
  try {
    const url = await uploadBufferRemote(rel, bytes, postId || "poster");
    if (url) {
      mediaPath = url;
      stored = "remote";
    }
  } catch (err) {
    warnings.push(`রিমোট স্টোরেজ: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!mediaPath) {
    try {
      await writeGeneratedMedia(rel, bytes);
    } catch {
      /* media root may be read-only; the public mirror below is enough locally */
    }
    try {
      await writeLocalMirror(rel, bytes);
      mediaPath = rel;
      stored = "local";
    } catch {
      /* no writable disk on a serverless runtime: use the database below */
    }
  }
  if (!mediaPath) {
    // A JPEG is both smaller than the print PNG and accepted by every social
    // crawler; a WebP OG image is not universally supported.
    try {
      const jpeg = await sharp(bytes).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
      const id = await savePosterImage({
        postId: postId || null,
        aspect,
        contentType: "image/jpeg",
        bytes: jpeg,
      });
      mediaPath = `/api/posters/${id}`;
      stored = "db";
    } catch (err) {
      warnings.push(
        `ছবিটি সংরক্ষণ করা যায়নি — শুধু ইনলাইন ডেটা পাঠানো হয়েছে (${err instanceof Error ? err.message : String(err)})`,
      );
    }
  }
  return { rel, mediaPath, stored };
}

function designPayload(
  plan: Awaited<ReturnType<typeof directPosterDesign>>["plan"],
  directedBy: string,
  imagePrompt: string,
  aspect: PosterAspect,
) {
  return {
    layout: plan.layout,
    aspect,
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
    directed_by: directedBy,
  };
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
    frames: DESIGN_FRAMES,
    aspects: POSTER_ASPECTS,
    layouts: POSTER_DESIGN_LAYOUTS,
    palettes: POSTER_PALETTES,
    visualStyles: POSTER_VISUAL_STYLES,
    textures: POSTER_TEXTURES,
    recent,
  });
}

export async function POST(req: NextRequest) {
  try {
    return await handlePost(req);
  } catch (err) {
    // A blank 500 hides which step failed; this keeps the reason visible to the
    // editor and to the deployment log without leaking a stack to the browser.
    return NextResponse.json(
      {
        ok: false,
        error: "পোস্টার তৈরি করা যায়নি।",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

async function handlePost(req: NextRequest) {
  const guard = await requireApiRole("editor");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  // Admin-only deployment probe: tells the operator which step a serverless
  // runtime can actually reach, without spending a text or image generation.
  if (body?.diagnose === true) {
    const stages: Record<string, unknown> = { stage: "start" };
    try {
      stages.stage = "portrait";
      stages.figure = publicFigureFor({ title: str(body?.title) || "Jensen Huang" });
      const portrait = await publicFigurePortrait({
        title: str(body?.title) || "Jensen Huang",
      });
      stages.portrait = portrait ? `${portrait.name} (${portrait.bytes.length} bytes)` : null;
      if (!portrait) {
        try {
          const res = await fetch(
            "https://en.wikipedia.org/api/rest_v1/page/summary/Jensen_Huang",
            {
              signal: AbortSignal.timeout(6_000),
              headers: {
                "user-agent": "HoichoiPoster/1.0 (https://hoichoifeed.vercel.app; editorial poster)",
                accept: "application/json",
              },
            },
          );
          stages.wikiStatus = res.status;
          const wikiBody = await res.text();
          stages.wikiBody = wikiBody.slice(0, 120);
          const wiki = JSON.parse(wikiBody) as {
            originalimage?: { source?: string };
            thumbnail?: { source?: string };
          };
          const candidates = [wiki.thumbnail?.source, wiki.originalimage?.source].filter(
            (u): u is string => Boolean(u),
          );
          const imageTries: Array<Record<string, unknown>> = [];
          for (const url of candidates) {
            try {
              const img = await fetch(url, {
                signal: AbortSignal.timeout(8_000),
                headers: {
                  "user-agent": "HoichoiPoster/1.0 (https://hoichoifeed.vercel.app)",
                  accept: "image/*",
                  referer: "https://en.wikipedia.org/",
                },
              });
              imageTries.push({
                host: new URL(url).host,
                status: img.status,
                type: img.headers.get("content-type"),
                length: (await img.arrayBuffer()).byteLength,
              });
            } catch (err) {
              imageTries.push({
                host: (() => {
                  try {
                    return new URL(url).host;
                  } catch {
                    return url;
                  }
                })(),
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }
          stages.imageTries = imageTries;
        } catch (err) {
          stages.wikiError = err instanceof Error ? err.message : String(err);
        }
      }
      stages.stage = "browser";
      const png = await renderHtmlToPng("<html><body><h1>ok</h1></body></html>", {
        width: 200,
        height: 100,
      });
      stages.stage = "done";
      stages.png = png.length;
      return NextResponse.json({ ok: true, ...stages });
    } catch (err) {
      return NextResponse.json({
        ok: false,
        ...stages,
        detail: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack?.split("\n").slice(0, 4) : null,
      });
    }
  }

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

  // One art direction, one or two frames. The LLM must not run twice for the
  // portrait: the story has one mood, and the point of 4:5 is that it is the
  // same page in a different shape, not a second opinion.
  const aspects: PosterAspect[] = [];
  const rawAspects = body?.aspects;
  if (rawAspects !== undefined) {
    if (!Array.isArray(rawAspects) || rawAspects.some((a) => !isPosterAspect(a))) {
      return NextResponse.json(
        { error: `aspects অবশ্যই ${POSTER_ASPECTS.join(" / ")}-এর একটি তালিকা হতে হবে` },
        { status: 400 },
      );
    }
    for (const a of rawAspects) {
      if (isPosterAspect(a) && !aspects.includes(a)) aspects.push(a);
    }
  } else if (body?.aspect !== undefined) {
    if (!isPosterAspect(body.aspect)) {
      return NextResponse.json(
        { error: `aspect অবশ্যই ${POSTER_ASPECTS.join(" / ")} হতে হবে` },
        { status: 400 },
      );
    }
    aspects.push(body.aspect);
  }
  if (aspects.length === 0) aspects.push("16:9");

  // The anti-repetition window. `regenerate` does not bypass it; it is the same
  // window read again, which is exactly what forces a fresh combination when
  // the editor clicks the button twice on one story. Portrait and landscape
  // siblings share a pair, so the window is de-duplicated before the prompt.
  let recentlyUsed: Array<{ layout: string; palette: string }> = [];
  try {
    const recent = await recentPosterDesigns(5);
    const seen = new Set<string>();
    for (const r of recent) {
      const key = `${r.layout_variant}|${r.palette_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      recentlyUsed.push({ layout: r.layout_variant, palette: r.palette_id });
    }
  } catch {
    /* first run before migration: an empty window is a valid window */
  }

  const direction = await directPosterDesign(article, {
    recentlyUsed,
    signal: AbortSignal.timeout(45_000),
  });
  let plan = direction.plan;

  // A story about a real person should show that person. Wikipedia's lead
  // portrait is a real photograph, not a synthetic likeness; when it resolves,
  // it replaces the generated focal visual for every frame and the footer
  // carries the credit. Any failure falls through to the image model.
  const portrait = await publicFigurePortrait(article).catch(() => null);
  if (portrait) {
    plan = {
      ...plan,
      // The photo is a photograph; the "3D isometric render" label the art
      // director chose for a generated visual must not sit under a real portrait.
      visualStyle: "cinematic photojournalism",
      footerText: `${plan.footerText} · ${portrait.credit}`.slice(0, 120),
    };
  }

  // The desk gives the masthead its date and lets the image prompt carry the
  // publication's own framing of the category.
  const desk = post?.category ? await deskForCategory(post.category) : null;
  const dateText =
    article.publishedAt && !Number.isNaN(new Date(article.publishedAt).getTime())
      ? banglaDate(new Date(article.publishedAt))
      : banglaDate();

  const warnings: string[] = [];
  if (direction.warning) warnings.push(direction.warning);

  // The focal visual is cached by ratio: both split layouts share one 1:1
  // image, and only the full-bleed shapes need a second, vertical render.
  interface Visual {
    background: Buffer;
    provider: string;
    model: string;
    prompt: string;
  }
  const visuals = new Map<string, Visual | null>();
  const promptFor = new Map<PosterAspect, string>();

  for (const aspect of aspects) {
    const ratio = focalAspectFor(plan.layout, aspect);
    const prompt = orientImagePrompt(plan.imagePrompt, aspect);
    promptFor.set(aspect, prompt);
    if (visuals.has(ratio)) continue;

    if (portrait) {
      const visual: Visual = {
        background: portrait.bytes,
        provider: "Wikimedia Commons",
        model: portrait.source,
        prompt: `${portrait.name} — ${portrait.credit}`,
      };
      visuals.set(ratio, visual);
      promptFor.set(aspect, visual.prompt);
      continue;
    }

    try {
      const result = await generateImage(
        {
          prompt,
          aspectRatio: ratio,
          // Native size where the provider supports it. Without this, every
          // provider also received "Compose for a 16:9 aspect ratio" as prose —
          // a second, sometimes conflicting instruction on top of the prompt the
          // editor saw. The editor now sees exactly what was sent.
          size: imageSizeFor(ratio),
          negativePrompt: DESIGN_IMAGE_NEGATIVE,
          count: 1,
        },
        AbortSignal.timeout(110_000),
      );
      visuals.set(ratio, {
        background: Buffer.from(result.bytes),
        provider: result.provider,
        model: result.model,
        prompt: result.prompt,
      });
      promptFor.set(aspect, result.prompt);
    } catch (err) {
      visuals.set(ratio, null);
      // A missing visual is not a missing poster: the textured wash is drawn in
      // the palette and the headline still publishes.
      warnings.push(
        `ফোকাল ছবি (${ratio}) তৈরি হয়নি — টেক্সচার্ড পটভূমি ব্যবহার হয়েছে (${err instanceof Error ? err.message : String(err)})`,
      );
    }
  }

  const format = str(body?.format) === "webp" ? "webp" : "png";
  const attach = postId ? bool(body?.attach, true) : false;
  const outputs: Array<{
    aspect: PosterAspect;
    rendered: Awaited<ReturnType<typeof renderDesignPoster>>;
    rel: string;
    mediaPath: string | null;
    stored: "remote" | "local" | "db" | "none";
    visual: Visual | null;
    prompt: string;
  }> = [];

  for (const aspect of aspects) {
    const visual = visuals.get(focalAspectFor(plan.layout, aspect)) ?? null;
    let rendered: Awaited<ReturnType<typeof renderDesignPoster>>;
    try {
      rendered = await renderDesignPoster({
        plan,
        aspect,
        background: visual?.background ?? null,
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

    // Persist. The bytes are always returned inline as well, because a
    // serverless runtime may not be able to serve a file it just wrote — the
    // CMS must still be able to show and download the poster it asked for.
    const saved = await persistPoster(
      rendered.bytes,
      rendered.contentType,
      postId,
      aspect,
      warnings,
    );
    outputs.push({
      aspect,
      rendered,
      rel: saved.rel,
      mediaPath: saved.mediaPath,
      stored: saved.stored,
      visual,
      prompt: promptFor.get(aspect) ?? visual?.prompt ?? plan.imagePrompt,
    });
  }

  const primary = outputs[0]!;

  // The first frame is the story's social card, so that is the one attached to
  // the post. The portrait is published alongside it, not instead of it.
  if (attach && primary.mediaPath) {
    try {
      await updatePost(postId, { media_path: primary.mediaPath, media_origin: "ai" });
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
          JSON.stringify({
            layout: plan.layout,
            palette: plan.paletteId,
            media_path: primary.mediaPath,
            aspects: outputs.map((o) => o.aspect),
          }),
          nowIso(),
        ],
      });
    } catch {
      /* the audit row is best-effort; the poster is already attached */
    }
  }

  // Memory is written only after a successful render, so a failed call cannot
  // poison the rotation with a design nobody ever saw. Both frames are rows;
  // the read above de-duplicates their shared pair.
  for (const output of outputs) {
    try {
      await recordPosterDesign({
        postId: postId || null,
        layout: plan.layout,
        palette: plan.paletteId,
        aspect: output.aspect,
        visualStyle: plan.visualStyle,
        texture: plan.texture,
        headline: plan.headline,
        mediaPath: output.mediaPath,
        createdBy: user.email,
      });
    } catch {
      warnings.push("ডিজাইন-ইতিহাস সংরক্ষণ করা যায়নি (মাইগ্রেশন ০৪০/০৪১ চালান)।");
      break;
    }
  }

  if (str(req.nextUrl.searchParams.get("format")) === "image") {
    const wanted = req.nextUrl.searchParams.get("aspect");
    const chosen =
      outputs.find((o) => o.aspect === wanted) ??
      outputs.find((o) => o.aspect === aspects[0]) ??
      primary;
    return new Response(chosen.rendered.bytes as unknown as BodyInit, {
      headers: {
        "content-type": chosen.rendered.contentType,
        "content-disposition": `inline; filename="${chosen.rel}"`,
        "cache-control": "no-store",
      },
    });
  }

  /**
   * Vercel caps a function response at 4.5 MB. A 4:5 PNG is ~3.5 MB and its
   * base64 is ~4.8 MB, so returning both frames as PNG data URLs produced a
   * blank 500 in production even though the render itself succeeded. The saved
   * file stays the full PNG; the inline copy the CMS previews is WebP, which is
   * visually identical at this size and an order of magnitude smaller.
   */
  const imagePayload = async (output: (typeof outputs)[number]) => {
    let preview = output.rendered.bytes;
    let previewType = output.rendered.contentType;
    try {
      preview = await sharp(output.rendered.bytes)
        .webp({ quality: 88, effort: 4 })
        .toBuffer();
      previewType = "image/webp";
    } catch {
      /* sharp is unavailable: fall back to the PNG, which still works locally */
    }
    const inline =
      preview.length > 0 && preview.length * 1.37 < 4_200_000 ? preview : output.rendered.bytes;
    const inlineType = inline === output.rendered.bytes ? output.rendered.contentType : previewType;
    return {
      aspect: output.aspect,
      media_path: output.mediaPath,
      stored: output.stored,
      content_type: inlineType,
      width: output.rendered.width,
      height: output.rendered.height,
      bytes: output.rendered.bytes.length,
      provider: output.visual?.provider ?? null,
      model: output.visual?.model ?? null,
      used_fallback_visual: output.rendered.usedFallbackVisual,
      data_url: `data:${inlineType};base64,${inline.toString("base64")}`,
    };
  };

  const payloads = await Promise.all(outputs.map(imagePayload));
  const primaryPayload = payloads[0]!;

  return NextResponse.json({
    ok: true,
    design: designPayload(plan, direction.source, primary.prompt, primary.aspect),
    image: {
      ...primaryPayload,
      attached: attach && Boolean(primary.mediaPath),
    },
    posters: outputs.map((output, index) => ({
      design: designPayload(plan, direction.source, output.prompt, output.aspect),
      image: {
        ...payloads[index]!,
        attached:
          output.aspect === primary.aspect && attach && Boolean(output.mediaPath),
      },
    })),
    desk: desk?.label ?? null,
    warnings,
  });
}
