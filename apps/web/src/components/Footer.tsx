import Link from "next/link";
import { toBn } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { t } from "@hoichoi/i18n";
import { getLocale } from "@/lib/locale";
import { SITE_BUILD } from "@/lib/build";
import { listFooterCategories, getSettings, parseAppConfig } from "@hoichoi/db";
import { FooterSocials } from "./FooterSocials";
import { AdvertiserLoginLink } from "./AdvertiserLoginLink";
import LocalZone from "./LocalZone";

export async function Footer() {
  const [categories, settings, locale] = await Promise.all([
    listFooterCategories(),
    getSettings(),
    getLocale(),
  ]);
  /** The footer is a server component, so it translates without a provider. */
  const tr = (key: Parameters<typeof t>[0], params?: Parameters<typeof t>[1]) =>
    t(key, params, locale);
  const footerLinks = categories.length > 0 ? categories : [];
  const appConfig = parseAppConfig(settings.app_config_json);
  const siteName = settings.site_name || BRAND.en;
  /**
   * Bangla readers get the operator's own text when there is one. English
   * readers get the translated default: the stored field is Bangla-only, and
   * mixing the two languages in one paragraph reads worse than a clean default.
   */
  const aboutDefault = `${BRAND.tagline} — ${tr("site.footer.aboutFallback")}`;
  const about = locale === "en" ? aboutDefault : settings.footer_about_bn || aboutDefault;
  // The submit link is the site's only growth channel, so it is surfaced in the
  // footer nav and as its own call-to-action. It previously existed only at
  // /submit with no inbound link, so visitors could never find it.
  const legalLinks = [
    { href: "/submit", label: tr("site.footer.submitSource") },
    { href: "/report", label: tr("site.footer.reportError") },
    { href: "/about", label: tr("site.footer.aboutUs") },
    { href: "/about/editorial", label: tr("site.footer.editorialPolicy") },
    { href: "/about/ai", label: tr("site.footer.aiPolicy") },
    { href: "/about/corrections", label: tr("site.footer.corrections") },
    { href: "/about/security", label: tr("site.footer.securityPolicy") },
    { href: "/about/retention", label: tr("site.footer.retention") },
    { href: "/privacy", label: tr("site.footer.privacy") },
    { href: "/terms", label: tr("site.footer.terms") },
    { href: "/cookies", label: tr("site.footer.cookies") },
    { href: "/dmca", label: tr("site.footer.dmca") },
    { href: "/contact", label: tr("site.footer.contact") },
  ];
  return (
    <footer className="page-chrome border-t-2 border-ink">
      <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Link href="/" className="group inline-flex items-center gap-2.5 group-hover:opacity-80">
              <img
                src={BRAND.mark}
                alt=""
                className="h-9 w-9 rounded-full object-cover ring-1 ring-black/10 transition-transform duration-300 group-hover:scale-105"
              />
              <span className="font-serif-bn text-[34px] leading-none font-black text-ink">
                {BRAND.bn}
                <span className="text-alizarin">।</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-[12.5px] leading-relaxed text-ink-soft">
              {about}
            </p>
            <FooterSocials links={appConfig.footer_socials} />
            {/* Advertisers had no route into /portal/login from the public site. */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <AdvertiserLoginLink />
              <Link href="/portal/signup" className="font-mono-x text-[10px] tracking-[0.14em] text-ink-soft uppercase underline-offset-4 hover:text-alizarin hover:underline">
                {tr("site.footer.newAdvertiser")}
              </Link>
            </div>
          </div>
          <div className="md:col-span-4">
            <p className="font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">
              {tr("site.footer.sectionsHeading")}
            </p>
            {footerLinks.length === 0 ? (
              <p className="mt-4 text-[13px] text-ink-soft">{tr("site.footer.noSections")}</p>
            ) : (
              <CategoryColumns links={footerLinks} locale={locale} />
            )}
          </div>
          <div className="md:col-span-3">
            <div className="border border-alizarin/40 bg-alizarin/[0.06] p-5">
              <p className="font-mono-x text-[10px] tracking-[0.24em] text-alizarin uppercase">
                {tr("site.footer.wantHeading")}
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink">
                {tr("site.footer.wantBody")}
              </p>
              <Link
                href="/submit"
                className="mt-4 inline-block bg-alizarin px-5 py-2.5 text-[12.5px] font-bold text-on-accent transition-colors hover:bg-ink"
              >
                {tr("site.footer.submitSourceCta")}
              </Link>
            </div>
            <p className="mt-6 font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">
              {tr("site.nav.system")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/system" className="border border-ink/30 px-4 py-2 text-[12px] font-bold transition-all duration-300 hover:border-ink hover:bg-ink hover:text-paper">
                {tr("site.footer.blueprint")}
              </Link>
            </div>
            <p className="mt-6 text-[10.5px] leading-relaxed text-ink-soft">
              {tr("site.footer.credit")}
            </p>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-ink/15 pt-6 font-mono-x text-[10px] tracking-[0.16em] text-ink-soft uppercase">
          <span>
            © {toBn(2026)} {siteName} · BUILD {SITE_BUILD}
          </span>
          <span className="flex flex-wrap items-center gap-4">
            {legalLinks.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-alizarin">
                {l.label}
              </Link>
            ))}
          </span>
          <span className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            BUGSFREE STUDIO · LOCALHOST/<LocalZone /> · EDGE CACHE ON
          </span>
        </div>
      </div>
    </footer>
  );
}

/**
 * Footer category list, split into vertical columns of at most 10 links each.
 *
 * With ≤10 categories the single column is centered under the heading; past 10
 * the list wraps into a second column (then a third, and so on), so adding
 * categories never makes the list scroll or overflow the footer.
 */
function CategoryColumns({
  links,
  locale,
  maxPerColumn = 10,
}: {
  links: Array<{ slug: string; displayNameBn: string; displayNameEn: string }>;
  /** Desk names in the reader's language; Bangla when English is missing. */
  locale: "bn" | "en";
  maxPerColumn?: number;
}) {
  const columns: typeof links[] = [];
  for (let i = 0; i < links.length; i += maxPerColumn) {
    columns.push(links.slice(i, i + maxPerColumn));
  }
  const centered = links.length <= maxPerColumn;
  return (
    <div className={`mt-4 flex gap-x-8 ${centered ? "justify-center" : ""}`}>
      {columns.map((column, ci) => (
        <ul key={ci} className="space-y-2.5 text-[13px] font-medium">
          {column.map((cat) => (
            <li key={cat.slug} className="flex items-center gap-2">
              <span className="h-1 w-1 rotate-45 bg-alizarin" />
              <Link href={`/category/${cat.slug}`} className="hover:text-alizarin">
                {(locale === "en" ? cat.displayNameEn || cat.displayNameBn : cat.displayNameBn || cat.displayNameEn)}
              </Link>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
