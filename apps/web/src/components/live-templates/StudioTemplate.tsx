"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Tv } from "lucide-react";
import { useLive } from "@/components/live/LiveProvider";
import LiveMedia, { useSources } from "@/components/live/LiveMedia";
import Scoreboard from "@/components/live/Scoreboard";
import { EngageTabs } from "@/components/live/Conversation";
import { LiveBadge, ReactionBar, ShareBar, ViewerCount } from "@/components/live/Widgets";
import { bn, clsx, streamLabel, TZ } from "@/lib/live-format";

function StudioClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const text = now
    ? bn(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now))
    : "--:--:--";
  return <span className="font-display text-[15px] font-bold tabular text-white">{text}</span>;
}

export default function StudioTemplate() {
  const { feed } = useLive();
  const ev = feed.event;
  const sources = useSources();
  const [channel, setChannel] = useState(0);
  const [switched, setSwitched] = useState(false);
  const headlines = feed.updates.slice(0, 6).map((u) => u.title || u.body.slice(0, 80));
  const loop = [...headlines, ...headlines];

  return (
    <section className="theme-night surface-night relative overflow-hidden text-ink">
      <div className="pointer-events-none absolute -top-40 left-1/3 h-[420px] w-[620px] rounded-full bg-[#d2202c]/15 blur-[120px]" />
      <div className="relative mx-auto max-w-site px-4 py-8 md:px-8 md:py-10">
        {/* channel bar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d2202c] font-serif-bn text-[15px] font-black text-white">হ</span>
            <div>
              <p className="font-serif-bn text-[17px] leading-none font-black text-white">
                হৈচৈ টিভি<span className="text-[#fa8b9b]">।</span>
              </p>
              <p className="mt-1 font-mono-x text-[9px] tracking-[0.24em] text-white/45 uppercase">LIVE STUDIO · {ev.category}</p>
            </div>
          </div>
          <div className="no-scrollbar ml-0 flex items-center gap-1 overflow-x-auto md:ml-6">
            {sources.map((s, i) => (
              <button
                key={`${s.url}-${i}`}
                type="button"
                onClick={() => {
                  setChannel(i);
                  setSwitched(true);
                }}
                className={clsx(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  channel === i ? "bg-white text-[#0a0c10]" : "text-white/60 ring-1 ring-white/15 hover:bg-white/10 hover:text-white",
                )}
              >
                <Tv size={12} /> {s.label}
                <span className="font-mono-x text-[8.5px] opacity-60">{streamLabel(s.type)}</span>
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-4">
            <ViewerCount tone="light" className="text-[12px]" />
            <StudioClock />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="relative overflow-hidden ring-1 ring-white/10">
              <LiveMedia key={channel} sourceIndex={channel} autoplay={switched} floating />
            </div>
            {/* lower third */}
            <div className="flex items-stretch overflow-hidden">
              <div className="flex shrink-0 items-center gap-2 bg-[#d2202c] px-4 py-2.5 text-white">
                <span className="eq-bar" />
                <span className="eq-bar" style={{ animationDelay: "-0.3s" }} />
                <span className="font-serif-bn text-[13px] font-black">{ev.status === "live" ? "সরাসরি" : "হাইলাইট"}</span>
              </div>
              <div className="relative flex flex-1 items-center overflow-hidden bg-white text-[#0a0c10]">
                <div className="marquee">
                  {loop.map((h, i) => (
                    <span key={i} className="flex items-center gap-3 px-5 text-[13px] font-semibold whitespace-nowrap">
                      <span className="h-1 w-1 rotate-45 bg-[#d2202c]" /> {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <h2 className="mt-5 font-serif-bn text-[24px] leading-snug font-black text-white md:text-[30px]">{ev.title}</h2>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <ReactionBar variant="dark" />
              <div className="flex items-center gap-3">
                <ShareBar tone="light" label={false} />
                <Link href={`/live/${ev.slug}`} className="flex items-center gap-1.5 bg-[#c8f65d] px-4 py-2 text-[12.5px] font-bold text-[#0a0c10] hover:bg-white">
                  লাইভ পাতা <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          </div>

          <aside className="flex flex-col rounded-xl border border-white/10 bg-[#0f131a] p-4 lg:col-span-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-mono-x text-[10px] tracking-[0.22em] text-white/50 uppercase">লাইভ চ্যাট</p>
              <LiveBadge status={ev.status} size="sm" />
            </div>
            <EngageTabs tone="dark" chatVariant="chat" height={330} />
          </aside>
        </div>

        {ev.scoreboard && (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <Scoreboard variant="band" tone="dark" />
          </div>
        )}
      </div>
    </section>
  );
}
