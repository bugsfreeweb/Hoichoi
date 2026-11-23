/**
 * The language of this request, read from the cookie.
 *
 * Server-side only: the root layout calls it once and hands the value to the
 * provider, so every server component and every client component agree on the
 * language before the first byte of HTML — no flash of Bangla for a reader who
 * chose English.
 *
 * `?lang=en` also works (a shared link can carry the language), and it wins over
 * the cookie for that request only. The cookie is what the toggle writes, because
 * a reader should not have to keep re-choosing on every link.
 */
import { cookies } from "next/headers";

import { LOCALE_COOKIE, normalizeLocale, type Locale } from "@hoichoi/i18n";

/**
 * One year. The constant lives here so the server and the toggle agree, but
 * `lib/locale.ts` imports `next/headers` and therefore cannot be pulled into a
 * client bundle — the provider keeps its own copy of the number below.
 */
export const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

export async function getLocale(
  searchParams?: Record<string, string | string[] | undefined>,
): Promise<Locale> {
  const fromQuery = Array.isArray(searchParams?.lang) ? searchParams?.lang[0] : searchParams?.lang;
  if (fromQuery) return normalizeLocale(fromQuery);
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

/** The cookie header a toggle should write (kept here so it is written once). */
export const localeCookie = {
  name: LOCALE_COOKIE,
  maxAge: LOCALE_MAX_AGE,
  path: "/",
  sameSite: "lax",
} as const;
