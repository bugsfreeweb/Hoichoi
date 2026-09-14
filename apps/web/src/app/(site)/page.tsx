import Link from "next/link";
import { windowPosts } from "@hoichoi/db";
import { getCategories } from "@/lib/categories-server";
import { ScrollProgress } from "@/components/ScrollProgress";
import Hero from "@/components/home/Hero";
import LiveAnalytics from "@/components/home/live-analytics";
import PulseFlow from "@/components/home/PulseFlow";
import RewriteSlider from "@/components/home/RewriteSlider";
import TiltCard from "@/components/home/TiltCard";
import ArticleGrid from "@/components/ArticleGrid";
import { AdSlot } from "@/components/AdSlot";
import { Reveal } from "@/components/Reveal";
import { HomeLiveProvider } from "@/components/home/live-data";
import { getSettings } from "@/lib/settings";
import { timeBn, readMinutesBn, shortId, bnNum } from "@/lib/bn";
import { CATEGORY_LABEL, CATEGORY_TINT, agoBn } from "@/lib/format";
import { BRAND } from "@/lib/brand";

export const revalidate = 300;

export default async function HomePage() {
  const [posts, cats, settings] = await Promise.all([
    windowPosts({ limit: 30 }),
    getCategories(),
    getSettings(),
  ]);
  const featured = posts[0] ?? null;
  const rest = posts.filter((p) => p.id !== featured?.id);
  const topPicks = rest.slice(0, 3);

  return (
    <HomeLiveProvider>
      <ScrollProgress />

      <Hero
        lastRunIso={featured?.created_at ?? null}
        collected={posts.length}
        published={posts.filter((p) => p.status === "published").length}
        dups={0}
        featuredImg={featured?.media_path ?? null}
        featuredTitle={featured?.title_bn ?? null}
      />

      <div className="mx-auto max-w-[1400px] px-4 pt-8 md:px-8">
        <AdSlot variant="leaderboard" html={settings.ad_leaderboard_html} />
      </div>

      <LiveAnalytics />

      {featured && (
        <section className="mx-auto max-w-[1400px] px-4 py-16 md:px-8 md:py-20">
          <Reveal>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono-x text-[10.5px] tracking-[0.28em] text-alizarin uppercase">
                  ▚ LEAD STORY · এই সিঙ্কের প্রধান কনটেন্ট
                </p>
                <h2 className="mt-2 font-serif-bn text-[34px] font-black text-ink md:text-[44px]">
                  আজকের প্রধান হৈচৈ
                </h2>
              </div>
              <span className="font-mono-x text-[10px] tracking-[0.2em] text-ink-soft uppercase">
                SYNCED {timeBn(featured.created_at ?? new Date().toISOString())} · AUTO-FEATURED
              </span>
            </div>
          </Reveal>

          <div className="mt-10 grid items-start gap-12 lg:grid-cols-12">
            <Reveal className="lg:col-span-7">
              <Link href={`/post/${featured.slug}`} className="group block">
                <TiltCard>
                  <div className="frame-press relative overflow-hidden">
                    <div className="aspect-[16/9.5] overflow-hidden bg-paper-deep">
                      {featured.media_path && featured.media_kind !== "none" ? (
                        <img
                          src={featured.media_path}
                          alt={featured.title_bn}
                          className="photo-grade h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-6">
                          <p className="text-center font-serif-bn text-[15px] font-bold leading-relaxed text-ink/40">
                            {featured.summary_bn?.slice(0, 80) ?? featured.title_bn.slice(0, 60)}…
                          </p>
                        </div>
                      )}
                    </div>
                    <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 font-mono-x text-[9.5px] tracking-[0.16em] text-paper uppercase backdrop-blur-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
                      SOURCE · {featured.source_name}
                    </span>
                    <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-alizarin px-2.5 py-1 text-[10px] font-bold text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5l13 7.5-13 7.5z"/></svg>
                      FACT-CHECKED
                    </span>
                  </div>
                </TiltCard>
                <p className="mt-3 flex items-center justify-between text-[10.5px] text-ink-soft/80">
                  <span>ছবি: {featured.media_path ? "সংগৃহীত" : "কেবল টেক্সট"} · প্রতীকী</span>
                  <span className="font-mono-x tracking-wide">
                    SHOT_{shortId(featured.id).toUpperCase()} · PLAYWRIGHT
                    1440×900
                  </span>
                </p>
              </Link>
            </Reveal>

            <div className="lg:col-span-5">
              <Reveal delay={100}>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="flex items-center gap-1.5 px-3 py-1 text-[11.5px] font-bold text-white"
                  style={{ background: CATEGORY_TINT[featured.category] ?? "#d2202c" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5l13 7.5-13 7.5z"/></svg>
                  {CATEGORY_LABEL[featured.category] ?? featured.category}
                </span>
                <span className="flex items-center gap-1 text-[12px] text-ink-soft">
                  <svg xmlns="http://www.w3.org/2000/svg" width="11.5" height="11.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0"/><circle cx="12" cy="10" r="3"/></svg>
                  {featured.source_name}
                </span>
              </div>
              <Link href={`/post/${featured.slug}`} className="mt-4 block">
                <h3 className="link-sweep inline font-serif-bn text-[26px] leading-[1.32] font-extrabold text-ink md:text-[32px]">
                  {featured.title_bn}
                </h3>
              </Link>
              <p className="mt-4 text-[14.5px] leading-relaxed text-ink-soft">
                {featured.summary_bn ?? featured.body_bn}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link
                  href={`/post/${featured.slug}`}
                  className="group flex items-center gap-2 bg-ink px-5 py-3 text-[13px] font-bold text-paper transition-colors duration-300 hover:bg-alizarin"
                >
                  পুরোটা পড়ুন
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
                <span className="flex items-center gap-1.5 font-mono-x text-[10.5px] text-ink-soft">
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3L7 21M17 3l-2 18M4 8h17M3 16h17"/></svg>
                  {shortId(featured.id)}
                </span>
                <span className="flex items-center gap-1.5 text-[11.5px] text-ink-soft">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  {bnNum(readMinutesBn(featured.body_bn))} মিনিট
                </span>
              </div>

              <div className="mt-8 border-t-2 border-ink pt-4">
                <p className="font-serif-bn text-[16px] font-extrabold">সর্বাধিক পঠিত</p>
                <ol className="mt-1 divide-y divide-ink/12">
                  {topPicks.map((a, i) => (
                    <li key={a.id}>
                      <Link href={`/post/${a.slug}`} className="group flex items-start gap-4 py-3.5">
                        <span className="text-outline-ink mt-0.5 font-serif-bn text-2xl leading-none font-black">
                          {bnNum(i + 1)}
                        </span>
                        <div>
                          <h4 className="link-sweep inline font-serif-bn text-[14.5px] leading-snug font-bold">
                            {a.title_bn}
                          </h4>
                          <p className="mt-1 flex items-center gap-2 text-[10.5px] text-ink-soft">
                            <span
                              className="inline-block h-1.5 w-1.5 rounded-full"
                              style={{ background: CATEGORY_TINT[a.category] ?? "#d2202c" }}
                            />
                            {CATEGORY_LABEL[a.category] ?? a.category} ·{" "}
                            {agoBn(a.published_at ?? a.created_at)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
              </Reveal>
            </div>
          </div>
        </section>
      )}

      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-[1400px] px-4 py-16 md:px-8 md:py-20">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-lime uppercase">
                AUTOMATION PIPELINE · EVERY 2 HOURS
              </p>
              <h2 className="mt-2 font-serif-bn text-[30px] font-black md:text-[42px]">
                ফিড থেকে লাইভ — ছয় ধাপ, <span className="text-lime">শূন্য ছোঁয়া।</span>
              </h2>
              <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-paper/50">
                আলোর বিন্দুটি রাস্তাটা দেখিয়ে দিচ্ছে — প্রতিটি রানে ডেটা ঠিক এই
                পথ ধরে এগোয়: সোর্স থেকে শট, শট থেকে হ্যাশ, হ্যাশ পেরোলে লেখা,
                লেখা শেষে সোজা প্রোডাকশনে।
              </p>
            </div>
            <Link
              href="/system"
              className="group flex items-center gap-2 border-b border-lime pb-1 text-[13px] font-bold text-lime"
            >
              পুরো ব্লুপ্রিন্ট
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
            </div>
          </Reveal>
          <div className="mt-12">
            <PulseFlow />
          </div>
        </div>
      </section>

      {featured && (
        <section className="border-y-2 border-ink bg-paper-deep/60">
          <div className="mx-auto max-w-[1400px] px-4 py-16 md:px-8 md:py-20">
            <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-alizarin uppercase">
                  REWRITE ENGINE · BANGLA STYLE GUIDE v2.4
                </p>
                <h2 className="mt-2 font-serif-bn text-[32px] font-black md:text-[42px]">
                  একই ঘটনা — <span className="text-alizarin">দুই জগত।</span>
                </h2>
                <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-soft">
                  বামে: ফিডের কাঁচা অবস্থা — হুটোপাটো ক্যাপশন, বানান-ভুল, আধমাথা
                  তথ্য। ডানে: হৈচৈর ফ্যাক্ট-গেট পার হওয়া পুনর্লিখন। হাতলটি ধরে
                  টেনে নিজেই বিচার করুন।
                </p>
              </div>
              <Link
                href={`/post/${featured.slug}`}
                className="link-sweep flex items-center gap-2 text-[13px] font-bold text-ink"
              >
                সম্পূর্ণ প্রতিবেদন
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            </div>
            </Reveal>
            <div className="mt-10">
              <RewriteSlider
                raw={featured.summary_bn ?? featured.body_bn}
                headline={featured.title_bn}
                body={featured.body_bn}
                sourceName={featured.source_name ?? "অজানা"}
                location={featured.source_name}
              />
            </div>
          </div>
        </section>
      )}

      <section id="latest" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-16 md:px-8 md:py-20">
        <Reveal>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-alizarin uppercase">
              ▚ TODAY'S COLLECTION · AUTO-CURATED
            </p>
            <h2 className="mt-2 font-serif-bn text-[34px] font-black text-ink md:text-[44px]">
              আজকের সংগ্রহ
            </h2>
          </div>
          <p className="max-w-sm text-[12.5px] leading-relaxed text-ink-soft">
            প্রতিটি কার্ডের হ্যাশ স্ট্যাম্প দেখুন — এটাই এর জন্মসনদ। একই খবর দুইবার
            এখানে জায়গা পায় না; পায় শুধু যাচাই করা, পুনর্লিখিত সংস্করণ।
          </p>
        </div>
        </Reveal>
        <ArticleGrid posts={rest} ads adInfeedHtml={settings.ad_infeed_html} />
      </section>

      <section className="mx-auto max-w-[1400px] px-4 pb-16 md:px-8">
        <a
          href="https://github.com/bugsfreeweb/Hoichoi/releases"
          target="_blank"
          rel="noreferrer"
          className="group relative flex flex-col items-start justify-between gap-6 overflow-hidden border-[1.5px] border-ink bg-ink p-7 text-paper md:flex-row md:items-center md:p-10"
        >
          <div className="drift pointer-events-none absolute -top-24 right-10 h-64 w-64 rounded-full bg-lime/10 blur-[80px]" />
          <div className="relative flex items-start gap-4">
            <img
              src={BRAND.mark}
              alt=""
              className="h-16 w-16 rounded-full object-cover ring-2 ring-lime/40"
            />
            <div>
              <p className="font-mono-x text-[10px] tracking-[0.26em] text-lime uppercase">
                OPTION A · TAURI 2 NATIVE CONTROLLER
              </p>
              <h3 className="mt-1 font-serif-bn text-[26px] font-black md:text-[32px]">
                {BRAND.desk} খুলুন
              </h3>
              <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-paper/55">
                এই সাইটের প্রতিটি লাইনের পেছনে ওই একটাই ইঞ্জিন — ওয়াচলিস্ট,
                কালেক্টর, ডুপ্লিকেট গেট, API ভল্ট ও দুই-ঘণ্টার ক্রন। ওয়েব শুধু
                ছাপে; অ্যাপই চালায়।
              </p>
            </div>
          </div>
          <span className="beam relative flex items-center gap-2 rounded-md bg-lime px-6 py-3.5 text-[13.5px] font-bold text-night transition-transform duration-300 group-hover:scale-[1.03]">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 4v4"/><path d="M2 8h20"/><path d="M6 4v4"/></svg>
            অ্যাপ লঞ্চ
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </span>
        </a>
      </section>

      <div className="mx-auto max-w-[1400px] px-4 pb-12 md:px-8">
        <AdSlot variant="strip" html={settings.ad_strip_html} />
      </div>
    </HomeLiveProvider>
  );
}