/** URL helpers the desk uses before putting a value into `src` or an iframe. */

export function safeHttpUrl(value: string): string | null {
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function hostIs(value: string, domain: string): boolean {
  const safe = safeHttpUrl(value);
  if (!safe) return false;
  const host = new URL(safe).hostname.toLowerCase();
  return host === domain || host.endsWith(`.${domain}`);
}

/** What an `<img src>` may carry: remote http(s), local path, blob, image data. */
export function safeImageSrc(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(raw))
    return raw;
  if (raw.startsWith("blob:")) return raw;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return safeHttpUrl(raw) ?? "";
}
