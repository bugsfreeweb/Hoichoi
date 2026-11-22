/**
 * The broadcast card: a 1200×675 (16:9) social-media news card, drawn at 2×.
 *
 * It is a different object from the editorial poster. The editorial plate is a
 * newsroom edition — desk, stands, columns. This one is a *broadcast* card, the
 * shape a platform scrolls past.
 *
 * ## One frame, eight designs
 *
 * The first version of this card was a single navy-to-crimson rectangle. A page
 * of stories then read as one image repeated, and — worse — a feed of them read
 * as a wall of near-black. Varying only the hue did not fix it: six dark fields
 * with the same rail and the same footer are still one design.
 *
 * So the card now has eight *designs*, not eight tints. They share the anatomy
 * the brand owns (desk badge, mark, headline, standfirst, source bar, fixed
 * 1200×675 frame at 2×) and differ in what a reader actually sees: light paper
 * versus dark field, type left versus centred, the story's picture as a framed
 * panel versus a full-bleed scrim, a solid footer bar versus a coloured band.
 * Six of the eight are light. The design is chosen by an FNV-1a hash of
 * `desk|headline`, so two stories from one desk differ, and a retry can never
 * repaint a story that has already been published.
 *
 * ## The photo is inspiration, never the picture
 *
 * When the story already has an image it is blurred, saturation-lifted and
 * hue-nudged, then blended into the field — a framed panel on the split designs,
 * a duotone under the type on the dark one. A reader sees a card *about* the
 * story, not the story's photo with a headline pasted on it.
 *
 * ## Type can never overflow
 *
 * The frame is fixed, the headline steps down with length, and the standfirst is
 * clamped to two lines.
 */

import { escapeHtml } from "./template";
import { dataUrlForImage } from "./image";
import { loadAssets, renderHtmlToPng, PosterBrowserUnavailable } from "./render";

export const BROADCAST_FRAME = { width: 1200, height: 675 } as const;
export const BROADCAST_SCALE = 2 as const;

export interface BroadcastCardInput {
  /** Only the *label* the badge prints; the design comes from the hash. */
  category?: string | null;
  title: string;
  summary?: string | null;
  source?: string | null;
  brand?: string | null;
  site?: string | null;
  dateText?: string | null;
  accent?: string | null;
  /** When the story already has a picture: it inspires the field, not copies it. */
  backgroundImage?: Buffer | null;
  logoDataUrl?: string | null;
  fonts?: "local" | "cdn";
}

export interface BroadcastCardResult {
  bytes: Buffer;
  contentType: "image/png";
  width: number;
  height: number;
  scale: number;
}

/** Headline size by stripped character count, tuned for a 1200 px frame. */
export function headlineSizeForCard(title: string): number {
  const len = title.replace(/\s+/g, " ").trim().length;
  if (len <= 32) return 66;
  if (len <= 54) return 54;
  return 44;
}

/** The badge paints with the desk accent; breaking stays crimson. */
const DEFAULT_ACCENT = "#E11D2E";

export interface BroadcastVariant {
  /** Stable id, printed in the render log and asserted by the tests. */
  id: string;
  /** `light` or `dark` — what the reader's eye gets, not a tint. */
  tone: "light" | "dark";
  /** The `.field` background. */
  field: string;
  /** The texture painted over the field. */
  grain: string;
  /** Headline paint: white-into-gold on dark, ink on paper. */
  headline: "warm" | "solid";
  /** The design's own CSS rules, scoped to `body[data-design="<id>"]`. */
  rules: string;
}

interface Design {
  id: string;
  tone: "light" | "dark";
  field: string;
  headline: "warm" | "solid";
  /** Design-scoped rules; `&` is replaced with the selector prefix. */
  rules: string;
}

/**
 * Eight designs. Each one is a composition, not a colour swap:
 *
 *   1 cream-split     light paper, picture in a right-hand panel, ink type
 *   2 ivory-band      centred ink type over sand, the accent carries the footer
 *   3 hero-duotone    the picture as a duotone field, type on a dark scrim
 *   4 mint-editorial  pale mint, small-caps badge, ink type, white footer
 *   5 sand-poster     warm sand, centred serif headline, dark footer bar
 *   6 slate-grid      cool ledger paper with rules, picture framed on the right
 *   7 ink-crimson     the original broadcast field — one dark card in eight
 *   8 photo-frame     white page, picture in an accent-edged frame, ink type
 */
const DESIGNS: Design[] = [
  {
    id: "cream-split",
    tone: "light",
    headline: "solid",
    field: `radial-gradient(120% 130% at 0% 0%, #fffaf0 0%, rgba(255,250,240,0) 62%),
      linear-gradient(158deg,#f9f3e6 0%,#f1e8d6 58%,#e9dfc9 100%)`,
    rules: `
    &{--ink-c:#161c28;--sub:#5b6372;--panel:#ffffffd6;--panel-ink:#1b2230;
      --panel-rule:#1b2230;--footer-bg:#141820;--footer-ink:#f6f0e2;
      --footer-sub:#b6afa0;--rule:#1b223026;--logo-bg:#1b22300d;--badge-ink:#fff;
      --veil:linear-gradient(90deg,rgba(249,243,230,0.14) 0 52%,rgba(249,243,230,0) 58%);}
    & .media{left:auto;right:0;width:46%;
      background:linear-gradient(158deg,#243052 0%,#3a2242 58%,#571f2f 100%)}
    & .ph-photo{filter:blur(1.4px) saturate(1.15) contrast(1.03);mix-blend-mode:overlay;opacity:0.9}
    & .media-mark{color:rgba(255,255,255,0.14)}
    & .ph-motif:before{background:radial-gradient(80% 80% at 70% 30%,#c8a05a2e 0%,transparent 62%)}
    & .spine{left:0;top:0;bottom:0;width:10px}
    & .shell{width:558px}
    & .summary{border-left-color:var(--accent)}`,
  },
  {
    id: "ivory-band",
    tone: "light",
    headline: "solid",
    field: `radial-gradient(110% 120% at 92% 4%, #fdf6e2 0%, rgba(253,246,226,0) 58%),
      linear-gradient(172deg,#fdfaf2 0%,#f6efdd 56%,#efe5cd 100%)`,
    rules: `
    &{--ink-c:#131a26;--sub:#5a6270;--panel:#ffffff;--panel-ink:#1a2130;
      --panel-rule:#131a26;--footer-bg:var(--accent);--footer-ink:#ffffff;
      --footer-sub:#ffe7e9;--rule:#131a2622;--logo-bg:#131a260d;--badge-ink:#131a26;
      --veil:linear-gradient(180deg,rgba(253,250,242,0) 0 60%,rgba(253,250,242,0.35) 100%);}
    & .badge{background:transparent;border:2px solid #131a26;color:#131a26}
    & .badge i{background:#131a26;box-shadow:0 0 0 4px #131a2614}
    & .media{opacity:0.34}
    & .ph-photo{mix-blend-mode:multiply;opacity:0.85}
    & .spine{left:0;right:0;top:0;height:6px}
    & header{justify-content:center}
    & .corner{position:absolute;right:0}
    & .shell{left:72px;right:72px;width:auto;bottom:150px;align-items:center;text-align:center}
    & h1{max-width:940px;text-align:center;margin:0 auto}
    & .summary{width:auto;max-width:760px;text-align:center;border-left:none;
      border-top:4px solid var(--accent);padding:18px 26px}
    & footer{height:96px}
    & .breaking{color:#ffffff}
    & .src{color:#ffeaea}
    & .foot-right{color:#ffdfe2}
    & .foot-right b{color:#ffffff}`,
  },
  {
    id: "hero-duotone",
    tone: "dark",
    headline: "warm",
    field: `radial-gradient(120% 140% at 10% -6%,#3d5080 0%,rgba(61,80,128,0) 62%),
      linear-gradient(132deg,#2b3a63 0%,#41538a 50%,#7a3049 100%)`,
    rules: `
    &{--ink-c:#ffffff;--sub:rgba(255,255,255,0.78);--panel:rgba(12,18,32,0.58);
      --panel-ink:#f4f7ff;--panel-rule:var(--accent);--footer-bg:#fdfdf8;
      --footer-ink:#14161a;--footer-sub:#6b7280;--rule:rgba(255,255,255,0.22);
      --logo-bg:rgba(255,255,255,0.12);--badge-ink:#fff;
      --veil:linear-gradient(180deg,rgba(8,12,22,0) 0 26%,rgba(8,12,22,0.34) 58%,rgba(8,12,22,0.62) 100%);}
    & .media:after{content:"";position:absolute;inset:0;mix-blend-mode:overlay;opacity:0.55;
      background:radial-gradient(72% 92% at 18% 8%,var(--accent) 0%,rgba(0,0,0,0) 62%)}
    & .ph-photo{filter:grayscale(1) contrast(1.18) brightness(1.06);
      mix-blend-mode:luminosity;opacity:0.95;transform:scale(1.03)}
    & .ph-motif:before{background:radial-gradient(80% 80% at 24% 18%,#e2622a35 0%,transparent 64%)}
    & .shell{left:64px;right:64px;width:auto;bottom:120px;align-items:center;text-align:center}
    & h1{max-width:980px;text-align:center;margin:0 auto}
    & .summary{width:auto;max-width:720px;text-align:center;border-left:none;
      border-top:3px solid var(--accent);background:rgba(10,14,26,0.52)}
    & footer{background:rgba(8,12,22,0.72);color:#fff}
    & .breaking{color:#ff6b74}
    & .src{color:#e7ecf7}
    & .foot-right{color:#a9b4c8}
    & .foot-right b{color:#fff}`,
  },
  {
    id: "mint-editorial",
    tone: "light",
    headline: "solid",
    field: `radial-gradient(120% 130% at 4% 96%, #e2f2e7 0%, rgba(226,242,231,0) 58%),
      linear-gradient(165deg,#f5fbf6 0%,#e8f3ec 62%,#dcebe0 100%)`,
    rules: `
    &{--ink-c:#12241c;--sub:#4c6355;--panel:#ffffff;--panel-ink:#16241d;
      --panel-rule:#12241c;--footer-bg:#ffffff;--footer-ink:#12241c;
      --footer-sub:#7b8b80;--rule:#12241c1f;--logo-bg:#12241c0d;--badge-ink:#fff;
      --veil:linear-gradient(90deg,rgba(245,251,246,0.2) 0 50%,rgba(245,251,246,0) 60%);}
    & .badge{background:#ffffff;color:#12241c;border:1px solid #12241c24;
      box-shadow:0 2px 10px #12241c14;letter-spacing:1.2px}
    & .badge i{background:#12241c;box-shadow:0 0 0 4px #12241c12}
    & .media{opacity:0.34}
    & .ph-photo{mix-blend-mode:multiply;opacity:0.7}
    & .spine{left:0;right:0;top:0;height:5px}
    & .shell{width:628px;border-left:8px solid var(--accent);padding-left:26px}
    & .summary{box-shadow:0 8px 26px #12241c12}
    & footer{border-top:1px solid #12241c14}
    & .media{left:auto;right:0;top:118px;bottom:110px;width:300px;opacity:0.34}
    & .media-mark{color:#12241c12}`,
  },
  {
    id: "sand-poster",
    tone: "light",
    headline: "solid",
    field: `radial-gradient(110% 120% at 84% 16%, #f8e8c6 0%, rgba(248,232,198,0) 60%),
      linear-gradient(160deg,#f7eeda 0%,#eddec1 68%,#e4d1ae 100%)`,
    rules: `
    &{--ink-c:#2a2013;--sub:#6b5b45;--panel:#fffdf6;--panel-ink:#2a2013;
      --panel-rule:#2a2013;--footer-bg:#14202f;--footer-ink:#f7f0e1;
      --footer-sub:#a9b6c4;--rule:#2a20132a;--logo-bg:#2a20130f;--badge-ink:#fff;
      --veil:linear-gradient(180deg,rgba(247,238,218,0.1) 0 55%,rgba(247,238,218,0) 100%);}
    & .badge{border-radius:6px;letter-spacing:2px}
    & .media{opacity:0.16}
    & .ph-photo{mix-blend-mode:multiply;opacity:0.42}
    & .spine{left:0;top:0;bottom:84px;width:0}
    & .media{inset:auto;right:70px;bottom:130px;width:296px;height:296px;border-radius:50%;
      overflow:hidden;background:radial-gradient(circle at 32% 28%,#f9ebcd,#d9ba8b);
      box-shadow:0 22px 54px #2a201330;border:6px solid #fffdf6}
    & .ph-photo{mix-blend-mode:normal;opacity:0.97;border-radius:50%;
      filter:blur(1.2px) saturate(1.15) contrast(1.03) hue-rotate(-6deg)}
    & .media-mark{left:80px;top:64px;right:auto;font-size:150px;color:#2a201314}
    & .shell{left:74px;right:412px;width:auto;bottom:124px;align-items:flex-start;text-align:left}
    & h1{max-width:560px;text-align:left;line-height:1.32}
    & .summary{width:auto;max-width:512px;text-align:left;border-left:4px solid var(--accent);
      border-bottom:none;padding:15px 20px;background:rgba(255,255,255,0.58)}
    & footer{height:84px}`,
  },
  {
    id: "slate-grid",
    tone: "light",
    headline: "solid",
    field: `repeating-linear-gradient(0deg,#141e3009 0 1px,rgba(0,0,0,0) 1px 62px),
      repeating-linear-gradient(90deg,#141e3009 0 1px,rgba(0,0,0,0) 1px 62px),
      linear-gradient(162deg,#f4f7fb 0%,#e7edf6 66%,#dee6f1 100%)`,
    rules: `
    &{--ink-c:#151d2b;--sub:#525d70;--panel:#ffffff;--panel-ink:#151d2b;
      --panel-rule:#151d2b;--footer-bg:#151d2b;--footer-ink:#f3f6fb;
      --footer-sub:#9fb0c6;--rule:#151d2b1f;--logo-bg:#151d2b0d;--badge-ink:#fff;
      --veil:none;}
    & .media{inset:auto;left:44px;right:auto;top:132px;bottom:110px;width:376px;
      border-radius:14px;overflow:hidden;box-shadow:0 18px 48px #141e3026;
      background:linear-gradient(158deg,#dbe4f2,#c6d3e8)}
    & .media-mark{color:#141e3014}
    & .media .ph-scene{border-radius:14px}
    & .ph-photo{filter:blur(2px) saturate(1.25) contrast(1.04) hue-rotate(-8deg);
      mix-blend-mode:multiply;opacity:0.8;transform:scale(1.06)}
    & .spine{left:0;top:0;bottom:0;width:8px}
    & .shell{left:464px;width:648px}
    & .summary{box-shadow:0 6px 20px #141e3014}`,
  },
  {
    id: "ink-crimson",
    tone: "dark",
    headline: "warm",
    field: `radial-gradient(120% 140% at 8% -8%,#26365f 0%,rgba(38,54,95,0) 55%),
      radial-gradient(130% 170% at 98% 104%,#e22a38 0%,#b0204433 40%,rgba(0,0,0,0) 64%),
      linear-gradient(135deg,#20304f 0%,#2b3a63 48%,#4a1e35 100%)`,
    rules: `
    &{--ink-c:#ffffff;--sub:rgba(255,255,255,0.8);--panel:rgba(9,13,24,0.5);
      --panel-ink:#f6f8ff;--panel-rule:var(--accent);--footer-bg:#fdfdf8;
      --footer-ink:#14161a;--footer-sub:#6b7280;--rule:rgba(255,255,255,0.22);
      --logo-bg:rgba(255,255,255,0.12);--badge-ink:#fff;
      --veil:linear-gradient(180deg,rgba(6,9,18,0.16) 0%,rgba(6,9,18,0.32) 55%,rgba(6,9,18,0.58) 100%);}
    & .ph-photo{filter:blur(2px) saturate(1.35) contrast(1.05) hue-rotate(-8deg);
      mix-blend-mode:soft-light;opacity:0.85}
    & .shell{width:700px}`,
  },
  {
    id: "photo-frame",
    tone: "light",
    headline: "solid",
    field: `linear-gradient(150deg,#ffffff 0%,#f5f8fc 62%,#eaf0f9 100%)`,
    rules: `
    &{--ink-c:#101827;--sub:#5a6577;--panel:#101827;--panel-ink:#f6f9ff;
      --panel-rule:var(--accent);--footer-bg:var(--accent);--footer-ink:#ffffff;
      --footer-sub:#ffe3e6;--rule:#10182722;--logo-bg:#1018270d;--badge-ink:#fff;
      --veil:linear-gradient(90deg,rgba(255,255,255,0.06) 0 54%,rgba(255,255,255,0) 60%);}
    &{--veil:linear-gradient(180deg,rgba(255,255,255,0) 0 34%,rgba(255,255,255,0.86) 52%,#ffffff 64%);}
    & .media{inset:auto;left:0;right:0;top:0;height:300px;
      background:linear-gradient(120deg,#e6edf9,#f3f7fd)}
    & .ph-photo{filter:blur(1.6px) saturate(1.2) contrast(1.02) hue-rotate(-6deg);
      mix-blend-mode:multiply;opacity:0.9;transform:scale(1.04)}
    & .media-mark{color:#10182712}
    & .spine{left:0;right:0;top:0;height:8px}
    & .shell{left:48px;right:48px;width:auto;bottom:96px}
    & .summary{max-width:760px}
    & .summary{border-left-color:var(--accent)}
    & .breaking{color:#ffffff}
    & .src{color:#ffe6e8}
    & .foot-right{color:#ffe0e3}
    & .foot-right b{color:#ffffff}`,
  },
];

const GRAINS: { id: string; css: string }[] = [
  {
    // The original diagonal rail.
    id: "rail",
    css: "repeating-linear-gradient(115deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 13px)",
  },
  {
    id: "halftone",
    css: "radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1.6px)",
  },
  {
    id: "horizon",
    css: "linear-gradient(180deg, transparent 0 58%, rgba(255,255,255,0.055) 58% 59%, transparent 59% 100%)",
  },
];

/** FNV-1a — the same small deterministic hash `image-prompt.ts` uses. */
function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Pick the card's design for this story.
 *
 * The seed is the desk plus the headline, so two stories from one desk differ
 * and one story never changes between renders.
 */
export function broadcastVariant(seed: string): BroadcastVariant {
  const h = hashSeed(seed.replace(/\s+/g, " ").trim());
  const design = DESIGNS[h % DESIGNS.length] ?? DESIGNS[0]!;
  const grain = GRAINS[Math.floor(h / 7) % GRAINS.length] ?? GRAINS[0]!;
  return {
    id: `${design.id}/${grain.id}`,
    tone: design.tone,
    field: design.field,
    grain: grain.css,
    headline: design.headline,
    rules: design.rules.replace(/&/g, `body[data-design="${design.id}"]`),
  };
}

function fontLinks(input: BroadcastCardInput): string {
  if (input.fonts !== "cdn") return "";
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;700&display=swap" rel="stylesheet">`;
}

/**
 * The card's HTML. Pure string with the data already inlined, so callers can
 * diff it, cache it, or hand it to a renderer that is not this one.
 */
export async function broadcastCardTemplate(
  input: BroadcastCardInput,
): Promise<string> {
  const accent = input.accent ?? DEFAULT_ACCENT;
  const brand = escapeHtml(input.brand ?? "হৈচৈ");
  const title = escapeHtml(input.title);
  const summary = (input.summary ?? "").trim();
  const source = input.source?.trim();
  const site = escapeHtml((input.site ?? "hoichoifeed.vercel.app").replace(/^www\./, ""));
  const dateText = escapeHtml(input.dateText ?? "");
  const category = input.category?.trim();
  const headSize = headlineSizeForCard(input.title);
  const variant = broadcastVariant(`${category ?? ""}|${input.title}`);

  const photo = input.backgroundImage ? dataUrlForImage(input.backgroundImage) : null;
  const art = photo
    ? `<div class="ph-scene ph-photo" style="background-image:url('${photo}')" aria-hidden="true"></div>`
    : `<div class="ph-scene ph-motif" aria-hidden="true"></div>`;

  const logo = input.logoDataUrl
    ? `<img class="logo-img" src="${input.logoDataUrl}" alt="" />`
    : `<span class="logo-letter">${escapeHtml((input.brand ?? "হৈচৈ").slice(0, 2))}</span>`;

  const headlinePaint =
    variant.headline === "warm"
      ? `color:transparent;background:linear-gradient(100deg,#ffffff 0%, #ffffff 42%, #f8cf68 100%);
    -webkit-background-clip:text;background-clip:text;text-shadow:none;`
      : `color:var(--ink-c);`;

  return `<!doctype html><html lang="bn"><head><meta charset="utf-8">
  ${fontLinks(input)}
  <style>
  :root{--accent:${accent};}
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body{width:1200px;height:675px;overflow:hidden;}
  body{font-family:"Noto Sans Bengali","Hind Siliguri",ui-sans-serif,system-ui,sans-serif;
    background:#0f1424;position:relative;color:var(--ink-c);-webkit-font-smoothing:antialiased;
    --ink-c:#fff;--sub:rgba(255,255,255,0.8);--panel:rgba(9,13,24,0.5);--panel-ink:#f6f8ff;
    --panel-rule:var(--accent);--footer-bg:#fdfdf8;--footer-ink:#14161a;--footer-sub:#6b7280;
    --rule:rgba(255,255,255,0.22);--logo-bg:rgba(255,255,255,0.12);--veil:none;}
  /* The field. Which one comes from broadcastVariant(); the anatomy below does
     not change with it. */
  .field{position:absolute;inset:0;background:${variant.field};}
  .media{position:absolute;inset:0;overflow:hidden;}
  /* Derivative inspiration: the source photo is never shown as itself. */
  .ph-scene{position:absolute;inset:0;background:${variant.grain};background-size:auto;}
  /* Base treatment: every design softens the photo; the design only decides
     how it is blended into its own field. */
  .ph-photo{background-size:cover;background-position:center;
    filter:blur(2px) saturate(1.3) contrast(1.02) hue-rotate(-8deg);
    transform:scale(1.04);mix-blend-mode:soft-light;opacity:0.85;}
  .ph-motif:before{content:"";position:absolute;inset:0;background:
    radial-gradient(70% 70% at 82% 26%, rgba(255,205,66,0.16) 0%, transparent 60%);}
  /* A story without a picture still gets a mark, so a media panel is never a
     blank rectangle. */
  .media-mark{position:absolute;right:28px;top:34px;font-family:"Noto Serif Bengali",serif;
    font-weight:700;font-size:210px;line-height:1;letter-spacing:-8px;
    color:rgba(255,255,255,0.10);user-select:none;}
  body[data-tone="light"] .media-mark{color:#141e300f;}
  .veil{position:absolute;inset:0;background:var(--veil);}
  .static{position:absolute;inset:0;mix-blend-mode:${variant.tone === "dark" ? "soft-light" : "multiply"};
    opacity:${variant.tone === "dark" ? "0.3" : "0.05"};
    background-image:radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1.4px);background-size:9px 9px;}
  .spine{position:absolute;background:var(--accent);}
  header{position:absolute;top:36px;left:48px;right:48px;display:flex;
    align-items:center;justify-content:space-between;gap:18px;z-index:3;}
  .badge{display:inline-flex;align-items:center;gap:10px;border:1px solid var(--rule);
    border-radius:999px;padding:9px 18px;background:var(--accent);color:var(--badge-ink);
    font-weight:700;letter-spacing:1.6px;text-transform:uppercase;font-size:20px;}
  .badge i{width:10px;height:10px;border-radius:50%;background:#fff;
    box-shadow:0 0 0 4px rgba(255,255,255,0.3);}
  .corner{display:flex;align-items:center;gap:18px;}
  .brand-badge{display:flex;align-items:center;gap:12px;}
  .logo{width:56px;height:56px;border-radius:15px;background:var(--logo-bg);
    border:1px solid var(--rule);display:grid;place-items:center;overflow:hidden;}
  .logo-img{width:100%;height:100%;object-fit:cover;}
  .logo-letter{font-family:"Noto Serif Bengali",serif;font-weight:700;font-size:29px;color:var(--ink-c);}
  .corner-name{font-weight:700;font-size:22px;letter-spacing:0.4px;color:var(--ink-c);}
  .corner-date{font-size:14.5px;color:var(--sub);letter-spacing:1px;}
  section.shell{position:absolute;left:48px;bottom:104px;width:660px;display:flex;
    flex-direction:column;gap:20px;z-index:3;}
  h1{font-family:"Noto Serif Bengali","Hind Siliguri",serif;font-weight:700;line-height:1.30;
    font-size:${headSize}px;letter-spacing:-0.4px;text-wrap:balance;${headlinePaint}}
  .summary{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
    width:max-content;max-width:100%;padding:16px 22px 16px 20px;border-left:4px solid var(--panel-rule);
    background:var(--panel);font-size:21px;line-height:1.55;color:var(--panel-ink);}
  footer{position:absolute;left:0;right:0;bottom:0;height:72px;background:var(--footer-bg);
    color:var(--footer-ink);display:flex;align-items:center;justify-content:space-between;
    padding:0 48px;z-index:4;}
  .foot-left{display:flex;align-items:center;gap:16px;}
  .breaking{font-weight:700;letter-spacing:2px;text-transform:uppercase;font-size:17px;color:var(--accent);}
  .foot-dot{width:9px;height:9px;border-radius:50%;background:var(--accent);}
  .src{font-weight:600;font-size:18px;color:var(--footer-ink);}
  .foot-right{display:flex;align-items:center;gap:14px;font-size:15px;letter-spacing:1px;
    color:var(--footer-sub);text-transform:uppercase;}
  .foot-right b{color:var(--footer-ink);font-weight:700;}
  /* The design's own composition. */
  ${variant.rules}
  </style></head><body data-design="${variant.id.split("/")[0]}" data-tone="${variant.tone}">
  <div class="field"></div>
  <div class="media">${art}${
    photo ? "" : `<span class="media-mark" aria-hidden="true">${escapeHtml(brand.slice(0, 1))}</span>`
  }</div>
  <div class="veil"></div>
  <div class="static" aria-hidden="true"></div>
  <div class="spine" aria-hidden="true"></div>
  <header>
    <div class="badge"><i></i>${escapeHtml(category || "সংবাদ")}</div>
    <div class="corner">
      <div class="brand-badge"><div class="logo">${logo}</div>
        <div class="corner-name">${brand}</div></div>
      ${dateText ? `<span class="corner-date">${dateText}</span>` : ""}
    </div>
  </header>
  <section class="shell">
    <h1>${title}</h1>
    ${summary ? `<div class="summary">${escapeHtml(summary)}</div>` : ""}
  </section>
  <footer>
    <div class="foot-left"><span class="foot-dot"></span>
      <span class="breaking">ব্রেকিং নিউজ</span>
      <span class="src">${source ? `সূত্র · ${escapeHtml(source)}` : brand}</span></div>
    <div class="foot-right"><b>${brand}</b> · ${site}</div>
  </footer>
  </body></html>`;
}

/**
 * Render the broadcast card to a 2400×1350 PNG.
 *
 * The frames are embedded from the package so a network-less machine gets the
 * same glyphs (this is not optional styling: Bengali conjuncts need a real face).
 * When `fonts: "cdn"` the template also requests Hind Siliguri and Noto Sans
 * Bengali from Google Fonts, and the embedded faces still cover the gap until
 * — and even if — that request fails.
 */
export async function renderBroadcastCard(
  input: BroadcastCardInput,
): Promise<BroadcastCardResult> {
  let faces = "";
  try {
    const assets = await loadAssets();
    const sans = assets.fonts.filter((f) => f.family === "Noto Sans Bengali");
    const serif = assets.fonts.filter((f) => f.family === "Noto Serif Bengali");
    const rules = (list: typeof assets.fonts) =>
      list
        .map(
          (f) =>
            `@font-face{font-family:"${f.family}";font-style:normal;font-weight:${f.weight};
              src:url(${f.dataUrl}) format("truetype");}`,
        )
        .join("");
    faces = rules(sans) + rules(serif);
  } catch (err) {
    // A missing font file must not silently produce tofu: an empty face set is
    // the same class of failure as no browser.
    throw new PosterBrowserUnavailable(err);
  }

  // A card with no image still needs the same mark; the logo is optional.
  let logoUrl = input.logoDataUrl ?? null;
  try {
    const assets = await loadAssets();
    logoUrl = logoUrl ?? assets.logo;
  } catch {
    /* keep input logo or none */
  }

  const html = await broadcastCardTemplate({
    ...input,
    logoDataUrl: logoUrl,
  });
  const styled = html.replace(/body\{/, `${faces}body{`);

  const bytes = await renderHtmlToPng(styled, {
    width: BROADCAST_FRAME.width,
    height: BROADCAST_FRAME.height,
    scale: BROADCAST_SCALE,
  });
  return {
    bytes,
    contentType: "image/png",
    width: BROADCAST_FRAME.width,
    height: BROADCAST_FRAME.height,
    scale: BROADCAST_SCALE,
  };
}
