import crypto from "node:crypto";

/**
 * TOTP (RFC 6238) — a second factor for privileged accounts, with no dependency.
 *
 * Written here rather than pulled in as a package because the algorithm is
 * short, fixed, and testable against the RFC's own vectors. The pieces that are
 * easy to get wrong — base32 padding, the counter width, and accepting the
 * *next* step because a phone's clock drifts — are handled explicitly.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input
    .toUpperCase()
    .replace(/[=\s]{1,64}$/g, "")
    .replace(/\s{1,64}/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error("invalid base32 character");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** A fresh 160-bit secret, base32-encoded (the size RFC 4226 recommends). */
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export const TOTP_STEP_SECONDS = 30;

/** HOTP value for an explicit counter, as a zero-padded string. */
export function hotp(
  secretBase32: string,
  counter: number,
  digits = 6,
): string {
  const key = base32Decode(secretBase32);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(binary % 10 ** digits).padStart(digits, "0");
}

export function totpStep(at: number = Date.now()): number {
  return Math.floor(at / 1000 / TOTP_STEP_SECONDS);
}

export function totp(
  secretBase32: string,
  at: number = Date.now(),
  digits = 6,
): string {
  return hotp(secretBase32, totpStep(at), digits);
}

/**
 * Verify a code, accepting the previous, current and next step so a phone clock
 * that is a few seconds off still works. Returns the matched step so the caller
 * can refuse a replay (`last_used_step`).
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  opts: { at?: number; window?: number; digits?: number } = {},
): { ok: boolean; step?: number } {
  const clean = code.replace(/\s+/g, "");
  if (!/^\d{6,8}$/.test(clean)) return { ok: false };
  const at = opts.at ?? Date.now();
  const window = opts.window ?? 1;
  const digits = opts.digits ?? 6;
  const current = totpStep(at);
  for (let delta = -window; delta <= window; delta += 1) {
    const step = current + delta;
    if (step < 0) continue;
    const expected = hotp(secretBase32, step, digits);
    // Constant-time compare: a timing side channel on a 6-digit code is small
    // but free to close.
    const a = Buffer.from(expected);
    const b = Buffer.from(clean);
    if (a.length === b.length && crypto.timingSafeEqual(a, b))
      return { ok: true, step };
  }
  return { ok: false };
}

/** The `otpauth://` URI an authenticator app reads from a QR code. */
export function totpUri(input: {
  secret: string;
  account: string;
  issuer: string;
  digits?: number;
  period?: number;
}): string {
  const label = encodeURIComponent(`${input.issuer}:${input.account}`);
  const params = new URLSearchParams({
    secret: input.secret,
    issuer: input.issuer,
    algorithm: "SHA1",
    digits: String(input.digits ?? 6),
    period: String(input.period ?? TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Recovery codes: long enough to be worth something, short enough to type. */
export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 chars
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

export function hashRecoveryCode(code: string): string {
  return crypto
    .createHash("sha256")
    .update(code.trim().toUpperCase())
    .digest("hex");
}
