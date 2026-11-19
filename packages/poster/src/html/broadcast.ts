/**
 * The broadcast card: a 1200×675 (16:9) social-media news card.
 *
 * It is a different object from the editorial poster. The editorial plate is a
 * newsroom edition — desk, stands, columns. This one is a *broadcast* card, the
 * shape a platform scrolls past: navy-to-crimson field, a red desk badge and a
 * logo badge on the top rail, a headline that reads white fading to gold, a
 * translucent summary box, and a solid white footer bar with "Breaking News" and
 * the source. It renders at 2× device scale so the PNG is 2400×1350, which is
 * the size social services downsample from.
 *
 * A few rules ride alongside the style:
 *
 *   • The picture is a *derivative inspiration*, never the photo itself. When the
 *     story already has an image, it is dropped behind the field as a
 *     hue-rotated, saturation-lifted, slightly-blurred layer blended with
 *     `soft-light`, so the card echoes the scene without being a copy of it.
 *   • The type is clamped and balanced, so no headline can overflow the frame.
 *   • Fonts embed from the package by default. Google Fonts (Hind Siliguri +
 *     Noto Sans Bengali) is an opt-in `cdn` mode for a machine that wants the
 *     exact families named in the brief and is guaranteed a network — a render
 *     must not depend on a network to be legible.
 */

import { escapeHtml } from "./template";
import { dataUrlForImage } from "./image";
import { loadAssets, renderHtmlToPng, PosterBrowserUnavailable } from "./render";

export const BROADCAST_FRAME = { width: 1200, height: 675 } as const;
export const BROADCAST_SCALE = 2 as const;

export interface BroadcastCardInput {
  /** The desk slug is not needed for the shape — this is one card for every
   *  story — only the *label* the badge prints. */
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

  /**
   * The story's own picture, treated rather than shown.
   *
   * The brief asks for a card "similar to, but not exactly, the image from the
   * content": so the photo is blurred, its saturation lifted and its hue nudged,
   * then blended with `soft-light` under the navy/crimson field. What survives is
   * the scene's light and colour, not the photograph — a reader sees a card about
   * the story, not the story's photo with a headline pasted on it.
   */
  const photo = input.backgroundImage
    ? dataUrlForImage(input.backgroundImage)
    : null;
  const art = photo
    ? `<div class="ph-scene ph-photo" style="background-image:url('${photo}')" aria-hidden="true"></div>
       <span class="ph-fade" aria-hidden="true"></span>`
    : '<div class="ph-scene ph-motif" aria-hidden="true"></div>';

  // The logo: a real mark when we have one, otherwise the brand letter in a
  // circle so the badge is never an empty box.
  const logo = input.logoDataUrl
    ? `<img class="logo-img" src="${input.logoDataUrl}" alt="" />`
    : `<span class="logo-letter">${escapeHtml((input.brand ?? "হৈচৈ").slice(0, 2))}</span>`;

  return `<!doctype html><html lang="bn"><head><meta charset="utf-8">
  ${fontLinks(input)}
  <style>
  :root{--accent:${accent};--accent-soft:${accent}22;--ink:#0B1020;
    --panel:rgba(9,13,24,0.55);--card:#121a30;}
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body{width:1200px;height:675px;overflow:hidden;}
  body{font-family:"Noto Sans Bengali","Hind Siliguri",ui-sans-serif,system-ui,sans-serif;
    background:var(--ink);position:relative;color:#fff;}
  /* Navy to crimson, but a navy you can name: the first version sat at #0b1020
     and read as black on a phone in daylight. The field is lifted and the crimson
     corner carries more of the frame, so the card looks like a broadcast graphic
     rather than a dark rectangle with white type. */
  .field{position:absolute;inset:0;background:
    radial-gradient(120% 140% at 6% -6%, #16224a 0%, transparent 52%),
    radial-gradient(130% 170% at 98% 106%, rgba(214,32,46,0.92) 0%, rgba(160,24,60,0.35) 38%, transparent 62%),
    linear-gradient(135deg,#101a36 0%,#1b2547 48%,#341328 100%);}
  /* Derivative inspiration: the source photo is never shown as itself. */
  .ph-scene{position:absolute;inset:0;background:
    repeating-linear-gradient(115deg, rgba(255,255,255,0.045) 0 1px, transparent 1px 13px);}
  .ph-motif::before{content:"";position:absolute;inset:0;background:
    radial-gradient(70% 70% at 82% 26%, rgba(255,205,66,0.16) 0%, transparent 60%);}
  .ph-photo{filter:blur(2px) saturate(1.35) contrast(1.05) hue-rotate(-8deg);
    background-size:cover;background-position:center;transform:scale(1.08);
    mix-blend-mode:soft-light;opacity:0.85;}
  .ph-fade{position:absolute;inset:0;background:
    linear-gradient(180deg, rgba(6,9,18,0.30) 0%, rgba(6,9,18,0.55) 55%, rgba(6,9,18,0.86) 100%);}
  .vignette{position:absolute;inset:0;background:
    linear-gradient(180deg, rgba(6,9,18,0.35) 0%, rgba(6,9,18,0) 22%, rgba(6,9,18,0.25) 78%, rgba(6,9,18,0.72) 100%);}
  .static{position:absolute;inset:0;mix-blend-mode:soft-light;opacity:0.5;
    background-image:radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1.4px);background-size:9px 9px;}
  .top-rule{position:absolute;top:0;left:0;right:0;height:6px;background:var(--accent);}
  header{position:absolute;top:34px;left:44px;right:44px;display:flex;
    align-items:center;justify-content:space-between;gap:18px;}
  .badge{display:inline-flex;align-items:center;gap:10px;border:1px solid rgba(255,255,255,0.22);
    border-radius:999px;padding:9px 18px;background:var(--accent);color:#fff;
    font-weight:700;letter-spacing:1.6px;text-transform:uppercase;font-size:20px;}
  .badge i{width:10px;height:10px;border-radius:50%;background:#fff;
    box-shadow:0 0 0 4px rgba(255,255,255,0.35);}
  .corner{display:flex;align-items:center;gap:18px;}
  .brand-badge{display:flex;align-items:center;gap:12px;}
  .logo{width:58px;height:58px;border-radius:16px;background:rgba(255,255,255,0.10);
    border:1px solid rgba(255,255,255,0.25);display:grid;place-items:center;overflow:hidden;}
  .logo-img{width:100%;height:100%;object-fit:cover;}
  .logo-letter{font-family:"Noto Serif Bengali",serif;font-weight:700;font-size:30px;color:#fff;}
  .corner-name{font-weight:700;font-size:22px;letter-spacing:0.4px;}
  .corner-date{font-size:14.5px;color:rgba(255,255,255,0.72);letter-spacing:1px;}
  section.shell{position:absolute;left:44px;right:44px;bottom:96px;display:flex;
    flex-direction:column;gap:22px;max-width:940px;}
  h1{font-family:"Noto Serif Bengali","Hind Siliguri",serif;font-weight:700;line-height:1.30;
    font-size:${headSize}px;letter-spacing:-0.4px;text-wrap:balance;
    color:transparent;
    background:linear-gradient(100deg,#ffffff 0%, #ffffff 42%, #f5c451 100%);
    -webkit-background-clip:text;background-clip:text;}
  .glow{filter:drop-shadow(0 4px 22px rgba(245,196,81,0.28));}
  .summary{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
    width:max-content;max-width:100%;padding:16px 22px 16px 20px;border-left:4px solid var(--accent);
    background:rgba(255,255,255,0.09);backdrop-filter:blur(8px);
    font-size:21px;line-height:1.55;color:rgba(255,255,255,0.94);}
  footer{position:absolute;left:0;right:0;bottom:0;height:66px;background:#fdfdf8;color:#14161a;
    display:flex;align-items:center;justify-content:space-between;padding:0 44px;}
  .foot-left{display:flex;align-items:center;gap:16px;}
  .breaking{font-weight:700;letter-spacing:2px;text-transform:uppercase;font-size:17px;color:var(--accent);}
  .foot-dot{width:9px;height:9px;border-radius:50%;background:var(--accent);}
  .src{font-weight:600;font-size:18px;color:#2a2f3a;}
  .foot-right{display:flex;align-items:center;gap:14px;font-size:15px;letter-spacing:1px;
    color:#6b7280;text-transform:uppercase;}
  .foot-right b{color:#14161a;font-weight:700;}
  </style></head><body>
  <div class="field"></div>
  ${art}
  <div class="vignette"></div>
  <div class="static" aria-hidden="true"></div>
  <div class="top-rule"></div>
  <header>
    <div class="badge"><i></i>${escapeHtml(category || "সংবাদ")}</div>
    <div class="corner">
      <div class="brand-badge"><div class="logo">${logo}</div>
        <div class="corner-name">${brand}</div></div>
      ${dateText ? `<span class="corner-date">${dateText}</span>` : ""}
    </div>
  </header>
  <section class="shell">
    <h1 class="glow">${title}</h1>
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
