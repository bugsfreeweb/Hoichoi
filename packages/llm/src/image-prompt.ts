/**
 * Editorial image brief — content-first, in the shape newspaper art desks use.
 *
 * The bug this fixes: the prompt used to be a category scene plus the Bangla
 * headline pasted in after "বিষয়:". Models that do not read Bengali (FLUX and
 * the Pollinations hosts) answered with the *style* and ignored the subject, so
 * every article rendered as the same generic illustration, and the ones that do
 * read Bengali sometimes rendered the headline *as text inside the picture* —
 * which is worse, because a newspaper never puts its own headline inside a
 * drawing.
 *
 * So the brief now follows the structure a real art director asks for, entirely
 * in English:
 *
 *   Central idea → Visual metaphor → Subject → Setting → Style →
 *   Composition (with empty space for the headline) → Palette → Mood → Avoid
 *
 * Two things make it article-specific rather than a template with the title
 * dropped in:
 *  - a metaphor bank keyed by what the story is actually about (bribery, a
 *    flooding river, a court verdict, a market price, a match…), chosen by
 *    matching the article's own words, and
 *  - a deterministic variant pick (medium, palette, mood, which side the empty
 *    space sits on) hashed from the headline, so the same story always produces
 *    the same picture and two different stories do not.
 *
 * The Bangla text never enters the prompt. It is the *source of meaning*, not a
 * string to render: the picture is described in English, which every image model
 * follows, and the brief explicitly forbids any lettering.
 */

export interface ImageBriefInput {
  title?: string | null;
  summary?: string | null;
  body?: string | null;
  category?: string | null;
  tags?: string[] | null;
  /** Target frame; defaults to the horizontal hero frame. */
  aspectRatio?: ImageAspectRatio;
}

export type ImageAspectRatio = "16:9" | "4:3" | "1:1" | "9:16";

/** Frame → the pixel size providers actually accept. */
export const IMAGE_SIZE_BY_RATIO: Record<ImageAspectRatio, string> = {
  "16:9": "1536x1024",
  "4:3": "1024x768",
  "1:1": "1024x1024",
  "9:16": "1024x1536",
};

/**
 * Provider size for a ratio. Kept next to the brief because a 16:9 brief with no
 * `size` is silently padded to a square by most hosts — the hero then gets cropped
 * to its centre by the card layout and the composition (empty space on one side)
 * is thrown away.
 */
export function imageSizeFor(ratio?: string | null): string {
  const key = (ratio ?? "").replace(/\s+/g, "") as ImageAspectRatio;
  return IMAGE_SIZE_BY_RATIO[key] ?? IMAGE_SIZE_BY_RATIO["16:9"];
}

/** Human-facing frame name used inside the prompt. */
function frameFor(ratio: ImageAspectRatio): string {
  switch (ratio) {
    case "1:1":
      return "square 1:1 frame";
    case "9:16":
      return "vertical 9:16 frame";
    case "4:3":
      return "landscape 4:3 frame";
    default:
      return "horizontal 16:9 frame";
  }
}

/**
 * A concrete scene sentence per editorial category, in English so non-Bengali
 * image models (FLUX / Pollinations) can follow it. Unknown categories fall
 * back to a neutral editorial-news scene.
 */
export const SCENE_BY_CATEGORY: Record<string, string> = {
  politics: "a press conference and national-assembly session in a government building with political banners",
  national: "a national news briefing at the secretariat with officials and microphones",
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

/** English labels, so the prompt's "about …" clause is readable by any model. */
const CATEGORY_LABEL: Record<string, string> = {
  politics: "national politics",
  national: "the country",
  accident: "a road accident",
  crime: "crime and policing",
  "law-order": "law and order",
  corruption: "corruption and public money",
  economy: "the economy and prices",
  business: "business and markets",
  education: "education",
  health: "health and hospitals",
  "medical-science": "medical research",
  science: "science and research",
  research: "research",
  sports: "sport",
  technology: "technology",
  tech: "technology",
  ai: "artificial intelligence",
  environment: "the environment",
  weather: "the weather",
  entertainment: "entertainment",
  culture: "culture and tradition",
  "history-traditions": "heritage",
  literature: "literature",
  lifestyle: "everyday life",
  obituary: "a life remembered",
  viral: "a moment that went viral",
  inspiration: "an inspiring story",
  "helping-others": "people helping each other",
  humanity: "humanity",
  "social-welfare": "social welfare",
  diaspora: "the diaspora",
  international: "world affairs",
  opinion: "opinion",
  "rural-life": "rural life",
  religion: "faith and community",
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

type Mood = "serious" | "hopeful" | "urgent" | "reflective" | "ironic";

/**
 * One metaphor per kind of story. `keys` are matched against the article's own
 * words (Bangla in the text, English in the cues), so the picture is chosen by
 * what happened rather than by which folder the editor filed it in.
 */
interface Metaphor {
  id: string;
  keys: RegExp;
  category?: string;
  tension: string;
  metaphor: string;
  subject: string;
  setting: string;
  mood: Mood;
}

const METAPHORS: readonly Metaphor[] = [
  {
    id: "bribery",
    keys: /ঘুষ|দুর্নীতি|কেলেঙ্কারি|লেনদেন|অনিয়ম|bribe|corruption/i,
    category: "corruption",
    tension: "public money passing through private hands",
    metaphor: "a gloved hand slipping a sealed envelope into a puppet that wears an official badge",
    subject: "one hand offering an envelope, and a wooden puppet whose strings are held from above",
    setting: "a dim records room with stacked files and a single desk lamp",
    mood: "urgent",
  },
  {
    id: "prices",
    keys: /দাম|মূল্য|বাজার|মুদ্রাস্ফীতি|ঋণ|ব্যাংক|রেমিট্যান্স|price|inflation|market/i,
    category: "economy",
    tension: "costs climbing faster than incomes",
    metaphor: "a pair of scales where a stack of coins outweighs a shopping basket",
    subject: "an empty shopping basket hanging from one arm of a great brass scale",
    setting: "a bare morning market street with shuttered stalls",
    mood: "serious",
  },
  {
    id: "flood",
    keys: /বন্যা|বৃষ্টি|বর্ষা|জলোচ্ছ্বাস|উপকূল|প্লাবন|flood|rain|monsoon/i,
    category: "environment",
    tension: "water arriving before help does",
    metaphor: "a household's rooftop standing alone as an island in brown floodwater",
    subject: "a rooftop with a bundle of belongings and a lamp, and a boat rowing toward it",
    setting: "still floodwater under a grey, breaking sky",
    mood: "urgent",
  },
  {
    id: "road",
    keys: /সড়ক|দুর্ঘটনা|বাস|ট্রাক|মোটরসাইকেল|accident|road/i,
    category: "accident",
    tension: "speed meeting a road that offers no protection",
    metaphor: "a bent traffic sign leaning over an empty highway at dusk",
    subject: "a twisted road sign and skid marks leading out of frame",
    setting: "a wide, empty highway under a low evening sky",
    mood: "serious",
  },
  {
    id: "policing",
    keys: /পুলিশ|গ্রেফতার|চুরি|হত্যা|তদন্ত|র‍্যাব|অপরাধ|police|arrest|crime/i,
    category: "crime",
    tension: "order arriving after the harm",
    metaphor: "police tape stretched across a street lamp's small circle of light",
    subject: "a strip of police tape and a pair of boots at the edge of the light",
    setting: "a narrow street at night with one working street lamp",
    mood: "serious",
  },
  {
    id: "verdict",
    keys: /আদালত|কোর্ট|রায়|কারাদণ্ড|মামলা|বিচার|court|verdict|trial/i,
    category: "law-order",
    tension: "a verdict carrying more weight than the testimony",
    metaphor: "a gavel resting on a tall stack of paper while one loose page drifts away",
    subject: "a wooden gavel and a leaning tower of case files",
    setting: "a courtroom desk under hard, narrow light",
    mood: "reflective",
  },
  {
    id: "politics",
    keys: /সংসদ|নির্বাচন|বাজেট|মন্ত্রী|সরকার|প্রধানমন্ত্রী|রাষ্ট্রপতি|দল|politics|election|budget/i,
    category: "politics",
    tension: "promises competing with delivery",
    metaphor: "two empty podiums facing each other beneath one hanging microphone",
    subject: "two podiums and a microphone suspended between them",
    setting: "an assembly hall with tall columns and hard shadows",
    mood: "serious",
  },
  {
    id: "education",
    keys: /শিক্ষা|স্কুল|বিশ্ববিদ্যালয়|পরীক্ষা|শিক্ষক|ছাত্র|ভর্তি|exam|school|university/i,
    category: "education",
    tension: "one result deciding years of work",
    metaphor: "an exam paper on a desk with an open door far in the background",
    subject: "a single sheet of paper under a desk lamp, and a distant doorway of light",
    setting: "a quiet classroom after hours",
    mood: "reflective",
  },
  {
    id: "care",
    keys: /হাসপাতাল|চিকিৎসা|ডাক্তার|রোগী|ওষুধ|স্বাস্থ্য|hospital|doctor|patient|health/i,
    category: "health",
    tension: "care waiting at the end of a long queue",
    metaphor: "an empty hospital bench beside a lit corridor that stretches away",
    subject: "an empty bench, a drip stand and a corridor of closed doors",
    setting: "a hospital corridor at night",
    mood: "serious",
  },
  {
    id: "machines",
    keys: /প্রযুক্তি|কৃত্রিম বুদ্ধিমত্তা|এআই|রোবট|সার্ভার|ডেটা|সাইবার|technology|artificial intelligence/i,
    category: "technology",
    tension: "machines learning faster than rules are written",
    metaphor: "a human hand and a wireframe hand reaching for the same switch",
    subject: "a real hand and a translucent hand meeting above a single switch",
    setting: "a dark room lit only by rows of small indicator lights",
    mood: "serious",
  },
  {
    id: "match",
    keys: /ক্রিকেট|ফুটবল|ম্যাচ|খেলা|স্টেডিয়াম|অলিম্পিক|cricket|football|match|sport/i,
    category: "sports",
    tension: "one moment deciding a whole season",
    metaphor: "a stadium floodlight over an empty pitch with a single ball at the centre",
    subject: "an empty pitch, one ball, and a floodlight pylon",
    setting: "a stadium at dusk with empty stands",
    mood: "hopeful",
  },
  {
    id: "climate",
    keys: /পরিবেশ|জলবায়ু|দূষণ|বৃক্ষ|অরণ্য|তাপমাত্রা|climate|pollution|forest/i,
    category: "environment",
    tension: "the ground changing under ordinary lives",
    metaphor: "a lone tree standing on cracked earth with a skyline behind it",
    subject: "a single tree and a distant skyline of towers",
    setting: "cracked dry ground under a wide pale sky",
    mood: "reflective",
  },
  {
    id: "distance",
    keys: /প্রবাসী|শ্রমিক|বিদেশ|ভিসা|flight|migrant|abroad/i,
    category: "diaspora",
    tension: "distance as the price of a future",
    metaphor: "a suitcase, a passport and a transfer slip on a bare table",
    subject: "a worn suitcase and an open passport under a single overhead light",
    setting: "an empty departure hall",
    mood: "reflective",
  },
  {
    id: "faith",
    keys: /ধর্ম|মসজিদ|মন্দির|ঈদ|পূজা|উৎসব|prayer|festival|religion/i,
    category: "religion",
    tension: "tradition holding a community together",
    metaphor: "lanterns rising through arches while a crowd gathers in shadow",
    subject: "hanging lanterns and the silhouettes of a gathered crowd",
    setting: "an arched courtyard at dusk",
    mood: "hopeful",
  },
  {
    id: "stage",
    keys: /সিনেমা|গান|সঙ্গীত|নাটক|অনুষ্ঠান|সেলিব্রিটি|cinema|music|stage/i,
    category: "entertainment",
    tension: "attention moving in waves",
    metaphor: "one microphone standing in a spotlight before a closed curtain",
    subject: "a microphone on an empty stage and a half-drawn curtain",
    setting: "a theatre stage seen from the wings",
    mood: "hopeful",
  },
  {
    id: "remembered",
    keys: /মৃত্যু|শোক|সমাধি|স্মরণ|obituary|memorial|death/i,
    category: "obituary",
    tension: "a life leaving a room quiet",
    metaphor: "an empty chair beside a lamp and a picture frame turned to the wall",
    subject: "an empty chair, a warm lamp and a turned frame",
    setting: "a plain room in late afternoon light",
    mood: "reflective",
  },
  {
    id: "going-viral",
    keys: /ভাইরাল|সোশ্যাল|ফেসবুক|টিকটক|ভিডিও|viral|social media/i,
    category: "viral",
    tension: "a moment becoming the whole story",
    metaphor: "a phone screen glowing above a crowd of faceless silhouettes",
    subject: "one glowing phone held up above silhouetted heads",
    setting: "a crowded street at night",
    mood: "ironic",
  },
  {
    id: "aid",
    keys: /ত্রাণ|সহায়তা|অনুদান|স্বেচ্ছাসেবক|দান|aid|relief|volunteer/i,
    category: "helping-others",
    tension: "help arriving one hand at a time",
    metaphor: "two hands passing a box through a lit doorway",
    subject: "two pairs of hands and a plain cardboard box",
    setting: "a doorway with hard daylight outside",
    mood: "hopeful",
  },
  {
    id: "harvest",
    keys: /কৃষি|কৃষক|ধান|ফসল|গ্রাম|farmer|harvest|paddy/i,
    category: "rural-life",
    tension: "a harvest depending on what the sky allows",
    metaphor: "a farmer's distant silhouette against a huge sky over a paddy field",
    subject: "a small figure with a tool at the edge of a field",
    setting: "an open paddy field under a wide sky",
    mood: "reflective",
  },
  {
    id: "grid",
    keys: /গ্যাস|তেল|বিদ্যুৎ|জ্বালানি|লোডশেডিং|fuel|power|electricity/i,
    category: "economy",
    tension: "the grid deciding who works today",
    metaphor: "a row of shopfronts with one window still lit",
    subject: "shuttered shopfronts and a single lit window",
    setting: "a narrow shopping street after dark",
    mood: "serious",
  },
  {
    id: "crossing",
    keys: /সেতু|রেল|মেট্রো|বিমানবন্দর|bridge|rail|metro|airport/i,
    category: "national",
    tension: "a country connecting itself slowly",
    metaphor: "a half-built bridge reaching over water with small signal flags",
    subject: "the unfinished span of a bridge and a few marker flags",
    setting: "wide water under an overcast sky",
    mood: "hopeful",
  },
  {
    id: "heat",
    keys: /গরম|তাপপ্রবাহ|শৈত্যপ্রবাহ|ঝড়|ঘূর্ণিঝড়|heatwave|storm|cyclone/i,
    category: "weather",
    tension: "the weather setting the day's terms",
    metaphor: "a shuttered shop under a heavy, low sky and one bare tree",
    subject: "a closed shutter, a bare tree and blowing dust",
    setting: "an empty street under a low sky",
    mood: "urgent",
  },
];

/**
 * English art-direction mediums; one per variant slot.
 *
 * Each phrase carries a *medium* marker ("brush edges", "line work", "flat shapes")
 * on purpose. A measured render of the brief without them came back as a
 * "softly lit vintage still-life photograph": FLUX happily reads "illustration"
 * as a prompt for a photo of a drawing, so the medium has to be described, not
 * named.
 */
const STYLES = [
  "gouache painting with visible brush edges and flat opaque shapes",
  "ink line work with loose watercolour washes",
  "flat vector shapes with a printed-paper grain and no gradients",
  "hand-drawn line art with a visible pencil underlayer",
  "cut-paper collage with hard cut edges and paper shadows",
] as const;

/** Muted, professional 3–4 colour sets. */
const PALETTES = [
  "deep indigo, warm ochre, dusty teal and off-white",
  "charcoal, brick red, muted mustard and ivory",
  "forest green, slate blue, cream and terracotta",
  "ink black, faded sepia, sage and pale rose",
] as const;

/** Stable 32-bit hash (FNV-1a) — same text, same picture, every run. */
export function briefSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function pick<T>(list: readonly T[], seed: number, salt: number): T {
  return list[(seed + salt * 2654435761) % list.length] as T;
}

/** Which metaphor the article is really about, by its own words. */
export function pickMetaphor(text: string, category?: string | null): Metaphor {
  const slug = (category ?? "").toLowerCase();
  let best: Metaphor | null = null;
  let bestScore = 0;
  const seed = briefSeed(`${category ?? ""}|${text.slice(0, 200)}`);
  for (const m of METAPHORS) {
    let score = 0;
    const hits = text.match(new RegExp(m.keys.source, "gi"));
    if (hits) score += Math.min(4, hits.length) * 2;
    if (m.category && m.category === slug) score += 3;
    if (score > bestScore) {
      best = m;
      bestScore = score;
    }
  }
  if (best) return best;
  // Nothing matched: a neutral "a system and the people inside it" metaphor,
  // still specific enough to draw.
  return {
    id: "neutral",
    keys: /$^/,
    tension: "a system and the people who depend on it",
    metaphor: "one hand-drawn figure standing before a wall of filing boxes and open ledgers",
    subject: "a single standing figure and a wall of stacked boxes",
    setting: "a plain room with a tall window and long shadows",
    mood: pick<Mood>(["serious", "reflective", "hopeful"], seed, 3),
  };
}

export interface ImageBrief {
  scene: string;
  cues: string[];
  subject: string;
  prompt: string;
  negative: string;
  /** The editorial structure, so a UI can show or edit each line. */
  topic: string;
  tension: string;
  metaphor: string;
  setting: string;
  style: string;
  composition: string;
  palette: string;
  mood: Mood;
  aspectRatio: ImageAspectRatio;
  size: string;
  seed: number;
}

/** What a render must never contain. Also handed to providers that take a negative. */
export const EDITORIAL_IMAGE_NEGATIVE =
  "photorealism, photograph, photographic, 3d render, depth of field, bokeh, misleading realism, " +
  "readable text, letters, words, numbers, captions, headlines, writing on documents, logos, " +
  "watermarks, brand marks, clutter, extra unrelated objects, recognizable faces, children. " +
  "no text, no letters, no words, no captions, no logos, no watermarks, no recognisable faces, no children.";

/**
 * One complete editorial brief, in the order an art director reads it.
 *
 * `prompt` is what goes to the model; the other fields exist so the console can
 * show *why* the picture looks the way it does and a test can assert each line.
 */
export function buildImageBrief(input: ImageBriefInput): ImageBrief {
  const title = (input.title?.trim() ?? "").slice(0, 180);
  const summary = input.summary?.trim() ?? "";
  const body = input.body?.trim() ?? "";
  const text = [title, summary, body, ...(input.tags ?? [])].filter(Boolean).join(" ");
  const slug = (input.category ?? "").toLowerCase();
  const cues = extractVisualCues(text);
  const seed = briefSeed(`${slug}|${title}|${summary.slice(0, 120)}`);

  const metaphor = pickMetaphor(text, input.category);
  const style = pick<string>(STYLES, seed, 1);
  const palette = pick<string>(PALETTES, seed, 2);
  const mood = metaphor.mood;
  const aspectRatio: ImageAspectRatio = input.aspectRatio ?? "16:9";
  const side = aspectRatio === "9:16" ? (seed % 2 ? "top" : "bottom") : seed % 2 ? "left" : "right";

  // The topic line is English on purpose: it is what the model understands, and
  // it is assembled from extracted cues rather than from the Bangla sentence, so
  // nothing in the prompt can be mistaken for lettering to render.
  const label = CATEGORY_LABEL[slug] ?? "the news of the day";
  const cueTail = cues.length ? ` (${cues.slice(0, 4).join(", ")})` : "";
  const topic = `${label}${cueTail}`;

  // The empty-space clause names what the space *is* (a plain wash) as well as
  // where it is; "generous empty space" alone was filled with props.
  const composition =
    `${frameFor(aspectRatio)}, clear focal point, generous empty space on the ${side} for the headline ` +
    "(a plain uncluttered wash of background colour), main subject on the opposite side";
  // "Not a photograph" is stated twice on purpose: once as the medium, once as a
  // negative, because an image model reads "illustration" as a subject and then
  // renders a photo of one.
  const styleLine =
    `modern editorial illustration, ${style}, simplified but expressive figures, ` +
    "drawn by hand rather than photographed";
  const paletteLine = `${palette}, muted and professional, subtle paper texture`;

  // The medium leads. Image models weight early tokens hardest, and a measured
  // render with the medium only in the middle of the prompt (and nothing before
  // the subject) came back as "a softly lit vintage still-life photograph" of a
  // drawing — the style word was read, the medium was not. Leading with
  // "hand-drawn ink and gouache editorial illustration, not a photograph" is the
  // one change that reliably moves the render out of photography.
  const prompt = [
    `Hand-drawn editorial illustration, ink and gouache on paper, not a photograph: a newspaper op-ed drawing about ${topic}.`,
    `Central idea: ${metaphor.tension}.`,
    `Visual metaphor: ${metaphor.metaphor}.`,
    `Subject: ${metaphor.subject}.`,
    `Setting: ${metaphor.setting}.`,
    `Style: ${styleLine}.`,
    `Composition: ${composition}.`,
    `Color palette: ${paletteLine}.`,
    `Mood: ${mood}.`,
    "Avoid: photorealism, photographs, 3d renders, depth of field, bokeh, misleading realism, " +
      "readable text, letters, writing on documents (papers and signs must be blank), logos, " +
      "watermarks, clutter, extra unrelated objects.",
  ].join("\n");

  return {
    scene: sceneForCategory(input.category),
    cues,
    subject: metaphor.subject,
    prompt,
    negative: EDITORIAL_IMAGE_NEGATIVE,
    topic,
    tension: metaphor.tension,
    metaphor: metaphor.metaphor,
    setting: metaphor.setting,
    style: styleLine,
    composition,
    palette: paletteLine,
    mood,
    aspectRatio,
    size: imageSizeFor(aspectRatio),
    seed,
  };
}

/**
 * How much of the bottom of a render to shave off, by provider.
 *
 * Only the keyless Pollinations hosts need it: they stamp a small
 * `pollinations.ai` mark in the bottom-right corner and keep doing it with
 * `nologo=true` and a referrer set. A newspaper cannot publish someone else's
 * mark, so the caller trims a thin band rather than shipping a watermark. Every
 * other provider returns 0 — cropping a paid render would be a layout decision,
 * not a legal one, and this function must not become a general "crop a bit".
 */
export function watermarkTrimFraction(provider: string | null | undefined): number {
  return /pollinations/i.test(provider ?? "") ? 0.08 : 0;
}

/** Convenience one-liner for callers that only need the prompt string. */
export function editorialImagePrompt(input: ImageBriefInput): string {
  return buildImageBrief(input).prompt;
}
