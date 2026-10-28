"use client";

import { useState } from "react";
import { Pin, Quote, Zap, BarChart3, Star, Link2, ChevronDown } from "lucide-react";
import { useLive } from "./LiveProvider";
import { TimeAgo } from "./Widgets";
import { copyText } from "@/lib/live-client";
import type { UpdateDTO } from "@/lib/live-types";
import { bn, bnTime, clsx } from "@/lib/live-format";

type Variant = "timeline" | "cards" | "compact" | "numbered";

const KIND_META: Record<UpdateDTO["kind"], { label: string; cls: string; icon?: typeof Zap }> = {
  breaking: { label: "ব্রেকিং", cls: "bg-live text-white", icon: Zap },
  key: { label: "গুরুত্বপূর্ণ", cls: "bg-lime text-paper", icon: Star },
  quote: { label: "উদ্ধৃতি", cls: "bg-ink text-paper", icon: Quote },
  stat: { label: "ডেটা", cls: "bg-[#0b7c72] text-white", icon: BarChart3 },
  update: { label: "আপডেট", cls: "border border-ink/25 text-ink-soft" },
};

function KindTag({ kind, dark }: { kind: UpdateDTO["kind"]; dark?: boolean }) {
  const m = KIND_META[kind] ?? KIND_META.update;
  const Icon = m.icon;
  return (
    <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-bold", kind === "update" && dark ? "border border-white/20 text-white/60" : m.cls)}>
      {Icon && <Icon size={10} />}
      {m.label}
    </span>
  );
}

function UpdateBody({ u, dark }: { u: UpdateDTO; dark?: boolean }) {
  if (u.kind === "quote") {
    return (
      <blockquote className={clsx("relative mt-2 border-l-[3px] pl-4 font-serif-bn text-[16px] leading-relaxed italic", dark ? "border-[#c8f65d] text-white/90" : "border-alizarin text-ink/90")}>
        {u.body}
        <footer className={clsx("mt-1.5 font-sans text-[11.5px] not-italic", dark ? "text-white/50" : "text-ink-soft")}>— {u.author}</footer>
      </blockquote>
    );
  }
  return <p className={clsx("mt-2 text-[14.5px] leading-relaxed", dark ? "text-white/75" : "text-ink/80")}>{u.body}</p>;
}

export default function UpdatesFeed({
  variant = "timeline",
  limit,
  filters = true,
  tone = "default",
  className,
  title,
}: {
  variant?: Variant;
  limit?: number;
  filters?: boolean;
  tone?: "default" | "dark";
  className?: string;
  title?: string;
}) {
  const { feed, fresh } = useLive();
  const [filter, setFilter] = useState<"all" | "key">("all");
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const dark = tone === "dark";

  let list = feed.updates;
  if (filter === "key") list = list.filter((u) => u.kind === "key" || u.kind === "breaking");
  const pinned = variant === "timeline" || variant === "cards" ? list.find((u) => u.pinned) : undefined;
  const rest = pinned ? list.filter((u) => u.id !== pinned.id) : list;
  const shown = limit && !expanded ? rest.slice(0, limit) : rest;
  const hidden = rest.length - shown.length;

  const copyLink = async (id: string) => {
    const copied = await copyText(`${window.location.origin}/live/${feed.event.slug}#update-${id}`);
    if (copied) {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } else {
      window.prompt("আপডেটের লিংক কপি করুন", `${window.location.origin}/live/${feed.event.slug}#update-${id}`);
    }
  };

  return (
    <div className={className}>
      {(title || filters) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <p className={clsx("font-serif-bn text-[18px] font-extrabold", dark ? "text-white" : "text-ink")}>{title}</p>}
          {filters && (
            <div className="flex items-center gap-1.5">
              {(
                [
                  ["all", `সব · ${bn(feed.updates.length)}`],
                  ["key", "গুরুত্বপূর্ণ"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={clsx(
                    "rounded-full border px-3.5 py-1 text-[12px] font-medium transition-all",
                    filter === key
                      ? dark
                        ? "border-white bg-white text-[#0a0c10]"
                        : "border-ink bg-ink text-paper"
                      : dark
                        ? "border-white/20 text-white/60 hover:border-white hover:text-white"
                        : "border-ink/25 text-ink-soft hover:border-ink hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {fresh.length > 0 && (
        <div className={clsx("rise-in mb-4 flex items-center gap-2 px-3 py-2 text-[12.5px] font-semibold", dark ? "bg-[#c8f65d]/15 text-[#c8f65d]" : "bg-lime/15 text-lime")}>
          <span className="relative flex h-2 w-2">
            <span className="absolute h-full w-full animate-ping rounded-full bg-current opacity-60" />
            <span className="relative h-2 w-2 rounded-full bg-current" />
          </span>
          {bn(fresh.length)}টি নতুন আপডেট যোগ হয়েছে
        </div>
      )}

      {pinned && (
        <article id={`update-${pinned.id}`} className={clsx("mb-6 p-4 md:p-5", dark ? "bg-white/[0.05] ring-1 ring-white/10" : "frame-press-sm bg-card")}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={clsx("inline-flex items-center gap-1 font-mono-x text-[9.5px] font-bold tracking-[0.2em] uppercase", dark ? "text-[#ffb454]" : "text-amberx")}>
              <Pin size={11} /> পিন করা
            </span>
            <KindTag kind={pinned.kind} dark={dark} />
            <span className={clsx("font-mono-x text-[10.5px]", dark ? "text-white/50" : "text-ink-soft")}>{bnTime(pinned.createdAt)}</span>
          </div>
          {pinned.title && <h4 className={clsx("mt-2.5 font-serif-bn text-[20px] leading-snug font-extrabold", dark ? "text-white" : "text-ink")}>{pinned.title}</h4>}
          <UpdateBody u={pinned} dark={dark} />
        </article>
      )}

      {variant === "timeline" && (
        <ol className={clsx("relative border-l-2", dark ? "border-white/10" : "border-ink/15")}>
          {shown.map((u) => (
            <li key={u.id} id={`update-${u.id}`} className={clsx("relative pb-7 pl-6 last:pb-0", fresh.includes(u.id) && "flash-new")}>
              <span
                className={clsx(
                  "absolute top-1.5 -left-[7px] h-3 w-3 rotate-45 border-2",
                  u.kind === "breaking" ? "border-live bg-live" : u.kind === "key" ? "border-lime bg-lime" : dark ? "border-white/40 bg-[#0a0c10]" : "border-ink bg-paper",
                )}
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className={clsx("font-mono-x text-[11px] font-bold tabular", dark ? "text-white" : "text-ink")}>{bnTime(u.createdAt)}</span>
                <TimeAgo iso={u.createdAt} className={clsx("text-[11.5px]", dark ? "text-white/45" : "text-ink-soft")} />
                <KindTag kind={u.kind} dark={dark} />
              </div>
              {u.title && u.kind !== "quote" && <h4 className={clsx("mt-2 font-serif-bn text-[18px] leading-snug font-bold", dark ? "text-white" : "text-ink")}>{u.title}</h4>}
              <UpdateBody u={u} dark={dark} />
              <div className={clsx("mt-2.5 flex items-center gap-3 text-[11px]", dark ? "text-white/40" : "text-ink-soft")}>
                {u.kind !== "quote" && <span>{u.author}</span>}
                <button type="button" onClick={() => copyLink(u.id)} className="inline-flex items-center gap-1 hover:text-alizarin">
                  <Link2 size={11} /> {copied === u.id ? "কপি হয়েছে" : "লিংক"}
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {variant === "cards" && (
        <div className="space-y-4">
          {shown.map((u) => (
            <article key={u.id} id={`update-${u.id}`} className={clsx("border p-4", dark ? "border-white/10 bg-white/[0.03]" : "border-ink/12 bg-card", fresh.includes(u.id) && "flash-new")}>
              <div className="flex items-center justify-between gap-2">
                <KindTag kind={u.kind} dark={dark} />
                <span className={clsx("font-mono-x text-[10.5px]", dark ? "text-white/50" : "text-ink-soft")}>
                  {bnTime(u.createdAt)} · <TimeAgo iso={u.createdAt} />
                </span>
              </div>
              {u.title && u.kind !== "quote" && <h4 className={clsx("mt-2.5 font-serif-bn text-[17px] leading-snug font-bold", dark ? "text-white" : "text-ink")}>{u.title}</h4>}
              <UpdateBody u={u} dark={dark} />
            </article>
          ))}
        </div>
      )}

      {variant === "compact" && (
        <ul className={clsx("divide-y", dark ? "divide-white/10" : "divide-ink/10")}>
          {shown.map((u) => (
            <li key={u.id} className={clsx("flex gap-3 py-2.5", fresh.includes(u.id) && "flash-new")}>
              <span className={clsx("w-[62px] shrink-0 pt-0.5 font-mono-x text-[10.5px] font-semibold tabular", u.kind === "breaking" ? "text-live" : dark ? "text-white/60" : "text-ink-soft")}>
                {bnTime(u.createdAt)}
              </span>
              <p className={clsx("text-[13.5px] leading-snug", dark ? "text-white/85" : "text-ink/90", (u.kind === "breaking" || u.kind === "key") && "font-bold")}>
                {u.title || u.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      {variant === "numbered" && (
        <ol className={clsx("divide-y", dark ? "divide-white/10" : "divide-ink/12")}>
          {shown.map((u, i) => (
            <li key={u.id} className={clsx("flex items-start gap-4 py-3.5", fresh.includes(u.id) && "flash-new")}>
              <span className="text-outline-ink mt-0.5 w-7 shrink-0 font-serif-bn text-2xl leading-none font-black">{bn(i + 1)}</span>
              <div className="min-w-0">
                <p className={clsx("font-mono-x text-[10px]", dark ? "text-white/45" : "text-ink-soft")}>
                  {bnTime(u.createdAt)} · {KIND_META[u.kind]?.label}
                </p>
                <h4 className={clsx("mt-1 font-serif-bn text-[15px] leading-snug font-bold", dark ? "text-white" : "text-ink")}>{u.title || u.body.slice(0, 90)}</h4>
              </div>
            </li>
          ))}
        </ol>
      )}

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={clsx(
            "mt-5 flex w-full items-center justify-center gap-2 border py-2.5 text-[12.5px] font-bold transition-colors",
            dark ? "border-white/15 text-white/80 hover:bg-white hover:text-[#0a0c10]" : "border-ink/20 text-ink hover:bg-ink hover:text-paper",
          )}
        >
          আরও {bn(hidden)}টি আপডেট <ChevronDown size={14} />
        </button>
      )}
      {shown.length === 0 && !pinned && <p className={clsx("py-6 text-center text-[13px]", dark ? "text-white/50" : "text-ink-soft")}>এখনো কোনো আপডেট নেই</p>}
    </div>
  );
}
