/**
 * The art director: one article in, one complete poster design out.
 *
 * This is the only place in the poster pipeline that needs judgement. Everything
 * downstream — the HTML, the image prompt, the render — is mechanical, and that
 * separation is the point of the brief: the model chooses *what the story is
 * about and how it should feel*, while code guarantees that the Bengali is
 * shaped by a browser and never by an image model.
 *
 * The output is constrained by a JSON Schema passed to Gemini's structured
 * output mode (`responseMimeType: "application/json"` + `responseSchema`). That
 * removes the "the model wrapped JSON in prose" failure class. It does *not*
 * remove the "the model ignored instruction 7" class, so every field is
 * validated again here and repaired against the anti-repetition window before a
 * single pixel is drawn.
 */
import type {
  PosterDesignLayout,
  PosterPaletteId,
  PosterTexture,
  PosterVisualStyle,
} from "@hoichoi/shared-types";
import {
  POSTER_DESIGN_LAYOUTS,
  POSTER_PALETTES,
  POSTER_TEXTURES,
  POSTER_VISUAL_STYLES,
  isPosterDesignLayout,
  isPosterPaletteId,
  isPosterTexture,
  isPosterVisualStyle,
  paletteById,
} from "@hoichoi/shared-types";
import { newResolver, type ResolverOptions } from "./resolver";
import { ProviderError } from "./types";

export interface PosterArticle {
  title: string;
  content?: string | null;
  summary?: string | null;
  category?: string | null;
  source?: string | null;
  /** ISO timestamp or a preformatted Bengali date. */
  publishedAt?: string | null;
}

export interface RecentlyUsedDesign {
  layout: string;
  palette: string;
}

export interface PosterDesignPlan {
  headline: string;
  highlightWord: string;
  /** Exactly one of these two carries the supporting copy. */
  bullets: string[];
  pullQuote: string | null;
  badgeText: string;
  footerText: string;
  layout: PosterDesignLayout;
  paletteId: PosterPaletteId;
  visualStyle: PosterVisualStyle;
  texture: PosterTexture;
  imagePrompt: string;
}

export interface ArtDirectorOptions {
  /** The last five rendered designs, newest first. */
  recentlyUsed?: readonly RecentlyUsedDesign[];
  /** Injected resolver for tests / a caller with its own key store. */
  resolver?: Pick<ResolverOptions, "keyStore" | "gateway"> | null;
  signal?: AbortSignal;
  /** Skip the LLM hop entirely (offline render, unit test, dry run). */
  offline?: boolean;
}

export interface ArtDirectorResult {
  plan: PosterDesignPlan;
  /** "llm" or the reason the deterministic planner answered instead. */
  source: "llm" | "fallback";
  /** Present when the LLM was attempted and failed; useful in the API payload. */
  warning?: string;
}

/** Gemini's OpenAPI-subset schema. Field names are English; values are Bengali. */
/**
 * The negative prompt for a poster visual.
 *
 * Deliberately narrower than `EDITORIAL_IMAGE_NEGATIVE`: that one forbids
 * "illustration" and "cartoon", which is right for a photojournalistic hero but
 * wrong when the art director explicitly chose "editorial digital illustration"
 * or "minimalist vector art". Only the things that would break the poster are
 * excluded here — lettering and identifiable people.
 */
export const DESIGN_IMAGE_NEGATIVE =
  "readable text, letters, words, numbers, captions, headlines, typographic signage, logos, brand marks, watermarks, identifiable faces, portraits of specific people, children, deformed hands, extra limbs, clutter";

export const ART_DIRECTOR_SCHEMA = {
  type: "OBJECT",
  properties: {
    headline: {
      type: "STRING",
      description: "Punchy Bengali headline, maximum 45 characters. No quotes.",
    },
    highlight_word: {
      type: "STRING",
      description: "One or two words copied exactly from headline, for the accent colour.",
    },
    content_mode: {
      type: "STRING",
      enum: ["bullets", "quote"],
      description: "bullets for explainer/roundup stories, quote for profile/opinion/emotional stories.",
    },
    bullets: {
      type: "ARRAY",
      description: "Exactly 3 crisp Bengali bullet points when content_mode is bullets, else an empty array.",
      items: { type: "STRING" },
    },
    pull_quote: {
      type: "STRING",
      description: "One impactful Bengali pull-quote of at most 120 characters when content_mode is quote, else an empty string.",
    },
    badge_text: {
      type: "STRING",
      description: "Bengali category badge, e.g. প্রযুক্তি, ব্রেকিং নিউজ, অর্থনীতি, খেলাধুলা.",
    },
    footer_text: {
      type: "STRING",
      description: "Bengali footer: সূত্র: <source> | <date>. Keep it short.",
    },
    layout_variant: {
      type: "STRING",
      enum: [...POSTER_DESIGN_LAYOUTS],
      description: "Choose the layout that fits this story and avoid recently_used_designs. The design is later recomposed to 4:5 as well.",
    },
    palette_id: {
      type: "STRING",
      enum: POSTER_PALETTES.map((p) => p.id),
      description: "Mood-matched palette id, never the same as the most recent design.",
    },
    visual_style: { type: "STRING", enum: [...POSTER_VISUAL_STYLES] },
    texture: {
      type: "STRING",
      enum: [...POSTER_TEXTURES],
      description: "Procedural background texture that suits the art direction.",
    },
    image_prompt: {
      type: "STRING",
      description:
        "Detailed English prompt for the focal visual. No text, letters, numbers, logos or watermarks in the image.",
    },
  },
  required: [
    "headline",
    "highlight_word",
    "content_mode",
    "bullets",
    "pull_quote",
    "badge_text",
    "footer_text",
    "layout_variant",
    "palette_id",
    "visual_style",
    "texture",
    "image_prompt",
  ],
} as const;

const SYSTEM_PROMPT = `You are the Senior Editorial Art Director of a Bengali daily newspaper.
You design one social poster per story. You do not write articles and you never invent facts.

Hard rules:
1. All reader-facing copy is Bengali. Do not translate Bengali names into English.
2. The headline is at most 45 Bengali characters, active voice, no trailing ellipsis.
3. highlight_word must appear verbatim inside headline.
4. Choose content_mode by story type: explainers, policy and roundups get exactly 3 bullets; profiles, opinion, emotion and conflict get one pull-quote and no bullets.
5. The badge is a short Bengali category tag, not a sentence.
6. Pick one layout_variant and one palette_id that fit the story's mood. Never repeat a (layout, palette) pair from recently_used_designs, and never repeat the single most recent palette.
7. image_prompt is English, describes only the focal visual, matches visual_style and the palette's mood, and ends with: "No text, no letters, no numbers, no logos, no watermark."
8. Return JSON only. No markdown, no commentary.`;

function clampText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function banglaDigits(n: number): string {
  const digits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(n).replace(/[0-9]/g, (d) => digits[Number(d)]!);
}

const BN_MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
] as const;

/** A Bengali date line without importing the DB's formatter (llm has no db dep). */
export function banglaDateLine(input?: string | null): string {
  const d = input ? new Date(input) : new Date();
  const when = Number.isNaN(d.getTime()) ? new Date() : d;
  return `${banglaDigits(when.getDate())} ${BN_MONTHS[when.getMonth()]} ${banglaDigits(when.getFullYear())}`;
}

const CATEGORY_DESK: Array<{ match: RegExp; desk: string; badge: string }> = [
  { match: /tech|technology|science|gadget|প্রযুক্তি|বিজ্ঞান/i, desk: "tech", badge: "প্রযুক্তি" },
  { match: /econom|business|finance|bank|market|অর্থনীতি|ব্যবসা|বাজার/i, desk: "finance", badge: "অর্থনীতি" },
  { match: /sport|cricket|football|খেলা|ক্রিকেট|ফুটবল/i, desk: "sports", badge: "খেলাধুলা" },
  { match: /health|environment|climate|স্বাস্থ্য|পরিবেশ|জলবায়ু/i, desk: "health", badge: "স্বাস্থ্য" },
  { match: /politics|world|international|রাজনীতি|আন্তর্জাতিক|বিশ্ব/i, desk: "world", badge: "রাজনীতি" },
  { match: /breaking|crime|accident|disaster|জরুরি|অপরাধ|দুর্ঘটনা|দুর্যোগ/i, desk: "breaking", badge: "ব্রেকিং নিউজ" },
  { match: /culture|entertainment|lifestyle|opinion|সংস্কৃতি|বিনোদন|মতামত/i, desk: "culture", badge: "সংস্কৃতি" },
];

function deskForCategory(category?: string | null): string {
  const value = (category ?? "").trim();
  return CATEGORY_DESK.find((c) => c.match.test(value))?.desk ?? "breaking";
}

const PALETTE_OF_DESK: Record<string, PosterPaletteId> = {
  tech: "tech_navy_cyan",
  finance: "finance_charcoal_gold",
  breaking: "breaking_obsidian_crimson",
  health: "health_forest_mint",
  world: "world_indigo_coral",
  sports: "health_forest_mint",
  culture: "world_indigo_coral",
};

const LAYOUT_OF_DESK: Record<string, PosterDesignLayout> = {
  tech: "split_left_media",
  finance: "editorial_magazine_grid",
  breaking: "breaking_spotlight",
  health: "split_right_media",
  world: "hero_overlay_gradient",
  sports: "hero_overlay_gradient",
  culture: "editorial_magazine_grid",
};

const STYLE_OF_DESK: Record<string, PosterVisualStyle> = {
  tech: "3D isometric render",
  finance: "editorial digital illustration",
  breaking: "cinematic photojournalism",
  health: "minimalist vector art",
  world: "cinematic photojournalism",
  sports: "cinematic photojournalism",
  culture: "editorial digital illustration",
};

const TEXTURE_OF_LAYOUT: Record<PosterDesignLayout, PosterTexture> = {
  split_left_media: "dot_grid",
  split_right_media: "diagonal_mesh",
  hero_overlay_gradient: "radial_glow",
  editorial_magazine_grid: "topographic",
  breaking_spotlight: "radial_glow",
};

const STOPWORDS = new Set([
  "এই", "একটি", "একটা", "এবং", "কিন্তু", "থেকে", "জন্য", "সাথে", "আরো", "আরও", "যে", "যা",
  "তার", "তিনি", "তারা", "করে", "করেছে", "হবে", "হয়", "হয়েছে", "নেই", "আছে", "বলে", "কথা",
  "নিয়ে", "মধ্যে", "পর", "আগে", "পরে", "দিকে", "এখন", "সব", "কোনো", "একজন", "নতুন", "আজ",
  "দিন", "বছর", "শেষ", "শুরু", "মতো", "আবার", "তবে", "কেন", "কীভাবে", "কোথায়",
]);

function wordsOf(text: string): string[] {
  return text
    .split(/[\s।,!?"'“”‘’()…:;]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);
}

/** Pick a pair the recent window has not used, with the most recent palette barred. */
export function avoidRepetition(
  wanted: { layout: PosterDesignLayout; paletteId: PosterPaletteId },
  recentlyUsed: readonly RecentlyUsedDesign[],
): { layout: PosterDesignLayout; paletteId: PosterPaletteId; changed: boolean } {
  const window = recentlyUsed.slice(0, 5);
  const pairs = new Set(window.map((r) => `${r.layout}|${r.palette}`));
  const mostRecentPalette = window[0]?.palette;
  if (!pairs.has(`${wanted.layout}|${wanted.paletteId}`) && wanted.paletteId !== mostRecentPalette) {
    return { ...wanted, changed: false };
  }
  for (const palette of POSTER_PALETTES) {
    for (const layout of POSTER_DESIGN_LAYOUTS) {
      if (pairs.has(`${layout}|${palette.id}`)) continue;
      if (palette.id === mostRecentPalette) continue;
      return { layout, paletteId: palette.id, changed: true };
    }
  }
  // Every pair is in the window (only possible with a seeded/test history):
  // a different palette is still better than an exact repeat.
  const alternative = POSTER_PALETTES.find((p) => p.id !== mostRecentPalette) ?? POSTER_PALETTES[0]!;
  return { layout: wanted.layout, paletteId: alternative.id, changed: true };
}

function fallbackPlan(
  article: PosterArticle,
  recentlyUsed: readonly RecentlyUsedDesign[],
): PosterDesignPlan {
  const desk = deskForCategory(article.category);
  const rawTitle = (article.title || "সংবাদ").replace(/\s+/g, " ").trim();
  let headline = rawTitle;
  if (headline.length > 45) {
    const cut = headline.slice(0, 45);
    // Prefer the last clause boundary inside the budget over a mid-phrase word:
    // "বিনিয়োগ, নতুন" is a correct 45-character cut and a bad headline.
    const boundary = Math.max(cut.lastIndexOf("।"), cut.lastIndexOf(","), cut.lastIndexOf("?"));
    const base = boundary >= 18 ? cut.slice(0, boundary) : cut.slice(0, Math.max(12, cut.lastIndexOf(" ")));
    headline = base.trim().replace(/[।,\-–—;:]+$/g, "").trim();
    if (!headline) headline = cut.trim();
  }
  const titleWords = wordsOf(headline).sort((a, b) => b.length - a.length);
  const highlightWord = titleWords.find((w) => !STOPWORDS.has(w) && headline.includes(w)) ?? "";
  // The summary is two sentences on most stories; the body is where the third
  // bullet lives. Both are read, the summary first, without repeating a line.
  const sourceText = `${article.summary ?? ""} ${article.content ?? ""}`.trim();
  const sentences = Array.from(
    new Set(
      sourceText
        .split(/(?<=[।.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 8),
    ),
  );
  const isQuoteStory = /culture|opinion|lifestyle/i.test(article.category ?? "");
  const bullets = isQuoteStory
    ? []
    : sentences.slice(0, 3).map((s) => clampText(s, 72));
  const dateText = banglaDateLine(article.publishedAt);
  const source = clampText(article.source, 40) || "হৈচৈ";
  const wanted = avoidRepetition(
    { layout: LAYOUT_OF_DESK[desk]!, paletteId: PALETTE_OF_DESK[desk]! },
    recentlyUsed,
  );
  const palette = paletteById(wanted.paletteId) ?? POSTER_PALETTES[0]!;
  const subject = clampText(rawTitle, 180) || "the story's central subject";
  return {
    headline,
    highlightWord,
    bullets,
    pullQuote: isQuoteStory ? clampText(sentences[0] ?? rawTitle, 120) : null,
    badgeText: CATEGORY_DESK.find((c) => c.desk === desk)?.badge ?? "সংবাদ",
    footerText: `সূত্র: ${source} | ${dateText}`,
    layout: wanted.layout,
    paletteId: wanted.paletteId,
    visualStyle: STYLE_OF_DESK[desk] ?? "editorial digital illustration",
    texture: TEXTURE_OF_LAYOUT[wanted.layout],
    imagePrompt: `${STYLE_OF_DESK[desk] ?? "editorial digital illustration"} of ${subject}. Colour mood: ${palette.label} (${palette.mood}), background ${palette.bg}, accent ${palette.accent}. Wide 16:9 composition with a clear focal subject and generous negative space. No text, no letters, no numbers, no logos, no watermark.`,
  };
}

/**
 * Turn whatever the model returned into a plan the renderer can trust.
 *
 * The two jobs are repair and rotation: fill a missing field from the
 * deterministic planner, and move a repeated (layout, palette) pair to the first
 * unused combination. A model that follows every instruction passes through
 * almost untouched; a model that ignores the anti-repetition rule still cannot
 * publish the same pair twice in a row.
 */
export function normalisePlan(
  raw: unknown,
  article: PosterArticle,
  recentlyUsed: readonly RecentlyUsedDesign[] = [],
): PosterDesignPlan {
  const fallback = fallbackPlan(article, recentlyUsed);
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const headline = clampText(obj.headline, 45) || fallback.headline;
  let highlight = clampText(obj.highlight_word, 24);
  if (!highlight || !headline.includes(highlight)) {
    highlight = wordsOf(headline).sort((a, b) => b.length - a.length)[0] ?? "";
  }

  const mode = obj.content_mode === "quote" ? "quote" : obj.content_mode === "bullets" ? "bullets" : null;
  const rawBullets = Array.isArray(obj.bullets)
    ? obj.bullets.map((b) => clampText(b, 78)).filter(Boolean)
    : [];
  const rawQuote = clampText(obj.pull_quote, 140);
  let bullets: string[] = [];
  let pullQuote: string | null = null;
  if (mode === "quote" || (!mode && rawQuote && rawBullets.length === 0)) {
    pullQuote = rawQuote || fallback.pullQuote || fallback.bullets[0] || headline;
  } else if (storySuggestsQuote(article) && rawBullets.length === 0) {
    pullQuote = rawQuote || fallback.pullQuote || headline;
  } else {
    bullets = rawBullets.slice(0, 3);
    while (bullets.length < 3 && fallback.bullets[bullets.length]) {
      bullets.push(fallback.bullets[bullets.length]!);
    }
    if (bullets.length === 0) pullQuote = fallback.pullQuote ?? headline;
  }

  const proposedLayout = isPosterDesignLayout(obj.layout_variant)
    ? obj.layout_variant
    : fallback.layout;
  const proposedPalette = isPosterPaletteId(obj.palette_id) ? obj.palette_id : fallback.paletteId;
  const rotated = avoidRepetition(
    { layout: proposedLayout, paletteId: proposedPalette },
    recentlyUsed,
  );

  const style = isPosterVisualStyle(obj.visual_style) ? obj.visual_style : fallback.visualStyle;
  const palette = paletteById(rotated.paletteId) ?? POSTER_PALETTES[0]!;
  const texture = isPosterTexture(obj.texture) ? obj.texture : TEXTURE_OF_LAYOUT[rotated.layout];
  const fallbackSubject = clampText(article.title, 180) || "the story's central subject";
  let imagePrompt = clampText(obj.image_prompt, 1200);
  if (!imagePrompt) {
    imagePrompt = `${style} of ${fallbackSubject}. Colour mood: ${palette.label} (${palette.mood}), background ${palette.bg}, accent ${palette.accent}. Wide composition with one clear focal subject and generous negative space.`;
  }
  if (!imagePrompt.includes(palette.accent)) {
    // The palette is a render decision, not a suggestion: if the model's prompt
    // names a different colour mood, the accent and ground are appended so the
    // focal visual and the CSS frame belong to the same page.
    imagePrompt = `${imagePrompt.replace(/[\s.]+$/, "")}. Colour direction: background ${palette.bg}, accent ${palette.accent}, mood ${palette.mood}.`;
  }
  if (!/no text|without text|text-free/i.test(imagePrompt)) {
    imagePrompt = `${imagePrompt.replace(/[\s.]+$/, "")}. No text, no letters, no numbers, no logos, no watermark.`;
  }

  return {
    headline,
    highlightWord: highlight,
    bullets,
    pullQuote,
    badgeText: clampText(obj.badge_text, 24) || fallback.badgeText,
    footerText: clampText(obj.footer_text, 90) || fallback.footerText,
    layout: rotated.layout,
    paletteId: rotated.paletteId,
    visualStyle: style,
    texture,
    imagePrompt,
  };
}

/** Culture-shaped stories get a quote when their body carries first-person prose. */
function storySuggestsQuote(article: PosterArticle): boolean {
  return /["“”]|বলেন|বলেছেন|জানান|মনে করেন/.test(article.content ?? "");
}

/** The prompt actually sent to the model. Exported so a test can assert the window. */
export function artDirectorPrompt(
  article: PosterArticle,
  recentlyUsed: readonly RecentlyUsedDesign[] = [],
): string {
  const recent = recentlyUsed.slice(0, 5).map((r) => `${r.layout} / ${r.palette}`).join(", ");
  return [
    `TITLE: ${article.title ?? ""}`,
    `CATEGORY: ${article.category ?? "unknown"}`,
    `SOURCE: ${article.source ?? "unknown"}`,
    `PUBLISHED: ${article.publishedAt ?? ""}`,
    `SUMMARY: ${clampText(article.summary, 700)}`,
    `CONTENT: ${clampText(article.content, 2200)}`,
    `recently_used_designs: ${recent || "none"}`,
    "Design the poster and return the JSON object.",
  ].join("\n\n");
}

/**
 * Ask the art director for a plan, with the deterministic planner as the floor.
 *
 * A story must never lose its poster because a text model had a bad minute. The
 * LLM call is therefore best-effort; the fallback is a complete, story-specific
 * design that still rotates against the recent window.
 */
export async function directPosterDesign(
  article: PosterArticle,
  opts: ArtDirectorOptions = {},
): Promise<ArtDirectorResult> {
  const recent = opts.recentlyUsed ?? [];
  if (opts.offline) {
    return { plan: normalisePlan(null, article, recent), source: "fallback" };
  }
  try {
    const resolver = newResolver(opts.resolver ?? {});
    // The chain, not one row: a 429 on the first free provider must not demote a
    // live request to the fallback while the next provider is healthy. This is
    // the same free-first walk the rewrite path uses.
    const attempted = new Set<string>();
    const errors: string[] = [];
    for (let attempt = 0; attempt < 4; attempt++) {
      const active = await resolver.next("rewrite", {
        signal: opts.signal,
        excludeProviderIds: attempted,
      });
      if (!active) break;
      attempted.add(active.row.id);
      if (typeof active.provider.generateJson !== "function") {
        errors.push(`${active.provider.name}: no structured-output support`);
        continue;
      }
      try {
        const raw = await active.provider.generateJson(
          {
            system: SYSTEM_PROMPT,
            user: artDirectorPrompt(article, recent),
            schema: ART_DIRECTOR_SCHEMA as unknown as Record<string, unknown>,
            maxOutputTokens: 2048,
            temperature: 0.8,
          },
          opts.signal,
        );
        resolver.markSuccess(active.row.id, active.row.display_name);
        return { plan: normalisePlan(raw, article, recent), source: "llm" };
      } catch (err) {
        const e = err as ProviderError | Error;
        resolver.markFailure(
          active.row.id,
          e instanceof ProviderError ? e.kind : "unknown",
        );
        errors.push(`${active.provider.name}: ${e.message}`);
      }
    }
    return {
      plan: normalisePlan(null, article, recent),
      source: "fallback",
      warning: errors.length
        ? `art director unavailable: ${errors.join(" | ")}`
        : "no text provider is active — deterministic art direction used",
    };
  } catch (err) {
    const message = err instanceof ProviderError ? err.message : err instanceof Error ? err.message : String(err);
    return {
      plan: normalisePlan(null, article, recent),
      source: "fallback",
      warning: `art director unavailable: ${message}`,
    };
  }
}

/** Exposed for the route's response and for the CMS label. */
/**
 * Re-aim a landscape image prompt at the portrait frame.
 *
 * The art director writes for 16:9 because that is the primary card. When the
 * same plan is also drawn at 4:5, reusing "wide composition" would ask the image
 * model for a subject that the vertical crop cuts in half. The aspect ratio is
 * passed to the image API separately; this only fixes the prose.
 */
export function orientImagePrompt(prompt: string, aspect: "16:9" | "4:5"): string {
  if (aspect === "16:9" || /vertical 4:5 composition/i.test(prompt)) return prompt;
  const vertical = prompt
    .replace(/\bwide\b/gi, "vertical")
    .replace(/\blandscape\b/gi, "portrait")
    .replace(/16:9/g, "4:5")
    .replace(/[\s.]+$/, "");
  return `${vertical}. Vertical 4:5 composition, the subject in the upper two thirds with calm space below for a headline.`;
}

/** Exposed for the route's response and for the CMS label. */
export function paletteSummary(plan: PosterDesignPlan) {
  const palette = paletteById(plan.paletteId) ?? POSTER_PALETTES[0]!;
  return {
    id: palette.id,
    label: palette.label,
    mood: palette.mood,
    bg: palette.bg,
    accent: palette.accent,
    cardBg: palette.cardBg,
    textPrimary: palette.textPrimary,
    textMuted: palette.textMuted,
  };
}

/** A trim that counts code points, not UTF-16 units (Bangla clusters are wide). */
export function trimTo(text: string, max: number): string {
  return Array.from(text).slice(0, max).join("");
}

export { paletteById };
