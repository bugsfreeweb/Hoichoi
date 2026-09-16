import Link from "next/link";
import { statsSnapshot, recentPipelineRuns, getAllComments, listPosts } from "@hoichoi/db";
import type { RecentPipelineRun } from "@hoichoi/db";
import Countdown from "@/components/admin/Countdown";
import ContentQueue from "@/components/admin/ContentQueue";

export const dynamic = "force-dynamic";

function toBn(v: number | string): string {
  return String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);
}

function bnTime(d: Date | string) {
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(typeof d === "string" ? new Date(d) : d);
}

function bnFull(d: Date | string) {
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(typeof d === "string" ? new Date(d) : d);
}

function runDuration(r: RecentPipelineRun): number | null {
  if (!r.finished_at) return null;
  return Math.max(0, Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000));
}

function durText(sec: number | null): string {
  if (sec === null || sec <= 0) return "—";
  return `${toBn(Math.floor(sec / 60))} মি ${toBn(String(sec % 60).padStart(2, "0"))} সে`;
}

function runStats(r: RecentPipelineRun) {
  const s = r.stats ?? {} as Record<string, unknown>;
  return {
    collected: Number(s.collected ?? s.scraped ?? 0),
    duplicates: Number(s.duplicatesBlocked ?? 0),
    published: Number(s.published ?? 0),
  };
}

export default async function AdminDashboardPage() {
  const [stats, runs, comments, posts] = await Promise.all([
    statsSnapshot(),
    recentPipelineRuns(10),
    getAllComments(),
    listPosts(300),
  ]);

  const lastRun = runs[0] ?? null;
  const avgDur = stats.avgRunDurationSec;
  const avgDurText = avgDur > 0
    ? `${Math.floor(avgDur / 60).toLocaleString("bn")} মি ${String(avgDur % 60).padStart(2, "0")} সে`
    : "—";

  const lastCollected = lastRun ? runStats(lastRun).collected : 0;

  const base = lastRun ? new Date(lastRun.started_at).getTime() : Date.now();
  const nextSlots = [1, 2, 3].map((n) =>
    bnTime(new Date(base + n * 2 * 60 * 60 * 1000)),
  );

  const modCounts = { pending: 0, approved: 0, blocked: 0 };
  comments.forEach((c) => { modCounts[c.status as keyof typeof modCounts]++; });

  const statTiles = [
    { label: "আজ সংগৃহীত", value: toBn(stats.collectedToday), sub: `সর্বশেষ রানে +${toBn(lastCollected)}`, icon: "📥", accent: "text-lime", bar: "bg-lime" },
    { label: "প্রকাশিত (লাইভ)", value: toBn(stats.published), sub: "AI Agent → Web সিঙ্কড", icon: "📰", accent: "text-sky-300", bar: "bg-sky-400" },
    { label: "ডুপ্লিকেট ব্লকড", value: toBn(stats.duplicatesBlocked), sub: "SHA-256 + SimHash মিল", icon: "🔍", accent: "text-amberx", bar: "bg-amberx" },
    { label: "গড় রান সময়", value: avgDurText, sub: "কালেক্ট → কমিট → ডিপ্লয়", icon: "⏱️", accent: "text-rose-300", bar: "bg-rose-400" },
  ];

  return (
    <section>
      {/* header */}
      <header className="flex flex-wrap items-center gap-4">
        <div>
          <p className="font-mono-x text-[9.5px] tracking-[0.26em] text-lime uppercase">
            COMMAND CENTER · LIVE
          </p>
          <h1 className="mt-1 font-serif-bn text-[26px] font-black text-white md:text-[32px]">
            ডেস্ক মনিটর
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 md:flex">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              placeholder="সারি, রান বা কী খুঁজুন…"
              className="w-52 bg-transparent text-[12px] text-white/85 outline-none placeholder:text-white/30"
            />
          </div>
          <button className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition-colors hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-alizarin" />
          </button>
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] py-1.5 pr-4 pl-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-alizarin to-alizarin-deep font-serif-bn text-[12px] font-black text-white">অ</span>
            <div className="leading-tight">
              <p className="text-[11.5px] font-semibold text-white">অ্যাডমিন</p>
              <p className="font-mono-x text-[8px] tracking-[0.16em] text-lime uppercase">● ONLINE</p>
            </div>
          </div>
        </div>
      </header>

      {/* moderation banner */}
      <Link href="/admin/moderation" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lime/25 bg-lime/[0.06] px-5 py-4 transition-colors hover:bg-lime/10">
        <div>
          <p className="text-[15px] font-bold text-white">মন্তব্য মডারেশন</p>
          <p className="mt-1 text-xs text-white/50">নতুন মন্তব্য যাচাই, অনুমোদন, প্রত্যাখ্যাত ও ব্লক — এক জায়গায়।</p>
        </div>
        <span className="text-sm font-semibold text-lime">রিভিউ সারি খুলুন →</span>
      </Link>

      {/* stat cards */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statTiles.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/8 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium text-white/55">{s.label}</p>
              <span className="text-[15px]">{s.icon}</span>
            </div>
            <p className="mt-3 font-serif-bn text-[30px] leading-none font-black text-white">{s.value}</p>
            <div className="mt-3.5 flex items-center gap-2">
              <span className={`h-1 w-6 rounded-full ${s.bar}`} />
              <p className="font-mono-x text-[9.5px] tracking-wide text-white/40">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* sync + schedule + dedup */}
      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        {/* next sync */}
        <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04] p-6">
          <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-lime/10 blur-2xl" />
          <p className="flex items-center gap-2 font-mono-x text-[9.5px] tracking-[0.24em] text-lime uppercase">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            পরবর্তী সিঙ্ক
          </p>
          <div className="mt-5">
            <Countdown lastRunIso={lastRun?.started_at ?? null} size={104} />
          </div>
          <div className="mt-5 space-y-2 border-t border-white/8 pt-4 font-mono-x text-[10px] text-white/45">
            <div className="flex justify-between">
              <span>LAST RUN</span>
              <span className="text-white/80">{lastRun ? bnTime(lastRun.started_at) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>RESULT</span>
              <span className="text-lime">
                {lastRun
                  ? `+${toBn(runStats(lastRun).published)} প্রকাশিত · ${toBn(runStats(lastRun).duplicates)} ডুপ্লিকেট ব্লক`
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* schedule */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-6">
          <p className="flex items-center gap-2 font-mono-x text-[9.5px] tracking-[0.24em] text-white/45 uppercase">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amberx"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
            শিডিউল
          </p>
          <div className="mt-4 flex items-baseline justify-between">
            <code className="font-mono-x text-[22px] font-bold text-white">ম্যানুয়াল</code>
            <span className="font-mono-x text-[9.5px] text-white/40">ASIA/DHAKA</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {nextSlots.map((t, i) => (
              <span key={i} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono-x text-[10px] text-white/70">
                পরের {toBn(i + 1)} · {t}
              </span>
            ))}
          </div>
          <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-lime py-3 text-[12.5px] font-bold text-night transition-all duration-300 hover:brightness-110 active:scale-[0.99]">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
            এখনই ম্যানুয়াল রান করুন
          </button>
          <div className="mt-4 space-y-2.5">
            {[
              { label: "স্ক্রিনশট আর্কাইভ", on: true },
              { label: "AI ফ্যাক্ট-গেট", on: true },
              { label: "অটো-কমিট ও ডিপ্লয়", on: true },
            ].map((t) => (
              <div key={t.label} className="flex items-center justify-between text-[11.5px] text-white/60">
                <span>{t.label}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lime"><rect width="20" height="12" x="2" y="6" rx="6" ry="6"/><path d="M16 8h.01"/></svg>
              </div>
            ))}
          </div>
        </div>

        {/* dedup engine */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-6">
          <p className="flex items-center gap-2 font-mono-x text-[9.5px] tracking-[0.24em] text-white/45 uppercase">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-300"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
            ডুপ্লিকেট ইঞ্জিন
          </p>
          <div className="mt-5 space-y-4">
            {[
              { algo: "SHA-256 EXACT", target: "টাইটেল + বডি ফিঙ্গারপ্রিন্ট", hit: 96, color: "bg-lime" },
              { algo: "SIMHASH NEAR-DUP", target: "cosine ≥ 0.87 হলে ব্লক", hit: 88, color: "bg-amberx" },
              { algo: "pHash IMAGE", target: "স্ক্রিনশট পারসেপচুয়াল মিল", hit: 74, color: "bg-sky-400" },
            ].map((d) => (
              <div key={d.algo}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono-x font-semibold text-white/80">{d.algo}</span>
                  <span className="font-mono-x text-[10px] text-white/40">{toBn(d.hit)}% নির্ভুলতা</span>
                </div>
                <p className="mt-1 text-[10.5px] text-white/40">{d.target}</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
                  <div className={`h-full rounded-full ${d.color}`} style={{ width: `${d.hit}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 border-t border-white/8 pt-4 text-[10.5px] leading-relaxed text-white/40">
            প্রতিটি ইনকামিং আইটেম আগে Postgres ইনডেক্সে যাচাই হয় — মিল পেলে
            সরাসরি <span className="text-rose-300">duplicate</span> হিসেবে
            ট্যাগ হয়, পুনর্লিখনের খরচ বাঁচে।
          </p>
        </div>
      </div>

      {/* content queue */}
      <div className="mt-4">
        <ContentQueue rows={posts} />
      </div>

      {/* moderation summary */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-panel p-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-serif-bn text-[17px] font-bold text-white">মন্তব্য মডারেশন সারি</p>
          <Link
            href="/admin/moderation"
            className="ml-auto flex items-center gap-2 rounded-lg bg-lime px-3.5 py-2 text-[11px] font-bold text-night transition-all hover:brightness-110"
          >
            মডারেশন খুলুন
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {([
            ["অপেক্ষমান", modCounts.pending, "text-amberx"],
            ["অনুমোদিত", modCounts.approved, "text-lime"],
            ["প্রত্যাখ্যাত", modCounts.blocked, "text-rose-300"],
          ] as const).map(([label, value, color]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] text-white/45">{label}</p>
              <p className={`mt-1 font-serif-bn text-[26px] leading-none font-black ${color}`}>
                {toBn(value)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* runs log */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-panel">
        <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
          <p className="font-serif-bn text-[17px] font-bold text-white">রান লগ</p>
          <span className="font-mono-x text-[10px] tracking-[0.2em] text-white/35 uppercase">
            AUTOMATION HISTORY · {bnFull(new Date().toISOString())}
          </span>
        </div>
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="font-mono-x text-[9.5px] tracking-[0.18em] text-white/35 uppercase">
                <th className="px-5 py-3 font-medium">রান</th>
                <th className="px-3 py-3 font-medium">ট্রিগার</th>
                <th className="px-3 py-3 font-medium">সংগৃহীত</th>
                <th className="px-3 py-3 font-medium">ডুপ্লিকেট</th>
                <th className="px-3 py-3 font-medium">প্রকাশিত</th>
                <th className="px-3 py-3 font-medium">সময়</th>
                <th className="px-5 py-3 text-right font-medium">নোট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {runs.map((r) => {
                const s = runStats(r);
                const dur = runDuration(r);
                return (
                  <tr key={r.id} className="transition-colors duration-200 hover:bg-white/[0.03]">
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2.5 font-mono-x text-[11px] text-white/80">
                        <span className={`h-2.5 w-2.5 rounded-full ${r.status === "completed" ? "bg-lime" : "bg-amberx"}`} />
                        {bnTime(r.started_at)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full border border-white/12 px-2.5 py-0.5 font-mono-x text-[9px] tracking-[0.14em] text-white/55 uppercase">
                        {r.provider_used ?? "auto"}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono-x text-[11.5px] text-white/80">{toBn(s.collected)}</td>
                    <td className="px-3 py-3 font-mono-x text-[11.5px] text-amberx">{toBn(s.duplicates)}</td>
                    <td className="px-3 py-3 font-mono-x text-[11.5px] text-lime">{toBn(s.published)}</td>
                    <td className="px-3 py-3 font-mono-x text-[10.5px] text-white/50">
                      {dur !== null ? durText(dur) : "চলছে…"}
                    </td>
                    <td className="max-w-[220px] truncate px-5 py-3 text-right text-[10.5px] text-white/45">
                      {r.error ?? "✓"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {runs.length === 0 && (
            <p className="p-6 text-center text-[12.5px] text-white/40">এখনো কোনো রান রেকর্ড নেই।</p>
          )}
        </div>
      </div>
    </section>
  );
}