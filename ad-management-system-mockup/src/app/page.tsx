import Link from "next/link";
import { TopBar, Ticker, CategoryRail, Footer, MobileAnchor, RightRail } from "@/components/site/Chrome";
import PostCard from "@/components/site/PostCard";
import AdSlot from "@/components/ads/AdSlot";
import { CATEGORIES, CATEGORY_MAP, POSTS, PIPELINE, SITE_STATS } from "@/lib/site-data";

export const dynamic = "force-dynamic";

const Arrow = ({ s = 15, cls = "" }: { s?: number; cls?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cls}>
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);

export default function HomePage() {
  const lead = POSTS[0];
  const grid = POSTS.slice(1);

  return (
    <div className="page-chrome min-h-screen">
      <TopBar active="site" />
      <Ticker />

      {/* ============================ HERO ============================ */}
      <section className="bg-night-grid relative overflow-hidden">
        <div className="mx-auto grid max-w-site gap-10 px-4 py-16 md:px-8 md:py-24 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="flex flex-wrap items-center gap-2 font-mono-x text-[10px] tracking-[0.22em] text-white/45 uppercase">
              <span className="flex items-center gap-1.5 border border-lime/40 bg-lime/10 px-2 py-1 text-lime">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lime" />
                </span>
                ডেটা যাচাই চলছে
              </span>
              <span>HOICHOI NEWSROOM</span>
              <span className="text-white/25">·</span>
              <span>HOICHOI DATABASE</span>
              <span className="text-white/25">·</span>
              <span>HUMAN REVIEW</span>
            </p>

            <h1 className="headline-grad mt-6 font-serif-bn text-[clamp(3rem,9vw,6.5rem)] leading-[0.95] font-black">
              হৈচৈ<span className="text-alizarin">!</span>
            </h1>

            <p className="mt-5 max-w-xl font-serif-bn text-[19px] leading-relaxed font-bold text-white/85">
              শহরের হৈচৈ, সংবাদের ভাষায় — শহর ফিডে যা বলে, আমরা তা যাচাই করে লিখি।
            </p>
            <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-white/50">
              শহরের ঘটনা, মানুষের কথা। হৈচৈয়ের সম্পাদকীয় ডেস্কে প্রতিটি খবর ও পাঠকের মন্তব্যের জন্য আছে
              আলাদা পর্যালোচনা। নিচের লাইভ গ্রাফে দেখুন ডাটাবেসে কত প্রতিবেদন জমেছে, কোনটি প্রকাশিত, আর
              আলোচনায় কী যোগ হলো।
            </p>

            <div className="mt-8 grid max-w-xl grid-cols-2 gap-px border border-white/10 bg-white/10 sm:grid-cols-4">
              {[
                { v: SITE_STATS.collected, l: "সংগৃহীত রেকর্ড" },
                { v: SITE_STATS.published, l: "প্রকাশিত প্রতিবেদন" },
                { v: SITE_STATS.duplicates, l: "ডুপ্লিকেট চিহ্নিত" },
                { v: SITE_STATS.comments, l: "অনুমোদিত মন্তব্য" },
              ].map((s) => (
                <div key={s.l} className="bg-[#0c1017] px-3 py-4">
                  <p className="font-serif-bn text-[30px] leading-none font-black text-lime">{s.v}</p>
                  <p className="mt-1.5 text-[10.5px] text-white/45">{s.l}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="#latest" className="flex items-center gap-2 bg-alizarin px-6 py-3 text-[13.5px] font-bold text-white transition-colors hover:bg-alizarin-deep">
                সর্বশেষ সংগ্রহ পড়ুন <Arrow />
              </Link>
              <Link href="/advertise" className="flex items-center gap-2 border border-white/25 px-6 py-3 text-[13.5px] font-bold text-white/85 transition-colors hover:border-lime hover:text-lime">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 11 18-5v12L3 13v-2z" /><path d="M11.6 16.8a3 3 0 1 0-5.6-2" />
                </svg>
                বিজ্ঞাপন দিন
              </Link>
            </div>
          </div>

          {/* floating desk mock */}
          <div className="relative hidden lg:col-span-5 lg:block">
            <div className="floaty absolute top-4 right-0 w-[330px]" style={{ ["--fr" as string]: "1.5deg", ["--fd" as string]: "8s" }}>
              <div className="beam rounded-xl">
                <div className="tauri-win rounded-xl p-4">
                  <p className="flex items-center gap-1.5 font-mono-x text-[9px] tracking-[0.2em] text-alizarin uppercase">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
                      <path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7" />
                    </svg>
                    FEED IN · মিরপুর আপডেট
                  </p>
                  <p className="mt-2 text-[12px] leading-relaxed text-ink/75">
                    জরুরি!! বাচ্চা হারাইছে বিকেলের দিকে। শেয়ার করেন সবাই…
                  </p>
                </div>
              </div>
            </div>

            <div className="floaty absolute bottom-0 left-6 w-[310px]" style={{ ["--fr" as string]: "-1.5deg", ["--fd" as string]: "9s", ["--fdel" as string]: "-5s" }}>
              <div className="beam rounded-xl">
                <div className="tauri-win rounded-xl p-4">
                  <p className="flex items-center gap-1.5 font-mono-x text-[9px] tracking-[0.2em] text-lime uppercase">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                      <path d="M4 12.5l5 5L20 6.5" />
                    </svg>
                    প্রকাশিত · কৃত্রিম বুদ্ধিমত্তা
                  </p>
                  <p className="mt-2 line-clamp-2 font-serif-bn text-[15px] leading-snug font-bold text-ink">
                    {lead.title}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/10">
          <div className="mx-auto flex max-w-site flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
            <p className="font-mono-x text-[9.5px] tracking-[0.24em] text-white/35 uppercase">
              FEED → SHOT → HASH → LLM → GIT → DEPLOY
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <span className="text-[11px] text-white/40">সর্বশেষ নথিভুক্ত রান: {SITE_STATS.lastRun}</span>
              <Link href="#live-insights" className="flex items-center gap-2 text-sm font-semibold text-lime">
                লাইভ গ্রাফ দেখুন <Arrow s={13} cls="rotate-90" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ AD SLOT · home_hero_below (EXISTING — cloned) ══════════ */}
      <div className="mx-auto max-w-site px-4 pt-8 md:px-8">
        <AdSlot slotKey="home_hero_below" />
      </div>

      {/* ======================= LIVE INSIGHTS ======================= */}
      <section id="live-insights" className="mt-12 border-y border-ink/15 bg-[#f6f1e3] py-14">
        <div className="mx-auto max-w-site px-4 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 font-mono-x text-[10.5px] tracking-[0.26em] text-lime uppercase">
                <span className="h-2 w-2 bg-lime" /> TELEMETRY · LIVE
              </p>
              <h2 className="mt-2 font-serif-bn text-[34px] font-black text-ink md:text-[44px]">
                হৈচৈ চলছে। দেখুন <span className="text-lime">সংখ্যায়।</span>
              </h2>
            </div>
            <p className="max-w-sm text-[12.5px] leading-relaxed text-ink-soft">
              প্রতি ১০ সেকেন্ডে নতুন তথ্য। গ্রাফে ডাটাবেসের রেকর্ড গণনা করা হয়; নমুনা রেকর্ড থাকলে সেটিও
              অন্তর্ভুক্ত।
            </p>
          </div>

          <div className="mt-8 grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: "সংগৃহীত প্রতিবেদন", v: SITE_STATS.collected, s: "নির্বাচিত সময়ের নতুন রেকর্ড", c: "#0b7c72" },
              { t: "প্রকাশিত প্রতিবেদন", v: SITE_STATS.published, s: "পাবলিক সাইটে প্রকাশিত", c: "#5f8f0e" },
              { t: "ডুপ্লিকেট চিহ্নিত", v: SITE_STATS.duplicates, s: "পুনরাবৃত্তি হিসেবে সংরক্ষিত", c: "#b45309" },
              { t: "অনুমোদিত মন্তব্য", v: SITE_STATS.comments, s: "সম্পাদকীয় রিভিউ পেরিয়েছে", c: "#d2202c" },
            ].map((m) => (
              <div key={m.t} className="bg-[#fbf7ea] p-5">
                <p className="flex items-center justify-between font-mono-x text-[10px] tracking-[0.18em] text-ink-soft uppercase">
                  {m.t}
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.c }} />
                </p>
                <p className="mt-3 font-serif-bn text-[40px] leading-none font-black text-ink">
                  {m.v}
                  <small className="ml-1 text-[14px] font-bold text-ink-soft">টি</small>
                </p>
                <p className="mt-2 text-[11px] text-ink-soft">{m.s}</p>
                <div className="mt-3 h-0.5 w-full" style={{ background: m.c }} />
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <article className="c-card p-5 lg:col-span-2">
              <p className="font-mono-x text-[10px] tracking-[0.2em] text-ink-soft uppercase">সংগ্রহ থেকে প্রকাশ</p>
              <div className="mt-4 flex h-[150px] items-end gap-1.5">
                {[32, 48, 40, 66, 54, 72, 61, 84, 70, 92, 78, 100].map((h, i) => (
                  <div key={i} className="flex-1">
                    <div className="w-full bg-[#0b7c72]/80" style={{ height: h }} />
                    <div className="w-full bg-lime" style={{ height: Math.round(h * 0.42) }} />
                  </div>
                ))}
              </div>
              <p className="mt-3 flex items-center gap-4 font-mono-x text-[10px] text-ink-soft uppercase">
                <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 bg-[#0b7c72]" /> সংগৃহীত</span>
                <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 bg-lime" /> প্রকাশিত</span>
              </p>
            </article>

            <article className="c-card p-5">
              <p className="font-mono-x text-[10px] tracking-[0.2em] text-ink-soft uppercase">এই মুহূর্তের অবস্থা</p>
              <div className="mt-4 space-y-3">
                {[
                  { n: "TURSO ডাটাবেস", s: "পরীক্ষা চলছে", ok: true },
                  { n: "পাবলিক ডেটা API", s: "GET /api/stats · 10s", ok: true },
                  { n: "ডেস্কটপ কালেক্টর", s: "Heartbeat পাওয়া যায়নি", ok: false },
                  { n: "বিজ্ঞাপন সার্ভার", s: "GET /api/ads/serve · live", ok: true },
                ].map((r) => (
                  <div key={r.n} className="flex items-center justify-between border-b border-ink/10 pb-2.5">
                    <div>
                      <p className="text-[12.5px] font-semibold text-ink">{r.n}</p>
                      <p className="font-mono-x text-[9.5px] text-ink-soft">{r.s}</p>
                    </div>
                    <span className={`c-pill ${r.ok ? "st-active" : "st-pending"}`}>
                      {r.ok ? "সংযুক্ত" : "অপেক্ষা"}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ══════════ AD SLOT · home_insights_below (NEW billboard) ══════════ */}
      <div className="mx-auto max-w-site px-4 pt-12 md:px-8">
        <AdSlot slotKey="home_insights_below" />
      </div>

      {/* ======================= CATEGORY RAIL (+ native ad) ======================= */}
      <div className="mt-12">
        <CategoryRail />
      </div>

      {/* ======================= LEAD STORY ======================= */}
      <section className="mx-auto max-w-site px-4 py-16 md:px-8 md:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-alizarin uppercase">
              ▚ LEAD STORY · এই সিঙ্কের প্রধান কনটেন্ট
            </p>
            <h2 className="mt-2 font-serif-bn text-[34px] font-black text-ink md:text-[44px]">
              আজকের প্রধান হৈচৈ
            </h2>
          </div>
          <p className="font-mono-x text-[10px] tracking-[0.2em] text-ink-soft uppercase">
            SYNCED {SITE_STATS.lastRun} · AUTO-FEATURED
          </p>
        </div>

        <Link href={`/post/${lead.slug}`} className="group grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="frame-press relative overflow-hidden">
              <div className="aspect-[16/9] bg-paper-deep">
                <div className="flex h-full items-center justify-center px-10">
                  <p className="text-center font-serif-bn text-[19px] leading-relaxed font-bold text-ink/40">
                    {lead.dek}
                  </p>
                </div>
              </div>
              <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-alizarin px-2.5 py-1 text-[10px] font-bold text-white">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5l13 7.5-13 7.5z" /></svg>
                FACT-CHECKED
              </span>
            </div>
          </div>
          <div className="flex flex-col justify-center lg:col-span-5">
            <span
              className="w-fit px-3 py-1 text-[11.5px] font-bold text-white"
              style={{ background: CATEGORY_MAP[lead.category]?.color }}
            >
              {CATEGORY_MAP[lead.category]?.name}
            </span>
            <h3 className="link-sweep mt-4 inline font-serif-bn text-[30px] leading-[1.25] font-black text-ink">
              {lead.title}
            </h3>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">{lead.dek}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 bg-ink px-5 py-2.5 text-[13px] font-bold text-paper transition-colors group-hover:bg-alizarin">
                পুরোটা পড়ুন <Arrow s={14} />
              </span>
              <span className="font-mono-x text-[10.5px] text-ink-soft">{lead.hash}</span>
            </div>
          </div>
        </Link>

        {/* ══════════ AD SLOT · home_lead_sponsor (NEW native) ══════════ */}
        <div className="mt-8 border-t border-ink/15 pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono-x text-[9.5px] tracking-[0.24em] text-ink-soft uppercase">
              এই প্রতিবেদনের পৃষ্ঠপোষক
            </span>
            <div className="min-w-[280px] flex-1 md:max-w-[520px]">
              <AdSlot slotKey="home_lead_sponsor" />
            </div>
          </div>
        </div>
      </section>

      {/* ======================= PIPELINE (dark band) ======================= */}
      <section className="bg-band text-bandline">
        <div className="mx-auto max-w-site px-4 py-16 md:px-8 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-2xl">
              <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-lime uppercase">
                AUTOMATION PIPELINE · EVERY 2 HOURS
              </p>
              <h2 className="mt-2 font-serif-bn text-[34px] font-black md:text-[44px]">
                ফিড থেকে লাইভ — ছয় ধাপ, <span className="text-lime">শূন্য ছোঁয়া।</span>
              </h2>
              <p className="mt-3 text-[13px] leading-relaxed text-bandline/60">
                আলোর বিন্দুটি রাস্তাটা দেখিয়ে দিচ্ছে — প্রতিটি রানে ডেটা ঠিক এই পথ ধরে এগোয়: সোর্স থেকে শট,
                শট থেকে হ্যাশ, হ্যাশ পেরোলে লেখা, লেখা শেষে সোজা প্রোডাকশনে।
              </p>
            </div>
            <Link href="/system" className="flex items-center gap-2 border border-bandline/30 px-5 py-2.5 text-[13px] font-bold transition-colors hover:border-lime hover:text-lime">
              পুরো ব্লুপ্রিন্ট <Arrow s={14} />
            </Link>
          </div>

          <div className="mt-10 grid gap-px bg-bandline/15 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {PIPELINE.map((p) => (
              <div key={p.n} className="relative bg-band p-5">
                <p className="font-serif-bn text-[15px] font-bold">{p.t}</p>
                <p className="mt-1 font-mono-x text-[9.5px] tracking-[0.16em] text-bandline/45 uppercase">{p.s}</p>
                <span className="absolute top-3 right-4 font-mono-x text-[22px] font-bold text-bandline/12">{p.n}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================= RAW vs REWRITTEN ======================= */}
      <section className="border-y-2 border-ink bg-ink/[0.06]">
        <div className="mx-auto max-w-site px-4 py-16 md:px-8 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-2xl">
              <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-alizarin uppercase">
                REWRITE ENGINE · BANGLA STYLE GUIDE v2.4
              </p>
              <h2 className="mt-2 font-serif-bn text-[34px] font-black text-ink md:text-[44px]">
                একই ঘটনা — <span className="text-alizarin">দুই জগত।</span>
              </h2>
            </div>
            <Link href={`/post/${lead.slug}`} className="flex items-center gap-2 bg-ink px-5 py-2.5 text-[13px] font-bold text-paper transition-colors hover:bg-alizarin">
              সম্পূর্ণ প্রতিবেদন <Arrow s={14} />
            </Link>
          </div>

          <div className="mt-10 grid gap-px border border-ink/20 bg-ink/20 md:grid-cols-2">
            <div className="bg-paper-deep/60 p-6">
              <p className="font-mono-x text-[9.5px] tracking-[0.24em] text-ink-soft uppercase">RAW FEED · অসম্পাদিত</p>
              <p className="mt-4 font-serif-bn text-[16px] leading-relaxed text-ink/60 italic">“{lead.raw}”</p>
            </div>
            <div className="bg-paper p-6">
              <p className="font-mono-x text-[9.5px] tracking-[0.24em] text-lime uppercase">HOICHOI REWRITE · যাচাইকৃত</p>
              <p className="mt-4 font-serif-bn text-[17px] leading-relaxed font-bold text-ink">{lead.title}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{lead.dek}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================= LATEST COLLECTION ======================= */}
      <section id="latest" className="mx-auto max-w-site scroll-mt-24 px-4 py-16 md:px-8 md:py-20">
        <div className="reveal">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-alizarin uppercase">
                ▚ TODAY&apos;S COLLECTION · AUTO-CURATED
              </p>
              <h2 className="mt-2 font-serif-bn text-[34px] font-black text-ink md:text-[44px]">আজকের সংগ্রহ</h2>
            </div>
            <p className="max-w-sm text-[12.5px] leading-relaxed text-ink-soft">
              প্রতিটি কার্ডের হ্যাশ স্ট্যাম্প দেখুন — এটাই এর জন্মসনদ। একই খবর দুইবার এখানে জায়গা পায় না; পায়
              শুধু যাচাই করা, পুনর্লিখিত সংস্করণ।
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-full border border-ink bg-ink px-4 py-1.5 text-[12.5px] font-medium text-paper">
            সব <span className="font-mono-x text-[10px] opacity-70">{POSTS.length}</span>
          </button>
          {CATEGORIES.slice(0, 6).map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="rounded-full border border-ink/25 px-4 py-1.5 text-[12.5px] font-medium text-ink-soft transition-all duration-300 hover:border-ink hover:text-ink"
            >
              {c.name} <span className="font-mono-x text-[10px] opacity-70">{c.count}</span>
            </Link>
          ))}
          <span className="ml-auto hidden font-mono-x text-[10px] tracking-[0.18em] text-ink-soft/70 uppercase md:block">
            FILTER · AUTO-CATEGORIZED BY LLM
          </span>
        </div>

        <div className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 xl:grid-cols-3">
          {grid.slice(0, 4).map((p, i) => (
            <PostCard key={p.slug} post={p} delay={i * 80} />
          ))}

          {/* ══════════ AD SLOT · home_feed_1 (EXISTING — cloned) ══════════ */}
          <div className="mt-10 sm:mt-0">
            <AdSlot slotKey="home_feed_1" />
          </div>

          {grid.slice(4, 9).map((p, i) => (
            <PostCard key={p.slug} post={p} delay={(i + 5) * 80} />
          ))}

          {/* ══════════ AD SLOT · home_feed_2 (EXISTING — cloned) ══════════ */}
          <div className="mt-10 sm:mt-0">
            <AdSlot slotKey="home_feed_2" />
          </div>

          {grid.slice(9).map((p, i) => (
            <PostCard key={p.slug} post={p} delay={(i + 11) * 80} />
          ))}
        </div>

        <nav aria-label="পৃষ্ঠা" className="mt-12 flex flex-wrap items-center justify-center gap-2">
          <span className="flex h-10 min-w-10 items-center justify-center border border-ink/15 px-3 text-[12.5px] font-bold text-ink-soft/50">
            ← আগের
          </span>
          {["১", "২", "৩"].map((n, i) => (
            <span
              key={n}
              className={`flex h-10 min-w-10 items-center justify-center border px-3 text-[12.5px] font-bold transition-colors duration-300 ${
                i === 0 ? "border-ink bg-ink text-paper" : "border-ink/25 bg-paper text-ink hover:bg-ink hover:text-paper"
              }`}
            >
              {n}
            </span>
          ))}
          <span className="px-1 font-mono-x text-[12px] text-ink-soft">…</span>
          <span className="flex h-10 min-w-10 items-center justify-center border border-ink/25 bg-paper px-3 text-[12.5px] font-bold text-ink">
            ১২
          </span>
          <span className="mx-1 font-mono-x text-[11px] tracking-wide text-ink-soft uppercase">পৃষ্ঠা ১ / ১২</span>
          <span className="flex h-10 min-w-10 items-center justify-center border border-ink/25 bg-paper px-3 text-[12.5px] font-bold text-ink">
            পরবর্তী →
          </span>
        </nav>
      </section>

      {/* ══════════ AD SLOT · home_prefooter_strip (EXISTING — cloned) ══════════ */}
      <div className="mx-auto max-w-site px-4 pb-12 md:px-8">
        <AdSlot slotKey="home_prefooter_strip" />
      </div>

      <Footer />
      <MobileAnchor />
      <RightRail />
      <div className="h-16 md:hidden" />
    </div>
  );
}
