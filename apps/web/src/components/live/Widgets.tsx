"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Check, Copy, Eye, MessageCircle, Share2, Wifi, WifiOff } from "lucide-react";
import { FacebookIcon as Facebook, XBrandIcon as Twitter } from "./BrandIcons";
import { useLive } from "./LiveProvider";
import { copyText } from "@/lib/live-client";
import { REACTIONS, type EventStatus } from "@/lib/live-types";
import { bn, bnCompact, bnNum, bnPercent, bnTime, clsx, countdownParts, timeAgo } from "@/lib/live-format";

/* ------------------------------------------------------------------ */
export function LiveBadge({ status, size = "md", label }: { status: EventStatus; size?: "sm" | "md" | "lg"; label?: string }) {
  const pad = size === "sm" ? "px-2 py-0.5 text-[9px]" : size === "lg" ? "px-3.5 py-1.5 text-[11.5px]" : "px-2.5 py-1 text-[10px]";
  if (status === "live") {
    return (
      <span className={clsx("inline-flex items-center gap-1.5 bg-live font-mono-x font-bold tracking-[0.18em] text-white uppercase", pad)}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-80" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
        </span>
        {label ?? "LIVE · সরাসরি"}
      </span>
    );
  }
  if (status === "scheduled") {
    return <span className={clsx("inline-flex items-center gap-1.5 bg-[#ffb454] font-mono-x font-bold tracking-[0.18em] text-[#1a140d] uppercase", pad)}>{label ?? "আসন্ন"}</span>;
  }
  return <span className={clsx("inline-flex items-center gap-1.5 bg-[#1a140d] font-mono-x font-bold tracking-[0.18em] text-[#f3eee1] uppercase ring-1 ring-white/20", pad)}>{label ?? "শেষ · রিপ্লে"}</span>;
}

/* ------------------------------------------------------------------ */
export function TimeAgo({ iso, className }: { iso: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <time dateTime={iso} className={className} title={bnTime(iso)}>
      {now === null ? bnTime(iso) : timeAgo(iso, now)}
    </time>
  );
}

/* ------------------------------------------------------------------ */
export function ViewerCount({ className, label = "জন দেখছেন", tone = "default" }: { className?: string; label?: string; tone?: "default" | "light" }) {
  const { feed } = useLive();
  if (!feed.event.showViewerCount || feed.event.status !== "live") return null;
  return (
    <span className={clsx("inline-flex items-center gap-1.5 tabular", tone === "light" ? "text-white/80" : "text-ink-soft", className)}>
      <Eye size={13} />
      <b className={clsx("font-bold", tone === "light" ? "text-white" : "text-ink")}>{bnCompact(feed.viewers)}</b> {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
export function Countdown({ target, compact = false }: { target: string; compact?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const p = countdownParts(target, now ?? new Date(target).getTime() - 1);
  const cells: [number, string][] = [
    [p.days, "দিন"],
    [p.hours, "ঘণ্টা"],
    [p.minutes, "মিনিট"],
    [p.seconds, "সেকেন্ড"],
  ];
  if (now !== null && p.done) {
    return <p className="font-serif-bn text-[18px] font-bold">সম্প্রচার যেকোনো মুহূর্তে শুরু হবে…</p>;
  }
  return (
    <div className="flex items-stretch gap-2">
      {cells.map(([v, l]) => (
        <div key={l} className={clsx("flex flex-col items-center border border-white/20 bg-white/5 backdrop-blur-sm", compact ? "min-w-12 px-2 py-1.5" : "min-w-16 px-3 py-2.5 md:min-w-20")}>
          <span className={clsx("font-display font-bold tabular leading-none", compact ? "text-[20px]" : "text-[30px] md:text-[40px]")}>
            {now === null ? "—" : bn(String(v).padStart(2, "0"))}
          </span>
          <span className="mt-1 font-mono-x text-[9px] tracking-[0.18em] text-white/55 uppercase">{l}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function ReactionBar({
  variant = "pill",
  className,
}: {
  variant?: "pill" | "stack" | "minimal" | "dark";
  className?: string;
}) {
  const { feed, react, bursts } = useLive();
  if (!feed.event.reactionsEnabled) return null;
  const total = Object.values(feed.reactions).reduce((s, n) => s + n, 0);
  return (
    <div className={clsx("relative", className)}>
      <div className="pointer-events-none absolute inset-x-0 bottom-full h-0">
        {bursts.map((b) => (
          <span key={b.id} className="reaction-float" style={{ left: `calc(50% + ${b.dx}px)`, ["--dx" as string]: `${b.dx / 3}px` }}>
            {b.emoji}
          </span>
        ))}
      </div>
      <div
        className={clsx(
          "flex flex-wrap items-center",
          variant === "stack" ? "gap-1.5" : "gap-1",
          variant === "dark" && "rounded-full border border-white/10 bg-white/5 p-1",
          variant === "pill" && "rounded-full border border-ink/15 bg-card p-1",
        )}
      >
        {REACTIONS.map((r) => (
          <button
            key={r.kind}
            type="button"
            title={r.label}
            aria-label={`${r.label} — ${bnNum(feed.reactions[r.kind] ?? 0)}`}
            onClick={() => react(r.kind)}
            className={clsx(
              "group flex items-center gap-1 transition active:scale-90",
              variant === "stack"
                ? "flex-col border border-ink/15 bg-card px-3 py-2 hover:-translate-y-0.5 hover:border-ink"
                : "rounded-full px-2.5 py-1 hover:bg-ink/5",
              variant === "dark" && "hover:bg-white/10",
            )}
          >
            <span className="text-[18px] leading-none transition-transform group-hover:scale-125">{r.emoji}</span>
            {variant !== "minimal" && (
              <span className={clsx("font-mono-x text-[10.5px] font-semibold tabular", variant === "dark" ? "text-white/70" : "text-ink-soft")}>
                {bnCompact(feed.reactions[r.kind] ?? 0)}
              </span>
            )}
          </button>
        ))}
        {variant === "pill" && (
          <span className="ml-1 hidden pr-3 font-mono-x text-[10px] tracking-[0.14em] text-ink-soft uppercase sm:inline">
            মোট {bnCompact(total)}
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function ShareBar({ className, tone = "default", label = true }: { className?: string; tone?: "default" | "light"; label?: boolean }) {
  const { feed, share, notify } = useLive();
  const [copied, setCopied] = useState(false);
  const [canNative, setCanNative] = useState(false);
  useEffect(() => setCanNative(typeof navigator !== "undefined" && "share" in navigator), []);

  const url = () => `${window.location.origin}/live/${feed.event.slug}`;
  const open = (network: string, href: string) => {
    share(network);
    window.open(href, "_blank", "noopener,noreferrer,width=640,height=560");
  };
  const btn = clsx(
    "flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
    tone === "light" ? "border-white/20 text-white/80 hover:bg-white hover:text-[#0a0c10]" : "border-ink/20 text-ink-soft hover:border-ink hover:bg-ink hover:text-paper",
  );
  return (
    <div className={clsx("flex items-center gap-1.5", className)}>
      {label && <span className={clsx("mr-1 font-mono-x text-[9.5px] tracking-[0.2em] uppercase", tone === "light" ? "text-white/50" : "text-ink-soft")}>শেয়ার</span>}
      <button type="button" aria-label="ফেসবুকে শেয়ার" className={btn} onClick={() => open("facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`)}>
        <Facebook size={14} />
      </button>
      <button type="button" aria-label="হোয়াটসঅ্যাপে শেয়ার" className={btn} onClick={() => open("whatsapp", `https://wa.me/?text=${encodeURIComponent(`${feed.event.title} ${url()}`)}`)}>
        <MessageCircle size={14} />
      </button>
      <button type="button" aria-label="এক্সে শেয়ার" className={btn} onClick={() => open("x", `https://twitter.com/intent/tweet?text=${encodeURIComponent(feed.event.title)}&url=${encodeURIComponent(url())}`)}>
        <Twitter size={14} />
      </button>
      <button
        type="button"
        aria-label="লিংক কপি করুন"
        className={btn}
        onClick={async () => {
          const success = await copyText(url());
          if (success) {
            setCopied(true);
            share("copy");
            notify("লাইভ পাতার লিংক কপি হয়েছে");
            setTimeout(() => setCopied(false), 1800);
          } else {
            notify("এই ব্রাউজারে কপি বন্ধ আছে। অ্যাড্রেস বারের লিংকটি কপি করুন।", true);
          }
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      {canNative && (
        <button
          type="button"
          aria-label="আরও অপশন"
          className={btn}
          onClick={async () => {
            try {
              await navigator.share({ title: feed.event.title, url: url() });
              share("native");
            } catch {
              /* cancelled */
            }
          }}
        >
          <Share2 size={14} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function PollCard({ className, tone = "default" }: { className?: string; tone?: "default" | "dark" }) {
  const { feed, vote } = useLive();
  const [error, setError] = useState<string | null>(null);
  const poll = feed.poll;
  if (!poll || !feed.event.pollsEnabled) return null;
  const showResults = Boolean(poll.myVote) || poll.status === "closed";
  const leader = Math.max(...poll.options.map((o) => o.votes));
  const dark = tone === "dark";

  return (
    <div className={clsx(className)}>
      <div className="flex items-center justify-between gap-2">
        <p className={clsx("font-mono-x text-[9.5px] tracking-[0.22em] uppercase", dark ? "text-[#c8f65d]" : "text-alizarin")}>
          ▚ {poll.status === "open" ? "লাইভ পোল" : "পোল · বন্ধ"}
        </p>
        <span className={clsx("font-mono-x text-[10px] tabular", dark ? "text-white/50" : "text-ink-soft")}>{bnNum(poll.total)} ভোট</span>
      </div>
      <p className={clsx("mt-2 font-serif-bn text-[16px] leading-snug font-bold", dark ? "text-white" : "text-ink")}>{poll.question}</p>
      <div className="mt-3 space-y-2">
        {poll.options.map((o) => {
          const pct = poll.total ? (o.votes / poll.total) * 100 : 0;
          const mine = poll.myVote === o.id;
          if (!showResults) {
            return (
              <button
                key={o.id}
                type="button"
                onClick={async () => {
                  setError(null);
                  const r = await vote(poll.id, o.id);
                  if (r.error) setError(r.error);
                }}
                className={clsx(
                  "flex w-full items-center justify-between border px-3.5 py-2.5 text-left text-[13.5px] font-semibold transition",
                  dark ? "border-white/15 text-white hover:border-white hover:bg-white hover:text-[#0a0c10]" : "border-ink/20 bg-card text-ink hover:border-ink hover:bg-ink hover:text-paper",
                )}
              >
                {o.label}
                <span className="font-mono-x text-[10px] opacity-60">ভোট দিন →</span>
              </button>
            );
          }
          return (
            <div key={o.id} className={clsx("relative overflow-hidden border px-3.5 py-2.5", dark ? "border-white/10" : "border-ink/15 bg-card")}>
              <div
                className={clsx("absolute inset-y-0 left-0 transition-[width] duration-700", o.votes === leader ? (dark ? "bg-[#c8f65d]/25" : "bg-lime/20") : dark ? "bg-white/10" : "bg-ink/[0.07]")}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between gap-3 text-[13.5px]">
                <span className={clsx("font-semibold", dark ? "text-white" : "text-ink")}>
                  {o.label} {mine && <span className={clsx("ml-1 font-mono-x text-[9.5px]", dark ? "text-[#c8f65d]" : "text-lime")}>✓ আপনার ভোট</span>}
                </span>
                <span className={clsx("font-mono-x text-[12px] font-bold tabular", dark ? "text-white" : "text-ink")}>{bnPercent(o.votes, poll.total)}</span>
              </div>
            </div>
          );
        })}
      </div>
      {error && <p className="mt-2 text-[12px] text-alizarin">{error}</p>}
      {!showResults && <p className={clsx("mt-2 text-[11.5px]", dark ? "text-white/45" : "text-ink-soft")}>ভোট দিলেই ফলাফল দেখতে পাবেন</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function KeyPoints({ className, title = "এক নজরে", tone = "default" }: { className?: string; title?: string; tone?: "default" | "dark" }) {
  const { feed } = useLive();
  if (!feed.event.keyPoints.length) return null;
  const dark = tone === "dark";
  return (
    <div className={className}>
      <p className={clsx("font-serif-bn text-[16px] font-extrabold", dark ? "text-white" : "text-ink")}>{title}</p>
      <ul className="mt-3 space-y-2.5">
        {feed.event.keyPoints.map((p, i) => (
          <li key={i} className={clsx("flex gap-3 text-[13.5px] leading-relaxed", dark ? "text-white/80" : "text-ink/85")}>
            <span className={clsx("mt-2 h-1.5 w-1.5 shrink-0 rotate-45", dark ? "bg-[#c8f65d]" : "bg-alizarin")} />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function FollowButton({ className, tone = "default" }: { className?: string; tone?: "default" | "light" }) {
  const { follow, toggleFollow } = useLive();
  return (
    <button
      type="button"
      onClick={() => void toggleFollow()}
      className={clsx(
        "inline-flex items-center gap-2 border px-3.5 py-2 text-[12.5px] font-bold transition-colors",
        follow
          ? "border-lime bg-lime text-paper"
          : tone === "light"
            ? "border-white/25 text-white hover:bg-white hover:text-[#0a0c10]"
            : "border-ink/25 text-ink hover:border-ink hover:bg-ink hover:text-paper",
        className,
      )}
    >
      {follow ? <BellRing size={14} /> : <Bell size={14} />}
      {follow ? "ফলো করছেন" : "আপডেট ফলো করুন"}
    </button>
  );
}

/* ------------------------------------------------------------------ */
export function SyncStatus({ className, tone = "default" }: { className?: string; tone?: "default" | "light" }) {
  const { connected, lastSync, feed } = useLive();
  const light = tone === "light";
  return (
    <span className={clsx("inline-flex items-center gap-2 font-mono-x text-[10px] tracking-[0.14em] uppercase", light ? "text-white/50" : "text-ink-soft", className)}>
      {connected ? <Wifi size={12} className={light ? "text-[#c8f65d]" : "text-lime"} /> : <WifiOff size={12} className="text-alizarin" />}
      {connected ? `SYNC ${lastSync ? bnTime(new Date(lastSync)) : "…"}` : "পুনরায় সংযোগ হচ্ছে"} · {bn(feed.refreshSeconds)}S
    </span>
  );
}

/* ------------------------------------------------------------------ */
export function StatStrip({ className, tone = "default" }: { className?: string; tone?: "default" | "light" }) {
  const { feed } = useLive();
  const light = tone === "light";
  const items: [string, number][] = [
    ["দর্শক এখন", feed.viewers],
    ["সর্বোচ্চ", feed.peakViewers],
    ["রিঅ্যাকশন", feed.totals.reactions],
    ["মন্তব্য", feed.totals.comments],
    ["ভোট", feed.totals.votes],
    ["শেয়ার", feed.totals.shares],
  ];
  return (
    <div className={clsx("grid grid-cols-3 gap-3 sm:grid-cols-6", className)}>
      {items
        .filter(([label]) => feed.event.status === "live" || (label !== "দর্শক এখন"))
        .map(([label, value]) => (
          <div key={label} className={clsx("border-l pl-3", light ? "border-white/15" : "border-ink/12")}>
            <span className={clsx("font-serif-bn text-[22px] leading-none font-black tabular", light ? "text-white" : "text-ink")}>{bnCompact(value)}</span>
            <p className={clsx("mt-1.5 font-mono-x text-[9px] tracking-[0.16em] uppercase", light ? "text-white/45" : "text-ink/40")}>{label}</p>
          </div>
        ))}
    </div>
  );
}
