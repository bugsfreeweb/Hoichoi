"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus, ExternalLink, X } from "lucide-react";
import type { StreamSource } from "@/lib/live-types";
import VideoPlayer from "./VideoPlayer";
import { useLive } from "./LiveProvider";
import { Countdown, LiveBadge } from "./Widgets";
import { bnDateTime, clsx } from "@/lib/live-format";

export function useSources(): StreamSource[] {
  const { feed } = useLive();
  const event = feed.event;
  const primary = event.streamUrl
    ? [{ label: "মূল সম্প্রচার", type: event.streamType, url: event.streamUrl }]
    : [];
  return [...primary, ...event.streams].filter((source) => source.url);
}

function calendarLink(title: string, startIso: string, location: string) {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + 2 * 3600_000);
  const fmt = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    location,
    details: "হৈচৈ লাইভ — সরাসরি সম্প্রচার",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function LiveMedia({
  sourceIndex = 0,
  autoplay = false,
  floating = false,
  compact = false,
  showBadge = true,
  className,
}: {
  sourceIndex?: number;
  autoplay?: boolean;
  floating?: boolean;
  compact?: boolean;
  showBadge?: boolean;
  className?: string;
}) {
  const { feed, play } = useLive();
  const event = feed.event;
  const sources = useSources();
  const source = sources[sourceIndex] ?? null;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(autoplay);
  const [outOfView, setOutOfView] = useState(false);
  const [closedFloat, setClosedFloat] = useState(false);
  const allowFloat = floating && feed.floatingPlayer;

  useEffect(() => {
    if (!allowFloat || !wrapRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setOutOfView(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0.15 },
    );
    observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [allowFloat, event.status]);

  const isFloating = allowFloat && playing && outOfView && !closedFloat;
  if (event.status === "scheduled") {
    return (
      <div className={clsx("relative aspect-video w-full overflow-hidden bg-[#0a0c10] text-[#f3eee1]", className)}>
        {event.coverImage && <img src={event.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-[#0a0c10]/60 to-[#0a0c10]/20" />
        <div className="relative flex h-full flex-col justify-between p-4 md:p-7">
          <div className="flex items-center justify-between">
            <LiveBadge status="scheduled" />
            <span className="font-mono-x text-[9.5px] tracking-[0.2em] text-white/60 uppercase">{bnDateTime(event.startsAt)}</span>
          </div>
          <div>
            <p className="font-mono-x text-[10px] tracking-[0.24em] text-[#ffb454] uppercase">সম্প্রচার শুরু হতে বাকি</p>
            <div className="mt-3"><Countdown target={event.startsAt} compact={compact} /></div>
            {!compact && (
              <a
                href={calendarLink(event.title, event.startsAt, event.location)}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 border border-white/25 px-4 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-white hover:text-[#0a0c10]"
              >
                <CalendarPlus size={14} /> ক্যালেন্ডারে রিমাইন্ডার যোগ করুন
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!source) {
    return (
      <div className={clsx("relative flex aspect-video w-full items-center justify-center bg-[#0a0c10] px-5 text-center text-white/65", className)}>
        <p className="font-mono-x text-[10px] tracking-[0.18em] uppercase">
          {event.status === "ended" ? "রিপ্লে লিংক যোগ করা হয়নি" : "সম্প্রচার লিংক যোগ করা হয়নি"}
        </p>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={clsx("relative aspect-video w-full bg-[#0a0c10]", className)}>
      <div className={clsx(isFloating ? "mini-player aspect-video bg-black" : "absolute inset-0")}>
        <VideoPlayer
          key={`${source.type}-${source.url}`}
          type={source.type}
          url={source.url}
          title={event.title}
          poster={event.coverImage}
          autoplay={autoplay}
          live={event.status === "live"}
          compact={compact}
          onPlay={() => play(source.label)}
          onActiveChange={setPlaying}
        />
        {showBadge && <div className="pointer-events-none absolute top-3 left-3"><LiveBadge status={event.status} size={isFloating ? "sm" : "md"} /></div>}
        {!compact && !isFloating && /^https?:\/\//.test(source.url) && (
          <div className="absolute top-3 right-3">
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              title="সম্প্রচারের মূল লিংক খুলুন"
              aria-label="সম্প্রচারের মূল লিংক খুলুন"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-white hover:bg-[#d2202c]"
            >
              <ExternalLink size={12} />
            </a>
          </div>
        )}
        {isFloating && (
          <button
            type="button"
            aria-label="মিনি প্লেয়ার বন্ধ করুন"
            onClick={() => setClosedFloat(true)}
            className="absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0c10] text-white shadow-lg ring-1 ring-white/20 hover:bg-[#d2202c]"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {isFloating && <div className="absolute inset-0 flex items-center justify-center bg-stripes text-center"><p className="font-mono-x text-[10px] tracking-[0.2em] text-white/50 uppercase">মিনি প্লেয়ারে চলছে ↘</p></div>}
    </div>
  );
}
