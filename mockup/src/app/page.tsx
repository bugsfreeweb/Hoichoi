import Link from "next/link";
import {
  ArrowRight,
  Flame,
  MapPin,
  Hash,
  Timer,
  AppWindow,
  Rss,
} from "lucide-react";
import Ticker from "@/components/ticker";
import Reveal from "@/components/reveal";
import ArticleGrid from "@/components/article-grid";
import SiteFooter from "@/components/site-footer";
import AdSlot from "@/components/ad-slot";
import Hero from "@/components/home/hero";
import LiveAnalytics from "@/components/home/live-analytics";
import { HomeLiveProvider } from "@/components/home/live-data";
import PulseFlow from "@/components/home/pulse-flow";
import RewriteSlider from "@/components/home/rewrite-slider";
import TiltCard from "@/components/home/tilt-card";
import ScrollProgress from "@/components/home/scroll-progress";
import { BRAND } from "@/lib/brand";
import { ensureReady } from "@/lib/db-bootstrap";
import {
  getArticles,
  getRuns,
  lite,
  bnTime,
  agoBn,
  toBn,
  CATEGORY_LABEL,
  CATEGORY_TINT,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureReady();
  const [articles, runs] = await Promise.all([getArticles(), getRuns()]);
  const published = articles.filter((a) => a.status === "published");
  const featured =
    published.find((a) => a.featured) ?? published[0] ?? articles[0] ?? null;
  const rest = published.filter((a) => a.id !== featured?.id);
  const lastRun = runs[0] ?? null;

  const collectedToday = articles.length;
  const dupToday = articles.filter(a => a.status === "duplicate").length;


  const topPicks = rest.slice(0, 3);
  const databaseReady = articles.length > 0;

  return (
    <HomeLiveProvider><main className="bg-paper">
      <ScrollProgress />
      <Ticker items={published.slice(0, 6).map((a) => a.title)} />

      {/* ======================= KINETIC HERO ======================= */}
      <Hero
        lastRunIso={lastRun?.startedAt?.toISOString() ?? null}
        collected={collectedToday}
        published={published.length}
        dups={dupToday}
        featuredImg={featured?.imageUrl ?? null}
        featuredTitle={featured?.title ?? null}
      />

      {/* ======================= AD · LEADERBOARD ======================= */}
      <div className="mx-auto max-w-[1400px] px-4 pt-8 md:px-8">
        <AdSlot variant="leaderboard" />
      </div>

      {/* Real database-backed charts refresh every 10 seconds. */}
      <LiveAnalytics />

      {!databaseReady && (
        <section className="mx-auto max-w-[1400px] px-4 py-16 md:px-8">
          <div className="border-[1.5px] border-ink bg-paper-deep/50 p-8 text-center">
            <h2 className="font-serif-bn text-[24px] font-black">এখনো কোনো কনটেন্ট নেই</h2>
            <p className="mx-auto mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-soft">
              ডাটাবেস সংযুক্ত, তবে <code className="font-mono-x text-[12px]">hoichoi_articles</code> টেবিলে কোনো
              প্রতিবেদন নেই। ডেমো কনটেন্ট যোগ করতে <code className="font-mono-x text-[12px]">/api/setup</code> চালান
              (Web-এ <code className="font-mono-x text-[12px]">x-setup-key</code> হেডারসহ), অথবা ডেস্কটপ কালেক্টর
              দিয়ে নতুন কনটেন্ট সংগ্রহ করুন।
            </p>
          </div>
        </section>
      )}

      {/* ======================= FEATURED STORY ======================= */}
      {featured && (
        <section className="mx-auto max-w-[1400px] px-4 py-16 md:px-8 md:py-20">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono-x text-[10.5px] tracking-[0.28em] text-alizarin uppercase">
                  ▚ LEAD STORY · এই সিঙ্কের প্রধান কনটেন্ট
                </p>
                <h2 className="mt-2 font-serif-bn text-[34px] font-black text-ink md:text-[44px]">
                  আজকের প্রধান হৈচৈ
                </h2>
              </div>
              <span className="font-mono-x text-[10px] tracking-[0.2em] text-ink-soft uppercase">
                SYNCED {bnTime(featured.collectedAt)} · AUTO-FEATURED
              </span>
            </div>
          </Reveal>

          <div className="grid items-start gap-12 lg:grid-cols-12">
            {/* image with tilt */}
            <Reveal className="lg:col-span-7">
              <Link href={`/news/${featured.id}`} className="group block">
                <TiltCard>
                  <div className="frame-press relative overflow-hidden">
                    <div className="aspect-[16/9.5] overflow-hidden bg-paper-deep">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={featured.imageUrl}
                        alt={featured.title}
                        className="photo-grade h-full w-full object-cover"
                      />
                    </div>
                    <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 font-mono-x text-[9.5px] tracking-[0.16em] text-paper uppercase backdrop-blur-sm">
                      <Rss size={9.5} /> SOURCE · FACEBOOK ARCHIVE
                    </span>
                    <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-alizarin-deep px-2.5 py-1 text-[10px] font-bold text-white">
                      <Flame size={10} /> FACT-CHECKED
                    </span>
                  </div>
                </TiltCard>
                <p className="mt-3 flex items-center justify-between text-[10.5px] text-ink-soft/80">
                  <span>ছবি: {featured.imageCredit} · প্রতীকী</span>
                  <span className="font-mono-x tracking-wide">
                    SHOT_{featured.id.toString().padStart(4, "0")}.PNG · PLAYWRIGHT
                    1440×900
                  </span>
                </p>
              </Link>
            </Reveal>

            {/* copy */}
            <div className="lg:col-span-5">
              <Reveal delay={100}>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="flex items-center gap-1.5 px-3 py-1 text-[11.5px] font-bold text-white"
                    style={{
                      background: CATEGORY_TINT[featured.category] ?? "#d2202c",
                    }}
                  >
                    <Flame size={11} />
                    {CATEGORY_LABEL[featured.category] ?? featured.category}
                  </span>
                  <span className="flex items-center gap-1 text-[12px] text-ink-soft">
                    <MapPin size={11.5} /> {featured.location}
                  </span>
                </div>
                <Link href={`/news/${featured.id}`} className="mt-4 block">
                  <h3 className="link-sweep inline font-serif-bn text-[26px] leading-[1.32] font-extrabold text-ink md:text-[32px]">
                    {featured.title}
                  </h3>
                </Link>
                <p className="mt-4 text-[14.5px] leading-relaxed text-ink-soft">
                  {featured.dek}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <Link
                    href={`/news/${featured.id}`}
                    className="group flex items-center gap-2 bg-ink px-5 py-3 text-[13px] font-bold text-paper transition-colors duration-300 hover:bg-alizarin"
                  >
                    পুরোটা পড়ুন
                    <ArrowRight
                      size={14}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </Link>
                  <span className="flex items-center gap-1.5 font-mono-x text-[10.5px] text-ink-soft">
                    <Hash size={11} /> {featured.hash.slice(0, 10)}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11.5px] text-ink-soft">
                    <Timer size={12} /> {toBn(featured.readingMinutes)} মিনিট
                  </span>
                </div>

                {/* most read */}
                <div className="mt-8 border-t-2 border-ink pt-4">
                  <p className="font-serif-bn text-[16px] font-extrabold">সর্বাধিক পঠিত</p>
                  <ol className="mt-1 divide-y divide-ink/12">
                    {topPicks.map((a, i) => (
                      <li key={a.id}>
                        <Link
                          href={`/news/${a.id}`}
                          className="group flex items-start gap-4 py-3.5"
                        >
                          <span className="text-outline-ink mt-0.5 font-serif-bn text-2xl leading-none font-black">
                            {toBn(i + 1)}
                          </span>
                          <div>
                            <h4 className="link-sweep inline font-serif-bn text-[14.5px] leading-snug font-bold">
                              {a.title}
                            </h4>
                            <p className="mt-1 flex items-center gap-2 text-[10.5px] text-ink-soft">
                              <span
                                className="inline-block h-1.5 w-1.5 rounded-full"
                                style={{
                                  background:
                                    CATEGORY_TINT[a.category] ?? "#d2202c",
                                }}
                              />
                              {CATEGORY_LABEL[a.category]} ·{" "}
                              {agoBn(a.publishedAt ?? a.collectedAt)}
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

      {/* ======================= PULSE PIPELINE ======================= */}
      <section className="bg-band text-bandline">
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
                <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-bandline/55">
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
                <ArrowRight
                  size={14}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
            </div>
          </Reveal>
          <div className="mt-12">
            <PulseFlow />
          </div>
        </div>
      </section>

      {/* ======================= REWRITE COMPARE ======================= */}
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
                  href={`/news/${featured.id}`}
                  className="link-sweep flex items-center gap-2 text-[13px] font-bold text-ink"
                >
                  সম্পূর্ণ প্রতিবেদন <ArrowRight size={14} />
                </Link>
              </div>
            </Reveal>
            <div>
              <RewriteSlider
                raw={featured.fbExcerpt}
                headline={featured.title}
                body={featured.body.split("\n\n")[1] ?? featured.dek}
                sourceName={featured.sourceName}
                location={featured.location}
              />
            </div>
          </div>
        </section>
      )}

      {/* ======================= COLLECTION GRID ======================= */}
      <section id="latest" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-16 md:px-8 md:py-20">
        <Reveal>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-alizarin uppercase">
                ▚ TODAY’S COLLECTION · AUTO-CURATED
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
        <ArticleGrid articles={rest.map(lite)} ads />
      </section>

      {/* ======================= DESK CTA ======================= */}
      <section className="mx-auto max-w-[1400px] px-4 pb-16 md:px-8">
        <Link
          href="/desk"
          className="group relative flex flex-col items-start justify-between gap-6 overflow-hidden border-[1.5px] border-band bg-band p-7 text-bandline md:flex-row md:items-center md:p-10"
        >
          <div className="drift pointer-events-none absolute -top-24 right-10 h-64 w-64 rounded-full bg-lime/10 blur-[80px]" />
          <div className="relative flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND.mark}
              alt=""
              className="h-16 w-16 rounded-full object-cover ring-2 ring-lime/40"
            />
            <div>
              <p className="font-mono-x text-[10px] tracking-[0.26em] text-lime uppercase">
                TAURI DESK · NATIVE CONTROLLER
              </p>
              <h3 className="mt-1 font-serif-bn text-[26px] font-black md:text-[32px]">
                {BRAND.desk} খুলুন
              </h3>
              <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-bandline/60">
                এই সাইটের প্রতিটি লাইনের পেছনে ওই একটাই ইঞ্জিন — ওয়াচলিস্ট,
                কালেক্টর, ডুপ্লিকেট গেট, API ভল্ট ও দুই-ঘণ্টার ক্রন। ওয়েব শুধু
                ছাপে; অ্যাপই চালায়।
              </p>
            </div>
          </div>
          <span className="beam relative flex items-center gap-2 rounded-md bg-lime px-6 py-3.5 text-[13.5px] font-bold text-night transition-transform duration-300 group-hover:scale-[1.03]">
            <AppWindow size={15} /> অ্যাপ লঞ্চ
            <ArrowRight size={14} />
          </span>
        </Link>
      </section>

      {/* ======================= AD · STRIP ======================= */}
      <div className="mx-auto max-w-[1400px] px-4 pb-12 md:px-8">
        <AdSlot variant="strip" />
      </div>

                  {/* ======================= FOOTER ======================= */}
      <SiteFooter context="OPTION B HOME" />
    </main></HomeLiveProvider>
  );
}
