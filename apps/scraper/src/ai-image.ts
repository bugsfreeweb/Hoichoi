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
import { generateImage, listImageProviders } from "@hoichoi/llm";

/** Categories where an AI rendering of the subject would be inappropriate. */
const SENSITIVE_AI_CATEGORIES = new Set(["child-sexual-abuse", "missing-children", "extramarital-crime"]);

/** True when an AI hero image may be generated for posts in `category`. */
export function aiHeroEligible(category: string | null | undefined): boolean {
  if (!category) return true;
  return !SENSITIVE_AI_CATEGORIES.has(category);
}

/** Editorial prompt shared by configured image-generation providers. */
export function aiHeroPrompt(title: string, summary: string): string {
  const subject = [title, summary].filter(Boolean).join(" ").replace(/\s+/g, " ").slice(0, 1200) || "a Bangla news report";
  return [
    "You are the art director for Hoichoi (হৈচৈ), a Bangla editorial brand.",
    "Create ONE editorial hero illustration for the article below.",
    "Hard rules: no text, no words, no letters, no numbers, no captions, no logos, no watermarks anywhere in the image.",
    "Style: modern cinematic editorial illustration, deep charcoal with restrained red and warm ivory accents, dignified journalism tone; no graphic or disturbing imagery.",
    "People, if any, must be abstract, shown from behind or at a distance, and NEVER recognizable; never depict children.",
    `Article: ${subject}`,
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
  log?: (msg: string) => void;
}): Promise<string | null> {
  const log = opts.log ?? (() => undefined);
  try {
    const result = await generateImage(
      { prompt: aiHeroPrompt(opts.title, opts.summary), aspectRatio: "16:9", count: 1 },
      AbortSignal.timeout(60_000),
    );
    const rel = randomMediaName("img", "webp");
    await processImage(Buffer.from(result.bytes), rel, { maxWidthPx: 1280 });
    log(`[ai-img] hero ✓ ${rel} via ${result.provider} (${result.model})`);
    return rel;
  } catch (err) {
    log(`[ai-img] generation failed: ${(err as Error).message}`);
    return null;
  }
}