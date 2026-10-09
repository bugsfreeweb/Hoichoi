/** Minimal classnames joiner (the kit controls its own class strings, so we
 * don't need clsx/tailwind-merge here). Falsy values are dropped. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  let out = "";
  for (const p of parts) {
    if (!p) continue;
    out = out ? `${out} ${p}` : p;
  }
  return out;
}
