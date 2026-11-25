/**
 * Concrete things a story is about, in words an image model can draw.
 *
 * A headline is not a picture. "Small cars gain popularity among young people
 * in Europe" contains four drawable facts — young adults, small cars, European
 * streets, and the shift in who drives them — but an image model given only the
 * headline draws a showroom or a generic crowd. This module turns the article
 * into an ordered visual brief: who, where, what, what they wear, what the place
 * looks like, and what it is made of.
 *
 * It is deliberately a lexicon, not a second LLM call: the brief is needed on
 * the offline fallback path too, it must be deterministic, and it must never
 * invent a fact the article does not contain. Unknown stories simply return
 * fewer lines and fall back to the existing metaphor engine.
 */

export type VisualSubjectKind =
  | "people"
  | "country"
  | "place"
  | "object"
  | "wardrobe"
  | "interior"
  | "exterior"
  | "material";

export interface VisualSubjects {
  people: string[];
  countries: string[];
  places: string[];
  objects: string[];
  wardrobe: string[];
  interiors: string[];
  exteriors: string[];
  materials: string[];
  /** Every label, in drawing order: people first, materials last. */
  labels: string[];
}

interface Entry {
  re: RegExp;
  kind: Exclude<VisualSubjectKind, "exterior"> | "exterior";
  label: string;
  /** A broader label this one makes redundant (e.g. compact cars vs a car). */
  suppresses?: string;
}

const ENTRY: readonly Entry[] = [
  // ── People and age groups ────────────────────────────────────────────────
  {
    re: /তরুণ|যুবক|যুবতী|যুবা|তরুণী|young\s+(?:people|adults?|drivers?|buyers?)|youth/i,
    kind: "people",
    label: "young adults, men and women in their twenties",
    suppresses: "adults",
  },
  {
    re: /শিক্ষার্থী|ছাত্রছাত্রী|ছাত্র|ছাত্রী|student|pupil/i,
    kind: "people",
    label: "university students in casual clothes",
  },
  {
    re: /কিশোর|টিনএজার|teenager|teen/i,
    kind: "people",
    label: "teenagers",
  },
  {
    re: /নারী|মহিলা|মেয়ে|\b(?:women|woman|female)\b/i,
    kind: "people",
    label: "women",
  },
  {
    re: /পুরুষ|ছেলে|\b(?:men|man|male)\b/i,
    kind: "people",
    label: "men",
  },
  {
    re: /শ্রমিক|কর্মী|worker|labourer|employee/i,
    kind: "people",
    label: "workers in practical work clothes",
  },
  {
    re: /কৃষক|চাষি|farmer/i,
    kind: "people",
    label: "a farmer in the field",
  },
  {
    re: /ডাক্তার|চিকিৎসক|নার্স|doctor|nurse/i,
    kind: "people",
    label: "medical staff in scrubs and white coats",
  },
  {
    re: /শিক্ষক|teacher/i,
    kind: "people",
    label: "a teacher",
  },
  {
    re: /ব্যবসায়ী|উদ্যোক্তা|entrepreneur|businessman|businesswoman/i,
    kind: "people",
    label: "a businessperson in a dark suit",
  },
  {
    re: /পরিবার|famil(?:y|ies)|parents|মা-বাবা/i,
    kind: "people",
    label: "a family",
  },
  {
    re: /বয়স্ক|প্রবীণ|elderly|older\s+(?:people|residents)/i,
    kind: "people",
    label: "elderly people",
  },
  {
    re: /স্বেচ্ছাসেবক|volunteer|rescue\s+worker/i,
    kind: "people",
    label: "relief volunteers in raincoats",
  },

  // ── Countries and regions ────────────────────────────────────────────────
  {
    re: /ইউরোপ|ইউরোপীয়|europe|european/i,
    kind: "country",
    label: "a European setting",
  },
  {
    re: /যুক্তরাষ্ট্র|আমেরিকা|america|united\s+states|\busa?\b/i,
    kind: "country",
    label: "an American setting",
  },
  {
    re: /যুক্তরাজ্য|ব্রিটেন|britain|united\s+kingdom|\buk\b/i,
    kind: "country",
    label: "a British setting",
  },
  { re: /ভারত|india|indian/i, kind: "country", label: "an Indian setting" },
  { re: /চীন|চিন|china|chinese/i, kind: "country", label: "a Chinese setting" },
  { re: /জাপান|japan|japanese/i, kind: "country", label: "a Japanese setting" },
  { re: /জার্মানি|germany|german/i, kind: "country", label: "a German setting" },
  { re: /ফ্রান্স|france|french/i, kind: "country", label: "a French setting" },
  {
    re: /বাংলাদেশ|bangladesh|bangladeshi/i,
    kind: "country",
    label: "a Bangladeshi setting",
  },
  { re: /পাকিস্তান|pakistan/i, kind: "country", label: "a Pakistani setting" },
  { re: /রাশিয়া|Russia/i, kind: "country", label: "a Russian setting" },
  { re: /ইউক্রেন|Ukraine/i, kind: "country", label: "a Ukrainian setting" },
  {
    re: /মধ্যপ্রাচ্য|middle\s+east/i,
    kind: "country",
    label: "a Middle Eastern setting",
  },
  { re: /আফ্রিকা|africa/i, kind: "country", label: "an African setting" },

  // ── Places, indoors and out ──────────────────────────────────────────────
  {
    re: /শহর|নগর|urban|city|city\s+street|downtown/i,
    kind: "exterior",
    label: "an urban street with pavements and parked cars",
  },
  {
    re: /গ্রাম|গ্রামীণ|rural|village|countryside/i,
    kind: "exterior",
    label: "a quiet rural road",
  },
  {
    re: /রাস্তা|সড়ক|street|road|highway|motorway/i,
    kind: "exterior",
    label: "a road receding toward the horizon",
  },
  {
    re: /পার্কিং|parking|car\s+park/i,
    kind: "exterior",
    label: "kerbside parking bays",
  },
  {
    re: /চার্জিং|charging|charger|electric\s+vehicle|\bev\b/i,
    kind: "object",
    label: "EV charging points",
  },
  {
    re: /বন্যা|বন্যায়|প্লাবিত|জলোচ্ছ্বাস|flood(?:s|ed|ing)?|floodwater/i,
    kind: "exterior",
    label: "floodwater covering a village road",
    suppresses: "a quiet rural road",
  },
  {
    re: /নৌকা|boat|ferry|rescue\s+craft/i,
    kind: "object",
    label: "wooden rescue boats",
  },
  {
    re: /আশ্রয়কেন্দ্র|ত্রাণ\s+শিবির|relief\s+camp|shelter|school\s+building\s+turned\s+into/i,
    kind: "place",
    label: "a schoolyard relief camp",
  },
  {
    re: /শোরুম|showroom|dealership/i,
    kind: "interior",
    label: "a bright car showroom floor",
  },
  {
    re: /কারখানা|ফ্যাক্টরি|factory|plant|assembly\s+line/i,
    kind: "interior",
    label: "a factory floor with an assembly line",
  },
  {
    re: /অফিস|office|workplace|কর্মক্ষেত্র/i,
    kind: "interior",
    label: "a modern open-plan office",
  },
  // "homes" is not a room. A flood or housing story says home without meaning
  // an interior; only an explicit room earns an indoor label.
  {
    re: /বসার\s+ঘর|living\s+room|drawing\s+room|interior\s+of\s+a\s+(?:home|house|flat)/i,
    kind: "interior",
    label: "a modest modern living room",
  },
  {
    re: /গাড়ির\s+ভিতর|car\s+interior|dashboard|cabin/i,
    kind: "interior",
    label: "a compact-car interior with a dashboard and seats",
  },
  {
    re: /হাসপাতাল|hospital|clinic/i,
    kind: "interior",
    label: "a hospital corridor",
  },
  {
    re: /ল্যাব|গবেষণাগার|laboratory|lab\b/i,
    kind: "interior",
    label: "a clean research laboratory",
  },
  {
    re: /বিশ্ববিদ্যালয়|ক্যাম্পাস|university|campus|college/i,
    kind: "exterior",
    label: "a university campus walkway",
  },
  {
    re: /স্টেডিয়াম|মাঠ|stadium|arena|pitch/i,
    kind: "exterior",
    label: "a stadium under floodlights",
  },
  {
    re: /বাজার|market|bazaar/i,
    kind: "exterior",
    label: "a busy street market",
  },
  {
    re: /বিমানবন্দর|airport|terminal/i,
    kind: "interior",
    label: "an airport departure hall",
  },
  {
    re: /রেল\s*স্টেশন|station|platform/i,
    kind: "exterior",
    label: "a railway platform",
  },
  {
    re: /সমুদ্র|উপকূল|\b(?:coast|beach|sea|harbour|port)\b/i,
    kind: "exterior",
    label: "a coastline with working boats",
  },
  {
    re: /নির্মাণ|construction|scaffold|building\s+site/i,
    kind: "exterior",
    label: "a construction site with scaffolding",
  },

  // ── Objects and products ─────────────────────────────────────────────────
  {
    re: /ছোট\s+গাড়ি|ক্ষুদ্র\s+গাড়ি|কম্প্যাক্ট\s+গাড়ি|small\s+cars?|compact\s+cars?|hatchback|mini\s+car/i,
    kind: "object",
    label: "small compact hatchback cars",
    suppresses: "a passenger car",
  },
  {
    re: /বৈদ্যুতিক\s+গাড়ি|ইলেকট্রিক\s+গাড়ি|electric\s+(?:car|vehicle)|\bev\b/i,
    kind: "object",
    label: "a modern electric car",
    suppresses: "a passenger car",
  },
  {
    re: /গাড়ি|কার|\b(?:car|automobile|vehicle)\b/i,
    kind: "object",
    label: "a passenger car",
  },
  {
    re: /মোটরসাইকেল|বাইক|motorbike|motorcycle/i,
    kind: "object",
    label: "a motorcycle",
  },
  {
    re: /বাস\b|bus\b/i,
    kind: "object",
    label: "a city bus",
  },
  {
    re: /ট্রাক|truck|lorry/i,
    kind: "object",
    label: "a goods truck",
  },
  {
    re: /সাইকেল|বাইসাইকেল|bicycle|bike\s+lane/i,
    kind: "object",
    label: "a bicycle",
  },
  {
    re: /মোবাইল|স্মার্টফোন|ফোন|smartphone|mobile\s+phone|iphone/i,
    kind: "object",
    label: "a smartphone held in one hand",
  },
  {
    re: /ল্যাপটপ|কম্পিউটার|laptop|computer/i,
    kind: "object",
    label: "a laptop on a desk",
  },
  {
    re: /জিপিইউ|গ্রাফিক্স\s*কার্ড|gpu|accelerator/i,
    kind: "object",
    label: "a rack-mounted GPU accelerator",
  },
  {
    re: /সেমিকন্ডাক্টর|চিপ|semiconductor|silicon\s+chip|processor/i,
    kind: "object",
    label: "a silicon processor wafer",
  },
  {
    re: /সৌর\s*প্যানেল|solar\s+panel/i,
    kind: "object",
    label: "solar panels on a roof",
  },
  {
    re: /বাতাস|wind\s+turbine|windmill/i,
    kind: "object",
    label: "wind turbines on a ridge",
  },
  {
    re: /ধান|ফসল|crop|paddy|harvest/i,
    kind: "exterior",
    label: "a paddy field ready for harvest",
  },
  {
    re: /ওষুধ|ঔষধ|medicine|vaccine|drug/i,
    kind: "object",
    label: "medicine vials and a syringe tray",
  },
  {
    re: /sacks?\s+of\s+rice|bags?\s+of\s+rice|চালের\s+বস্তা/i,
    kind: "object",
    label: "plain unlabelled burlap sacks of rice",
  },
  {
    re: /rice\s+padd(?:y|ies)|paddy\s+field|ধান\s+খেত/i,
    kind: "exterior",
    label: "rice paddies",
  },
  {
    re: /টাকা|অর্থ|নোট|নগদ|money|cash|currency|banknote/i,
    kind: "object",
    label: "a fan of paper banknotes",
  },
  {
    re: /দলিল|নথি|ফাইল|document|file|paperwork/i,
    kind: "object",
    label: "a stack of official documents",
  },

  // -- Wardrobe and dress ---------------------------------------------------
  {
    re: /শাড়ি|saree|sari/i,
    kind: "wardrobe",
    label: "a woman in a cotton saree",
  },
  {
    re: /পাঞ্জাবি|পাঞ্জাবী|panjabi|kurta/i,
    kind: "wardrobe",
    label: "a man in a simple panjabi",
  },
  {
    re: /স্যুট|\b(?:suit|blazer)\b|formal\s+wear/i,
    kind: "wardrobe",
    label: "a tailored dark suit",
  },
  {
    re: /জ্যাকেট|jacket|leather\s+jacket/i,
    kind: "wardrobe",
    label: "a dark jacket",
  },
  {
    re: /শার্ট|\bshirt\b|t-?shirt/i,
    kind: "wardrobe",
    label: "a plain shirt",
  },
  {
    re: /ইউনিফর্ম|uniform/i,
    kind: "wardrobe",
    label: "a neat uniform",
  },
  {
    re: /ক্যাজুয়াল|streetwear|casual|jeans|denim/i,
    kind: "wardrobe",
    label: "casual modern streetwear",
  },
  {
    re: /ল্যাব\s*কোট|lab\s+coat|white\s+coat/i,
    kind: "wardrobe",
    label: "a white lab coat",
  },

  // -- Materials, so a generated object has a surface -----------------------
  {
    re: /ইস্পাত|\bsteel\b/i,
    kind: "material",
    label: "brushed steel surfaces",
  },
  {
    re: /অ্যালুমিনিয়াম|\b(?:aluminium|aluminum)\b/i,
    kind: "material",
    label: "brushed aluminium panels",
  },
  {
    re: /কাচ|\bglass\b/i,
    kind: "material",
    label: "clear glass",
  },
  {
    re: /কংক্রিট|concrete/i,
    kind: "material",
    label: "raw concrete",
  },
  {
    re: /কাঠ|\bwood\b|timber/i,
    kind: "material",
    label: "warm wood",
  },
  {
    re: /কাপড়|fabric|textile|cloth/i,
    kind: "material",
    label: "woven fabric upholstery",
  },
  {
    re: /চামড়া|leather/i,
    kind: "material",
    label: "soft leather",
  },
  {
    re: /সিলিকন|silicon/i,
    kind: "material",
    label: "a silicon wafer surface",
  },
];

const ORDER: ReadonlyArray<
  keyof Pick<
    VisualSubjects,
    | "people"
    | "countries"
    | "places"
    | "objects"
    | "wardrobe"
    | "interiors"
    | "exteriors"
    | "materials"
  >
> = [
  "people",
  "countries",
  "places",
  "objects",
  "wardrobe",
  "interiors",
  "exteriors",
  "materials",
];

function empty(): VisualSubjects {
  return {
    people: [],
    countries: [],
    places: [],
    objects: [],
    wardrobe: [],
    interiors: [],
    exteriors: [],
    materials: [],
    labels: [],
  };
}

/**
 * Read the article, not the category. A car story filed under "business" still
 * has cars in it; a story with no recognisable noun returns an empty brief and
 * the caller keeps its existing scene.
 */
export function extractVisualSubjects(input: {
  title?: string | null;
  summary?: string | null;
  body?: string | null;
  content?: string | null;
  tags?: string[] | null;
}): VisualSubjects {
  const text = [
    input.title,
    input.summary,
    input.body,
    input.content,
    ...(input.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ");
  if (!text) return empty();

  const out = empty();
  const seen = new Set<string>();
  const suppressed = new Set<string>();

  for (const entry of ENTRY) {
    if (!entry.re.test(text)) continue;
    if (suppressed.has(entry.label)) continue;
    if (seen.has(entry.label)) continue;
    seen.add(entry.label);
    if (entry.suppresses) suppressed.add(entry.suppresses);
    switch (entry.kind) {
      case "people":
        out.people.push(entry.label);
        break;
      case "country":
        out.countries.push(entry.label);
        break;
      case "place":
        out.places.push(entry.label);
        break;
      case "object":
        out.objects.push(entry.label);
        break;
      case "wardrobe":
        out.wardrobe.push(entry.label);
        break;
      case "interior":
        out.interiors.push(entry.label);
        break;
      case "exterior":
        out.exteriors.push(entry.label);
        break;
      case "material":
        out.materials.push(entry.label);
        break;
    }
  }

  // A generic label that arrived before the specific one is now redundant.
  for (const key of ORDER) {
    out[key] = out[key].filter((label) => !suppressed.has(label));
  }

  /**
   * "Previously small cars were for rural residents; now urban youth buy them"
   * names both places, but only one is the story's scene. When the article's
   * present-tense subject is urban, the rural contrast is history, not backdrop.
   */
  const urban = "an urban street with pavements and parked cars";
  const rural = "a quiet rural road";
  if (out.exteriors.includes(urban) && out.exteriors.includes(rural)) {
    out.exteriors = out.exteriors.filter((label) => label !== rural);
  }
  // A flooded road is a specific exterior; the generic rural road beside it
  // only asks the model to draw two settings.
  // "Previously these cars were for older drivers" is the story's contrast,
  // not its cast. When the present-tense subject is young adults and the older
  // group is introduced by a past-tense marker, drop the older group.
  const historical =
    /previously|traditionally|once|used\s+to|no\s+longer|historically|were\s+often|in\s+the\s+past/i.test(
      text,
    );
  if (historical && out.people.some((label) => /young adults/.test(label))) {
    out.people = out.people.filter((label) => !/elderly people/.test(label));
  }

  if (out.exteriors.includes("floodwater covering a village road")) {
    out.exteriors = out.exteriors.filter(
      (label) =>
        label !== rural && label !== "a road receding toward the horizon",
    );
  }

  // A crowd is not five near-duplicate people. Keep the four strongest roles
  // so the setting, objects and weather still fit in the ten-label budget.
  const people = out.people.slice(0, 4);
  out.labels = [
    ...people,
    ...ORDER.filter((key) => key !== "people").flatMap((key) => out[key]),
  ].slice(0, 10);
  return out;
}

/** A short, ordered phrase for a prompt: "young adults ..., small cars ..., Europe". */
export function visualBriefLine(subjects: VisualSubjects, max = 8): string {
  return subjects.labels.slice(0, max).join(", ");
}

/**
 * The subject sentence the deterministic planner uses when no model answers.
 * Built from the article's own nouns; falls back to the headline only if the
 * lexicon found nothing at all.
 */
export function visualSubjectSentence(
  input: {
    title?: string | null;
    summary?: string | null;
    body?: string | null;
    tags?: string[] | null;
  },
  fallback: string,
): string {
  const brief = visualBriefLine(extractVisualSubjects(input));
  return brief || fallback;
}
