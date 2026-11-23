/**
 * The desk's language switch.
 *
 * Two letters, in the window frame next to the theme switch: `বাং` while the
 * desk reads English, `EN` while it reads Bangla. Short on purpose — it sits in
 * a title bar that already spends its width on the clock and the window
 * controls, and the tooltip says the full name of the language it switches to.
 */
import { useDeskLocale } from "../lib/locale";

export default function DeskLanguageToggle() {
  const { locale, toggle, t } = useDeskLocale();
  const next = locale === "bn" ? "en" : "bn";

  return (
    <button
      type="button"
      className="desk-lang"
      onClick={toggle}
      title={`${t("desk.chrome.switchLanguage")} → ${t(next === "en" ? "lang.en" : "lang.bn")}`}
      aria-label={`${t("desk.chrome.switchLanguage")} → ${t(next === "en" ? "lang.en" : "lang.bn")}`}
    >
      {next === "en" ? "EN" : "বাং"}
    </button>
  );
}
