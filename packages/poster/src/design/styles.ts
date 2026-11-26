/**
 * The stylesheet for the dynamic poster.
 *
 * Every rule that protects Bengali legibility lives here rather than in the
 * per-layout markup, so a sixth layout cannot forget it:
 *
 *   - Hind Siliguri for display, at `line-height: 1.42` and with vertical
 *     padding, because `ি`, `ী`, `ু`, `ৃ` and the reph sit above and below the
 *     baseline and clip in a tight line box;
 *   - `text-wrap: balance` on the headline, so a two-line heading is not a long
 *     line and a stray word;
 *   - the copy is never laid directly on the photo without a surface: a glass
 *     card, a solid column or a tinted scrim, depending on the layout.
 */
import type { DesignPosterContent } from "./tokens";
import { SAFE, frameFor, onAccent } from "./tokens";
import { portraitStyles } from "./portrait-styles";
import { textureDataUri } from "./textures";

function fontCss(fonts: DesignPosterContent["fonts"]): string {
  return fonts
    .map(
      (f) =>
        `@font-face{font-family:"${f.family}";font-weight:${f.weight};font-style:normal;font-display:block;src:url("${f.dataUrl}") format("truetype");}`,
    )
    .join("\n");
}

export function designStyles(content: DesignPosterContent): string {
  const { palette } = content;
  const accentInk = onAccent(palette);
  const texture = textureDataUri(content.texture, palette, content.seed);
  const frame = frameFor(content.aspect);
  const w = frame.width;
  const h = frame.height;

  return `${fontCss(content.fonts)}
:root{
  --bg-color:${palette.bg};
  --accent-color:${palette.accent};
  --card-bg:${palette.cardBg};
  --text-primary:${palette.textPrimary};
  --text-muted:${palette.textMuted};
  --hairline:color-mix(in srgb, ${palette.textPrimary} 22%, transparent);
  --accent-ink:${accentInk};
  --safe:${SAFE}px;
}
*{box-sizing:border-box;margin:0;padding:0;}
html,body{width:${w}px;height:${h}px;overflow:hidden;background:var(--bg-color);}
body{
  font-family:"Hind Siliguri","Noto Sans Bengali",sans-serif;
  color:var(--text-primary);
  -webkit-font-smoothing:antialiased;
  text-rendering:geometricPrecision;
}
h1,h2,h3,p,ul,figure{margin:0;}
.stage{position:relative;width:${w}px;height:${h}px;overflow:hidden;background:var(--bg-color);}
.bg{position:absolute;inset:0;background:
  radial-gradient(140% 110% at 80% 0%, color-mix(in srgb, var(--accent-color) 12%, transparent) 0%, transparent 58%),
  linear-gradient(155deg, color-mix(in srgb, var(--bg-color) 88%, #FFFFFF) 0%, var(--bg-color) 46%, color-mix(in srgb, var(--bg-color) 82%, #000000) 100%);
}
.texture{position:absolute;inset:0;background-image:${texture};background-size:cover;opacity:0.9;pointer-events:none;}
.vignette{position:absolute;inset:0;background:radial-gradient(125% 100% at 50% 45%, transparent 42%, rgba(0,0,0,0.42) 100%);pointer-events:none;}
.media{position:absolute;background-size:cover;background-position:center;background-repeat:no-repeat;}
.media--empty{background-image:
  radial-gradient(90% 120% at 30% 25%, color-mix(in srgb, var(--accent-color) 38%, transparent) 0%, transparent 62%),
  radial-gradient(80% 90% at 82% 80%, color-mix(in srgb, var(--accent-color) 22%, transparent) 0%, transparent 60%),
  linear-gradient(150deg, color-mix(in srgb, var(--bg-color) 72%, #FFFFFF) 0%, var(--bg-color) 100%);
}
.media--empty::after{
  content:"";
  position:absolute;inset:9%;
  border:1px solid color-mix(in srgb, var(--accent-color) 34%, transparent);
  border-radius:8px;
}

/* ---------- shared editorial atoms ---------- */
.masthead{display:flex;align-items:center;gap:16px;min-width:0;}
.mark{width:46px;height:46px;object-fit:contain;flex:0 0 auto;}
.wordmark{font-family:"Noto Serif Bengali",serif;font-weight:700;font-size:36px;line-height:1;letter-spacing:-0.5px;}
.newsroom{font-family:"Hind Siliguri",sans-serif;font-size:13px;font-weight:600;letter-spacing:3.2px;text-transform:uppercase;color:var(--text-muted);white-space:nowrap;}
.masthead-rule{width:100%;height:2px;background:var(--accent-color);opacity:0.85;margin-top:14px;}

.badge{display:inline-flex;align-items:center;gap:12px;padding:11px 24px;border-radius:999px;background:var(--accent-color);color:var(--accent-ink);font-size:22px;font-weight:700;letter-spacing:0.4px;align-self:flex-start;box-shadow:0 10px 34px color-mix(in srgb, var(--accent-color) 28%, transparent);}
.badge .dot{width:9px;height:9px;border-radius:999px;background:currentColor;opacity:0.75;}

/* With description blocks gone, the headline owns the copy column. Auto
   block margins centre it in the space between the badge and the footer instead
   of leaving one dead gap above the footer. */
.copy .headline,
.glass .headline{flex:0 0 auto;margin-top:auto;margin-bottom:auto;}

.headline{
  font-family:"Hind Siliguri","Noto Sans Bengali",sans-serif;
  font-weight:700;
  font-size:var(--headline-size,72px);
  line-height:1.42;
  letter-spacing:-0.6px;
  padding:6px 0 10px;
  text-wrap:balance;
  overflow-wrap:break-word;
  display:-webkit-box;
  -webkit-line-clamp:4;
  -webkit-box-orient:vertical;
  overflow:hidden;
  text-shadow:0 4px 28px rgba(0,0,0,0.34);
}
.hl{color:var(--accent-color);background:transparent;position:relative;white-space:nowrap;}
.hl::after{content:"";position:absolute;left:0;right:0;bottom:0.08em;height:0.09em;background:var(--accent-color);opacity:0.45;border-radius:2px;}

.bullets{list-style:none;display:flex;flex-direction:column;gap:14px;}
.bullets li{display:grid;grid-template-columns:34px 1fr;gap:14px;align-items:start;font-size:23px;line-height:1.5;color:var(--text-muted);}
.bullets .n{font-family:"Hind Siliguri",sans-serif;font-size:15px;font-weight:700;letter-spacing:0.5px;color:var(--accent-color);border:1px solid color-mix(in srgb, var(--accent-color) 45%, transparent);border-radius:999px;width:32px;height:32px;display:grid;place-items:center;margin-top:2px;}

.quote{position:relative;padding:4px 0 4px 36px;border-left:4px solid var(--accent-color);}
.quote p{font-family:"Galada","Noto Serif Bengali",serif;font-size:42px;line-height:1.55;color:var(--text-primary);font-weight:400;}
.quote::before{content:"“";position:absolute;left:20px;top:-34px;font-family:"Galada",serif;font-size:92px;color:var(--accent-color);opacity:0.5;line-height:1;}

.footer{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;border-top:1px solid var(--hairline);padding-top:16px;}
.footer .source{font-size:17px;line-height:1.4;color:var(--text-muted);max-width:66%;}
.footer .readmore{font-size:17px;font-weight:700;letter-spacing:0.4px;color:var(--text-primary);white-space:nowrap;}
.footer .readmore b{color:var(--accent-color);}

.watermark{position:absolute;right:${SAFE}px;bottom:${SAFE - 26}px;display:flex;align-items:center;gap:10px;opacity:0.32;pointer-events:none;}
.watermark img{width:38px;height:38px;object-fit:contain;filter:grayscale(1) brightness(2);}
.watermark span{font-family:"Noto Serif Bengali",serif;font-size:30px;font-weight:700;}

.photo-credit{position:absolute;left:20px;bottom:18px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.72);background:rgba(0,0,0,0.34);padding:5px 10px;border-radius:3px;}

/* ---------- 1. split_left_media ---------- */
body[data-layout="split_left_media"] .media{left:0;top:0;width:45%;height:100%;background-position:center;}
body[data-layout="split_left_media"] .media::after{content:"";position:absolute;right:0;top:0;bottom:0;width:10px;background:var(--accent-color);}
body[data-layout="split_left_media"] .copy{position:absolute;left:45%;top:0;right:0;bottom:0;padding:${SAFE + 20}px ${SAFE + 20}px ${SAFE}px ${SAFE + 12}px;display:flex;flex-direction:column;gap:24px;}
body[data-layout="split_left_media"] .copy::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg, color-mix(in srgb, var(--bg-color) 72%, transparent) 0%, var(--bg-color) 16%);z-index:-1;}
body[data-layout="split_left_media"] .headline{margin-top:4px;}
body[data-layout="split_left_media"] .spacer{flex:1;min-height:6px;}
/* The watermark owns the bottom-right corner; the footer stops above it. */
body[data-layout="split_left_media"] .footer{margin-bottom:56px;}

/* ---------- 2. split_right_media ---------- */
body[data-layout="split_right_media"] .copy{position:absolute;left:0;top:0;width:57%;bottom:0;padding:${SAFE + 20}px ${SAFE - 8}px ${SAFE}px ${SAFE}px;display:flex;flex-direction:column;gap:24px;}
body[data-layout="split_right_media"] .media-frame{position:absolute;right:${SAFE}px;top:${SAFE + 8}px;width:39%;height:${h - SAFE * 2 - 16}px;padding:12px;border:1px solid var(--hairline);background:color-mix(in srgb, var(--bg-color) 74%, #FFFFFF 4%);}
body[data-layout="split_right_media"] .media-frame .media{position:absolute;inset:12px;}
body[data-layout="split_right_media"] .media-frame::before{content:"";position:absolute;left:-18px;top:-18px;width:120px;height:120px;border-left:8px solid var(--accent-color);border-top:8px solid var(--accent-color);}
body[data-layout="split_right_media"] .media-frame::after{content:"";position:absolute;right:-18px;bottom:-18px;width:120px;height:120px;border-right:8px solid var(--accent-color);border-bottom:8px solid var(--accent-color);}
body[data-layout="split_right_media"] .frame-caption{position:absolute;left:12px;right:12px;bottom:12px;padding:9px 14px;background:var(--card-bg);font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--text-primary);}
body[data-layout="split_right_media"] .spacer{flex:1;min-height:6px;}

/* ---------- 3. hero_overlay_gradient ---------- */
body[data-layout="hero_overlay_gradient"] .media{inset:0;background-position:center 38%;}
body[data-layout="hero_overlay_gradient"] .veil{position:absolute;inset:0;background:
  linear-gradient(90deg, var(--bg-color) 0%, color-mix(in srgb, var(--bg-color) 92%, transparent) 34%, color-mix(in srgb, var(--bg-color) 46%, transparent) 66%, color-mix(in srgb, var(--bg-color) 12%, transparent) 100%),
  linear-gradient(0deg, color-mix(in srgb, var(--bg-color) 88%, transparent) 0%, transparent 46%);}
body[data-layout="hero_overlay_gradient"] .masthead{position:absolute;left:${SAFE}px;right:${SAFE}px;top:${SAFE - 8}px;}
body[data-layout="hero_overlay_gradient"] .glass{position:absolute;left:${SAFE}px;top:176px;width:900px;padding:44px 48px 40px;border-radius:20px;background:var(--card-bg);border:1px solid color-mix(in srgb, var(--text-primary) 16%, transparent);box-shadow:0 30px 90px rgba(0,0,0,0.45);backdrop-filter:blur(26px) saturate(1.15);display:flex;flex-direction:column;gap:22px;}
body[data-layout="hero_overlay_gradient"] .glass::before{content:"";position:absolute;left:0;top:26px;bottom:26px;width:5px;border-radius:4px;background:var(--accent-color);}
body[data-layout="hero_overlay_gradient"] .spacer{flex:1;min-height:4px;}
body[data-layout="hero_overlay_gradient"] .footer{margin-top:2px;}

/* ---------- 4. editorial_magazine_grid ---------- */
body[data-layout="editorial_magazine_grid"] .topbar{position:absolute;left:0;right:0;top:0;height:14px;background:var(--accent-color);}
body[data-layout="editorial_magazine_grid"] .grid{position:absolute;inset:14px 0 0 0;display:grid;grid-template-columns:58% 42%;}
body[data-layout="editorial_magazine_grid"] .col-left{padding:${SAFE + 4}px ${SAFE - 8}px ${SAFE}px ${SAFE}px;display:flex;flex-direction:column;gap:22px;border-right:1px solid var(--hairline);}
body[data-layout="editorial_magazine_grid"] .col-right{position:relative;padding:${SAFE + 4}px ${SAFE}px ${SAFE}px ${SAFE - 8}px;}
body[data-layout="editorial_magazine_grid"] .visual{position:absolute;left:${SAFE - 8}px;right:${SAFE}px;top:${SAFE + 26}px;height:600px;padding:10px;border:1px solid var(--hairline);}
body[data-layout="editorial_magazine_grid"] .visual .media{position:absolute;inset:10px;}
body[data-layout="editorial_magazine_grid"] .visual::after{content:"";position:absolute;left:-14px;top:-14px;width:92px;height:92px;background:var(--accent-color);opacity:0.9;}
body[data-layout="editorial_magazine_grid"] .visual-caption{position:absolute;left:${SAFE - 8}px;right:${SAFE}px;top:${SAFE + 26 + 600 + 18}px;display:flex;justify-content:space-between;font-size:13px;letter-spacing:2.4px;text-transform:uppercase;color:var(--text-muted);}
body[data-layout="editorial_magazine_grid"] .pullbox{background:color-mix(in srgb, var(--accent-color) 12%, transparent);border-left:5px solid var(--accent-color);padding:20px 24px;}
body[data-layout="editorial_magazine_grid"] .pullbox .quote{border-left:none;padding-left:0;}
body[data-layout="editorial_magazine_grid"] .pullbox .quote::before{display:none;}
body[data-layout="editorial_magazine_grid"] .pullbox .quote p{font-size:34px;}
body[data-layout="editorial_magazine_grid"] .col-left .bullets li{font-size:21px;}
body[data-layout="editorial_magazine_grid"] .spacer{flex:1;min-height:4px;}
body[data-layout="editorial_magazine_grid"] .footer{margin-top:2px;}
body[data-layout="editorial_magazine_grid"] .col-left .headline{flex:0 0 auto;margin-top:auto;margin-bottom:auto;}

/* ---------- 5. breaking_spotlight ---------- */
body[data-layout="breaking_spotlight"] .bg{background:
  radial-gradient(58% 62% at 50% 32%, color-mix(in srgb, var(--accent-color) 30%, transparent) 0%, transparent 68%),
  radial-gradient(120% 100% at 50% 110%, color-mix(in srgb, var(--accent-color) 18%, transparent) 0%, transparent 60%),
  linear-gradient(170deg, #050506 0%, var(--bg-color) 52%, #050506 100%);}
body[data-layout="breaking_spotlight"] .ticker-top{position:absolute;left:0;right:0;top:0;height:70px;background:var(--accent-color);color:var(--accent-ink);display:flex;align-items:center;gap:16px;padding:0 ${SAFE}px;z-index:4;}
body[data-layout="breaking_spotlight"] .ticker-top .live{display:inline-flex;align-items:center;gap:10px;font-size:20px;font-weight:700;letter-spacing:3px;text-transform:uppercase;}
body[data-layout="breaking_spotlight"] .ticker-top .live i{width:11px;height:11px;border-radius:999px;background:currentColor;box-shadow:0 0 0 5px color-mix(in srgb, currentColor 24%, transparent);}
body[data-layout="breaking_spotlight"] .ticker-top .date{margin-left:auto;font-size:18px;font-weight:600;opacity:0.9;}
body[data-layout="breaking_spotlight"] .masthead{position:absolute;left:${SAFE}px;top:${104}px;z-index:4;}
body[data-layout="breaking_spotlight"] .spotlight{position:absolute;left:50%;top:${96}px;transform:translateX(-50%);width:404px;height:404px;border-radius:50%;overflow:hidden;border:5px solid var(--accent-color);box-shadow:0 0 0 16px color-mix(in srgb, var(--accent-color) 14%, transparent), 0 34px 90px rgba(0,0,0,0.55);z-index:2;}
body[data-layout="breaking_spotlight"] .spotlight .media{inset:0;}
body[data-layout="breaking_spotlight"] .center{position:absolute;left:${SAFE}px;right:${SAFE}px;top:532px;bottom:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:18px;z-index:3;}
body[data-layout="breaking_spotlight"] .center .badge{align-self:center;}
body[data-layout="breaking_spotlight"] .center .headline{max-width:1480px;-webkit-line-clamp:3;text-shadow:0 6px 34px rgba(0,0,0,0.6);}
body[data-layout="breaking_spotlight"] .center .quote{border-left:none;padding-left:0;max-width:1320px;}
body[data-layout="breaking_spotlight"] .center .quote::before{left:50%;transform:translateX(-50%);top:-46px;}
body[data-layout="breaking_spotlight"] .center .quote p{font-size:36px;}
body[data-layout="breaking_spotlight"] .ticker-bottom{position:absolute;left:${SAFE}px;right:${SAFE}px;bottom:${SAFE + 18}px;display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--hairline);border-bottom:1px solid var(--hairline);z-index:3;}
body[data-layout="breaking_spotlight"] .ticker-bottom .cell{display:flex;align-items:center;gap:12px;padding:18px 20px;font-size:20px;line-height:1.42;color:var(--text-muted);}
body[data-layout="breaking_spotlight"] .ticker-bottom .cell + .cell{border-left:1px solid var(--hairline);}
body[data-layout="breaking_spotlight"] .ticker-bottom .n{color:var(--accent-color);font-weight:700;font-size:15px;letter-spacing:0.5px;flex:0 0 auto;}
body[data-layout="breaking_spotlight"] .spot-footer{position:absolute;left:${SAFE}px;right:${SAFE}px;bottom:${SAFE - 44}px;display:flex;align-items:center;justify-content:space-between;gap:20px;z-index:3;}
body[data-layout="breaking_spotlight"] .spot-footer .source{font-size:15px;color:var(--text-muted);}
body[data-layout="breaking_spotlight"] .spot-footer .readmore{font-size:15px;font-weight:700;color:var(--text-primary);}
body[data-layout="breaking_spotlight"] .spot-footer .readmore b{color:var(--accent-color);}
body[data-layout="breaking_spotlight"] .watermark--spot{bottom:176px;right:${SAFE}px;}

${content.aspect === "4:5" ? portraitStyles() : ""}
/* Final rule: portrait layout blocks set their own top margin, so the
   auto-margin centring must come after them. */
body .copy .headline,
body .glass .headline{margin-top:auto;margin-bottom:auto;}
`;
}
