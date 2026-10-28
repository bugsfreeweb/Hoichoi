"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Timer } from "lucide-react";
import { useLive } from "@/components/live/LiveProvider";
import LiveMedia from "@/components/live/LiveMedia";
import Scoreboard from "@/components/live/Scoreboard";
import UpdatesFeed from "@/components/live/UpdatesFeed";
import { FollowButton, KeyPoints, LiveBadge, ReactionBar, ShareBar, SyncStatus, ViewerCount } from "@/components/live/Widgets";
import { bnTime, durationBn } from "@/lib/live-format";

function Elapsed({ from, to }: { from: string; to: string | null }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return <span>শুরু {bnTime(from)}</span>;
  const end = to ? new Date(to).getTime() : now;
  const ms = end - new Date(from).getTime();
  if (ms < 0) return <span>শুরু হবে {bnTime(from)}</span>;
  return (
    <span>
      শুরু {bnTime(from)} · {to ? "চলেছে" : "চলছে"} {durationBn(ms)}
    </span>
  );
}

export default function TimelineTemplate() {
  const { feed } = useLive();
  const ev = feed.event;
  const moments = feed.updates.filter((u) => u.kind === "key" || u.kind === "breaking").slice(0, 6);

  return (
    <section className="mx-auto max-w-site px-4 py-12 md:px-8 md:py-16">
      <div className="flex flex-wrap items-center gap-3">
        <LiveBadge status={ev.status} size="lg" label={ev.status === "live" ? "লাইভ ব্লগ" : undefined} />
        <span className="flex items-center gap-1.5 font-mono-x text-[10.5px] tracking-[0.12em] text-ink-soft uppercase">
          <Timer size={12} /> <Elapsed from={ev.startsAt} to={ev.endedAt} />
        </span>
        <ViewerCount className="text-[12px]" />
        <SyncStatus className="ml-auto" />
      </div>
      <h2 className="mt-4 max-w-5xl font-serif-bn text-[30px] leading-[1.2] font-black text-ink md:text-[44px]">{ev.title}</h2>

      {moments.length > 0 && (
        <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">
          <span className="shrink-0 self-center font-mono-x text-[9.5px] tracking-[0.22em] text-ink-soft uppercase">গুরুত্বপূর্ণ মুহূর্ত ▸</span>
          {moments.map((m) => (
            <a
              key={m.id}
              href={`#update-${m.id}`}
              className="group flex shrink-0 items-center gap-2 border border-ink/20 bg-paper px-3 py-1.5 text-[12.5px] font-bold text-ink transition-all hover:border-ink hover:bg-ink hover:text-paper"
            >
              <span className={m.kind === "breaking" ? "h-1.5 w-1.5 rounded-full bg-live" : "h-1.5 w-1.5 rounded-full bg-lime"} />
              <span className="font-mono-x text-[10px] font-medium text-ink-soft group-hover:text-paper/70">{bnTime(m.createdAt)}</span>
              <span className="max-w-[260px] truncate">{m.title}</span>
            </a>
          ))}
        </div>
      )}

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-12">
        <aside className="lg:sticky lg:top-14 lg:col-span-5">
          <div className="frame-press-red overflow-hidden bg-[#0a0c10]">
            <LiveMedia />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <ReactionBar />
          </div>
          <div className="mt-5 grid gap-5 border-t border-ink/12 pt-5">
            {ev.scoreboard ? <Scoreboard /> : null}
            <KeyPoints />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <FollowButton />
            <ShareBar label={false} />
          </div>
        </aside>

        <div className="lg:col-span-7">
          <UpdatesFeed variant="timeline" limit={5} title="ঘটনাপ্রবাহ" />
          <Link
            href={`/live/${ev.slug}`}
            className="group mt-6 inline-flex items-center gap-2 bg-ink px-5 py-3 text-[13px] font-bold text-paper transition-colors hover:bg-alizarin"
          >
            পুরো লাইভ ব্লগ, মন্তব্য ও প্রশ্নোত্তর <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
