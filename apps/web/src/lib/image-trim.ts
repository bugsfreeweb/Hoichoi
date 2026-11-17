/**
 * Remove a provider's corner watermark from a generated image.
 *
 * The keyless Pollinations hosts stamp a small `pollinations.ai` mark in the
 * bottom-right corner and keep doing it with `nologo=true` and a referrer set
 * (measured: two renders, two marks). A news desk cannot publish a third party's
 * logo inside its own hero image, and the provider offers no way to turn it off
 * without a paid key — so the bottom band is cropped.
 *
 * This is deliberately narrow: it only ever trims, never resizes or re-encodes
 * beyond the format it was given, and it returns the input unchanged when the
 * fraction is zero or the image is too small to lose a band.
 */
import sharp from "sharp";

/** Cap: no watermark band is ever more than a quarter of the frame. */
export const MAX_TRIM_FRACTION = 0.25;

export async function trimWatermark(bytes: Uint8Array, fraction: number): Promise<Uint8Array> {
  if (!Number.isFinite(fraction) || fraction <= 0) return bytes;
  const image = sharp(Buffer.from(bytes));
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width < 32 || height < 32) return bytes;
  const keep = Math.max(1, Math.round(height * (1 - Math.min(MAX_TRIM_FRACTION, fraction))));
  if (keep >= height) return bytes;
  const out = await image.extract({ left: 0, top: 0, width, height: keep }).toBuffer();
  return new Uint8Array(out);
}
