"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Eye } from "lucide-react";
import { useLive } from "@/components/live/LiveProvider";
import LiveMedia from "@/components/live/LiveMedia";
import Scoreboard from "@/components/live/Scoreboard";
import { LiveBadge, ReactionBar, ShareBar, TimeAgo, ViewerCount } from "@/components/live/Widgets";
import type { EventCard } from "@/lib/live-types";
import { bnCompact, bnDateTime, bnTime, clsx } from "@/lib/live-format";

function RotatingUpdate() {
  const { feed } = useLive();
  const items = feed.updates.slice(0, 5);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items.length]);
  const u = items[i % Math.max(1, items.length)];
  if (!u) return null;
  return (
    <div className="mt-3 flex items-start gap-3 border-l-2 border-alizarin pl-3">
      <div key={u.id} className="rise-in min-w-0">
        <p className="font-mono-x text-[10px] tracking-[0.1em] text-ink-soft">
          {bnTime(u.createdAt)} · <TimeAgo iso={u.createdAt} />
        </p>
        <p className="mt-0.5 line-clamp-2 text-[13.5px] leading-snug font-semibold text-ink">{u.title || u.body}</p>
      </div>
      <div className="ml-auto flex shrink-0 gap-1 pt-1">
        {items.map((x, idx) => (
          <span key={x.id} className={clsx("h-1 w-3 transition-colors", idx === i ? "bg-alizarin" : "bg-ink/15")} />
        ))}
      </div>
    </div>
  );
}

export default function CompactTemplate({ others = [] }: { others?: EventCard[] }) {
  const { feed } = useLive();
  const ev = feed.event;
  const more = others.filter((o) => o.id !== ev.id).slice(0, 4);

  return (
    <section className="mx-auto max-w-site px-4 pt-8 pb-4 md:px-8">
      <div className="frame-press grid overflow-hidden bg-card md:grid-cols-[minmax(0,400px)_1fr] xl:grid-cols-[minmax(0,420px)_1fr_220px]">
        <div className="bg-[#0a0c10]">
          <LiveMedia compact floating />
        </div>
        <div className="min-w-0 p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <LiveBadge status={ev.status} size="sm" />
            <span className="flex items-center gap-1.5 text-[11.5px] font-bold" style={{ color: ev.categoryColor }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: ev.categoryColor }} /> {ev.category}
            </span>
            <ViewerCount className="text-[11.5px]" />
          </div>
          <Link href={`/live/${ev.slug}`} className="group mt-2 block">
            <h2 className="link-sweep inline font-serif-bn text-[19px] leading-snug font-extrabold text-ink md:text-[22px]">{ev.title}</h2>
          </Link>
          <Scoreboard variant="mini" className="mt-2" />
          <RotatingUpdate />
        </div>
        <div className="flex flex-col justify-between gap-4 border-t border-ink/12 p-4 xl:border-t-0 xl:border-l">
          <Link href={`/live/${ev.slug}`} className="group flex items-center justify-center gap-2 bg-alizarin px-4 py-3 text-[13px] font-bold text-paper transition-colors hover:bg-alizarin-deep">
            {ev.status === "scheduled" ? "রিমাইন্ডার ও বিস্তারিত" : ev.status === "ended" ? "রিপ্লে দেখুন" : "লাইভ দেখুন"}
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <ReactionBar variant="minimal" />
          <ShareBar label={false} />
        </div>
      </div>

      {more.length > 0 && (
        <div className="mt-8">
          <p className="font-mono-x text-[10px] tracking-[0.26em] text-ink-soft uppercase">▚ আরও লাইভ ও আসন্ন</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {more.map((c) => (
              <Link key={c.id} href={`/live/${c.slug}`} className="group flex gap-3 border border-ink/15 bg-paper p-3 transition-colors hover:border-ink">
                <div className="relative h-16 w-24 shrink-0 overflow-hidden bg-[#0a0c10]">
                  {c.coverImage && <img src={c.coverImage} alt="" className="h-full w-full object-cover opacity-85 transition group-hover:scale-105" />}
                  <span className="absolute top-1 left-1">
                    <LiveBadge status={c.status} size="sm" label={c.status === "live" ? "LIVE" : c.status === "scheduled" ? "আসন্ন" : "রিপ্লে"} />
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 font-serif-bn text-[13.5px] leading-snug font-bold text-ink">{c.title}</p>
                  <p className="mt-1 flex items-center gap-1 font-mono-x text-[10px] text-ink-soft">
                    {c.status === "live" ? (
                      <>
                        <Eye size={10} /> {bnCompact(c.viewers)} দেখছেন
                      </>
                    ) : (
                      bnDateTime(c.startsAt)
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
