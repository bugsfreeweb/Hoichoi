import Link from "next/link";
import type { SiteSettings } from "@hoichoi/shared-types";

export function Footer({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="page-chrome border-t-2 border-ink">
      <div className="mx-auto max-w-site px-4 py-12 md:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-serif-bn text-[34px] font-black leading-none">
              {settings.site_name}
              <span className="text-alizarin">।</span>
            </p>
            <p className="mt-3 max-w-xs text-[12.5px] leading-relaxed text-ink-soft">
              স্বয়ংক্রিয় সংবাদ কিউরেশন ডেস্ক — ডেস্কটপ কালেক্টর, পুনর্লিখন ইঞ্জিন, GitHub-ভিত্তিক প্রকাশনা ও Vercel ডিপ্লয়লাইনের পূর্ণ প্রবাহ এখানে দৃশ্যমান।
            </p>
          </div>
          <div className="md:col-span-3">
            <p className="font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">বিভাগসমূহ</p>
            <ul className="mt-4 space-y-2.5 text-[13px] font-medium">
              <li className="flex items-center gap-2"><span className="diamond"></span><Link href="/category/child-sexual-abuse">শিশু যৌন নির্যাতন</Link></li>
              <li className="flex items-center gap-2"><span className="diamond"></span><Link href="/category/extramarital-crime">পরকীয়া অপরাধ</Link></li>
              <li className="flex items-center gap-2"><span className="diamond"></span><Link href="/category/missing-children">নিখোঁজ শিশু</Link></li>
            </ul>
          </div>
          <div className="md:col-span-4">
            <p className="font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">সিস্টেম মানচিত্র</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/submit" className="border border-ink/30 px-4 py-2 text-[12px] font-bold transition-all duration-300 hover:border-ink hover:bg-ink hover:text-paper">
                পেজ প্রস্তাব করুন →
              </Link>
            </div>
            <p className="mt-6 text-[10.5px] leading-relaxed text-ink-soft/80">
              ছবি: Pexels ফটোগ্রাফারগণ · প্রতীকী। সব চরিত্র ও ঘটনা কাল্পনিক এবং কেবল সচেতনতামূলক বিন্যাসে রচিত।
            </p>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-ink/15 pt-6 font-mono-x text-[10px] tracking-[0.16em] text-ink-soft uppercase">
          <span>© 2026 {settings.site_name} DESK</span>
          <span className="flex items-center gap-4">
            <Link href="/about">সম্পর্কে</Link>
            <Link href="/privacy">গোপনীয়তা</Link>
            <Link href="/terms">শর্তাবলি</Link>
            <Link href="/dmca">DMCA</Link>
            <Link href="/contact">যোগাযোগ</Link>
          </span>
          <span className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20"/><path d="M2 12h20"/></svg>
            DHAKA · ASIA/UTC+6 · EDGE CACHE ON
          </span>
        </div>
      </div>
    </footer>
  );
}