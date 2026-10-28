"use client";

import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { useLive } from "@/components/live/LiveProvider";
import LiveMedia from "@/components/live/LiveMedia";
import Scoreboard, { useScoreboard } from "@/components/live/Scoreboard";
import UpdatesFeed from "@/components/live/UpdatesFeed";
import { FollowButton, LiveBadge, ReactionBar, ShareBar, StatStrip, SyncStatus, ViewerCount, KeyPoints } from "@/components/live/Widgets";

export default function StageTemplate() {
  const { feed } = useLive();
  const ev = feed.event;
  const sb = useScoreboard();

  return (
    <section className="bg-night-grid relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="drift absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full bg-alizarin/20 blur-[110px]" />
        <div className="drift absolute -top-32 right-[-10%] h-[460px] w-[460px] rounded-full bg-lime/12 blur-[120px]" style={{ animationDelay: "-6s" }} />
      </div>

      <div className="relative mx-auto grid max-w-site gap-8 px-4 py-10 md:px-8 lg:grid-cols-12 lg:py-14">
        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-center gap-2">
            <LiveBadge status={ev.status} />
            <span className="flex items-center gap-2 rounded-full border border-lime/40 bg-lime/10 px-3 py-1 font-mono-x text-[10px] tracking-[0.2em] text-lime uppercase">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: ev.categoryColor }} />
              {ev.kicker}
            </span>
            <span className="hidden items-center gap-1.5 rounded-full border border-ink/12 bg-ink/[0.04] px-3 py-1 font-mono-x text-[9.5px] tracking-[0.14em] text-ink/55 uppercase sm:flex">
              <MapPin size={10} /> {ev.location}
            </span>
            <ViewerCount className="ml-auto text-[12px]" />
          </div>

          <h2 className="headline-grad mt-5 -ml-1 pb-1 font-serif-bn text-[30px] leading-[1.18] font-black tracking-tight md:text-[46px]">
            {ev.title}
          </h2>
          <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-ink/60">{ev.summary}</p>

          <div className="frame-press mt-6 overflow-hidden bg-[#0a0c10]">
            <LiveMedia floating />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <ReactionBar />
            <div className="flex flex-wrap items-center gap-3">
              <ShareBar />
              <FollowButton />
            </div>
          </div>
        </div>

        <aside className="lg:col-span-4">
          <div className="tauri-win p-4 md:p-5 lg:sticky lg:top-14">
            {sb ? <Scoreboard /> : <KeyPoints />}
            <div className="my-4 border-t border-ink/10" />
            <div className="flex items-center justify-between">
              <p className="font-mono-x text-[9.5px] tracking-[0.22em] text-ink-soft uppercase">সর্বশেষ · লাইভ ডেস্ক</p>
              <SyncStatus />
            </div>
            <UpdatesFeed variant="compact" limit={6} filters={false} className="mt-1 max-h-[300px] overflow-y-auto scroll-thin" />
            <Link
              href={`/live/${ev.slug}`}
              className="group mt-4 flex items-center justify-center gap-2 bg-alizarin px-5 py-3 text-[13.5px] font-bold text-paper transition-colors hover:bg-alizarin-deep"
            >
              পুরো লাইভ কভারেজ
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </aside>
      </div>

      <div className="relative border-t border-ink/8">
        <div className="mx-auto flex max-w-site flex-wrap items-center justify-between gap-5 px-4 py-4 md:px-8">
          <StatStrip className="w-full max-w-3xl" />
          <p className="font-mono-x text-[9.5px] tracking-[0.24em] text-ink/35 uppercase">VIDEO → DATA → DESK → READER</p>
        </div>
      </div>
    </section>
  );
}
