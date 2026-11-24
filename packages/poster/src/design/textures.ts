/**
 * Procedural background textures.
 *
 * The brief asks that no two backgrounds look identical, and it is right: five
 * palettes on their own would still produce a feed of five flat rectangles. The
 * texture is drawn here rather than requested from the image model because it
 * must be deterministic (two renders of one story match), tiny (an SVG data URL,
 * no extra request) and safe (no letters, ever).
 *
 * Each pattern is seeded from the story's own text, so the angle, spacing and
 * glow position vary from story to story even within one texture family.
 */
import type { PosterPalette, PosterTexture } from "@hoichoi/shared-types";
import { DESIGN_FRAME } from "./tokens";

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function pattern(kind: "dots" | "lines", palette: PosterPalette, seed: number): string {
  const gap = 26 + (seed % 22);
  const angle = -35 + (seed % 55);
  const opacity = 0.10 + ((seed >>> 5) % 10) / 100;
  if (kind === "dots") {
    return `<pattern id="p" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})">
      <circle cx="${gap / 2}" cy="${gap / 2}" r="1.5" fill="${palette.accent}" fill-opacity="${opacity.toFixed(2)}"/>
    </pattern>`;
  }
  return `<pattern id="p" width="${gap * 2}" height="${gap * 2}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})">
      <path d="M0 ${gap} L${gap * 2} ${gap} M${gap} 0 L${gap} ${gap * 2}" stroke="${palette.accent}" stroke-opacity="${(opacity * 0.8).toFixed(2)}" stroke-width="1"/>
    </pattern>`;
}

function glow(palette: PosterPalette, seed: number): string {
  const cx = 240 + (seed % 1300);
  const cy = 160 + ((seed >>> 7) % 720);
  const r = 460 + ((seed >>> 3) % 360);
  return `<radialGradient id="g" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${palette.accent}" stop-opacity="0.32"/>
      <stop offset="0.55" stop-color="${palette.accent}" stop-opacity="0.10"/>
      <stop offset="1" stop-color="${palette.accent}" stop-opacity="0"/>
    </radialGradient>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#g)"/>`;
}

function topographic(palette: PosterPalette, seed: number): string {
  const cx = 380 + (seed % 1160);
  const cy = 220 + ((seed >>> 6) % 620);
  const rings = 7;
  const paths = Array.from({ length: rings }, (_, i) => {
    const rx = 150 + i * (58 + (seed % 14));
    const ry = rx * (0.58 + ((seed >>> 4) % 18) / 100);
    const rot = (seed % 40) - 20;
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry.toFixed(0)}" transform="rotate(${rot} ${cx} ${cy})" fill="none" stroke="${palette.accent}" stroke-opacity="${(0.13 - i * 0.012).toFixed(3)}" stroke-width="1.2"/>`;
  }).join("");
  return `<g>${paths}</g>`;
}

/** The SVG for one texture. Pure and deterministic: same seed, same bytes. */
export function textureSvg(texture: PosterTexture, palette: PosterPalette, seedText: string): string {
  const seed = fnv1a(`${seedText}|${texture}|${palette.id}`);
  const w = DESIGN_FRAME.width;
  const h = DESIGN_FRAME.height;
  let defs = "";
  let body = "";

  switch (texture) {
    case "dot_grid":
      defs = pattern("dots", palette, seed);
      body = `<rect width="${w}" height="${h}" fill="url(#p)"/>`;
      break;
    case "diagonal_mesh":
      defs = pattern("lines", palette, seed);
      body = `<rect width="${w}" height="${h}" fill="url(#p)"/>`;
      break;
    case "radial_glow":
      body = glow(palette, seed);
      break;
    case "topographic":
      body = `${glow(palette, seed)}${topographic(palette, seed)}`;
      break;
    case "mixed":
    default:
      defs = pattern("dots", palette, seed);
      body = `<rect width="${w}" height="${h}" fill="url(#p)"/>${glow(palette, seed)}${topographic(palette, seed)}`;
      break;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>${defs}</defs>
  ${body}
</svg>`;
}

/** A CSS-ready `url(...)`, UTF-8 and fully escaped so `#` cannot end the value. */
export function textureDataUri(texture: PosterTexture, palette: PosterPalette, seed: string): string {
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(textureSvg(texture, palette, seed))}")`;
}
