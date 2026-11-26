/**
 * The 4:5 recomposition, expressed as overrides on the same semantic markup.
 *
 * There is no second layout tree. The body builders already emit masthead,
 * badge, headline, support and footer in reading order, so portrait only has to
 * restack them. One source of truth for the Bengali line box, one set of palette
 * variables, and a sixth layout arrives in both frames for free.
 */

import { SAFE_PORTRAIT } from "./tokens";

export function portraitStyles(): string {
  const s = SAFE_PORTRAIT;

  return `
/* ---------- shared atoms ---------- */
body[data-aspect="4:5"] .mark{width:38px;height:38px;}
body[data-aspect="4:5"] .wordmark{font-size:30px;}
body[data-aspect="4:5"] .newsroom{font-size:10px;letter-spacing:2px;}
body[data-aspect="4:5"] .masthead-rule{margin-top:10px;height:2px;}
body[data-aspect="4:5"] .badge{font-size:16px;padding:8px 18px;gap:8px;box-shadow:0 6px 20px color-mix(in srgb,var(--accent-color) 24%,transparent);}
body[data-aspect="4:5"] .badge .dot{width:7px;height:7px;}
body[data-aspect="4:5"] .headline{line-height:1.44;letter-spacing:-0.3px;padding:4px 0 6px;}
body[data-aspect="4:5"] .bullets{gap:9px;}
body[data-aspect="4:5"] .bullets li{font-size:19px;grid-template-columns:26px 1fr;gap:9px;line-height:1.48;}
body[data-aspect="4:5"] .bullets .n{width:24px;height:24px;font-size:11px;}
body[data-aspect="4:5"] .quote{padding-left:22px;border-left-width:3px;}
body[data-aspect="4:5"] .quote p{font-size:30px;line-height:1.5;}
body[data-aspect="4:5"] .quote::before{font-size:64px;top:-22px;left:12px;}
body[data-aspect="4:5"] .footer{padding-top:10px;}
body[data-aspect="4:5"] .footer .source,body[data-aspect="4:5"] .footer .readmore{font-size:13px;}
body[data-aspect="4:5"] .watermark{right:${s}px;bottom:18px;gap:7px;}
body[data-aspect="4:5"] .watermark img{width:26px;height:26px;}
body[data-aspect="4:5"] .watermark span{font-size:20px;}
body[data-aspect="4:5"] .photo-credit{font-size:10px;letter-spacing:1.4px;padding:4px 8px;}

/* ---------- 1. split_left_media ---------- */
body[data-aspect="4:5"][data-layout="split_left_media"] .media{left:0;top:0;width:100%;height:50%;background-position:center;}
body[data-aspect="4:5"][data-layout="split_left_media"] .media::after{left:0;right:0;top:auto;bottom:0;width:auto;height:8px;}
body[data-aspect="4:5"][data-layout="split_left_media"] .copy{left:0;right:0;top:50%;bottom:0;padding:26px ${s}px 20px;gap:12px;}
body[data-aspect="4:5"][data-layout="split_left_media"] .copy::before{background:linear-gradient(180deg,color-mix(in srgb,var(--bg-color) 70%,transparent) 0%,var(--bg-color) 12%);}
body[data-aspect="4:5"][data-layout="split_left_media"] .footer{margin-bottom:22px;}

/* A quote-only portrait has no bullets to fill the copy column. Without this,
   the flexible spacer left a third of the poster empty below one sentence. */
body[data-aspect="4:5"][data-layout="split_left_media"] .quote-only,
body[data-aspect="4:5"][data-layout="split_right_media"] .quote-only{
  flex:1;align-self:stretch;display:flex;align-items:center;margin:6px 0 8px;
  padding:22px 22px 22px 26px;border-left:5px solid var(--accent-color);
  border-radius:4px;background:color-mix(in srgb,var(--accent-color) 10%,transparent);
}
body[data-aspect="4:5"][data-layout="split_left_media"] .quote-only p,
body[data-aspect="4:5"][data-layout="split_right_media"] .quote-only p{font-size:32px;line-height:1.55;}

/* ---------- 2. split_right_media ---------- */
body[data-aspect="4:5"][data-layout="split_right_media"] .copy{left:0;top:0;width:100%;height:56%;bottom:auto;padding:42px ${s}px 20px;gap:14px;}
body[data-aspect="4:5"][data-layout="split_right_media"] .media-frame{left:${s}px;right:${s}px;top:58%;bottom:${s}px;width:auto;height:auto;padding:0;}
body[data-aspect="4:5"][data-layout="split_right_media"] .media-frame .media{inset:0;}
body[data-aspect="4:5"][data-layout="split_right_media"] .media-frame::before{left:-10px;top:-10px;width:64px;height:64px;border-left-width:5px;border-top-width:5px;}
body[data-aspect="4:5"][data-layout="split_right_media"] .media-frame::after{right:-10px;bottom:-10px;width:64px;height:64px;border-right-width:5px;border-bottom-width:5px;}
body[data-aspect="4:5"][data-layout="split_right_media"] .frame-caption{left:8px;right:8px;bottom:8px;font-size:9px;padding:5px 8px;letter-spacing:1.4px;}

/* ---------- 3. hero_overlay_gradient ---------- */
body[data-aspect="4:5"][data-layout="hero_overlay_gradient"] .veil{background:
  linear-gradient(0deg,var(--bg-color) 0%,color-mix(in srgb,var(--bg-color) 92%,transparent) 38%,color-mix(in srgb,var(--bg-color) 42%,transparent) 66%,color-mix(in srgb,var(--bg-color) 8%,transparent) 100%);}
body[data-aspect="4:5"][data-layout="hero_overlay_gradient"] .masthead{left:${s}px;right:${s}px;top:${s - 8}px;}
body[data-aspect="4:5"][data-layout="hero_overlay_gradient"] .glass{left:24px;right:24px;top:auto;bottom:30px;width:auto;padding:26px 26px 24px;gap:13px;border-radius:16px;}
body[data-aspect="4:5"][data-layout="hero_overlay_gradient"] .glass::before{display:none;}
body[data-aspect="4:5"][data-layout="hero_overlay_gradient"] .photo-credit{left:auto;right:14px;bottom:auto;top:14px;}

/* ---------- 4. editorial_magazine_grid ---------- */
body[data-aspect="4:5"][data-layout="editorial_magazine_grid"] .topbar{height:10px;}
body[data-aspect="4:5"][data-layout="editorial_magazine_grid"] .grid{inset:10px 0 0 0;display:flex;flex-direction:column;}
body[data-aspect="4:5"][data-layout="editorial_magazine_grid"] .col-right{order:1;height:38%;padding:32px ${s}px 0;flex:0 0 auto;}
body[data-aspect="4:5"][data-layout="editorial_magazine_grid"] .visual{left:${s}px;right:${s}px;top:30px;bottom:0;height:auto;padding:0;}
body[data-aspect="4:5"][data-layout="editorial_magazine_grid"] .visual .media{inset:0;}
body[data-aspect="4:5"][data-layout="editorial_magazine_grid"] .visual::after{display:none;}
body[data-aspect="4:5"][data-layout="editorial_magazine_grid"] .visual-caption{display:none;}
body[data-aspect="4:5"][data-layout="editorial_magazine_grid"] .col-left{order:2;flex:1;min-height:0;padding:22px ${s}px 58px;border-right:none;gap:13px;}
body[data-aspect="4:5"][data-layout="editorial_magazine_grid"] .pullbox{padding:12px 16px;}
body[data-aspect="4:5"][data-layout="editorial_magazine_grid"] .pullbox .quote p{font-size:24px;}

/* ---------- 5. breaking_spotlight ---------- */
body[data-aspect="4:5"][data-layout="breaking_spotlight"] .ticker-top{height:54px;padding:0 ${s - 16}px;gap:12px;}
body[data-aspect="4:5"][data-layout="breaking_spotlight"] .ticker-top .live{font-size:15px;letter-spacing:2px;gap:8px;}
body[data-aspect="4:5"][data-layout="breaking_spotlight"] .ticker-top .live i{width:8px;height:8px;}
body[data-aspect="4:5"][data-layout="breaking_spotlight"] .ticker-top .date{font-size:13px;}
body[data-aspect="4:5"][data-layout="breaking_spotlight"] .masthead{left:${s}px;top:74px;}
body[data-aspect="4:5"][data-layout="breaking_spotlight"] .newsroom{display:none;}
body[data-aspect="4:5"][data-layout="breaking_spotlight"] .spotlight{width:330px;height:330px;top:68px;border-width:4px;box-shadow:0 0 0 12px color-mix(in srgb,var(--accent-color) 14%,transparent),0 24px 60px rgba(0,0,0,0.55);}
body[data-aspect="4:5"][data-layout="breaking_spotlight"] .center{left:${s}px;right:${s}px;top:430px;bottom:110px;justify-content:center;gap:11px;}
body[data-aspect="4:5"][data-layout="breaking_spotlight"] .center:has(.quote){top:520px;}
body[data-aspect="4:5"][data-layout="breaking_spotlight"] .center .headline{max-width:984px;-webkit-line-clamp:4;}
body[data-aspect="4:5"][data-layout="breaking_spotlight"] .center .quote{max-width:960px;}
body[data-aspect="4:5"][data-layout="breaking_spotlight"] .center .quote p{font-size:28px;}
body[data-aspect="4:5"][data-layout="breaking_spotlight"] .center .quote::before{font-size:60px;top:-34px;}
body[data-aspect="4:5"][data-layout="breaking_spotlight"] .ticker-bottom{left:${s}px;right:${s}px;top:840px;bottom:auto;grid-template-columns:1fr;}
body[data-aspect="4:5"][data-layout="breaking_spotlight"] .ticker-bottom .cell{padding:15px 4px;font-size:17px;gap:8px;line-height:1.4;}
body[data-aspect="4:5"][data-layout="breaking_spotlight"] .ticker-bottom .cell + .cell{border-left:none;border-top:1px solid var(--hairline);}
body[data-aspect="4:5"][data-layout="breaking_spotlight"] .ticker-bottom .n{font-size:11px;}
body[data-aspect="4:5"][data-layout="breaking_spotlight"] .spot-footer{left:${s}px;right:${s}px;bottom:16px;}
body[data-aspect="4:5"][data-layout="breaking_spotlight"] .spot-footer .source,body[data-aspect="4:5"][data-layout="breaking_spotlight"] .spot-footer .readmore{font-size:12px;}
body[data-aspect="4:5"][data-layout="breaking_spotlight"] .watermark--spot{display:none;}
`;
}
