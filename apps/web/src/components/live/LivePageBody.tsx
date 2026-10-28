"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Eye, MapPin, Tv } from "lucide-react";
import { useLive } from "./LiveProvider";
import LiveMedia, { useSources } from "./LiveMedia";
import Scoreboard from "./Scoreboard";
import UpdatesFeed from "./UpdatesFeed";
import { EngageTabs } from "./Conversation";
import { FollowButton, KeyPoints, LiveBadge, ReactionBar, ShareBar, StatStrip, SyncStatus, ViewerCount } from "./Widgets";
import type { EventCard } from "@/lib/live-types";
import { bnCompact, bnDate, bnTime, clsx, streamLabel } from "@/lib/live-format";

export default function LivePageBody({ others }: { others: EventCard[] }) {
  const { feed } = useLive();
  const ev = feed.event;
  const sources = useSources();
  const [channel, setChannel] = useState(0);
  const more = others.filter((o) => o.id !== ev.id).slice(0, 4);

  return (
    <>
      <section className="bg-night-grid relative overflow-hidden border-b border-ink/10">
        <div className="pointer-events-none absolute -right-40 -bottom-40 h-[420px] w-[420px] rounded-full bg-alizarin/15 blur-[110px]" />
        <div className="relative mx-auto max-w-site px-4 py-8 md:px-8 md:py-10">
          <nav className="flex items-center gap-1.5 font-mono-x text-[10px] tracking-[0.18em] text-ink-soft uppercase">
            <Link href="/" className="hover:text-alizarin">হোম</Link>
            <ChevronRight size={11} />
            <Link href="/live" className="hover:text-alizarin">লাইভ কেন্দ্র</Link>
            <ChevronRight size={11} />
            <span style={{ color: ev.categoryColor }}>{ev.category}</span>
          </nav>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <LiveBadge status={ev.status} size="lg" />
            <span className="rounded-full border border-ink/15 bg-ink/[0.04] px-3 py-1 font-mono-x text-[10px] tracking-[0.18em] text-ink/60 uppercase">{ev.kicker}</span>
            <span className="flex items-center gap-1 text-[12px] text-ink-soft">
              <MapPin size={12} /> {ev.location}
            </span>
            <ViewerCount className="text-[12.5px]" />
            <SyncStatus className="md:ml-auto" />
          </div>
          <h1 className="mt-5 max-w-5xl font-serif-bn text-[30px] leading-[1.22] font-black text-ink md:text-[48px]">{ev.title}</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-ink-soft">{ev.summary}</p>
          <p className="mt-4 font-mono-x text-[10.5px] tracking-[0.12em] text-ink-soft uppercase">
            {bnDate(ev.startsAt)} · শুরু {bnTime(ev.startsAt)} · হৈচৈ লাইভ ডেস্ক
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-site gap-10 px-4 py-10 md:px-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <div className="frame-press overflow-hidden bg-[#0a0c10]">
            <LiveMedia key={channel} sourceIndex={channel} floating autoplay={ev.status === "live" || channel > 0} />
          </div>

          {sources.length > 1 && ev.status !== "scheduled" && (
            <div className="no-scrollbar mt-4 flex items-center gap-2 overflow-x-auto">
              <span className="shrink-0 font-mono-x text-[9.5px] tracking-[0.2em] text-ink-soft uppercase">সম্প্রচার ▸</span>
              {sources.map((s, i) => (
                <button
                  key={`${s.url}-${i}`}
                  type="button"
                  onClick={() => setChannel(i)}
                  className={clsx(
                    "flex shrink-0 items-center gap-1.5 border px-3 py-1.5 text-[12px] font-bold transition-colors",
                    channel === i ? "border-ink bg-ink text-paper" : "border-ink/20 text-ink hover:border-ink",
                  )}
                >
                  <Tv size={12} /> {s.label} <span className="font-mono-x text-[9px] font-normal opacity-60">{streamLabel(s.type)}</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <ReactionBar />
            <div className="flex flex-wrap items-center gap-3">
              <ShareBar />
              <FollowButton />
            </div>
          </div>

          <div className="mt-8 border-y border-ink/12 py-5">
            <StatStrip />
          </div>

          {ev.keyPoints.length > 0 && (
            <div className="frame-press-sm mt-8 bg-card p-5 md:p-6">
              <KeyPoints title="এক নজরে — যা জানা জরুরি" />
            </div>
          )}

          <div className="mt-10">
            <UpdatesFeed variant="timeline" title="লাইভ আপডেট" limit={12} />
          </div>
        </div>

        <aside className="lg:col-span-4">
          <div className="space-y-6 lg:sticky lg:top-14">
            {ev.scoreboard && (
              <div className="card-paper p-4 md:p-5">
                <Scoreboard />
              </div>
            )}
            <div id="engage" className="card-paper scroll-mt-16 p-4 md:p-5">
              <EngageTabs height={380} />
            </div>
            {more.length > 0 && (
              <div className="border-t-2 border-ink pt-4">
                <p className="font-serif-bn text-[16px] font-extrabold">আরও লাইভ</p>
                <ul className="mt-2 divide-y divide-ink/12">
                  {more.map((c) => (
                    <li key={c.id}>
                      <Link href={`/live/${c.slug}`} className="group flex items-start gap-3 py-3">
                        <span className={clsx("mt-1.5 h-2 w-2 shrink-0 rounded-full", c.status === "live" ? "bg-live" : c.status === "scheduled" ? "bg-[#ffb454]" : "bg-ink/30")} />
                        <span className="min-w-0">
                          <span className="link-sweep inline font-serif-bn text-[14px] leading-snug font-bold">{c.title}</span>
                          <span className="mt-1 flex items-center gap-1 font-mono-x text-[10px] text-ink-soft">
                            {c.status === "live" ? (
                              <>
                                <Eye size={10} /> {bnCompact(c.viewers)} দেখছেন
                              </>
                            ) : c.status === "scheduled" ? (
                              `শুরু ${bnTime(c.startsAt)}`
                            ) : (
                              "রিপ্লে আছে"
                            )}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
