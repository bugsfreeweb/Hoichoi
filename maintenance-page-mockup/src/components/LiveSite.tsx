import Link from "next/link";
import { ArrowRight, Check, MonitorSmartphone, ShieldCheck } from "lucide-react";
import type { SiteSettings } from "@/lib/types";
import { HOICHOI_PIPELINE, bnNum, copyFor, loc } from "@/lib/types";
import { Dock } from "@/components/Dock";
import { BreakingBand, HoiLogo, HoiTicker, PipelineStrip, StatQuartet, StatusGrid } from "@/components/hoichoi";

/** What visitors see once maintenance mode is switched off — a faithful Hoichoi front page. */
export function LiveSite({ s }: { s: SiteSettings }) {
  const L = loc(s);
  const copy = copyFor(s);
  return (
    <main className="font-sans-bn min-h-[100dvh] w-full bg-[#f3eee1] text-[#1a140d]">
      <BreakingBand s={s} />
      <div className="hoi-paper">
        <header className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
          <HoiLogo s={s} size="lg" />
          <nav className="hidden items-center gap-6 text-[13px] font-bold text-[#1a140d]/70 lg:flex">
            <a href="#latest" className="transition hover:text-[#d2202c]">{L === "bn" ? "সর্বশেষ" : "Latest"}</a>
            <a href="#live-insights" className="transition hover:text-[#d2202c]">{L === "bn" ? "লাইভ গ্রাফ" : "Live graph"}</a>
            <a href="#pipeline" className="transition hover:text-[#d2202c]">{L === "bn" ? "পাইপলাইন" : "Pipeline"}</a>
            <Link href="/designs" className="transition hover:text-[#d2202c]">
              {L === "bn" ? "রক্ষণাবেক্ষণ ডিজাইন" : "Maintenance designs"}
            </Link>
          </nav>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1a140d] px-4 py-2 text-xs font-bold text-[#f3eee1] transition hover:bg-[#d2202c]"
          >
            <ShieldCheck size={14} /> {L === "bn" ? "হৈচৈ ডেস্ক" : "Hoichoi Desk"}
          </Link>
        </header>
        <div className="hoi-rule-double mx-auto max-w-[1400px] px-4 md:px-8" style={{ marginInline: "max(1rem, calc((100vw - 1400px)/2 + 2rem))" }} />
      </div>

      {/* hero */}
      <section className="hoi-paper mx-auto max-w-[1400px] px-4 pt-10 pb-8 md:px-8">
        <p className="font-mono-x inline-flex items-center gap-2 rounded-full border border-[#5f8f0e]/40 bg-[#5f8f0e]/10 px-3.5 py-1.5 text-[10px] tracking-[0.24em] text-[#4a7009] uppercase">
          <span className="hoi-live-dot h-1.5 w-1.5 rounded-full bg-[#5f8f0e] text-[#5f8f0e]" />
          {L === "bn" ? "ডেটা যাচাই সম্পন্ন — আমরা লাইভ" : "Verification complete — we are live"}
        </p>
        <h1 className="font-serif-bn mt-5 max-w-4xl text-[clamp(2.6rem,7vw,5.4rem)] leading-[1.02] font-black tracking-tight">
          {L === "bn" ? "হৈচৈ" : "HOICHOI"}
          <span className="text-[#d2202c]">!</span>
        </h1>
        <p className="font-sans-bn mt-3 max-w-2xl text-[clamp(1rem,2.4vw,1.35rem)] leading-relaxed font-semibold text-[#1a140d]/80">
          {L === "bn"
            ? "শহরের হৈচৈ, সংবাদের ভাষায় — শহর ফিডে যা বলে, আমরা তা যাচাই করে লিখি।"
            : "City noise, in the language of news — what the city says on the feed, we verify and write."}
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#6b6250]">{copy.body}</p>

        <div className="mt-6 max-w-3xl">
          <StatQuartet s={s} />
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <a
            href="#latest"
            className="inline-flex items-center gap-2 rounded-lg bg-[#d2202c] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#a3121d]"
          >
            {L === "bn" ? "সর্বশেষ সংগ্রহ পড়ুন" : "Read the latest collection"} <ArrowRight size={16} />
          </a>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1a140d] px-6 py-[10px] text-sm font-bold text-[#1a140d] transition hover:bg-[#1a140d] hover:text-[#f3eee1]"
          >
            <MonitorSmartphone size={16} /> {L === "bn" ? "হৈচৈ ডেস্ক লঞ্চ" : "Launch Hoichoi Desk"}
          </Link>
        </div>
      </section>

      <PipelineStrip s={s} />
      {s.hoichoi.showTicker && <HoiTicker s={s} />}

      {/* live insights */}
      <section id="live-insights" className="mx-auto max-w-[1400px] px-4 py-10 md:px-8">
        <p className="font-mono-x text-[10px] tracking-[0.3em] text-[#d2202c] uppercase">▚ THE NEWSROOM, IN NUMBERS</p>
        <h2 className="font-serif-bn mt-2 text-[clamp(1.6rem,4vw,2.6rem)] font-extrabold">
          {L === "bn" ? "হৈচৈ চলছে। দেখুন সংখ্যায়।" : "Hoichoi is on. See it in numbers."}
        </h2>
        <div className="mt-6">
          <StatusGrid s={s} />
        </div>
      </section>

      {/* pipeline */}
      <section id="pipeline" className="border-y-2 border-[#1a140d]/10 bg-[#1a140d] py-10 text-[#f3eee1]">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8">
          <p className="font-mono-x text-[10px] tracking-[0.3em] text-[#c8f65d]/80 uppercase">
            AUTOMATION PIPELINE · EVERY 2 HOURS
          </p>
          <h2 className="font-serif-bn mt-2 max-w-2xl text-[clamp(1.6rem,4vw,2.6rem)] leading-tight font-extrabold">
            {L === "bn" ? "ফিড থেকে লাইভ — ছয় ধাপ, শূন্য ছোঁয়া।" : "Feed to live — six steps, zero touch."}
          </h2>
          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            {HOICHOI_PIPELINE.map((p, i) => (
              <div key={p.en} className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
                <p className="font-mono-x text-[10px] text-[#c8f65d]/70">0{i + 1}</p>
                <p className="font-sans-bn mt-1.5 text-sm font-bold">{L === "bn" ? p.bn : p.en}</p>
                <p className="font-mono-x mt-1 text-[9px] tracking-[0.14em] text-white/40">{p.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* checklist */}
      <section id="latest" className="mx-auto max-w-[1400px] px-4 py-10 md:px-8">
        <div className="rounded-2xl border-2 border-[#1a140d]/12 bg-white/70 p-6 md:p-8">
          <p className="font-mono-x text-[10px] tracking-[0.3em] text-[#6b6250] uppercase">
            {L === "bn" ? "লঞ্চ চেকলিস্ট" : "Launch checklist"}
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {(L === "bn"
              ? ["অবকাঠামো মাইগ্রেট সম্পন্ন", "ডিজাইন সিস্টেম v2.4 চালু", "নিউজলেটার তালিকা পুনঃসমন্বয়", "অ্যানালিটিক্স ও আপটাইম সংযুক্ত"]
              : ["Infrastructure migrated", "Design system v2.4 shipped", "Newsletter list re-synced", "Analytics & uptime wired"]
            ).map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm font-semibold text-[#1a140d]/80">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[#5f8f0e]/15 text-[#4a7009]">
                  <Check size={12} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t-2 border-[#1a140d]/10 px-4 py-8 md:px-8">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 text-xs text-[#6b6250]">
          <span className="font-sans-bn">{copy.footerNote}</span>
          <span className="font-mono-x">
            {s.contact.email} · {L === "bn" ? "ছবি: Pexels ফটোগ্রাফারগণ" : "Photos: Pexels photographers"}
          </span>
        </div>
      </footer>
      {s.ui.showDock && <Dock s={s} />}
    </main>
  );
}
