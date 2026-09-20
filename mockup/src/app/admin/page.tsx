import Link from "next/link";
import {
  LayoutDashboard,
  ListOrdered,
  KeyRound,
  CalendarClock,
  ScrollText,
  Settings,
  Inbox,
  Newspaper,
  Fingerprint,
  Timer,
  Search,
  Bell,
  Lock,
  Play,
  Sparkles,
  GitBranch,
  Camera,
  ToggleRight,
  Database,
  Zap,
  CircleDot,
  AppWindow,
  ArrowUpRight,
} from "lucide-react";
import Countdown from "@/components/countdown";
import QueueTable from "@/components/admin/queue-table";
import KeyVault from "@/components/admin/key-vault";
import AdsPanel from "@/components/admin/ads-panel";
import { getArticles, getCommentStatusCounts, getRuns, getKeys, lite, toBn, bnTime, bnDate } from "@/lib/data";
import { ensureReady } from "@/lib/db-bootstrap";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await ensureReady();
  const [articles, runs, keys, commentCounts] = await Promise.all([
    getArticles(),
    getRuns(),
    getKeys(),
    getCommentStatusCounts(),
  ]);

  const lastRun = runs[0] ?? null;
  const published = articles.filter((a) => a.status === "published").length;
  const collectedToday = runs.reduce((s, r) => s + r.collected, 0);
  const dupToday = runs.reduce((s, r) => s + r.duplicates, 0);
  const avgDur = runs.length
    ? Math.round(runs.reduce((s, r) => s + r.durationSec, 0) / runs.length)
    : 0;
  const durText = `${toBn(Math.floor(avgDur / 60))} মি ${toBn(String(avgDur % 60).padStart(2, "0"))} সে`;

  const base = lastRun ? new Date(lastRun.startedAt).getTime() : Date.now();
  const nextSlots = [1, 2, 3].map((n) =>
    bnTime(new Date(base + n * 2 * 60 * 60 * 1000)),
  );

  const stats = [
    {
      label: "আজ সংগৃহীত",
      value: toBn(collectedToday),
      sub: `সর্বশেষ রানে +${toBn(lastRun?.collected ?? 0)}`,
      icon: Inbox,
      accent: "text-lime",
      bar: "bg-lime",
    },
    {
      label: "প্রকাশিত (লাইভ)",
      value: toBn(published),
      sub: "AI Agent → Web সিঙ্কড",
      icon: Newspaper,
      accent: "text-sky-300",
      bar: "bg-sky-400",
    },
    {
      label: "ডুপ্লিকেট ব্লকড",
      value: toBn(dupToday),
      sub: "SHA-256 + SimHash মিল",
      icon: Fingerprint,
      accent: "text-amberx",
      bar: "bg-amberx",
    },
    {
      label: "গড় রান সময়",
      value: durText,
      sub: "কালেক্ট → কমিট → ডিপ্লয়",
      icon: Timer,
      accent: "text-rose-300",
      bar: "bg-rose-400",
    },
  ];

  const NAV = [
    { icon: LayoutDashboard, label: "ড্যাশবোর্ড", active: true },
    { icon: ListOrdered, label: "কনটেন্ট সারি", active: false },
    { icon: KeyRound, label: "API ভল্ট", active: false },
    { icon: CalendarClock, label: "অটোমেশন", active: false },
    { icon: ScrollText, label: "রান লগ", active: false },
    { icon: Settings, label: "সেটিংস", active: false },
  ];

  return (
    <main className="bg-night-grid min-h-screen pb-16 text-[#e9e6da]">
      <div className="mx-auto flex max-w-[1500px] gap-6 px-4 pt-8 md:px-6">
        {/* ============ SIDEBAR ============ */}
        <aside className="sticky top-16 hidden h-[calc(100vh-6.5rem)] w-60 shrink-0 flex-col rounded-2xl border border-white/8 bg-panel/60 p-4 lg:flex">
          <div className="flex items-center gap-3 border-b border-white/8 px-2 pb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-alizarin font-serif-bn text-[17px] font-black text-white">
              হ
            </span>
            <div>
              <p className="text-[14px] leading-tight font-bold text-white">
                হৈচৈ কন্ট্রোল
              </p>
              <p className="font-mono-x text-[8.5px] tracking-[0.2em] text-white/35 uppercase">
                WEB TWIN · DESK IS PRIMARY
              </p>
            </div>
          </div>

          <nav className="mt-4 space-y-1">
            <Link href="/admin/comments" className="mb-3 flex items-center justify-between rounded-lg border border-lime/30 bg-lime/10 px-3 py-3 text-[13px] font-bold text-lime">মন্তব্য মডারেশন <span>↗</span></Link>
            {NAV.map((n) => (
              <button
                key={n.label}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[12.5px] font-medium transition-all duration-300 ${
                  n.active
                    ? "bg-white text-night"
                    : "text-white/55 hover:bg-white/8 hover:text-white"
                }`}
              >
                <n.icon size={14} strokeWidth={2} />
                {n.label}
                {n.active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-alizarin" />
                )}
              </button>
            ))}
          </nav>

          <Link
            href="/desk"
            className="mt-4 flex items-center gap-2 rounded-xl bg-lime px-3 py-2.5 text-[12px] font-bold text-night transition-all hover:brightness-110"
          >
            <AppWindow size={14} /> ডেস্কটপ অ্যাপ খুলুন
          </Link>
          <div className="mt-auto rounded-xl border border-white/8 bg-white/[0.04] p-4">
            <p className="flex items-center gap-2 text-[11px] font-semibold text-white/85">
              <Lock size={12} className="text-lime" /> ভল্ট সিলড
            </p>
            <p className="mt-2 font-mono-x text-[9px] leading-relaxed tracking-wide text-white/40">
              KEYS ENCRYPTED · AES-256 MASTER KEY DESKTOP ENV-এ · রিপোতে কখনো না
            </p>
          </div>
        </aside>

        {/* ============ MAIN ============ */}
        <section className="min-w-0 flex-1">
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
                <Search size={13} className="text-white/40" />
                <input
                  placeholder="সারি, রান বা কী খুঁজুন…"
                  className="w-52 bg-transparent text-[12px] text-white/85 outline-none placeholder:text-white/30"
                />
              </div>
              <button className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition-colors hover:text-white">
                <Bell size={15} />
                <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-alizarin" />
              </button>
              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] py-1.5 pr-4 pl-1.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-alizarin to-alizarin-deep font-serif-bn text-[12px] font-black text-white">
                  অ
                </span>
                <div className="leading-tight">
                  <p className="text-[11.5px] font-semibold text-white">অ্যাডমিন</p>
                  <p className="font-mono-x text-[8px] tracking-[0.16em] text-lime uppercase">
                    ● ONLINE
                  </p>
                </div>
              </div>
            </div>
          </header>

          <Link href="/admin/comments" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lime/25 bg-lime/[0.06] px-5 py-4 transition-colors hover:bg-lime/10"><div><p className="text-[15px] font-bold text-white">মন্তব্য মডারেশন</p><p className="mt-1 text-xs text-white/50">নতুন মন্তব্য যাচাই, অনুমোদন, প্রত্যাখ্যান ও স্প্যাম নিয়ন্ত্রণ — এক জায়গায়।</p></div><span className="text-sm font-semibold text-lime">রিভিউ সারি খুলুন →</span></Link>

          {/* stats */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="panel panel-hover rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-medium text-white/55">{s.label}</p>
                  <s.icon size={15} className={s.accent} strokeWidth={2} />
                </div>
                <p className="mt-3 font-serif-bn text-[30px] leading-none font-black text-white">
                  {s.value}
                </p>
                <div className="mt-3.5 flex items-center gap-2">
                  <span className={`h-1 w-6 rounded-full ${s.bar}`} />
                  <p className="font-mono-x text-[9.5px] tracking-wide text-white/40">
                    {s.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* sync + schedule + dedup */}
          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            {/* next sync */}
            <div className="panel panel-hover relative overflow-hidden rounded-2xl p-6">
              <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-lime/10 blur-2xl" />
              <p className="flex items-center gap-2 font-mono-x text-[9.5px] tracking-[0.24em] text-lime uppercase">
                <Zap size={11} /> পরবর্তী সিঙ্ক
              </p>
              <div className="mt-5">
                <Countdown
                  lastRunIso={lastRun?.startedAt?.toISOString() ?? null}
                  size={104}
                  dark
                />
              </div>
              <div className="mt-5 space-y-2 border-t border-white/8 pt-4 font-mono-x text-[10px] text-white/45">
                <div className="flex justify-between">
                  <span>LAST RUN</span>
                  <span className="text-white/80">
                    {lastRun ? bnTime(lastRun.startedAt) : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>RESULT</span>
                  <span className="text-lime">
                    {lastRun
                      ? `+${toBn(lastRun.published)} প্রকাশিত · ${toBn(lastRun.duplicates)} ডুপ্লিকেট ব্লক`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* schedule */}
            <div className="panel panel-hover rounded-2xl p-6">
              <p className="flex items-center gap-2 font-mono-x text-[9.5px] tracking-[0.24em] text-white/45 uppercase">
                <CalendarClock size={11} className="text-amberx" /> শিডিউল
              </p>
              <div className="mt-4 flex items-baseline justify-between">
                <code className="font-mono-x text-[22px] font-bold text-white">
                  ম্যানুয়াল
                </code>
                <span className="font-mono-x text-[9.5px] text-white/40">
                  ASIA/DHAKA
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {nextSlots.map((t, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono-x text-[10px] text-white/70"
                  >
                    পরের {toBn(i + 1)} · {t}
                  </span>
                ))}
              </div>
              <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-lime py-3 text-[12.5px] font-bold text-night transition-all duration-300 hover:brightness-110 active:scale-[0.99]">
                <Play size={13} />
                এখনই ম্যানুয়াল রান করুন
              </button>
              <div className="mt-4 space-y-2.5">
                {[
                  { icon: Camera, label: "স্ক্রিনশট আর্কাইভ", on: true },
                  { icon: Sparkles, label: "AI ফ্যাক্ট-গেট", on: true },
                  { icon: GitBranch, label: "অটো-কমিট ও ডিপ্লয়", on: true },
                ].map((t) => (
                  <div
                    key={t.label}
                    className="flex items-center justify-between text-[11.5px] text-white/60"
                  >
                    <span className="flex items-center gap-2">
                      <t.icon size={12} className="text-white/45" />
                      {t.label}
                    </span>
                    <ToggleRight size={18} className="text-lime" />
                  </div>
                ))}
              </div>
            </div>

            {/* dedup engine */}
            <div className="panel panel-hover rounded-2xl p-6">
              <p className="flex items-center gap-2 font-mono-x text-[9.5px] tracking-[0.24em] text-white/45 uppercase">
                <Database size={11} className="text-sky-300" /> ডুপ্লিকেট ইঞ্জিন
              </p>
              <div className="mt-5 space-y-4">
                {[
                  {
                    algo: "SHA-256 EXACT",
                    target: "টাইটেল + বডি ফিঙ্গারপ্রিন্ট",
                    hit: 96,
                    color: "bg-lime",
                  },
                  {
                    algo: "SIMHASH NEAR-DUP",
                    target: "cosine ≥ 0.87 হলে ব্লক",
                    hit: 88,
                    color: "bg-amberx",
                  },
                  {
                    algo: "pHash IMAGE",
                    target: "স্ক্রিনশট পারসেপচুয়াল মিল",
                    hit: 74,
                    color: "bg-sky-400",
                  },
                ].map((d) => (
                  <div key={d.algo}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono-x font-semibold text-white/80">
                        {d.algo}
                      </span>
                      <span className="font-mono-x text-[10px] text-white/40">
                        {toBn(d.hit)}% নির্ভুলতা
                      </span>
                    </div>
                    <p className="mt-1 text-[10.5px] text-white/40">{d.target}</p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
                      <div
                        className={`h-full rounded-full ${d.color}`}
                        style={{ width: `${d.hit}%` }}
                      />
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

          {/* queue */}
          <div className="mt-4">
            <QueueTable rows={articles.map(lite)} />
          </div>

          {/* moderation summary */}
          <div className="panel panel-hover mt-4 overflow-hidden rounded-2xl p-6">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-serif-bn text-[17px] font-bold text-white">মন্তব্য মডারেশন সারি</p>
              <Link
                href="/admin/comments"
                className="ml-auto flex items-center gap-2 rounded-lg bg-lime px-3.5 py-2 text-[11px] font-bold text-night transition-all hover:brightness-110"
              >
                মডারেশন খুলুন <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(
                [
                  ["অপেক্ষমাণ", commentCounts.pending, "text-amberx"],
                  ["অনুমোদিত", commentCounts.approved, "text-lime"],
                  ["প্রত্যাখ্যাত", commentCounts.rejected, "text-rose-300"],
                  ["স্প্যাম", commentCounts.spam, "text-white/50"],
                ] as const
              ).map(([label, value, color]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] text-white/45">{label}</p>
                  <p className={`mt-1 font-serif-bn text-[26px] leading-none font-black ${color}`}>
                    {toBn(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ads manager */}
          <div className="mt-4">
            <AdsPanel />
          </div>

          {/* vault */}
          <div className="mt-4">
            <KeyVault keys={keys} />
          </div>

          {/* runs log */}
          <div className="panel mt-4 overflow-hidden rounded-2xl">
            <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
              <ScrollText size={15} className="text-white/60" />
              <p className="font-serif-bn text-[17px] font-bold text-white">রান লগ</p>
              <span className="font-mono-x text-[10px] tracking-[0.2em] text-white/35 uppercase">
                AUTOMATION HISTORY · {bnDate(new Date())}
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
                  {runs.map((r) => (
                    <tr
                      key={r.id}
                      className="transition-colors duration-200 hover:bg-white/[0.03]"
                    >
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2.5 font-mono-x text-[11px] text-white/80">
                          <CircleDot
                            size={11}
                            className={
                              r.status === "success" ? "text-lime" : "text-amberx"
                            }
                          />
                          {bnTime(r.startedAt)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 font-mono-x text-[9px] tracking-[0.14em] uppercase ${
                            r.trigger === "cron"
                              ? "border-white/12 text-white/55"
                              : "border-amberx/50 text-amberx"
                          }`}
                        >
                          {r.trigger}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono-x text-[11.5px] text-white/80">
                        {toBn(r.collected)}
                      </td>
                      <td className="px-3 py-3 font-mono-x text-[11.5px] text-amberx">
                        {toBn(r.duplicates)}
                      </td>
                      <td className="px-3 py-3 font-mono-x text-[11.5px] text-lime">
                        {toBn(r.published)}
                      </td>
                      <td className="px-3 py-3 font-mono-x text-[10.5px] text-white/50">
                        {toBn(Math.floor(r.durationSec / 60))} মি{" "}
                        {toBn(String(r.durationSec % 60).padStart(2, "0"))} সে
                      </td>
                      <td className="max-w-[220px] truncate px-5 py-3 text-right text-[10.5px] text-white/45">
                        {r.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
