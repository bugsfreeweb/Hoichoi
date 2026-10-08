/**
 * AI-generated fallback hero images (Gemini image generation).
 *
 * Some Facebook posts (caption-less or 403'd media) and most plain feed items
 * carry no picture at all, so posts end up published with `media_kind = "none"`
 * and a gradient card on the site. When a Gemini `GOOGLE_API_KEY` is present
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

/** Categories where an AI rendering of the subject would be inappropriate. */
const SENSITIVE_AI_CATEGORIES = new Set(["child-sexual-abuse", "missing-children", "extramarital-crime"]);

/** True when an AI hero image may be generated for posts in `category`. */
export function aiHeroEligible(category: string | null | undefined): boolean {
  if (!category) return true;
  return !SENSITIVE_AI_CATEGORIES.has(category);
}

/** Editorial-prompt for the Gemini image model. */
export function aiHeroPrompt(title: string, summary: string): string {
  const subject = [title, summary].filter(Boolean).join(" ").replace(/\s+/g, " ").slice(0, 1400) || "a Bangla news report";
  return [
    "You are the art director for a Bangla public-interest news site (হৈচৈ).",
    "Create ONE editorial hero illustration for the article below.",
    "Hard rules: no text, no words, no letters, no numbers, no captions, no logos, no watermarks anywhere in the image.",
    "Style: flat modern editorial illustration, calm natural light, dignified print-journalism tone; no graphic or disturbing imagery.",
    "People, if any, must be abstract, shown from behind or at a distance, and NEVER recognizable; never depict children.",
    `Article: ${subject}`,
  ].join("\n");
}

const DEFAULT_MODEL = "gemini-2.5-flash-image";

/**
 * Generate an AI hero image for a post and store it in the media root.
 * Returns the relative media path on success (caller mirrors/uploads it),
 * or `null` when the API key is absent, the request fails, or the model
 * returns no inline image. Never throws.
 */
export async function generateAIHero(opts: {
  title: string;
  summary: string;
  log?: (msg: string) => void;
}): Promise<string | null> {
  const log = opts.log ?? (() => undefined);
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    log("[ai-img] skip — GOOGLE_API_KEY not set");
    return null;
  }
  const model = process.env.GEMINI_IMAGE_MODEL ?? DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: aiHeroPrompt(opts.title, opts.summary) }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });
  } catch (err) {
    log(`[ai-img] request failed: ${(err as Error).message}`);
    return null;
  }
  if (!res.ok) {
    log(`[ai-img] HTTP ${res.status}`);
    return null;
  }
  let body: {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
  };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    log("[ai-img] unparseable response");
    return null;
  }
  const inline = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
  if (!inline) {
    log("[ai-img] no inline image in Gemini response");
    return null;
  }
  try {
    const rel = randomMediaName("img", "webp");
    await processImage(Buffer.from(inline, "base64"), rel, { maxWidthPx: 1280 });
    log(`[ai-img] hero ✓ ${rel}`);
    return rel;
  } catch (err) {
    log(`[ai-img] store failed: ${(err as Error).message}`);
    return null;
  }
}