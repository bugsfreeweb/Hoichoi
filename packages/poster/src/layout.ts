/**
 * The composition layer: brand, logo and headline over a 16:9 plate.
 *
 * Why this exists. Until now a story's picture was whatever the image model
 * returned — a 1024×627 crop whose subject was chosen from the story's own
 * words, with nothing on it that said *this is Hoichoi*, and nothing that said
 * *this is the headline*. Two consequences, both measured on the live site:
 *
 *   1. Every story's picture was anonymous. A screenshot in a Facebook group
 *      could have come from any newsroom.
 *   2. A story could be published with no picture at all. The generator can
 *      fail (quota, timeout, a provider that answers HTML), and the pipeline
 *      treated that as "publish anyway, the card will cope".
 *
 * So the picture is now built in layers, and the layers are guaranteed:
 *
 *   backdrop   the AI render, cover-cropped to a landscape frame (layer 1)
 *              OR, when the model fails, a deterministic branded backdrop drawn
 *              from the story's own seed (layer 1′)
 *   scrim      a bottom-up gradient so the caption is readable over any render
 *   caption    category · headline (wrapped, auto-fitted) · credit
 *   brand      logo mark, wordmark and the newsroom line, top-left
 *
 * The frame is always 16:9 landscape (`POSTER_FRAME`), because a story picture
 * is a card, a share image and an og:image before it is ever a photograph.
 *
 * All geometry is pure (`posterLayout`) and unit-tested; `renderPoster` only
 * rasterises it.
 */

export interface PosterSpec {
  /** The Bangla headline. This is the caption, and it is never empty. */
  title: string;
  /** The desk, in Bangla ("সংবাদ", "খেলা"). Rendered as a chip and a kicker. */
  category?: string | null;
  /** Where the story came from, in short form. Rendered after the category. */
  source?: string | null;
  /** Publication date, already formatted in Bangla numerals. */
  dateText?: string | null;
  /** Wordmark. Defaults to the site's. */
  brand?: string;
  /** The small line under the wordmark. */
  brandLine?: string;
  /** The credit at the bottom right. */
  site?: string;
}

/** 16:9, and nothing else. Every surface we publish into wants this ratio. */
export const POSTER_FRAME = { width: 1600, height: 900 } as const;

/** Line budget for the caption, and the type sizes it may be drawn at. */
export const CAPTION_MAX_LINES = 3;
const CAPTION_SIZES = [62, 56, 50, 44, 40] as const;
/** Left margin, usable width, and how far the last caption line sits above the edge. */
const CAPTION_BOX = { x: 88, width: POSTER_FRAME.width - 176, bottom: 138 } as const;
const ACCENT = "#e8552d";
const INK = "#ffffff";
const MUTED = "rgba(255,255,255,0.72)";

/** XML-escape, because a headline is user-facing text and may contain `<`. */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Split a Bangla headline into lines that fit a pixel width.
 *
 * Bangla wraps on spaces like Latin does, so a greedy split on word boundaries
 * is correct. The width estimate is deliberately conservative (0.56 em per
 * glyph): Bangla clusters are wider than Latin ones, and a caption that overruns
 * the plate is worse than one that breaks a word early.
 */
export function wrapCaption(text: string, fontSize: number, maxWidth: number): string[] {
  const maxChars = Math.max(8, Math.floor(maxWidth / (fontSize * 0.56)));
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Fit the caption into the plate: the largest type size whose wrap stays inside
 * the line budget, or the smallest size with a hard ellipsis if even that does
 * not fit. A 400-character headline must not push the caption off the picture.
 */
export function fitCaption(
  title: string,
  opts: { maxWidth?: number; maxLines?: number } = {},
): { lines: string[]; fontSize: number; truncated: boolean } {
  const maxWidth = opts.maxWidth ?? CAPTION_BOX.width;
  const maxLines = opts.maxLines ?? CAPTION_MAX_LINES;
  const clean = title.replace(/\s+/g, " ").trim();
  for (const fontSize of CAPTION_SIZES) {
    const lines = wrapCaption(clean, fontSize, maxWidth);
    if (lines.length <= maxLines) return { lines, fontSize, truncated: false };
  }
  const fontSize = CAPTION_SIZES[CAPTION_SIZES.length - 1]!;
  const lines = wrapCaption(clean, fontSize, maxWidth).slice(0, maxLines);
  const last = lines.length - 1;
  if (last >= 0) {
    const tail = lines[last]!;
    lines[last] = `${tail.slice(0, Math.max(1, tail.length - 1)).trimEnd()}…`;
  }
  return { lines, fontSize, truncated: true };
}

/**
 * The kicker above the headline: the source, and only the source.
 *
 * The desk is already a chip in the top-right corner; repeating it above the
 * headline printed the same word twice on one picture.
 */
export function kickerLine(spec: PosterSpec): string {
  return spec.source?.trim() ?? "";
}

/** The credit: the site, then the date. Never the headline again. */
export function creditLine(spec: PosterSpec): string {
  return [spec.site ?? "hoichoifeed.vercel.app", spec.dateText?.trim()].filter(Boolean).join(" · ");
}

/**
 * The caption plate as SVG.
 *
 * Text is drawn here rather than with `sharp`'s text API because there is no
 * such API: the supported route is compositing an SVG, and `renderPoster`
 * registers a Bengali font with fontconfig so librsvg can shape the clusters.
 */
export function captionSvg(spec: PosterSpec): string {
  const kicker = kickerLine(spec);
  const credit = creditLine(spec);
  const { lines, fontSize } = fitCaption(spec.title);
  const lineHeight = Math.round(fontSize * 1.22);
  const blockHeight = lines.length * lineHeight;
  // `CAPTION_BOX.bottom` is a distance *from* the bottom edge: the caption is a
  // footer, so the headline never floats in the middle of the picture.
  const lastBaseline = POSTER_FRAME.height - CAPTION_BOX.bottom;
  const firstBaseline = lastBaseline - blockHeight + fontSize * 0.86;
  const brand = spec.brand ?? "হৈচৈ";
  const brandLine = spec.brandLine ?? "HOICHOI · NEWSROOM";

  const titleSpans = lines
    .map(
      (line, i) =>
        `<text x="${CAPTION_BOX.x}" y="${Math.round(firstBaseline + i * lineHeight)}" font-family="Noto Sans Bengali" font-size="${fontSize}" font-weight="700" fill="${INK}" letter-spacing="-0.5">${escapeXml(line)}</text>`,
    )
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${POSTER_FRAME.width}" height="${POSTER_FRAME.height}" viewBox="0 0 ${POSTER_FRAME.width} ${POSTER_FRAME.height}">
  <defs>
    <linearGradient id="scrim" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#06070a" stop-opacity="0.94"/>
      <stop offset="0.45" stop-color="#06070a" stop-opacity="0.72"/>
      <stop offset="1" stop-color="#06070a" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="topfade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#06070a" stop-opacity="0.52"/>
      <stop offset="1" stop-color="#06070a" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${POSTER_FRAME.width}" height="${POSTER_FRAME.height}" fill="url(#topfade)"/>
  <rect y="${Math.round(POSTER_FRAME.height * 0.34)}" width="${POSTER_FRAME.width}" height="${Math.round(POSTER_FRAME.height * 0.66)}" fill="url(#scrim)"/>

  <!-- brand lockup -->
  <text x="${CAPTION_BOX.x}" y="${88 + 38}" font-family="Noto Sans Bengali" font-size="40" font-weight="700" fill="${INK}">${escapeXml(brand)}</text>
  <text x="${CAPTION_BOX.x}" y="${88 + 62}" font-family="Noto Sans Bengali" font-size="13" font-weight="700" fill="${MUTED}" letter-spacing="3.4">${escapeXml(brandLine)}</text>

  <!-- desk chip -->
  ${
    spec.category?.trim()
      ? `<g>
    <rect x="${POSTER_FRAME.width - CAPTION_BOX.x - 8 - Math.max(120, spec.category.trim().length * 21)}" y="72" width="${Math.max(120, spec.category.trim().length * 21) + 8}" height="42" rx="21" fill="${ACCENT}"/>
    <text x="${POSTER_FRAME.width - CAPTION_BOX.x - Math.max(120, spec.category.trim().length * 21) / 2}" y="100" text-anchor="middle" font-family="Noto Sans Bengali" font-size="20" font-weight="700" fill="#ffffff">${escapeXml(spec.category.trim())}</text>
  </g>`
      : ""
  }

  <!-- caption: kicker, rule, headline -->
  <text x="${CAPTION_BOX.x}" y="${Math.round(firstBaseline - fontSize * 0.86 - 30)}" font-family="Noto Sans Bengali" font-size="19" font-weight="700" fill="${ACCENT}" letter-spacing="1.2">${escapeXml(kicker)}</text>
  <rect x="${CAPTION_BOX.x}" y="${Math.round(firstBaseline - fontSize * 0.86 - 18)}" width="56" height="3" fill="${ACCENT}"/>
  ${titleSpans}

  <!-- credit, on its own line below the caption -->
  <text x="${CAPTION_BOX.x}" y="${POSTER_FRAME.height - 40}" font-family="Noto Sans Bengali" font-size="16" fill="${MUTED}">${escapeXml(credit)}</text>
</svg>`;
}

/**
 * A branded backdrop for the case where nothing was rendered.
 *
 * This is the promise of "never miss an image" kept honestly: if the model
 * fails we do not publish a story with no picture and we do not publish someone
 * else's stock photo — we publish a plate in our own colours, derived from the
 * story's own seed, with the headline on it. Not a photograph, and it does not
 * pretend to be one.
 */
export function backdropSvg(seed: string, accent = ACCENT): string {
  const hash = fnv1a(seed);
  const angle = hash % 40;
  const cx = 260 + (hash % 900);
  const cy = 120 + ((hash >>> 8) % 460);
  const r = 380 + ((hash >>> 4) % 240);
  const cx2 = 140 + ((hash >>> 12) % 1300);
  const cy2 = 640 + ((hash >>> 16) % 180);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${POSTER_FRAME.width}" height="${POSTER_FRAME.height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#101318"/>
      <stop offset="0.55" stop-color="#191c24"/>
      <stop offset="1" stop-color="#0b0d11"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${POSTER_FRAME.width}" height="${POSTER_FRAME.height}" fill="url(#bg)"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#glow)"/>
  <g opacity="0.10" stroke="#ffffff" stroke-width="1.5" transform="rotate(${angle} ${POSTER_FRAME.width / 2} ${POSTER_FRAME.height / 2})">
    ${Array.from({ length: 26 }, (_, i) => `<line x1="${i * 70 - 200}" y1="-40" x2="${i * 70 - 200}" y2="${POSTER_FRAME.height + 40}"/>`).join("")}
  </g>
  <circle cx="${cx2}" cy="${cy2}" r="220" fill="${accent}" opacity="0.10"/>
</svg>`;
}

/** FNV-1a: stable across runs and platforms, so a seed always draws the same plate. */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
