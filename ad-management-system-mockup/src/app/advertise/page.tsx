import Link from "next/link";
import { TopBar, Ticker, Footer } from "@/components/site/Chrome";
import Creative from "@/components/ads/Creative";
import AdPulse from "@/components/ads/AdPulse";
import { SLOTS, FORMAT_LABEL, DURATIONS, quotePrice } from "@/lib/ads/slots";
import { TEMPLATES, CATEGORY_LABEL } from "@/lib/ads/templates";
import type { CreativeKind, PaletteKey } from "@/lib/ads/types";

export const dynamic = "force-dynamic";

const PAY = [
  { k: "bkash", n: "বিকাশ", d: "মোবাইল ব্যাংকিং", c: "#e2136e" },
  { k: "nagad", n: "নগদ", d: "মোবাইল ব্যাংকিং", c: "#f6921e" },
  { k: "rocket", n: "রকেট", d: "মোবাইল ব্যাংকিং", c: "#8c3494" },
  { k: "card", n: "কার্ড", d: "Visa · Mastercard · Amex", c: "#1a1f71" },
  { k: "paypal", n: "PayPal", d: "আন্তর্জাতিক", c: "#003087" },
  { k: "crypto", n: "ক্রিপ্টো", d: "BTC · ETH · USDT", c: "#f7931a" },
  { k: "bank", n: "ব্যাংক ট্রান্সফার", d: "EFT / RTGS", c: "#0d9488" },
  { k: "manual", n: "ম্যানুয়াল", d: "অ্যাডমিন ইনভয়েস", c: "#6b6250" },
];

export default function AdvertisePage() {
  const byPage = {
    home: SLOTS.filter((s) => s.page === "home"),
    post: SLOTS.filter((s) => s.page === "post"),
    category: SLOTS.filter((s) => s.page === "category"),
    global: SLOTS.filter((s) => s.page === "global"),
  };

  return (
    <div className="page-chrome min-h-screen">
      <TopBar active="ads" />
      <Ticker />

      {/* hero */}
      <section className="bg-night-grid relative overflow-hidden border-b-2 border-ink">
        <div className="mx-auto max-w-site px-4 py-16 md:px-8 md:py-20">
          <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-lime uppercase">
            ▚ HOICHOI AD PLATFORM · RATE CARD 2026
          </p>
          <h1 className="mt-4 max-w-3xl font-serif-bn text-[clamp(2.2rem,5.5vw,4rem)] leading-[1.08] font-black text-white">
            সংবাদের পাশে <span className="text-lime">আপনার ব্র্যান্ড</span> — ৩ মিনিটে বুকিং।
          </h1>
          <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-white/60">
            ২০টি স্লট, {TEMPLATES.length}+ রেডি টেমপ্লেট, অটো-অনুবাদ, আর বিকাশ/নগদ/কার্ড/PayPal/ক্রিপ্টো —
            সব এক প্যানেলে। পেমেন্ট নিশ্চিত হলেই বিজ্ঞাপন স্বয়ংক্রিয়ভাবে লাইভ।
          </p>
          <div className="mt-8">
            <AdPulse />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/portal/studio" className="flex items-center gap-2 bg-alizarin px-6 py-3 text-[13.5px] font-bold text-white hover:bg-alizarin-deep">
              🎨 স্টুডিওতে বানান →
            </Link>
            <Link href="/portal/book" className="flex items-center gap-2 border border-white/25 px-6 py-3 text-[13.5px] font-bold text-white/85 hover:border-lime hover:text-lime">
              দ্রুত বুকিং
            </Link>
            <Link href="#slots" className="flex items-center gap-2 border border-white/25 px-6 py-3 text-[13.5px] font-bold text-white/85 hover:border-lime hover:text-lime">
              স্লট ম্যাপ দেখুন
            </Link>
          </div>

          <div className="mt-10 grid max-w-3xl grid-cols-2 gap-px border border-white/10 bg-white/10 sm:grid-cols-4">
            {[
              { v: `${SLOTS.length}`, l: "বিজ্ঞাপন স্লট" },
              { v: `${TEMPLATES.length}`, l: "রেডি টেমপ্লেট" },
              { v: "৬", l: "ভাষায় অটো-অনুবাদ" },
              { v: "১৬", l: "অ্যানিমেশন ইফেক্ট" },
            ].map((s) => (
              <div key={s.l} className="bg-[#0c1017] px-3 py-4">
                <p className="font-serif-bn text-[28px] leading-none font-black text-lime">{s.v}</p>
                <p className="mt-1.5 text-[10.5px] text-white/45">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* slot map */}
      <section id="slots" className="mx-auto max-w-site px-4 py-16 md:px-8">
        <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-alizarin uppercase">
          ▚ INVENTORY MAP · কোথায় কোন বিজ্ঞাপন
        </p>
        <h2 className="mt-2 font-serif-bn text-[34px] font-black text-ink md:text-[42px]">স্লট ও রেট কার্ড</h2>
        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
          <span className="border border-lime/50 bg-lime/10 px-1.5 py-0.5 font-mono-x text-[10px] text-lime uppercase">
            LIVE
          </span>{" "}
          চিহ্নিত স্লটগুলো সাইটে এখনই আছে।{" "}
          <span className="border border-ink/30 bg-ink/5 px-1.5 py-0.5 font-mono-x text-[10px] text-ink-soft uppercase">
            NEW
          </span>{" "}
          চিহ্নিতগুলো একই ডিজাইন-ভাষায় নতুন প্রস্তাব।
        </p>

        {(
          [
            ["হোম পেজ", byPage.home],
            ["প্রতিবেদন পেজ", byPage.post],
            ["বিভাগ পেজ", byPage.category],
            ["সব পেজ (গ্লোবাল)", byPage.global],
          ] as const
        ).map(([title, list]) => (
          <div key={title} className="mt-10">
            <h3 className="flex items-center gap-3 font-serif-bn text-[20px] font-black text-ink">
              <span className="h-2.5 w-2.5 rotate-45 bg-alizarin" />
              {title}
              <span className="font-mono-x text-[10px] font-medium tracking-[0.2em] text-ink-soft uppercase">
                {list.length} slots
              </span>
            </h3>

            <div className="scroll-x mt-4 c-card">
              <table className="c-table">
                <thead>
                  <tr>
                    <th>স্লট</th>
                    <th>অবস্থান</th>
                    <th>ফরম্যাট</th>
                    <th>সাইজ</th>
                    <th>চাহিদা</th>
                    <th className="text-right">দৈনিক</th>
                    <th className="text-right">৭ দিন</th>
                    <th className="text-right">৩০ দিন</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => {
                    const w = quotePrice(s.key, 7);
                    const m = quotePrice(s.key, 30);
                    return (
                      <tr key={s.key}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span
                              className={`c-pill ${s.existing ? "st-active" : "st-draft"}`}
                              title={s.existing ? "সাইটে বিদ্যমান" : "নতুন প্রস্তাব"}
                            >
                              {s.existing ? "LIVE" : "NEW"}
                            </span>
                            <span className="font-serif-bn text-[14px] font-bold text-ink">{s.label}</span>
                          </div>
                          <span className="font-mono-x text-[9.5px] text-ink-soft">{s.key}</span>
                        </td>
                        <td className="max-w-[220px] text-[12px] text-ink-soft">{s.area}</td>
                        <td className="text-[12px]">{FORMAT_LABEL[s.format]}</td>
                        <td className="font-mono-x text-[11px]">{s.size}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 bg-ink/12">
                              <div className="h-full bg-lime" style={{ width: `${s.heat}%` }} />
                            </div>
                            <span className="font-mono-x text-[10px] text-ink-soft">{s.heat}</span>
                          </div>
                        </td>
                        <td className="text-right font-mono-x">৳{s.dayRate.toLocaleString()}</td>
                        <td className="text-right font-mono-x text-ink-soft">৳{w.total.toLocaleString()}</td>
                        <td className="text-right font-mono-x font-bold">৳{m.total.toLocaleString()}</td>
                        <td className="text-right">
                          <Link href={`/portal/studio?slot=${s.key}`} className="c-btn px-3 py-1.5 text-[11px]">
                            বুক
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <p className="mt-4 font-mono-x text-[10px] tracking-[0.16em] text-ink-soft uppercase">
          * মূল্যে ১৫% ভ্যাট অন্তর্ভুক্ত · দীর্ঘ মেয়াদে {Math.round(DURATIONS[DURATIONS.length - 1].off * 100)}% পর্যন্ত ছাড়
        </p>
      </section>

      {/* template gallery */}
      <section className="border-y-2 border-ink bg-ink/[0.05]">
        <div className="mx-auto max-w-site px-4 py-16 md:px-8">
          <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-alizarin uppercase">
            ▚ TEMPLATE LIBRARY · রেডি-টু-গো
          </p>
          <h2 className="mt-2 font-serif-bn text-[34px] font-black text-ink md:text-[42px]">
            {TEMPLATES.length}টি পেশাদার টেমপ্লেট
          </h2>
          <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
            পণ্য, নিখোঁজ শিশু, নির্বাচন, স্পনসর, চাকরি, রিয়েল এস্টেট, স্বাস্থ্য, শোকসংবাদ, সরকারি বিজ্ঞপ্তি ও
            সম্পূর্ণ কাস্টম — শুধু লেখা বদলান, ডিজাইন রেডি।
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {TEMPLATES.slice(0, 12).map((t) => (
              <div key={t.id} className="c-card overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b border-ink/12 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-serif-bn text-[14px] font-bold text-ink">{t.nameBn}</p>
                    <p className="font-mono-x text-[9px] tracking-[0.18em] text-ink-soft uppercase">
                      {CATEGORY_LABEL[t.category]} · {t.id}
                    </p>
                  </div>
                  {t.premium ? <span className="c-pill st-pending">PREMIUM</span> : <span className="c-pill st-active">FREE</span>}
                </div>
                <div className="bg-paper-deep/40 p-3">
                  <div className="min-h-[150px]">
                    <Creative
                    kind={t.kind as CreativeKind}
                    palette={t.palette as PaletteKey}
                    data={t.data}
                    format="rect"
                    style={{ anim: "fade-up", animIdle: t.premium ? "shine" : "none", hoverLift: true, animSpeed: 600 }}
                  />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-ink/12 px-3 py-2">
                  <span className="font-mono-x text-[9.5px] text-ink-soft uppercase">
                    {t.formats.length} ফরম্যাট
                  </span>
                  <Link href={`/portal/studio?template=${t.id}`} className="c-btn px-3 py-1.5 text-[11px]">
                    স্টুডিওতে খুলুন
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link href="/portal/book" className="c-btn c-btn-lime px-6 py-3">
              সব {TEMPLATES.length}টি টেমপ্লেট দেখুন →
            </Link>
          </div>
        </div>
      </section>

      {/* payments */}
      <section className="mx-auto max-w-site px-4 py-16 md:px-8">
        <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-alizarin uppercase">▚ PAYMENTS</p>
        <h2 className="mt-2 font-serif-bn text-[34px] font-black text-ink md:text-[42px]">ঝামেলাহীন পেমেন্ট</h2>
        <div className="mt-8 grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-2 lg:grid-cols-4">
          {PAY.map((p) => (
            <div key={p.k} className="bg-paper p-5">
              <div className="h-1.5 w-10" style={{ background: p.c }} />
              <p className="mt-3 font-serif-bn text-[17px] font-black text-ink">{p.n}</p>
              <p className="mt-1 text-[11.5px] text-ink-soft">{p.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { n: "০১", t: "স্লট ও টেমপ্লেট বাছুন", d: "রেট লাইভ দেখা যায়, মেয়াদ বাড়ালে ছাড় স্বয়ংক্রিয়।" },
            { n: "০২", t: "লেখা দিন — অনুবাদ অটো", d: "বাংলায় লিখুন; ইংরেজি/হিন্দি/আরবি সংস্করণ নিজে থেকেই তৈরি।" },
            { n: "০৩", t: "পেমেন্ট → সাথে সাথে লাইভ", d: "পেমেন্ট নিশ্চিত হলেই বিজ্ঞাপন স্লটে বসে যায়। অ্যাডমিনের অপেক্ষা নেই।" },
          ].map((s) => (
            <div key={s.n} className="c-card relative p-5">
              <span className="absolute top-3 right-4 font-mono-x text-[26px] font-bold text-ink/10">{s.n}</span>
              <p className="font-serif-bn text-[18px] font-black text-ink">{s.t}</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{s.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-2 border-ink bg-ink p-6 text-paper">
          <div>
            <p className="font-serif-bn text-[22px] font-black">শুরু করতে প্রস্তুত?</p>
            <p className="mt-1 text-[12.5px] text-paper/60">ads@hoichoi.example · ০৯৬১০-০০০০০০</p>
          </div>
          <div className="flex gap-3">
            <Link href="/portal/book" className="bg-lime px-5 py-2.5 text-[13px] font-bold text-night">
              বুকিং শুরু
            </Link>
            <Link href="/portal" className="border border-paper/30 px-5 py-2.5 text-[13px] font-bold">
              ক্লায়েন্ট প্যানেল
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
