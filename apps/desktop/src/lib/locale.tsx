/**
 * The desk's language.
 *
 * One provider at the top of the app; every screen reads `useDeskT()` and prints
 * words from `@hoichoi/i18n`. The choice is remembered in `localStorage`
 * (`hoichoi.lang`), the same key the web app uses, so a reader who picked English
 * on the site finds the desk in English too — on the same machine.
 *
 * Bangla stays the default: the desk is a Bangla newsroom tool, and an operator
 * who has never touched the switch sees exactly what they saw before.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  LOCALE_STORAGE_KEY,
  normalizeLocale,
  otherLocale,
  t as translate,
  type Locale,
  type MessageKey,
  type Params,
} from "@hoichoi/i18n";

interface DeskLocale {
  locale: Locale;
  setLocale: (next: Locale) => void;
  toggle: () => void;
  /** `t()` bound to the chosen language. */
  t: (key: MessageKey, params?: Params) => string;
  /**
   * `b("বাংলা", "English")` for desk prose that exists in one screen only —
   * same idea as the web's `useBi`, see `Bilingual` in `@hoichoi/i18n`.
   */
  b: (bn: string, en: string) => string;
}

const DeskLocaleContext = createContext<DeskLocale | null>(null);

/** Read the saved choice; a corrupt or absent value falls back to Bangla. */
export function readStoredLocale(): Locale {
  try {
    return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return "bn";
  }
}

export function DeskLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale());

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* storage disabled: the choice lasts for this session */
    }
  }, []);

  useEffect(() => {
    // The document's own language attribute is what a screen reader and the
    // spell-checker consult, so it follows the switch.
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<DeskLocale>(
    () => ({
      locale,
      setLocale,
      toggle: () => setLocale(otherLocale(locale)),
      t: (key: MessageKey, params?: Params) => translate(key, params, locale),
      b: (bn: string, en: string) => (locale === "en" ? en : bn),
    }),
    [locale, setLocale],
  );

  return <DeskLocaleContext.Provider value={value}>{children}</DeskLocaleContext.Provider>;
}

/** Outside the provider this is Bangla and a no-op switch, never a crash. */
export function useDeskLocale(): DeskLocale {
  return (
    useContext(DeskLocaleContext) ?? {
      locale: "bn",
      setLocale: () => undefined,
      toggle: () => undefined,
      t: (key: MessageKey, params?: Params) => translate(key, params, "bn"),
      // Outside the provider the desk is Bangla, which is the bn half.
      b: (bn: string, _en: string) => bn,
    }
  );
}

export function useDeskT(): (key: MessageKey, params?: Params) => string {
  return useDeskLocale().t;
}
