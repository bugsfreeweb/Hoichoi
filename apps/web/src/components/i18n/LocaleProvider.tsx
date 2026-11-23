"use client";

/**
 * The reader's language, on the client.
 *
 * The root layout reads the cookie on the server and passes it down, so the first
 * paint is already in the right language. This provider exists for the two things
 * a server cannot do: switch the language without a full reload, and let the
 * toggle print its own label in the language it is switching *to*.
 */
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  otherLocale,
  t as translate,
  type Locale,
  type MessageKey,
  type Params,
} from "@hoichoi/i18n";

/**
 * Same one year as `lib/locale.ts`. It is repeated rather than imported because
 * that module reads `next/headers`, which a client component may not touch —
 * the build fails with "You're importing a component that needs next/headers".
 */
const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

interface LocaleContextValue {
  locale: Locale;
  /** The language the toggle would switch to. */
  next: Locale;
  setLocale: (next: Locale) => void;
  toggle: () => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const router = useRouter();

  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_MAX_AGE}; samesite=lax`;
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, next);
      } catch {
        /* private mode: the cookie is what the server reads */
      }
      // `lang` on <html> is also what a screen reader uses to pick a voice.
      document.documentElement.lang = next;
      router.refresh();
    },
    [router],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      next: otherLocale(locale),
      setLocale,
      toggle: () => setLocale(otherLocale(locale)),
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** The current language; outside a provider it is Bangla, the default. */
export function useLocale(): LocaleContextValue {
  return (
    useContext(LocaleContext) ?? {
      locale: "bn",
      next: "en",
      setLocale: () => undefined,
      toggle: () => undefined,
    }
  );
}

/**
 * `b("বাংলা", "English")` → the string in the reader's language.
 *
 * Console screens hold a lot of prose that exists in exactly one place; this
 * keeps the pair next to the markup instead of inventing a key per sentence.
 * See `Bilingual` in `@hoichoi/i18n` for why both mechanisms exist.
 */
export type BiHook = (bn: string, en: string) => string;

export function useBi(): BiHook {
  const { locale } = useLocale();
  return useCallback((bn: string, en: string) => (locale === "en" ? en : bn), [locale]);
}

/** `t()` already bound to the reader's language: `const t = useT()`. */
export function useT(): (key: MessageKey, params?: Params) => string {
  const { locale } = useLocale();
  return useCallback((key: MessageKey, params?: Params) => translate(key, params, locale), [locale]);
}
