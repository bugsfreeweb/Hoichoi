import sharp from "sharp";

/**
 * Perceptual hash (DCT-based pHash) for IMG-1 image-only dedup.
 * Resize → 32x32 grayscale → 2D DCT-II → take 8x8 low frequencies →
 * drop DC → compare against median → 64-bit hex.
 */
export async function imagePhash(buffer: Buffer): Promise<string> {
  const { data, info } = await sharp(buffer)
    .resize(32, 32, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const size = info.width; // 32
  const pixels = Array.from(data);

  // 2D DCT-II (separable): compute DCT of rows, then columns.
  const dct2d = dct2D(pixels, size);
  const low = 8;
  const block: number[] = [];
  let sum = 0;
  let count = 0;
  for (let y = 0; y < low; y++) {
    for (let x = 0; x < low; x++) {
      if (x === 0 && y === 0) continue; // skip DC coefficient
      const v = dct2d[y * size + x]!;
      block.push(v);
      sum += v;
      count++;
    }
  }
  const median = sum / count;
  let hash = "";
  for (let i = 0; i < block.length; i++) {
    hash += block[i]! > median ? "1" : "0";
    if (hash.length >= 64) break;
  }
  return BigInt.asUintN(64, BigInt(parseInt(hash, 2) || 0)).toString(16).padStart(16, "0");
}

function dct2D(pixels: number[], size: number): number[] {
  const oneDim = (arr: number[]): number[] => {
    const n = arr.length;
    const out = new Array(n);
    for (let k = 0; k < n; k++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += arr[i]! * Math.cos((Math.PI * (2 * i + 1) * k) / (2 * n));
      }
      out[k] = sum * (k === 0 ? Math.sqrt(1 / n) : Math.sqrt(2 / n));
    }
    return out;
  };

  // apply to rows
  const rows: number[][] = [];
  for (let y = 0; y < size; y++) {
    rows.push(oneDim(pixels.slice(y * size, (y + 1) * size)));
  }
  // apply to columns
  const out = new Array(size * size);
  for (let x = 0; x < size; x++) {
    const col = Array.from({ length: size }, (_, y) => rows[y]![x]!);
    const t = oneDim(col);
    for (let y = 0; y < size; y++) {
      out[y * size + x] = t[y]!;
    }
  }
  return out;
}

/** Hamming distance between two hex pHashes. */
export function hammingDistance(a: string, b: string): number {
  const ai = BigInt(`0x${a}`);
  const bi = BigInt(`0x${b}`);
  const xor = ai ^ bi;
  let d = 0;
  let v = xor;
  while (v > 0n) {
    d++;
    v &= v - 1n;
  }
  return d;
}

/** Threshold: ≤ 10 differing bits of 64 → near-duplicate. */
export function isNearDuplicate(a: string, b: string, threshold = 10): boolean {
  return hammingDistance(a, b) <= threshold;
}