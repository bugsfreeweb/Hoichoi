/**
 * The poster as HTML: one frame, four shapes, two papers.
 *
 * Why HTML at all. The previous renderer drew text as `<text>` inside an SVG and
 * let librsvg shape it. Eyeballing the result was not enough to see the fault —
 * a side-by-side render of the same Bangla sentence through librsvg and through
 * Chromium showed the difference plainly: in librsvg, `ক্ষুদ্র` came apart, signs
 * drifted off their consonants, and `স্ট্রাইক` collapsed. Chromium (HarfBuzz)
 * shaped all of them correctly. So the typography is handed to a real browser
 * engine, and CSS does the layout work it was designed for.
 *
 * The two hard rules of the art direction are encoded here rather than in prose:
 *
 *   - a Bengali headline gets `line-height: 1.38` and vertical padding, because
 *     `ি`, `ী`, `ু`, `ৃ` and the reph sit above and below the baseline and clip
 *     against a tight line box;
 *   - the photo never carries the headline's job: every layout puts the type on
 *     its own surface (a scrim, a paper column, or a bar), so legibility does not
 *     depend on what the model happened to render.
 */
import type { PosterLayout, PosterPlan, PosterTheme } from "./select";

export interface PosterContent {
  /** The Bangla headline. Never empty. */
  title: string;
  /** The standfirst, in Bangla. Optional. */
  summary?: string | null;
  /** Desk label in Bangla, e.g. "রাজনীতি". */
  category?: string | null;
  /** Bangla date text, e.g. "১৮ নভেম্বর ২০২৬". */
  dateText?: string | null;
  /** Source name, printed under the headline. */
  source?: string | null;
  /** Wordmark. Defaults to হৈচৈ. */
  brand?: string;
  /** The domain printed in the footer. */
  site?: string;
  /** Stable per-story number for the barcode and the edition line. */
  seed?: string;
  /** `data:image/…;base64,…` for the AI render, or null for the branded wash. */
  backgroundDataUrl: string | null;
  /** `data:image/png;base64,…` for the logo mark. */
  logoDataUrl: string | null;
  /** Font faces, already base64-inlined, keyed by family name. */
  fonts: Array<{ family: string; weight: number; dataUrl: string }>;
  /** Breaking-banner label / kicker. */
  kicker?: string | null;
}

export const POSTER_HTML_FRAME = { width: 1920, height: 1080 } as const;

const THEME: Record<PosterTheme, Record<string, string>> = {
  dark: {
    bg: "#0D1017",
    ink: "#FFFFFF",
    muted: "rgba(255,255,255,0.80)",
    faint: "rgba(255,255,255,0.55)",
    rule: "rgba(255,255,255,0.20)",
    panel: "rgba(9,12,18,0.66)",
    scrim: "linear-gradient(90deg, rgba(13,16,23,0.985) 0%, rgba(13,16,23,0.96) 42%, rgba(13,16,23,0.52) 72%, rgba(13,16,23,0.16) 100%)",
    scrimRight:
      "linear-gradient(270deg, rgba(13,16,23,0.985) 0%, rgba(13,16,23,0.96) 42%, rgba(13,16,23,0.52) 72%, rgba(13,16,23,0.16) 100%)",
    scrimBottom:
      "linear-gradient(0deg, rgba(13,16,23,0.985) 0%, rgba(13,16,23,0.94) 38%, rgba(13,16,23,0.62) 62%, rgba(13,16,23,0.12) 88%, rgba(13,16,23,0) 100%)",
  },
  "light-paper": {
    bg: "#F8F6F0",
    ink: "#14161A",
    muted: "#3E444C",
    faint: "#666C74",
    rule: "rgba(20,22,26,0.18)",
    panel: "rgba(248,246,240,0.92)",
    scrim: "linear-gradient(90deg, rgba(248,246,240,0.99) 0%, rgba(248,246,240,0.96) 46%, rgba(248,246,240,0.55) 74%, rgba(248,246,240,0.12) 100%)",
    scrimRight:
      "linear-gradient(270deg, rgba(248,246,240,0.99) 0%, rgba(248,246,240,0.96) 46%, rgba(248,246,240,0.55) 74%, rgba(248,246,240,0.12) 100%)",
    scrimBottom:
      "linear-gradient(0deg, rgba(248,246,240,0.97) 0%, rgba(248,246,240,0.86) 46%, rgba(248,246,240,0.12) 80%, rgba(248,246,240,0) 100%)",
  },
};

/** XML/HTML escaping — a headline may contain `<`, `&` or a quote. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The decorative barcode.
 *
 * Bars of deterministic width from the story's own seed, so two renders of one
 * story print the same bars and two stories do not print the same pattern. It is
 * aria-hidden decoration, not a scannable code — it exists to make the footer
 * read as an edition rather than as a web page.
 */
export function barcodeBars(seed: string, count = 34): number[] {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    bars.push(2 + ((hash >>> 0) % 5));
  }
  return bars;
}

function fontCss(fonts: PosterContent["fonts"]): string {
  return fonts
    .map(
      (f) => `@font-face{font-family:"${f.family}";font-weight:${f.weight};font-style:normal;font-display:block;src:url("${f.dataUrl}") format("truetype");}`,
    )
    .join("\n");
}

/** Masthead — logo, wordmark, date, and the rule under them. */
function masthead(content: PosterContent): string {
  const brand = escapeHtml(content.brand ?? "হৈচৈ");
  return `<div class="masthead">
      <div class="masthead-left">
        ${content.logoDataUrl ? `<img class="mark" src="${content.logoDataUrl}" alt="" />` : ""}
        <span class="wordmark">${brand}</span>
        <span class="newsroom">NEWSROOM · ${escapeHtml((content.site ?? "").replace(/^www\./, ""))}</span>
      </div>
      <div class="masthead-right"><span class="date">${escapeHtml(content.dateText ?? "")}</span></div>
    </div>
    <div class="masthead-rule" style="background:var(--accent)"></div>`;
}

/** Category pill + kicker. */
function categoryTag(content: PosterContent, plan: PosterPlan): string {
  const label = content.category?.trim();
  if (!label) return "";
  return `<div class="tag"><span class="tag-dot" style="background:${plan.accent}"></span><span class="tag-text">${escapeHtml(label)}</span></div>`;
}

/** The footer: read-more, edition, barcode. */
function footer(content: PosterContent): string {
  const bars = barcodeBars(content.seed ?? content.title);
  return `<div class="footer">
      <div class="footer-left">
        <span class="readmore">বিস্তারিত পড়ুন</span>
        <span class="domain">${escapeHtml(content.site ?? "hoichoifeed.vercel.app")}</span>
      </div>
      <div class="barcode" aria-hidden="true">${bars
        .map((w, i) => `<i style="width:${w}px;height:${i % 7 === 0 ? 46 : 34}px"></i>`)
        .join("")}</div>
    </div>`;
}

/** Headline + standfirst + source, sized from the plan. */
function copyBlock(content: PosterContent, plan: PosterPlan): string {
  const summary = content.summary?.trim();
  return `<h1 class="headline" style="font-size:${plan.headlineSize}px">${escapeHtml(content.title)}</h1>
    ${summary ? `<p class="summary">${escapeHtml(summary)}</p>` : ""}
    ${content.source ? `<p class="source">সূত্র · ${escapeHtml(content.source)}</p>` : ""}`;
}

function column(content: PosterContent, plan: PosterPlan): string {
  return `${masthead(content)}
    ${categoryTag(content, plan)}
    ${copyBlock(content, plan)}
    <div class="spacer"></div>
    ${footer(content)}`;
}

/**
 * The four shapes.
 *
 * Each returns the body markup; the shared `SHELL` supplies the frame, the
 * fonts, the theme variables and the photographic gradient. Keeping the gradient
 * in one place is what makes "the text is always legible" a property of the
 * renderer instead of a habit of whoever edits a layout next.
 */
function body(content: PosterContent, plan: PosterPlan): string {
  const bg = content.backgroundDataUrl;
  // With no render the plate is still branded: an accent wash in the theme's own
  // palette, so a light-paper story does not get a dark photograph-shaped hole.
  const wash =
    plan.theme === "light-paper"
      ? `radial-gradient(120% 90% at 78% 30%, ${plan.accent}33 0%, ${plan.accent}14 44%, rgba(0,0,0,0) 74%), linear-gradient(160deg, #EFEBE2 0%, #E4DFD3 58%, #D9D3C6 100%)`
      : `radial-gradient(120% 90% at 78% 30%, ${plan.accent}55 0%, ${plan.accent}18 42%, rgba(0,0,0,0) 72%), linear-gradient(160deg, #171B24 0%, #0C0F16 60%, #090B10 100%)`;
  /**
   * The wash is always drawn, and the photograph is drawn on top of it.
   *
   * A structural promise, not a fallback: a picture that fails to paint (a data
   * URL the browser refuses, a corrupt upload) used to leave nothing but the
   * theme's near-black page colour behind the headline — a poster that looks
   * like a black rectangle with text on it. With the wash underneath, the worst
   * case is a branded poster without a photograph.
   */
  const washLayer = `<div class="photo photo--wash" style="background:${wash}"></div>`;
  /**
   * With no photograph the plate is still a designed surface, not empty space.
   *
   * A single dark gradient is technically "a graphic" and reads as a void: the
   * reported symptom was "only the headline is there, the rest is black". Three
   * quiet layers fix that at no cost — measured grid rules, a large low-opacity
   * wordmark in the picture area, and a corner accent. They live under the type,
   * so legibility is unchanged.
   */
  const motif = bg
    ? ""
    : `<div class="motif">
        <div class="motif-grid"></div>
        <div class="motif-mark">${content.logoDataUrl ? `<img src="${content.logoDataUrl}" alt="" />` : `<span>${escapeHtml(content.brand ?? "হৈচৈ")}</span>`}</div>
        <div class="motif-corner" style="background:${plan.accent}"></div>
      </div>`;
  const photo = bg
    ? `${washLayer}<div class="photo" style="background-image:url('${bg}')"></div>`
    : `${washLayer}${motif}`;

  switch (plan.layout) {
    case "split-right":
      return `<div class="scrim scrim--right"></div>${photo}
        <div class="frame"></div>
        <section class="col col--right">${column(content, plan)}</section>
        <div class="divider" style="left:55%"></div>`;

    case "editorial-card":
      return `<div class="paper">
          <div class="paper-frame"></div>
          <section class="col col--paper">
            ${masthead(content)}
            ${categoryTag(content, plan)}
            ${copyBlock(content, plan)}
            <div class="spacer"></div>
            ${footer(content)}
          </section>
          <div class="divider divider--paper" style="left:52%"></div>
          <figure class="card-photo">
            ${photo}
            <figcaption class="card-caption">${escapeHtml(content.category ?? "সংবাদ")}</figcaption>
          </figure>
        </div>`;

    case "breaking-banner":
      return `${photo}
        <div class="scrim scrim--bottom"></div>
        <div class="frame"></div>
        <div class="breaking-bar" style="background:${plan.accent}">
          <span class="breaking-dot"></span>
          <span class="breaking-text">${escapeHtml(content.kicker ?? "ব্রেকিং নিউজ")}</span>
          <span class="breaking-date">${escapeHtml(content.dateText ?? "")}</span>
        </div>
        <section class="col col--bottom">
          ${masthead(content)}
          ${categoryTag(content, plan)}
          ${copyBlock(content, plan)}
          ${footer(content)}
        </section>`;

    case "split-left":
    default:
      return `${photo}
        <div class="scrim"></div>
        <div class="frame"></div>
        <section class="col col--left">${column(content, plan)}</section>
        <div class="divider" style="left:45%"></div>`;
  }
}

/** Shared stylesheet: theme variables, the frame, and the Bengali line box. */
function styles(plan: PosterPlan): string {
  const t = THEME[plan.theme];
  const dark = plan.theme === "dark";
  return `
  :root{--bg:${t.bg};--ink:${t.ink};--muted:${t.muted};--faint:${t.faint};--rule:${t.rule};--panel:${t.panel};--accent:${plan.accent};}
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body{width:${POSTER_HTML_FRAME.width}px;height:${POSTER_HTML_FRAME.height}px;overflow:hidden;background:var(--bg);}
  body{font-family:"Noto Sans Bengali",sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased;}
  .photo{position:absolute;inset:0;background-size:cover;background-position:center right;filter:blur(2px) saturate(0.92) contrast(0.98);transform:scale(1.04);transform-origin:center;}
  /* The wash is a graphic, not a photograph: blurring it would smear the accent
     glow into a brown smudge, and the blur exists to soften a photo behind type. */
  .photo--wash{filter:none;transform:none;}
  .motif{position:absolute;inset:0;overflow:hidden;}
  .motif-grid{position:absolute;inset:36px;background-image:repeating-linear-gradient(90deg,${dark ? "rgba(255,255,255,0.045)" : "rgba(20,22,26,0.05)"} 0 1px,rgba(0,0,0,0) 1px 120px),repeating-linear-gradient(0deg,${dark ? "rgba(255,255,255,0.03)" : "rgba(20,22,26,0.035)"} 0 1px,rgba(0,0,0,0) 1px 120px);}
  .motif-mark{position:absolute;right:96px;top:50%;transform:translateY(-50%) rotate(-6deg);display:grid;place-items:center;opacity:${dark ? "0.1" : "0.08"};}
  .motif-mark img{width:340px;height:340px;object-fit:contain;filter:grayscale(1);}
  .motif-mark span{font-family:"Noto Serif Bengali",serif;font-size:300px;font-weight:700;line-height:1;color:${dark ? "#FFFFFF" : "#14161A"};}
  .motif-corner{position:absolute;right:0;bottom:0;width:420px;height:8px;opacity:0.75;}
  .scrim{position:absolute;inset:0;background:${t.scrim};}
  .scrim--right{background:${t.scrimRight};}
  .scrim--bottom{background:${t.scrimBottom};}
  .frame{position:absolute;inset:36px;border:1px solid var(--rule);pointer-events:none;}
  .divider{position:absolute;top:120px;bottom:120px;width:1px;background:${dark ? "rgba(255,255,255,0.09)" : "rgba(20,22,26,0.08)"};}
  .col{position:absolute;top:0;bottom:0;display:flex;flex-direction:column;padding:88px 64px 72px;gap:22px;}
  .col--left{left:0;width:45%;}
  .col--right{right:0;width:45%;}
  .col--bottom{left:0;right:38%;bottom:0;top:auto;padding:0 64px 76px;gap:18px;}
  .spacer{flex:1 1 auto;min-height:8px;}
  .masthead{display:flex;align-items:center;justify-content:space-between;gap:18px;}
  .masthead-left{display:flex;align-items:center;gap:14px;min-width:0;}
  .mark{width:48px;height:48px;object-fit:contain;flex:0 0 auto;}
  .wordmark{font-family:"Noto Serif Bengali",serif;font-weight:700;font-size:38px;line-height:1;letter-spacing:-0.5px;}
  .newsroom{font-size:13px;font-weight:500;letter-spacing:2px;text-transform:uppercase;color:var(--faint);white-space:nowrap;}
  .masthead-right{flex:0 0 auto;}
  .date{font-size:19px;font-weight:500;color:var(--muted);}
  .masthead-rule{height:3px;width:100%;border-radius:2px;}
  .tag{display:inline-flex;align-items:center;gap:10px;align-self:flex-start;border:1px solid var(--rule);border-radius:999px;padding:9px 18px;background:${dark ? "rgba(255,255,255,0.06)" : "rgba(20,22,26,0.045)"};}
  .tag-dot{width:9px;height:9px;border-radius:50%;flex:0 0 auto;}
  .tag-text{font-size:19px;font-weight:600;letter-spacing:0.6px;text-transform:uppercase;}
  .headline{font-family:"Noto Serif Bengali",serif;font-weight:700;line-height:1.38;letter-spacing:-0.6px;padding-top:6px;padding-bottom:10px;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;text-wrap:balance;}
  .summary{font-size:24px;line-height:1.6;color:var(--muted);font-weight:400;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;padding-top:4px;}
  .source{font-size:17px;letter-spacing:0.4px;color:var(--faint);margin-top:2px;}
  .footer{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;border-top:1px solid var(--rule);padding-top:16px;}
  .footer-left{display:flex;flex-direction:column;gap:4px;}
  .readmore{font-size:15px;letter-spacing:2.4px;text-transform:uppercase;color:var(--faint);}
  .domain{font-size:19px;font-weight:600;color:var(--ink);}
  .barcode{display:flex;align-items:flex-end;gap:3px;height:46px;opacity:${dark ? 0.75 : 0.85};}
  .barcode i{display:block;background:var(--ink);opacity:0.85;}
  .breaking-bar{position:absolute;top:36px;left:36px;right:36px;height:74px;display:flex;align-items:center;gap:16px;padding:0 28px;color:#fff;}
  .breaking-dot{width:12px;height:12px;border-radius:50%;background:#fff;box-shadow:0 0 0 5px rgba(255,255,255,0.28);}
  .breaking-text{font-size:24px;font-weight:700;letter-spacing:3px;text-transform:uppercase;}
  .breaking-date{margin-left:auto;font-size:19px;font-weight:500;letter-spacing:1px;opacity:0.92;}
  .col--bottom .masthead{display:none;}
  .paper{position:absolute;inset:0;background:var(--bg);}
  .paper-frame{position:absolute;inset:28px;border:1px solid var(--rule);}
  .col--paper{left:0;width:52%;padding:80px 56px 64px;gap:20px;}
  .divider--paper{top:56px;bottom:56px;}
  .card-photo{position:absolute;top:80px;right:80px;bottom:80px;left:56%;border:1px solid var(--rule);padding:12px;background:${dark ? "rgba(255,255,255,0.03)" : "rgba(20,22,26,0.03)"};}
  /* A framed photograph is a picture, not a background: it stays sharp. Only the
     full-bleed layouts soften theirs, because there the words sit on top of it. */
  .card-photo .photo{position:absolute;inset:12px;background-size:cover;background-position:center;filter:none;transform:none;}
  .card-caption{position:absolute;left:12px;right:12px;bottom:12px;box-sizing:border-box;padding:10px 14px;background:${dark ? "rgba(9,12,18,0.72)" : "rgba(248,246,240,0.92)"};font-size:15px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:${dark ? "#FFFFFF" : "#14161A"};}
`;
}

/** The complete document handed to the browser. */
export function posterHtml(content: PosterContent, plan: PosterPlan): string {
  return `<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(content.title)}</title>
<style>${fontCss(content.fonts)}${styles(plan)}</style>
</head>
<body data-layout="${plan.layout satisfies PosterLayout}" data-theme="${plan.theme}">
${body(content, plan)}
</body>
</html>`;
}
