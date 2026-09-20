import Link from "next/link";
import { Globe2 } from "lucide-react";
import Logo from "@/components/logo";
import { BRAND } from "@/lib/brand";
import { toBn, CATEGORY_LABEL } from "@/lib/data";

/** Shared site footer — identical on home and news detail pages. */
export default function SiteFooter({ context = "OPTION B HOME" }: { context?: string }) {
  return (
    <footer className="border-t-2 border-ink">
      <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo href="/" size="lg" />
            <p className="mt-4 max-w-xs text-[12.5px] leading-relaxed text-ink-soft">
              {BRAND.tagline} — স্বয়ংক্রিয় সংবাদ কিউরেশন ডেস্কের কারিগরি
              প্রদর্শনী: ডেস্কটপ কালেক্টর, পুনর্লিখন ইঞ্জিন, AI Agent-ভিত্তিক
              প্রকাশনা ও Web ডিপ্লয়লাইনের পূর্ণ প্রবাহ।
            </p>
          </div>
          <div className="md:col-span-3">
            <p className="font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">
              বিভাগসমূহ
            </p>
            <ul className="mt-4 space-y-2.5 text-[13px] font-medium">
              {Object.values(CATEGORY_LABEL).map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <span className="h-1 w-1 rotate-45 bg-alizarin" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-4">
            <p className="font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">
              সিস্টেম মানচিত্র
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { href: "/desk", label: "ডেস্কটপ অ্যাপ" },
                { href: "/admin", label: "ওয়েব অ্যাডমিন" },
                { href: "/system", label: "সিস্টেম ব্লুপ্রিন্ট" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="border border-ink/30 px-4 py-2 text-[12px] font-bold transition-all duration-300 hover:border-ink hover:bg-ink hover:text-paper"
                >
                  {l.label} →
                </Link>
              ))}
            </div>
            <p className="mt-6 text-[10.5px] leading-relaxed text-ink-soft/80">
              ছবি: Pexels ফটোগ্রাফারগণ · এটি একটি প্রযুক্তি প্রদর্শনী (মকআপ) —
              সব চরিত্র ও ঘটনাবহুল কাল্পনিক এবং কেবল সচেতনতামূলক বিন্যাসে রচিত।
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/15 pt-6 font-mono-x text-[10px] tracking-[0.16em] text-ink-soft uppercase">
          <span>
            © {toBn(2026)} {BRAND.en} DESK · {context} · BUILD 3.2
          </span>
          <span className="flex items-center gap-2">
            <Globe2 size={11} /> BUGSFREE STUDIO · ASIA/UTC+6 · EDGE CACHE ON
          </span>
        </div>
      </div>
    </footer>
  );
}