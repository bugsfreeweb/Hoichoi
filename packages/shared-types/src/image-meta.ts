/**
 * The facts a stored picture can state about itself.
 *
 * The media registry recorded a size in bytes and nothing else, so the console
 * could say "2.1 MB" about a file that was, in fact, a 2400×1600 WebP — and had
 * no way to notice that an "image" it had just mirrored was really an HTML error
 * page with a `.jpg` name. Both are cheap to answer from the first few dozen
 * bytes, with no decoder and no image library in the hot path.
 *
 * Deliberately independent of `packages/poster`: this must be importable from a
 * server route, a worker and a test without pulling a renderer along with it.
 * Unknown formats return `null` rather than a guess, because a wrong MIME type
 * written into a database outlives the mistake.
 */

export interface ImageSize {
  width: number;
  height: number;
}

const PNG = [0x89, 0x50, 0x4e, 0x47];
const JPEG = [0xff, 0xd8, 0xff];

function startsWith(b: Uint8Array, sig: number[]): boolean {
  if (b.length < sig.length) return false;
  return sig.every((v, i) => b[i] === v);
}

function ascii(b: Uint8Array, at: number, len: number): string {
  let out = "";
  for (let i = at; i < at + len && i < b.length; i += 1)
    out += String.fromCharCode(b[i] ?? 0);
  return out;
}

const u16be = (b: Uint8Array, at: number) =>
  ((b[at] ?? 0) << 8) | (b[at + 1] ?? 0);
const u16le = (b: Uint8Array, at: number) =>
  (b[at] ?? 0) | ((b[at + 1] ?? 0) << 8);
const u24le = (b: Uint8Array, at: number) =>
  (b[at] ?? 0) | ((b[at + 1] ?? 0) << 8) | ((b[at + 2] ?? 0) << 16);
const u32be = (b: Uint8Array, at: number) =>
  (((b[at] ?? 0) << 24) |
    ((b[at + 1] ?? 0) << 16) |
    ((b[at + 2] ?? 0) << 8) |
    (b[at + 3] ?? 0)) >>>
  0;
const u32le = (b: Uint8Array, at: number) =>
  ((b[at] ?? 0) |
    ((b[at + 1] ?? 0) << 8) |
    ((b[at + 2] ?? 0) << 16) |
    ((b[at + 3] ?? 0) << 24)) >>>
  0;

/**
 * The real media type, from magic bytes only. `null` means "this is not an
 * image format I recognise" — never a fallback, because the caller writes it
 * into a row that later readers trust.
 */
export function sniffImageMime(bytes: Uint8Array): string | null {
  const b = bytes;
  if (startsWith(b, PNG)) return "image/png";
  if (startsWith(b, JPEG)) return "image/jpeg";
  if (b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46)
    return "image/gif";
  if (b.length >= 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP")
    return "image/webp";
  if (b.length >= 12 && ascii(b, 4, 4) === "ftyp") {
    const brand = ascii(b, 8, 4);
    if (brand === "avif" || brand === "avis") return "image/avif";
    if (brand === "heic" || brand === "heix" || brand === "mif1")
      return "image/heic";
  }
  if (b.length >= 2 && b[0] === 0x42 && b[1] === 0x4d) return "image/bmp";
  if (
    b.length >= 12 &&
    (ascii(b, 0, 4) === "II*\u0000" || ascii(b, 0, 4) === "MM\u0000*")
  ) {
    return "image/tiff";
  }
  return null;
}

/** PNG: width/height are the first two u32be of the IHDR chunk. */
function pngSize(b: Uint8Array): ImageSize | null {
  if (b.length < 24 || ascii(b, 12, 4) !== "IHDR") return null;
  return { width: u32be(b, 16), height: u32be(b, 20) };
}

/** JPEG: walk the marker segments to the first Start-Of-Frame. */
function jpegSize(b: Uint8Array): ImageSize | null {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i += 1; // resynchronise on a stray byte rather than trusting a bad length
      continue;
    }
    const marker = b[i + 1] ?? 0;
    // Standalone markers carry no length payload.
    if (
      marker === 0xd8 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      i += 2;
      continue;
    }
    const len = u16be(b, i + 2);
    if (len < 2) return null;
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSof) return { width: u16be(b, i + 7), height: u16be(b, i + 5) };
    i += 2 + len;
  }
  return null;
}

/** GIF: the logical screen descriptor, little-endian. */
function gifSize(b: Uint8Array): ImageSize | null {
  if (b.length < 10) return null;
  return { width: u16le(b, 6), height: u16le(b, 8) };
}

/** WebP: three container shapes, each storing its size differently. */
function webpSize(b: Uint8Array): ImageSize | null {
  if (b.length < 30) return null;
  const chunk = ascii(b, 12, 4);
  if (chunk === "VP8 ") {
    // Lossy: 3-byte frame tag, then the 14-bit dimensions after the start code.
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    if ((b[20] ?? 0) !== 0x2f) return null;
    const bits = u32le(b, 21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return { width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
  }
  return null;
}

/** BMP: the DIB header, rows stored bottom-up (that does not change the size). */
function bmpSize(b: Uint8Array): ImageSize | null {
  if (b.length < 26) return null;
  return { width: u32le(b, 18), height: Math.abs(u32le(b, 22) | 0) };
}

/**
 * Pixel dimensions, or `null` when the format is unseen, the header is
 * truncated, or the numbers are nonsense. Callers store `null` and say
 * "অজানা" rather than inventing a size.
 */
export function readImageSize(bytes: Uint8Array): ImageSize | null {
  let size: ImageSize | null = null;
  const mime = sniffImageMime(bytes);
  if (mime === "image/png") size = pngSize(bytes);
  else if (mime === "image/jpeg") size = jpegSize(bytes);
  else if (mime === "image/gif") size = gifSize(bytes);
  else if (mime === "image/webp") size = webpSize(bytes);
  else if (mime === "image/bmp") size = bmpSize(bytes);
  if (!size) return null;
  // A zero or absurd dimension means we misparsed; say unknown, not 0×0.
  if (!Number.isFinite(size.width) || !Number.isFinite(size.height))
    return null;
  if (
    size.width <= 0 ||
    size.height <= 0 ||
    size.width > 100_000 ||
    size.height > 100_000
  )
    return null;
  return size;
}

/** Everything the registry records about one blob. */
export function describeImage(bytes: Uint8Array): {
  mime: string | null;
  width: number | null;
  height: number | null;
} {
  const size = readImageSize(bytes);
  return {
    mime: sniffImageMime(bytes),
    width: size?.width ?? null,
    height: size?.height ?? null,
  };
}
