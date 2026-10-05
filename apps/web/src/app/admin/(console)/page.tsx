import Link from "next/link";
import {
  countReviewQueues,
  listCategories,
  listContentQueue,
  radarSnapshot,
  recentPipelineRuns,
  runHistoryByDay,
  statsSnapshot,
  type ContentQueueTab,
} from "@hoichoi/db";
import type { RecentPipelineRun } from "@hoichoi/db";
import Countdown from "@/components/admin/Countdown";
import ContentQueue from "@/components/admin/ContentQueue";
import { CategoryFunnel, RunTrendChart } from "@/components/admin/DashboardCharts";
import { ManualRun } from "@/components/admin/ManualRun";

export const dynamic = "force-dynamic";

const QUEUE_PAGE_SIZE = 20;
const TREND_DAYS = 14;

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

function bnDay(d: Date | string) {
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "long",
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
    emptyText: Number(s.emptyText ?? 0),
  };
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string; q?: string }>;
}) {
  const { page: pageParam, tab: tabParam, q: qParam } = await searchParams;
  const tab: ContentQueueTab =
    tabParam === "published" || tabParam === "pending" ? tabParam : "all";
  const q = (qParam ?? "").trim();

  const [stats, runs, queues, trend, radar, queue, cats] = await Promise.all([
    statsSnapshot(),
    recentPipelineRuns(10),
    countReviewQueues(),
    runHistoryByDay(TREND_DAYS),
    radarSnapshot(),
    listContentQueue({ tab, q, page: Number(pageParam ?? 1), pageSize: QUEUE_PAGE_SIZE }),
    listCategories(),
  ]);

  const lastRun = runs[0] ?? null;
  const avgDur = stats.avgRunDurationSec;
  const avgDurText = avgDur > 0
    ? `${Math.floor(avgDur / 60).toLocaleString("bn")} মি ${String(avgDur % 60).padStart(2, "0")} সে`
    : "—";
  const lastStats = lastRun ? runStats(lastRun) : null;

  const base = lastRun ? new Date(lastRun.started_at).getTime() : Date.now();
  const nextSlots = [1, 2, 3].map((n) => bnTime(new Date(base + n * 2 * 60 * 60 * 1000)));

  // Tab counters come from the same counts the queue pages use, so the dashboard
  // and the list it links to can never disagree about how much work is waiting.
  const tabCounts = {
    all: queues.pending_review + queues.approved + queues.published + queues.removed,
    published: queues.published,
    pending: queues.pending_review + queues.approved + queues.removed,
  };

  const totals = radar.totals;
  const funnel = [
    { label: "প্রকাশিত", value: totals.published, color: "var(--chart-published)", href: "/admin/posts" },
    { label: "সারিতে", value: totals.queued, color: "var(--chart-collected)", href: "/admin/moderation" },
    { label: "ডুপ্লিকেট ব্লকড", value: totals.duplicate, color: "var(--chart-duplicates)", href: null },
  ] as const;

  const attention = [
    { label: "অনুমোদনের অপেক্ষায়", value: queues.pending_review, href: "/admin/moderation", color: "text-amberx" },
    { label: "দ্বিতীয় অনুমোদনের অপেক্ষায়", value: queues.approved, href: "/admin/moderation", color: "text-lime" },
    { label: "সরানোর অনুরোধ", value: queues.open_removals, href: "/admin/removals", color: "text-alizarin" },
    { label: "রিডার রিপোর্ট", value: queues.open_reports, href: "/admin/reports", color: "text-alizarin" },
    { label: "নতুন সাবমিশন", value: queues.new_submissions, href: "/admin/submissions", color: "text-amberx" },
  ].filter((a) => a.value > 0);
  const attentionTotal = attention.reduce((n, a) => n + a.value, 0);

  const statTiles = [
    {
      label: "আজ সংগৃহীত",
      value: toBn(stats.collectedToday),
      sub: lastStats ? `সর্বশেষ রানে +${toBn(lastStats.collected)}` : "এখনো কোনো রান নেই",
      bar: "bg-lime",
    },
    {
      label: "প্রকাশিত (লাইভ)",
      value: toBn(stats.published),
      sub: "AI Agent → Web সিঙ্কড",
      bar: "bg-sky-400",
    },
    {
      label: "ডুপ্লিকেট ব্লকড",
      value: toBn(stats.duplicatesBlocked),
      sub: `ডেডপ্লাইফাইল · ${toBn(stats.dedupRate)}% মিল`,
      bar: "bg-amberx",
    },
    {
      label: "গড় রান সময়",
      value: avgDurText,
      sub: "কালেক্ট → কমিট → ডিপ্লয়",
      bar: "bg-rose-400",
    },
  ];

  return (
    <section>
      <header className="flex flex-wrap items-center gap-4">
        <div>
          <p className="font-mono-x text-[9.5px] tracking-[0.26em] text-lime uppercase">
            COMMAND CENTER
          </p>
          <h1 className="mt-1 font-serif-bn text-[26px] font-black text-white md:text-[32px]">
            ডেস্ক মনিটর
          </h1>
          <p className="mt-1 text-[12px] text-white/50">{bnDay(new Date())}</p>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          {lastRun && (
            <Link
              href="/admin/logs"
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[11.5px] font-semibold text-white/70 transition-colors hover:border-white/30 hover:text-white"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  lastRun.status === "completed"
                    ? "bg-lime"
                    : lastRun.status === "running"
                      ? "bg-amberx"
                      : "bg-alizarin"
                }`}
              />
              সর্বশেষ রান {bnTime(lastRun.started_at)}
            </Link>
          )}
        </div>
      </header>

      {/* Work waiting on an operator. This replaces a single moderation banner that
          only ever pointed at one queue, so the other four were invisible. */}
      {attention.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-amberx/25 bg-amberx/[0.06] p-5">
          <div className="flex flex-wrap items-baseline gap-3">
            <p className="font-serif-bn text-[16px] font-bold text-white">
              অপেক্ষমাকারী কাজ
            </p>
            <p className="font-mono-x text-[10px] tracking-[0.2em] text-amberx uppercase">
              {toBn(attentionTotal)} ITEMS · {toBn(attention.length)} QUEUES
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {attention.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[12px] font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white"
              >
                <span className={`font-mono-x text-[15px] font-black ${a.color}`}>
                  {toBn(a.value)}
                </span>
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-lime/25 bg-lime/[0.06] px-5 py-4">
          <p className="text-[13.5px] font-semibold text-white">
            কোনো কিউ আটকে নেই — সব হিসাব শেষ।
          </p>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statTiles.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/8 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium text-white/55">{s.label}</p>
            </div>
            <p className="mt-3 font-serif-bn text-[30px] leading-none font-black text-white">{s.value}</p>
            <div className="mt-3.5 flex items-center gap-2">
              <span className={`h-1 w-6 rounded-full ${s.bar}`} />
              <p className="font-mono-x text-[9.5px] tracking-wide text-white/40">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <RunTrendChart series={trend} />
        <CategoryFunnel radar={radar} />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04] p-6">
          <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-lime/10 blur-2xl" />
          <p className="flex items-center gap-2 font-mono-x text-[9.5px] tracking-[0.24em] text-lime uppercase">
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
              <span>DURATION</span>
              <span className="text-white/80">{lastRun ? durText(runDuration(lastRun)) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>RESULT</span>
              <span className={lastRun?.status === "completed" ? "text-lime" : "text-amberx"}>
                {lastRun
                  ? `+${toBn(lastStats?.published ?? 0)} প্রকাশিত · ${toBn(lastStats?.duplicates ?? 0)} ব্লক`
                  : "—"}
              </span>
            </div>
            {lastRun && lastStats && lastStats.emptyText > 0 && (
              <div className="flex justify-between">
                <span>EMPTY TEXT</span>
                <span className="text-white/70">
                  {toBn(lastStats.emptyText)} · পুনর্লেখন এড়ানো
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-6">
          <p className="flex items-center gap-2 font-mono-x text-[9.5px] tracking-[0.24em] text-white/45 uppercase">
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
          <ManualRun initialRuns={runs} />
          <p className="mt-4 border-t border-white/8 pt-4 text-[10.5px] leading-relaxed text-white/40">
            পাইপলাইন GitHub Actions থেকে চালু হয়। উপরের বাটনে ট্রিগার টোকেন সেট থাকলে
            এখান থেকেই রান শুরু করা যায়; না থাকলে Actions থেকে নিজে চালাতে হবে।
          </p>
        </div>

        {/* Real funnel conversion. This panel used to render three hardcoded
            accuracy figures (96% / 88% / 74%) for dedup algorithms that are not
            measured, which looked like telemetry but was invented. */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-6">
          <p className="flex items-center gap-2 font-mono-x text-[9.5px] tracking-[0.24em] text-white/45 uppercase">
            কনভার্সন
          </p>
          <div className="mt-5">
            <p className="text-[11px] text-white/45">মোট সংগৃহীত</p>
            <p className="mt-1 font-serif-bn text-[30px] leading-none font-black text-white">
              {toBn(totals.collected)}
            </p>
          </div>
          <div className="mt-5 space-y-3">
            {funnel.map((f) => (
              <div key={f.label}>
                <div className="flex items-center justify-between text-[11.5px]">
                  {f.href ? (
                    <Link href={f.href} className="text-white/70 hover:text-white">
                      {f.label}
                    </Link>
                  ) : (
                    <span className="text-white/70">{f.label}</span>
                  )}
                  <span className="font-mono-x text-[10.5px] text-white/50">
                    {toBn(f.value)} · {toBn(pct(f.value, totals.collected))}%
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct(f.value, totals.collected)}%`, background: f.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 border-t border-white/8 pt-4 text-[10.5px] leading-relaxed text-white/40">
            ডুপ্লিকেট আগে SHA-256 ও pHash দিয়ে ধরা পড়ে, তাই নতুন লেখা তৈরির খরচ বাঁচে —
            এই অংশে যা ব্লক হয় তার সংখ্যাই উপরে।
          </p>
        </div>
      </div>

      <div className="mt-4">
        <ContentQueue
          rows={queue.rows}
          cats={cats}
          tab={tab}
          q={q}
          counts={tabCounts}
          total={queue.total}
          page={queue.page}
          pageSize={queue.pageSize}
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-panel p-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-serif-bn text-[17px] font-bold text-white">মডারেশন সারি</p>
          <Link
            href="/admin/moderation"
            className="ml-auto flex items-center gap-2 rounded-lg bg-lime px-3.5 py-2 text-[11px] font-bold text-night transition-all hover:brightness-110"
          >
            মডারেশন খুলুন
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(
            [
              ["অপেক্ষমান", queues.pending_review, "text-amberx"],
              ["অনুমোদিত", queues.approved, "text-white"],
              ["প্রকাশিত", queues.published, "text-lime"],
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

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-panel">
        <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
          <p className="font-serif-bn text-[17px] font-bold text-white">রান লগ</p>
          <span className="font-mono-x text-[10px] tracking-[0.2em] text-white/35 uppercase">
            AUTOMATION HISTORY
          </span>
          <Link href="/admin/logs" className="ml-auto text-[11px] font-semibold text-lime hover:underline">
            সব লগ →
          </Link>
        </div>
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="font-mono-x text-[9.5px] tracking-[0.18em] text-white/35 uppercase">
                <th className="px-5 py-3 font-medium">রান</th>
                <th className="px-3 py-3 font-medium">অবস্থা</th>
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
                    <td className="px-5 py-3 font-mono-x text-[11px] text-white/80">
                      {bnTime(r.started_at)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-mono-x text-[9px] tracking-[0.14em] uppercase ${
                          r.status === "completed"
                            ? "bg-lime/15 text-lime"
                            : r.status === "running"
                              ? "bg-amberx/15 text-amberx"
                              : "bg-alizarin/15 text-alizarin"
                        }`}
                      >
                        {r.status}
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
