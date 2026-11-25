/**
 * `b(bn, en)` in a server component.
 *
 * Most public pages are server-rendered and hold a dozen one-off sentences that
 * never needed a dictionary key. The client has `useBi` for the same job; this
 * is its server twin, so the language toggle changes headings and calls to
 * action instead of only the navbar and footer.
 */
import { t, type MessageKey, type Params, type Locale } from "@hoichoi/i18n";
import { getLocale } from "./locale";

export interface ServerBi {
  locale: Locale;
  b: (bn: string, en: string) => string;
  t: (key: MessageKey, params?: Params) => string;
}

export async function serverBi(
  searchParams?: Record<string, string | string[] | undefined>,
): Promise<ServerBi> {
  const locale = await getLocale(searchParams);
  return {
    locale,
    b: (bn, en) => (locale === "en" ? en : bn),
    t: (key, params) => t(key, params, locale),
  };
}
