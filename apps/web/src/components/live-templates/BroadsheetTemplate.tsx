"use client";

import Link from "next/link";
import { ArrowRight, Clock3, Radio } from "lucide-react";
import { useLive } from "@/components/live/LiveProvider";
import LiveMedia, { useSources } from "@/components/live/LiveMedia";
import Scoreboard from "@/components/live/Scoreboard";
import UpdatesFeed from "@/components/live/UpdatesFeed";
import { FollowButton, KeyPoints, LiveBadge, PollCard, ReactionBar, TimeAgo, ViewerCount } from "@/components/live/Widgets";
import { bnDate, bnTime, streamLabel } from "@/lib/live-format";

export default function BroadsheetTemplate() {
  const { feed } = useLive();
  const ev = feed.event;
  const sources = useSources();
  const topComment = [...feed.comments].filter((c) => c.status === "approved").sort((a, b) => b.likes - a.likes)[0];
  const latest = feed.updates[0];

  return (
    <section className="mx-auto max-w-site px-4 py-12 md:px-8 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">▚ LIVE COVERAGE · সরাসরি সম্প্রচার</p>
          <h2 className="mt-2 font-serif-bn text-[34px] font-black text-ink md:text-[44px]">
            লাইভ: {ev.kicker.replace("লাইভ", "").trim() || ev.category}
          </h2>
        </div>
        <span className="font-mono-x text-[10px] tracking-[0.2em] text-ink-soft uppercase">
          {bnDate(ev.startsAt)} · {latest ? `UPDATED ${bnTime(latest.createdAt)}` : "AWAITING"}
        </span>
      </div>
      <div className="mt-4 border-t-2 border-ink" />
      <div className="mt-[3px] border-t border-ink/40" />

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="frame-press overflow-hidden bg-[#0a0c10]">
            <LiveMedia floating />
          </div>
          <p className="mt-3 flex items-center justify-between text-[10.5px] text-ink-soft/80">
            <span>ভিডিও: {ev.location || "হৈচৈ লাইভ ডেস্ক"} · সরাসরি</span>
            <span className="font-mono-x tracking-wide uppercase">STREAM · {streamLabel(sources[0]?.type ?? "youtube")}</span>
          </p>
        </div>

        <div className="lg:col-span-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 text-[11.5px] font-bold text-white" style={{ background: ev.categoryColor }}>
              <Radio size={12} /> {ev.category}
            </span>
            <LiveBadge status={ev.status} size="sm" />
            <ViewerCount className="text-[12px]" />
          </div>
          <Link href={`/live/${ev.slug}`} className="group mt-4 block">
            <h3 className="link-sweep inline font-serif-bn text-[26px] leading-[1.32] font-extrabold text-ink md:text-[31px]">{ev.title}</h3>
          </Link>
          <p className="mt-4 text-[14.5px] leading-relaxed text-ink-soft">{ev.summary}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link href={`/live/${ev.slug}`} className="group flex items-center gap-2 bg-ink px-5 py-3 text-[13px] font-bold text-paper transition-colors duration-300 hover:bg-alizarin">
              লাইভ পাতায় পড়ুন <ArrowRight size={14} />
            </Link>
            <FollowButton />
            {latest && (
              <span className="flex items-center gap-1.5 text-[11.5px] text-ink-soft">
                <Clock3 size={12} /> <TimeAgo iso={latest.createdAt} />
              </span>
            )}
          </div>

          <div className="mt-8 border-t-2 border-ink pt-4">
            <p className="font-serif-bn text-[16px] font-extrabold">সর্বশেষ আপডেট</p>
            <UpdatesFeed variant="numbered" limit={4} filters={false} />
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-8 border-t border-ink/15 pt-8 md:grid-cols-3 md:divide-x md:divide-ink/12">
        <div className="md:pr-8">
          {ev.scoreboard ? <Scoreboard /> : <KeyPoints />}
        </div>
        <div className="md:px-8">
          {feed.poll ? <PollCard /> : <KeyPoints />}
        </div>
        <div className="md:pl-8">
          <p className="font-mono-x text-[9.5px] tracking-[0.22em] text-alizarin uppercase">▚ পাঠকের মত</p>
          {topComment ? (
            <blockquote className="mt-3">
              <p className="font-serif-bn text-[18px] leading-relaxed font-bold text-ink">“{topComment.body}”</p>
              <footer className="mt-2 text-[12px] text-ink-soft">— {topComment.name} · {topComment.likes} জন সহমত</footer>
            </blockquote>
          ) : (
            <p className="mt-3 text-[13px] text-ink-soft">লাইভ পাতায় প্রথম মন্তব্যটি করুন।</p>
          )}
          <ReactionBar variant="minimal" className="mt-5" />
        </div>
      </div>
    </section>
  );
}
