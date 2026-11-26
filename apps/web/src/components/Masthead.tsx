import Link from "next/link";
import { longDateBn } from "@/lib/bn";
import { formatDate, t } from "@hoichoi/i18n";
import { getLocale } from "@/lib/locale";
import type { SiteSettings } from "@hoichoi/shared-types";

export async function Masthead({ settings }: { settings: SiteSettings }) {
  const accent = settings.accent_color || "#d64541";
  // Bangla keeps its own long-date spelling (`longDateBn`) so the masthead reads
  // exactly as it always has; English uses the shared formatter.
  const locale = await getLocale();
  const dateLine = locale === "en" ? formatDate(new Date(), "en", { weekday: true }) : longDateBn(new Date().toISOString());
  return (
    <header className="bn-surface-header mx-auto max-w-site px-4 pt-6 md:px-8">
      <div className="flex items-center justify-between border-b border-ink/20 pb-3 text-[11.5px] font-medium text-ink-soft">
        <span>{dateLine} · {t("site.masthead.onlineEdition", undefined, locale)}</span>
        <span className="hidden font-mono-x tracking-[0.2em] uppercase sm:block">
          {t("site.masthead.desk", undefined, locale).toUpperCase()} · ISSN-AUTO-24
        </span>
        <span>{t("site.masthead.price", undefined, locale)}</span>
      </div>
      <div className="flex flex-col items-center py-8 text-center md:py-10">
        <Link className="group inline-flex items-baseline" href="/">
          {settings.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logo_url}
              alt={settings.site_name}
              className="max-h-14 w-auto object-contain md:max-h-16"
            />
          ) : (
            <h1 className="font-serif-bn text-[64px] font-black leading-[0.95] tracking-tight text-ink md:text-[104px]">
              {settings.site_name}
            </h1>
          )}
          <span className="ml-1 text-[40px] leading-none md:text-[64px]" style={{ color: accent }}>
            ।
          </span>
        </Link>
        <div className="mt-4 flex w-full items-center gap-4">
          <span className="h-px flex-1 bg-ink/25"></span>
          <p className="text-[12px] font-medium tracking-wide text-ink-soft md:text-[13px]">
            {settings.slogan_bn}
          </p>
          <span className="h-px flex-1 bg-ink/25"></span>
        </div>
        <p className="mt-2 text-[10.5px] text-ink-soft md:text-[11px]">{settings.tagline}</p>
      </div>
    </header>
  );
}