/**
 * What kind of picture is this, really?
 *
 * The plate used to hand the browser a `data:image/png` URL for whatever bytes
 * it was given. A WebP photograph — which is what the media store writes and
 * what most providers return — is not a PNG, and Chromium silently refuses a
 * data URL whose declared type does not match its content: the background image
 * simply never paints, leaving the poster's whole graphic area black. The
 * headline and footer still drew, so the plate looked "designed but empty".
 *
 * Sniffing the magic bytes costs nothing and cannot disagree with the browser.
 */
export function dataUrlForImage(bytes: Buffer | Uint8Array): string {
  return `data:${sniffMime(bytes)};base64,${Buffer.from(bytes).toString("base64")}`;
}

export function sniffMime(bytes: Uint8Array): string {
  const b = bytes;
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return "image/webp";
  }
  if (b.length >= 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return "image/avif";
  // An unknown format is still worth trying as a PNG: the layer underneath is a
  // branded wash, so a picture that fails to paint costs a picture, not the plate.
  return "image/png";
}
