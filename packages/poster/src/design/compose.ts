/**
 * Assemble the document handed to Chromium.
 *
 * One function, one `<style>`, one `<body>` with `data-layout`. Keeping the
 * palette variables and the texture in the same document as the markup is what
 * lets the screenshot be a single atomic operation: no external stylesheet can
 * arrive late and paint the poster in the fallback font.
 */
import type { DesignPosterContent } from "./tokens";
import { escapeHtml, frameFor } from "./tokens";
import { designStyles } from "./styles";
import { layoutBody } from "./layouts";

export function designPosterHtml(content: DesignPosterContent): string {
  const frame = frameFor(content.aspect);
  return `<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=${frame.width}, initial-scale=1" />
<title>${escapeHtml(content.headline)}</title>
<style>${designStyles(content)}</style>
</head>
<body data-layout="${content.layout}" data-aspect="${content.aspect}">
${layoutBody(content)}
</body>
</html>`;
}
