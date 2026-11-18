/**
 * AI-generated fallback hero images using the configured image-provider chain.
 *
 * Some Facebook posts (caption-less or 403'd media) and most plain feed items
 * carry no picture at all, so posts end up published with `media_kind = "none"`
 * and a gradient card on the site. When an active image provider is configured
 * (and the operator has not turned the feature off in app_config_json) the
 * pipeline generates one editorial illustration for such posts; `media ai-fill`
 * repairs the ones already in the database.
 *
 * Safety rules are hard-coded by design (this is a runtime safety boundary, not
 * operator content): AI images are never generated for the missing-children,
 * child-sexual-abuse and extramarital-crime categories, and the prompt demands
 * no text, no logos, no identifiable people and no children.
 */
import { randomMediaName, processImage } from "./media";
import { composeStoryPlate } from "./plate";
import { buildImageBrief, generateImage, imageSizeFor, listImageProviders } from "@hoichoi/llm";
import { planPoster } from "@hoichoi/poster";
import { POSTER_FRAME } from "@hoichoi/poster";

/** Categories where an AI rendering of the subject would be inappropriate. */
const SENSITIVE_AI_CATEGORIES = new Set(["child-sexual-abuse", "missing-children", "extramarital-crime"]);

/** True when an AI hero image may be generated for posts in `category`. */
export function aiHeroEligible(category: string | null | undefined): boolean {
  if (!category) return true;
  return !SENSITIVE_AI_CATEGORIES.has(category);
}

/** Editorial prompt shared by configured image-generation providers. */
export function aiHeroPrompt(
  title: string,
  summary: string,
  body?: string,
  category?: string | null,
  reservedSide?: "left" | "right" | "center" | "bottom-left",
): string {
  // The editorial brief is the newspaper-shaped one (central idea → metaphor →
  // subject → setting → style → composition → palette → mood → avoid); this
  // wrapper adds only the hard safety rules, so the pipeline, the CLI and the
  // admin button all render from the same structure.
  const brief = buildImageBrief({ title, summary, body, category });
  return [
    brief.prompt,
    "Hard rules: no text, no words, no letters, no numbers, no captions, no logos, no watermarks anywhere in the image.",
    "People, if any, must be abstract, shown from behind or at a distance, and NEVER recognizable; never depict children.",
  ].join("\n");
}

export async function hasAIImageProvider(): Promise<boolean> {
  const providers = await listImageProviders();
  return providers.some((provider) => provider.supportsImage && provider.hasKey);
}

/**
 * Generate an AI hero image for a post and store it in the media root.
 * Returns the relative media path on success (caller mirrors/uploads it),
 * or `null` when no image provider is configured, generation fails, or the
 * provider returns no image. Never throws.
 */
export async function generateAIHero(opts: {
  title: string;
  summary: string;
  body?: string;
  category?: string | null;
  log?: (msg: string) => void;
}): Promise<string | null> {
  const log = opts.log ?? (() => undefined);
  try {
    // The layout decides which part of the frame stays empty; a picture that
    // ignored it would put its subject exactly where the headline will go.
    const reservedSide = planPoster({ category: opts.category, title: opts.title }).subjectSide;
    const brief = buildImageBrief({
      title: opts.title,
      summary: opts.summary,
      body: opts.body,
      category: opts.category,
      reservedSide,
    });
    const result = await generateImage(
      {
        prompt: aiHeroPrompt(opts.title, opts.summary, opts.body, opts.category, reservedSide),
        // The negative prompt is part of the brief; dropping it is why a few
        // renders still came back with lettering or a watermark.
        negativePrompt: brief.negative,
        aspectRatio: brief.aspectRatio,
        // Without an explicit size most hosts pad to a square, and the card layout
        // then crops the centre out of a 16:9 composition.
        size: imageSizeFor(brief.aspectRatio),
        count: 1,
      },
      AbortSignal.timeout(60_000),
    );
    return await writePlate(Buffer.from(result.bytes), opts, log, `via ${result.provider} (${result.model})`);
  } catch (err) {
    /**
     * The model failed — quota, timeout, HTML instead of an image. The story
     * still gets a picture: the branded plate is drawn from the headline alone,
     * so a published card never falls back to an empty gradient.
     */
    log(`[ai-img] generation failed: ${(err as Error).message}`);
    try {
      return await writePlate(null, opts, log, "branded plate (no model)");
    } catch (plateErr) {
      log(`[ai-img] plate failed: ${(plateErr as Error).message}`);
      return null;
    }
  }
}

/**
 * Compose the plate around whatever we have and store it.
 *
 * A `null` render is a legitimate input: the plate carries the brand and the
 * headline, which is a publishable picture and an honest one — it does not
 * pretend a model drew the story.
 */
async function writePlate(
  background: Buffer | null,
  opts: { title: string; summary: string; category?: string | null },
  log: (msg: string) => void,
  via: string,
): Promise<string> {
  const plate = await composeStoryPlate({
    background,
    title: opts.title,
    category: opts.category,
    source: null,
  });
  const rel = randomMediaName("img", "webp");
  await processImage(plate, rel, { maxWidthPx: POSTER_FRAME.width });
  log(`[ai-img] hero ✓ ${rel} ${via}`);
  return rel;
}