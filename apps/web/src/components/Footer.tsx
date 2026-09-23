import Link from "next/link";
import { toBn } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { listFooterCategories, getSettings } from "@hoichoi/db";

export async function Footer() {
  const [categories, settings] = await Promise.all([listFooterCategories(), getSettings()]);
  const footerLinks = categories.length > 0 ? categories : [];
  const siteName = settings.site_name || BRAND.en;
  const about =
    settings.footer_about_bn ||
    `${BRAND.tagline} — স্বয়ংক্রিয় সংবাদ কিউরেশন ডেস্কের কারিগরি প্রদর্শনী: ডেস্কটপ কালেক্টর, পুনর্লিখন ইঞ্জিন, AI Agent-ভিত্তিক প্রকাশনা ও Web ডিপ্লয়লাইনের পূর্ণ প্রবাহ।`;
  return (
    <footer className="page-chrome border-t-2 border-ink">
      <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <span className="group inline-flex items-center gap-2.5">
              <img
                src={BRAND.mark}
                alt=""
                className="h-9 w-9 rounded-full object-cover ring-1 ring-black/10"
              />
              <span className="font-serif-bn text-[34px] leading-none font-black text-ink">
                {BRAND.bn}
                <span className="text-alizarin">।</span>
              </span>
            </span>
            <p className="mt-4 max-w-xs text-[12.5px] leading-relaxed text-ink-soft">
              {about}
            </p>
          </div>
          <div className="md:col-span-3">
            <p className="font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">
              বিভাগসমূহ
            </p>
            <ul className="mt-4 space-y-2.5 text-[13px] font-medium">
              {footerLinks.map((cat) => (
                <li key={cat.slug} className="flex items-center gap-2">
                  <span className="h-1 w-1 rotate-45 bg-alizarin" />
                  <Link href={`/category/${cat.slug}`} className="hover:text-alizarin">
                    {cat.displayNameBn || cat.displayNameEn}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-4">
            <p className="font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">
              সিস্টেম মানচিত্র
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/admin" className="border border-ink/30 px-4 py-2 text-[12px] font-bold transition-all duration-300 hover:border-ink hover:bg-ink hover:text-paper">
                ওয়েব অ্যাডমিন →
              </Link>
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
            © {toBn(2026)} {siteName} DESK · BUILD 3.2
          </span>
          <span className="flex items-center gap-4">
            <Link href="/about">সম্পর্কে</Link>
            <Link href="/privacy">গোপনীয়তা</Link>
            <Link href="/terms">শর্তাবলি</Link>
            <Link href="/dmca">DMCA</Link>
            <Link href="/contact">যোগাযোগ</Link>
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
