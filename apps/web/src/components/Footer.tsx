import Link from "next/link";
import { toBn } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { SITE_BUILD } from "@/lib/build";
import { listFooterCategories, getSettings } from "@hoichoi/db";

export async function Footer() {
  const [categories, settings] = await Promise.all([listFooterCategories(), getSettings()]);
  const footerLinks = categories.length > 0 ? categories : [];
  const siteName = settings.site_name || BRAND.en;
  const about =
    settings.footer_about_bn ||
    `${BRAND.tagline} — ফেসবুক পেজ ও গ্রুপ, অনলাইন সংবাদপত্র, ম্যাগাজিন এবং সামাজিক মাধ্যমে ছড়িয়ে পড়া গল্প সংগ্রহ করে যাচাই, ডুপ্লিকেট-ফিল্টার ও এআই-সম্পাদনার পর বাংলায় প্রকাশিত সংবাদ-ধাঁচের সাইট।`;
  // The submit link is the site's only growth channel, so it is surfaced in the
  // footer nav and as its own call-to-action. It previously existed only at
  // /submit with no inbound link, so visitors could never find it.
  const legalLinks = [
    { href: "/submit", label: "সোর্স জমা দিন" },
    { href: "/report", label: "ভুল রিপোর্ট" },
    { href: "/about", label: "সম্পর্কে" },
    { href: "/privacy", label: "গোপনীয়তা" },
    { href: "/terms", label: "শর্তাবলি" },
    { href: "/dmca", label: "DMCA" },
    { href: "/contact", label: "যোগাযোগ" },
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
          </div>
          <div className="md:col-span-4">
            <p className="font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">
              বিভাগসমূহ
            </p>
            {footerLinks.length === 0 ? (
              <p className="mt-4 text-[13px] text-ink-soft">কোনো বিভাগ এখনো যোগ হয়নি।</p>
            ) : (
              <CategoryColumns links={footerLinks} />
            )}
          </div>
          <div className="md:col-span-3">
            <div className="border border-alizarin/40 bg-alizarin/[0.06] p-5">
              <p className="font-mono-x text-[10px] tracking-[0.24em] text-alizarin uppercase">
                আপনি কি এমন কোনো ফেসবুক পেজ বা গ্রুপ জানেন?
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink">
                সংবাদ-ধাঁচের গুরুত্বপূর্ণ পোস্ট প্রকাশ করে এমন সব পেজ ও গ্রুপ আমাদের কাছে জানান।
                অ্যাডমিন যাচাই করে অনুমোদন করলেই সেটি সোর্স হিসেবে যুক্ত হয়।
              </p>
              <Link
                href="/submit"
                className="mt-4 inline-block bg-alizarin px-5 py-2.5 text-[12.5px] font-bold text-white transition-colors hover:bg-ink"
              >
                সোর্স জমা দিন →
              </Link>
            </div>
            <p className="mt-6 font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">
              সিস্টেম
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/system" className="border border-ink/30 px-4 py-2 text-[12px] font-bold transition-all duration-300 hover:border-ink hover:bg-ink hover:text-paper">
                সিস্টেম ব্লুপ্রিন্ট →
              </Link>
            </div>
            <p className="mt-6 text-[10.5px] leading-relaxed text-ink-soft/80">
              ছবি: Pexels ফটোগ্রাফারগণ · এটি একটি প্রযুক্তি প্রদর্শনী (মকআপ) —
              সব চরিত্র ও ঘটনাবহুল কাল্পনিক এবং কেবল সচেতনতামূলক বিন্যাসে রচিত।
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
            BUGSFREE STUDIO · ASIA/UTC+6 · EDGE CACHE ON
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
  maxPerColumn = 10,
}: {
  links: Array<{ slug: string; displayNameBn: string; displayNameEn: string }>;
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
                {cat.displayNameBn || cat.displayNameEn}
              </Link>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
