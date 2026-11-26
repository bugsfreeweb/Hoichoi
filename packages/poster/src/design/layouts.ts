/**
 * The five 16:9 shapes.
 *
 * Each builder returns only the body markup. The frame, the fonts, the palette
 * variables and the texture are supplied by `compose.ts`, which is what keeps a
 * new layout from inventing its own colours or its own ideas about safe margins.
 *
 * The shapes are deliberately structurally different, not five variations of one
 * column: a two-column split, a hero with a glass card, a Swiss grid with a
 * framed visual, and a centred spotlight with a ticker. An editor flipping from
 * one post to the next should see a different *kind* of page.
 */
import type { DesignPosterContent } from "./tokens";
import {
  escapeHtml,
  headlineHtml,
  headlineSizeFor,
} from "./tokens";

function mediaLayer(content: DesignPosterContent, extraClass = ""): string {
  if (content.backgroundDataUrl) {
    return `<div class="media ${extraClass}" style="background-image:url('${content.backgroundDataUrl}')"></div>`;
  }
  return `<div class="media media--empty ${extraClass}"></div>`;
}

function masthead(content: DesignPosterContent): string {
  return `<div class="masthead">
      ${content.logoDataUrl ? `<img class="mark" src="${content.logoDataUrl}" alt="" />` : ""}
      <span class="wordmark">${escapeHtml(content.brand)}</span>
      <span class="newsroom">NEWSROOM · ${escapeHtml(content.site)}</span>
    </div>`;
}

function badge(content: DesignPosterContent): string {
  return content.badgeText
    ? `<div class="badge"><span class="dot"></span><span>${escapeHtml(content.badgeText)}</span></div>`
    : "";
}

function footer(content: DesignPosterContent): string {
  return `<div class="footer">
      <span class="source">${escapeHtml(content.footerText)}</span>
      <span class="readmore">বিস্তারিত পড়ুন <b>·</b> ${escapeHtml(content.site)}</span>
    </div>`;
}

function watermark(content: DesignPosterContent, extra = ""): string {
  return `<div class="watermark ${extra}" aria-hidden="true">
      ${content.logoDataUrl ? `<img src="${content.logoDataUrl}" alt="" />` : ""}
      <span>${escapeHtml(content.brand)}</span>
    </div>`;
}

function headline(content: DesignPosterContent): string {
  const size = headlineSizeFor(
    content.layout,
    content.headline,
    content.aspect,
  );
  return `<h1 class="headline" style="--headline-size:${size}px">${headlineHtml(content.headline, content.highlightWord)}</h1>`;
}

export function layoutBody(content: DesignPosterContent): string {
  const shared = `<div class="bg"></div><div class="texture"></div>`;

  switch (content.layout) {
    case "split_right_media":
      return `<div class="stage" data-layout="split_right_media">
        ${shared}
        <section class="copy">
          ${masthead(content)}
          <div class="masthead-rule"></div>
          ${badge(content)}
          ${headline(content)}
          ${footer(content)}
        </section>
        <figure class="media-frame">
          ${mediaLayer(content)}
          <figcaption class="frame-caption">${content.visualStyle}</figcaption>
        </figure>
        <div class="vignette"></div>
        ${watermark(content)}
      </div>`;

    case "hero_overlay_gradient":
      return `<div class="stage" data-layout="hero_overlay_gradient">
        ${shared}
        ${mediaLayer(content)}
        <div class="veil"></div>
        <div class="vignette"></div>
        <div class="masthead">${masthead(content)}</div>
        <section class="glass">
          ${badge(content)}
          ${headline(content)}
          ${footer(content)}
        </section>
        <div class="photo-credit">${content.visualStyle}</div>
        ${watermark(content)}
      </div>`;

    case "editorial_magazine_grid":
      return `<div class="stage" data-layout="editorial_magazine_grid">
        ${shared}
        <div class="topbar"></div>
        <div class="grid">
          <section class="col-left">
            ${masthead(content)}
            <div class="masthead-rule"></div>
            ${badge(content)}
            ${headline(content)}
              ${footer(content)}
          </section>
          <div class="col-right">
            <figure class="visual">${mediaLayer(content)}</figure>
            <div class="visual-caption"><span>${escapeHtml(content.badgeText)}</span><span>${escapeHtml(content.dateText ?? "")}</span></div>
          </div>
        </div>
        ${watermark(content)}
      </div>`;

    case "breaking_spotlight":
      return `<div class="stage" data-layout="breaking_spotlight">
        ${shared}
        <div class="vignette"></div>
        <div class="ticker-top">
          <span class="live"><i></i>ব্রেকিং</span>
          <span class="date">${escapeHtml(content.dateText ?? "")}</span>
        </div>
        <div class="masthead">${masthead(content)}</div>
        <figure class="spotlight">${mediaLayer(content)}</figure>
        <section class="center">
          ${badge(content)}
          ${headline(content)}
        </section>
        <div class="spot-footer">
          <span class="source">${escapeHtml(content.footerText)}</span>
          <span class="readmore">বিস্তারিত পড়ুন <b>·</b> ${escapeHtml(content.site)}</span>
        </div>
        ${watermark(content, "watermark--spot")}
      </div>`;

    case "split_left_media":
    default:
      return `<div class="stage" data-layout="split_left_media">
        ${shared}
        ${mediaLayer(content)}
        <div class="vignette"></div>
        <section class="copy">
          ${masthead(content)}
          <div class="masthead-rule"></div>
          ${badge(content)}
          ${headline(content)}
          ${footer(content)}
        </section>
        <div class="photo-credit">${content.visualStyle}</div>
        ${watermark(content)}
      </div>`;
  }
}
