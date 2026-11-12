/**
 * Content-aware image prompt builder.
 *
 * Why this exists: the old prompt was a constant style sentence with the
 * article appended as "বিষয়: …". Image models that don't read Bengali (FLUX,
 * most Pollinations hosts) answered with the *style* and ignored the subject,
 * so every article produced effectively the same picture — the "images never
 * match the story" bug.
 *
 * This builder pivots the prompt away from style-first and toward **content
 * first**: it derives a concrete, mostly-English visual scene from the article
 * (category scene + extracted proper nouns, numbers and place-name hints), then
 * appends the actual headline and a short style tail. The result varies with
 * each article instead of collaging the same generic illustration.
 */

export interface ImageBriefInput {
  title?: string | null;
  summary?: string | null;
  body?: string | null;
  category?: string | null;
  tags?: string[] | null;
}

/**
 * A concrete scene sentence per editorial category, in English so non-Bengali
 * image models (FLUX / Pollinations) can follow it. Unknown categories fall
 * back to a neutral editorial-news scene.
 */
export const SCENE_BY_CATEGORY: Record<string, string> = {
  politics: "a press conference and national-assembly session in a government building with political banners",
  "national": "a national news briefing at the secretariat with officials and microphones",
  accident: "an emergency scene with a damaged vehicle, flashing hazard lights and rescue workers on a road",
  crime: "a quiet street cordoned off by police tape at dusk with an investigator in a reflective vest",
  "law-order": "a courthouse entrance with a police escort and a uniformed officer keeping order",
  corruption: "a stack of documents and envelopes under a desk lamp in a dim archive room",
  economy: "a bustling city business district with currency symbols and a stock ticker in the background",
  business: "a modern office tower with charts and a busy trading floor",
  education: "a classroom with students and a teacher at a chalkboard, warm morning light",
  health: "a hospital corridor with a doctor in scrubs beside medical equipment",
  "medical-science": "a clean laboratory with a researcher, microscope and test tubes",
  science: "a research laboratory with a scientist, beakers and a model of a molecule",
  research: "a scholar at a desk surrounded by books, papers and a laptop",
  sports: "a packed stadium during action with a player mid-attempt under floodlights",
  technology: "a futuristic data centre and circuitry, softly glowing server racks",
  tech: "a futuristic data centre with glowing server racks and cables",
  ai: "a glowing network of neural connections in a dark room with a processor core",
  environment: "a lush landscape with a river and a small team in bright vests, clear sky",
  weather: "a dramatic sky with rainclouds and a weather map overlay",
  entertainment: "a brightly lit stage with a crowd silhouetted against concert lights",
  culture: "a colourful festival gathering with lanterns and traditional dress",
  "history-traditions": "an old heritage building with traditional architecture and a crowd of visitors",
  literature: "an open antique book on a wooden desk with a pen and warm lamp light",
  lifestyle: "an everyday domestic scene with people in a modern home, soft daylight",
  obituary: "a quiet memorial with candles, flowers and a framed portrait in soft light",
  viral: "a busy social-media moment with a phone screen showing a crowd reaction",
  inspiration: "an ambitious figure on a hilltop at sunrise looking toward the horizon",
  "helping-others": "volunteers handing out supplies to a relieved crowd in daylight",
  humanity: "diverse hands joined together in a warm, hopeful moment",
  "social-welfare": "community workers distributing aid boxes to a grateful family",
  diaspora: "a cosmopolitan city street with a blend of cultures and luggage at an airport",
  international: "a world map with flags and an international conference hall",
  opinion: "a journalist at a typewriter at a desk in a newsroom",
  "rural-life": "a green paddy field with a farmer at work under a wide open sky",
  religion: "a serene place of worship with warm light through arches",
  "missing-children": "a symbolic scene of a lantern being lit beside a sign with an uplifted child silhouette",
};

/** Common Bengali → English clue phrases that tell an image model where/who/what. */
const CLUE_GLOSSARY: ReadonlyArray<readonly [RegExp, string]> = [
  [/ঢাকা/i, "Dhaka"], [/চট্টগ্রাম|চাঁদপুর/i, "Chattogram"], [/রাজশাহী/i, "Rajshahi"],
  [/খুলনা/i, "Khulna"], [/সিলেট/i, "Sylhet"], [/বরিশাল/i, "Barishal"], [/রংপুর/i, "Rangpur"],
  [/ময়মনসিংহ/i, "Mymensingh"], [/কুমিল্লা/i, "Cumilla"], [/ডিজিটাল/i, "digital"],
  [/আন্তর্জাতিক/i, "international"], [/রাষ্ট্রপতি/i, "president"], [/প্রধানমন্ত্রী/i, "prime minister"],
  [/পুলিশ/i, "police"], [/আদালত|কোর্ট/i, "court"], [/হাসপাতাল/i, "hospital"], [/বিশ্ববিদ্যালয়/i, "university"],
  [/স্কুল/i, "school"], [/সেনা|সেনাবাহিনী/i, "army"], [/সীমান্ত/i, "border"],
  [/রেল|ট্রেন/i, "train"], [/বিমান/i, "aircraft"], [/জাহাজ/i, "ship"], [/সেতু/i, "bridge"],
  [/বর্ষা|বৃষ্টি/i, "monsoon rain"], [/বন্যা/i, "flood"], [/ভূমিকম্প/i, "earthquake"],
  [/অর্থনীতি/i, "economy"], [/স্টক|শেয়ার/i, "stock market"], [/গ্যাস|তেল/i, "fuel"],
  [/ক্রিকেট/i, "cricket"], [/ফুটবল/i, "football"], [/অলিম্পিক/i, "Olympics"],
];

/** Extract concrete visual cues from the raw article text (names, numbers, glossary). */
export function extractVisualCues(text: string): string[] {
  if (!text) return [];
  const cues = new Set<string>();
  for (const [re, label] of CLUE_GLOSSARY) if (re.test(text)) cues.add(label);
  // Latin-script proper nouns / English fragments (e.g. "NVIDIA", "Alice Huang").
  for (const m of text.matchAll(/\b[A-Za-z][A-Za-z0-9&.'+#-]{2,}\b/g)) {
    const w = m[0];
    if (/^(the|you|and|for|are|was|with|from|this|that|news|post|https|www|com|said|not|has|had|Will|via|more)$/i.test(w)) continue;
    cues.add(w);
  }
  // Quantities + units ("৩০০ কোটি", "১২ জন", "1.5 million").
  // Bengali digits (০-৯) are not matched by \d, so both ranges are listed.
  for (const m of text.matchAll(/([\d০-৯][\d০-৯,.]*\s*(?:কোটি|লাখ|লক্ষ|হাজার|মিলিয়ন|billion|million|%|km|kg))/gi)) {
    cues.add(`figure ${m[0].trim()}`);
  }
  return [...cues].slice(0, 10);
}

/** The scene sentence for a category, falling back to a neutral editorial scene. */
export function sceneForCategory(category?: string | null): string {
  return SCENE_BY_CATEGORY[category?.toLowerCase() ?? ""] ??
    "an editorial news scene relevant to the story described below";
}

export interface ImageBrief {
  scene: string;
  cues: string[];
  subject: string;
  prompt: string;
  negative: string;
}

/** One flat prompt string that varies with the article and leads with content. */
export function buildImageBrief(input: ImageBriefInput): ImageBrief {
  // Titles are clamped: an unbounded headline (some sources paste the whole
  // caption) pushed the prompt past the model's limit and the tail — style,
  // negative rules, brand palette — was silently dropped.
  const title = (input.title?.trim() ?? "").slice(0, 180);
  const summary = input.summary?.trim() ?? "";
  const body = input.body?.trim() ?? "";
  const text = [title, summary, body, ...(input.tags ?? [])].filter(Boolean).join(" ");
  const scene = sceneForCategory(input.category);
  const cues = extractVisualCues(text);

  // Subject line: keep the real headline verbatim (Gemini/clip models read
  // Bangla fine) AND a short plain-English gloss for the models that don't.
  const subjectGloss = cues.length ? ` (${cues.slice(0, 4).join(", ")})` : "";
  const subject = title ? `${title}${subjectGloss}` : `an editorial news scene${subjectGloss}`;
  const subjectLine = summary ? `${subject}. ${summary.slice(0, 220)}` : subject;

  const sceneLine = scene;
  const cueLine = cues.length ? `Details to include: ${cues.join("; ")}.` : "";

  const prompt = [
    `Illustration of ${sceneLine}.`,
    cueLine,
    subjectLine,
    "Style tail: cinematic editorial illustration for Hoichoi, a Bangla news desk — muted charcoal palette with warm ivory light and one restrained red accent, shallow depth of field, dignified journalism tone.",
  ].filter((line) => line.length > 0).join("\n");

  return {
    scene: sceneLine,
    cues,
    subject: subjectLine,
    prompt,
    negative:
      "no text, no letters, no words, no captions, no logos, no watermarks, no recognisable faces, no children.",
  };
}

/** Convenience one-liner for callers that only need the prompt string. */
export function editorialImagePrompt(input: ImageBriefInput): string {
  return buildImageBrief(input).prompt;
}

/** Every editorial image must avoid these; surfaces the negative prompt too. */
export const EDITORIAL_IMAGE_NEGATIVE = buildImageBrief({}).negative;
