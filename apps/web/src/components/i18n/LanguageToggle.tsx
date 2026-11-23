"use client";

/**
 * The language switch: one control, three surfaces.
 *
 * It prints the language it is switching *to* (`English` while reading Bangla),
 * not the one you are in — a toggle should say what it does, not what already is.
 * The Bangla label is set in the Latin text so an English reader can find it and
 * a Bangla reader recognises it.
 */
import clsx from "clsx";

import { t } from "@hoichoi/i18n";
import { useLocale } from "@/components/i18n/LocaleProvider";

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={clsx("inline-flex items-center rounded-full border border-current/25 p-0.5 text-[11px] font-semibold", className)}
      role="group"
      aria-label={t("lang.label", undefined, locale)}
    >
      {(["bn", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          title={code === "bn" ? t("lang.bn", undefined, locale) : t("lang.en", undefined, locale)}
          className={clsx(
            "rounded-full px-2 py-1 leading-none transition-colors",
            locale === code ? "bg-current/90 text-[color:var(--toggle-ink,#0b0b0b)]" : "opacity-70 hover:opacity-100",
          )}
        >
          {code === "bn" ? "বাংলা" : "EN"}
        </button>
      ))}
    </div>
  );
}
