"use client";

import Link from "next/link";
import { ArrowUpRight, Activity } from "lucide-react";
import { useLive } from "@/components/live/LiveProvider";
import LiveMedia from "@/components/live/LiveMedia";
import { useScoreboard } from "@/components/live/Scoreboard";
import UpdatesFeed from "@/components/live/UpdatesFeed";
import { KeyPoints, LiveBadge, PollCard, ReactionBar, ShareBar, StatStrip, SyncStatus, ViewerCount } from "@/components/live/Widgets";
import { bn, bnNum, bnPercent, clsx } from "@/lib/live-format";

function BigBoard() {
  const sb = useScoreboard();
  const { feed } = useLive();
  if (!sb) {
    return (
      <div className="card-paper p-6">
        <KeyPoints title="মূল তথ্য" />
      </div>
    );
  }
  const total = sb.items.reduce((s, i) => s + i.value, 0);

  if (sb.kind === "match") {
    const [a, b] = sb.items;
    if (!a || !b) {
      return <div className="card-paper p-6"><KeyPoints title="মূল তথ্য" /></div>;
    }
    return (
      <div className="card-paper relative overflow-hidden p-5 md:p-7">
        <p className="font-mono-x text-[10px] tracking-[0.22em] text-lime uppercase">{sb.title}</p>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {[a, b].filter(Boolean).map((team, idx) => (
            <div key={team.label} className={clsx(idx === 1 ? "order-3 text-right" : "order-1")}>
              <p className="font-serif-bn text-[18px] font-bold text-ink md:text-[22px]">{team.label}</p>
              <p className="mt-1 font-display text-[52px] leading-none font-bold tabular md:text-[84px]" style={{ color: team.color }}>
                {team.display ?? bn(team.value)}
              </p>
              <p className="mt-1 font-mono-x text-[11px] text-ink-soft">{team.sub}</p>
            </div>
          ))}
          <span className="order-2 font-mono-x text-[12px] tracking-[0.3em] text-ink-soft">VS</span>
        </div>
        {sb.note && <p className="mt-5 border-t border-line pt-4 font-serif-bn text-[17px] font-bold text-alizarin">{sb.note}</p>}
        {typeof sb.progress === "number" && (
          <div className="mt-3 h-1.5 bg-ink/10">
            <div className="h-full bg-lime" style={{ width: `${sb.progress}%` }} />
          </div>
        )}
        {sb.meta && (
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {sb.meta.map((m) => (
              <div key={m.label} className="border-l border-ink/12 pl-3">
                <p className="font-display text-[20px] font-bold text-ink tabular">{m.value}</p>
                <p className="mt-0.5 font-mono-x text-[9px] tracking-[0.14em] text-ink-soft uppercase">{m.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (sb.kind === "election") {
    const sorted = [...sb.items].sort((x, y) => y.value - x.value);
    return (
      <div className="card-paper p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono-x text-[10px] tracking-[0.22em] text-lime uppercase">{sb.title}</p>
          {sb.note && <p className="text-[12px] text-ink-soft">{sb.note}</p>}
        </div>
        <div className="mt-4 flex h-4 w-full overflow-hidden">
          {sorted.map((i) => (
            <span key={i.label} title={i.label} className="h-full transition-[width] duration-700" style={{ width: `${(i.value / Math.max(1, total)) * 100}%`, background: i.color }} />
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {sorted.map((i, idx) => (
            <div key={i.label} className={clsx("relative border p-4", idx === 0 ? "border-ink bg-paper" : "border-line")}>
              <span className="absolute inset-x-0 top-0 h-1" style={{ background: i.color }} />
              <p className="text-[12px] text-ink-soft">{i.label.split("·")[0]?.trim() ?? i.label}</p>
              <p className="font-serif-bn text-[14px] font-bold text-ink">{i.label.split("·")[1]?.trim()}</p>
              <p className="mt-2 font-display text-[30px] leading-none font-bold tabular text-ink">{bnNum(i.value)}</p>
              <p className="mt-1 font-mono-x text-[11px] text-ink-soft">{bnPercent(i.value, total, 1)} ভোট</p>
              {idx === 0 && <span className="absolute top-3 right-3 bg-lime px-1.5 py-0.5 font-mono-x text-[9px] font-bold text-paper">এগিয়ে</span>}
            </div>
          ))}
        </div>
        {typeof sb.progress === "number" && (
          <div className="mt-5">
            <div className="flex justify-between font-mono-x text-[10px] tracking-[0.14em] text-ink-soft uppercase">
              <span>কেন্দ্রের ফল ঘোষিত</span>
              <span>{bn(sb.progress)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 bg-ink/10">
              <div className="h-full bg-ink" style={{ width: `${sb.progress}%` }} />
            </div>
          </div>
        )}
        {sb.meta && (
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {sb.meta.map((m) => (
              <div key={m.label} className="border-l border-ink/12 pl-3">
                <p className="font-display text-[18px] font-bold text-ink tabular">{m.value}</p>
                <p className="mt-0.5 font-mono-x text-[9px] tracking-[0.14em] text-ink-soft uppercase">{m.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {sb.items.map((i) => (
          <div key={i.label} className="relative overflow-hidden rounded-[10px] border border-line bg-gradient-to-br from-card to-paper-deep/60 p-5 transition-colors hover:border-lime">
            <p className="flex items-center justify-between text-[12.5px] text-ink-soft">
              {i.label}
              <Activity size={14} style={{ color: i.color }} />
            </p>
            <p className="mt-3 font-display text-[34px] leading-none font-bold tabular text-ink">{i.display ?? bnNum(i.value)}</p>
            <p className="mt-2 text-[12px] text-ink-soft">{i.sub}</p>
            <span className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: i.color }} />
          </div>
        ))}
      </div>
      {sb.meta && (
        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 rounded-[10px] border border-line bg-card px-5 py-3">
          {sb.meta.map((m) => (
            <p key={m.label} className="text-[12.5px] text-ink-soft">
              {m.label}: <b className="text-ink">{m.value}</b>
            </p>
          ))}
        </div>
      )}
      {feed.event.status === "live" && sb.note && <p className="mt-2 text-[11px] text-ink-soft">{sb.note}</p>}
    </div>
  );
}

export default function ScoreboardTemplate() {
  const { feed, connected } = useLive();
  const ev = feed.event;
  return (
    <section className="border-y border-line bg-[#f6f1e3] dark:bg-panel">
      <div className="mx-auto max-w-site px-4 py-12 md:px-8 md:py-14">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 font-mono-x text-[10.5px] tracking-[0.26em] text-lime uppercase">
              <span className="h-px w-6 bg-lime" /> THE LIVE DESK, IN NUMBERS
            </p>
            <h2 className="mt-3 font-serif-bn text-[28px] leading-tight font-black text-ink md:text-[40px]">
              {ev.title.split(":")[0]}। <span className="text-lime">দেখুন সংখ্যায়।</span>
            </h2>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="flex items-center gap-2 rounded-full border border-lime/30 bg-lime/10 px-3 py-1 font-mono-x text-[10px] tracking-[0.2em] text-lime uppercase">
              <i className={clsx("h-1.5 w-1.5 rounded-full", connected ? "bg-lime" : "bg-alizarin")} /> {connected ? "CONNECTED" : "RECONNECTING"}
            </span>
            <SyncStatus />
          </div>
        </header>

        <div className="mt-8">
          <BigBoard />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-12">
          <article className="rounded-[10px] border border-line bg-card p-4 lg:col-span-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-serif-bn text-[15px] font-bold text-ink">সরাসরি ভিডিও</h3>
              <LiveBadge status={ev.status} size="sm" />
            </div>
            <div className="overflow-hidden rounded-md">
              <LiveMedia showBadge={false} floating />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <ViewerCount className="text-[12px]" />
              <ShareBar label={false} />
            </div>
            <ReactionBar variant="minimal" className="mt-2" />
          </article>
          <article className="rounded-[10px] border border-line bg-card p-4 lg:col-span-4">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-serif-bn text-[15px] font-bold text-ink">সর্বশেষ প্রকাশনা</h3>
              <span className="rounded-full border border-lime/30 bg-lime/10 px-2 py-0.5 font-mono-x text-[9px] tracking-[0.16em] text-lime">ACTIVITY</span>
            </div>
            <UpdatesFeed variant="compact" limit={7} filters={false} className="max-h-[330px] overflow-y-auto scroll-thin" />
          </article>
          <article className="rounded-[10px] border border-line bg-card p-4 lg:col-span-3">
            {feed.poll ? <PollCard /> : <KeyPoints />}
            <Link href={`/live/${ev.slug}`} className="mt-5 flex items-center justify-between border-t border-line pt-3 text-[13px] font-bold text-lime hover:underline">
              পুরো ডেটা ও লাইভ পাতা <ArrowUpRight size={14} />
            </Link>
          </article>
        </div>
        <StatStrip className="mt-8" />
      </div>
    </section>
  );
}
