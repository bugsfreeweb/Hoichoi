"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChevronUp, Heart, MessageSquareText, Pin, Send, ShieldCheck, Timer, HelpCircle, BarChart2 } from "lucide-react";
import { useLive } from "./LiveProvider";
import { PollCard, TimeAgo } from "./Widgets";
import { getStoredName, storeName } from "@/lib/live-client";
import { bn, bnCompact, clsx } from "@/lib/live-format";

const NAME_COLORS = ["#d2202c", "#0b7c72", "#2563eb", "#b45309", "#7c3aed", "#db2777", "#5f8f0e"];
const NAME_COLORS_DARK = ["#fa8b9b", "#2dd4bf", "#90afff", "#ffb454", "#c4b5fd", "#f9a8d4", "#c8f65d"];
function colorFor(name: string, dark: boolean) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const list = dark ? NAME_COLORS_DARK : NAME_COLORS;
  return list[h % list.length];
}

type Msg = { tone: "ok" | "warn" | "err"; text: string } | null;

function Notice({ msg, dark }: { msg: Msg; dark: boolean }) {
  if (!msg) return null;
  return (
    <p
      className={clsx(
        "mt-2 text-[12px] leading-snug",
        msg.tone === "ok" ? (dark ? "text-[#c8f65d]" : "text-lime") : msg.tone === "warn" ? (dark ? "text-[#ffb454]" : "text-amberx") : "text-alizarin",
      )}
    >
      {msg.text}
    </p>
  );
}

/* ------------------------------------------------------------------ */
export function LiveChat({
  variant = "thread",
  tone = "default",
  height = 420,
  className,
}: {
  variant?: "thread" | "chat";
  tone?: "default" | "dark";
  height?: number;
  className?: string;
}) {
  const { feed, comment, like, liking } = useLive();
  const dark = tone === "dark";
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ev = feed.event;

  useEffect(() => setName(getStoredName()), []);

  const pinned = feed.comments.find((c) => c.pinned && c.status === "approved");
  const others = feed.comments.filter((c) => c.id !== pinned?.id);
  const list = variant === "chat" ? [...others].reverse() : others;

  useEffect(() => {
    if (variant !== "chat") return;
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (nearBottom || el.scrollTop === 0) el.scrollTop = el.scrollHeight;
  }, [feed.comments.length, variant]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (name.trim().length < 2) return setMsg({ tone: "err", text: "আগে আপনার নাম লিখুন" });
    if (text.trim().length < 2) return setMsg({ tone: "err", text: "কিছু লিখুন" });
    setBusy(true);
    storeName(name.trim());
    const r = await comment(name.trim(), text.trim());
    setBusy(false);
    if (r.ok) {
      setText("");
      setMsg(
        r.moderation === "pending"
          ? { tone: "warn", text: "ধন্যবাদ! আপনার মন্তব্যটি সম্পাদকীয় রিভিউয়ের পর প্রকাশিত হবে।" }
          : { tone: "ok", text: "মন্তব্য প্রকাশিত হয়েছে ✓" },
      );
      setTimeout(() => setMsg(null), 5000);
    } else {
      setMsg({ tone: "err", text: r.error ?? "মন্তব্য পাঠানো যায়নি" });
    }
  };

  if (!ev.commentsEnabled) {
    return (
      <div className={clsx("flex flex-col items-center justify-center gap-2 py-10 text-center", className)}>
        <MessageSquareText size={20} className={dark ? "text-white/40" : "text-ink-soft"} />
        <p className={clsx("text-[13px]", dark ? "text-white/60" : "text-ink-soft")}>এই লাইভে মন্তব্য বন্ধ রাখা হয়েছে</p>
      </div>
    );
  }

  return (
    <div className={clsx("flex flex-col", className)}>
      {pinned && (
        <div className={clsx("mb-3 flex gap-2.5 p-3", dark ? "bg-white/[0.06]" : "bg-amberx/10")}>
          <Pin size={13} className={clsx("mt-0.5 shrink-0", dark ? "text-[#ffb454]" : "text-amberx")} />
          <p className={clsx("text-[13px] leading-snug", dark ? "text-white/85" : "text-ink/85")}>
            <b style={{ color: colorFor(pinned.name, dark) }}>{pinned.name}</b> {pinned.body}
          </p>
        </div>
      )}

      <div ref={scrollRef} className="scroll-thin flex-1 overflow-y-auto pr-1" style={{ maxHeight: height }}>
        {list.length === 0 && <p className={clsx("py-8 text-center text-[13px]", dark ? "text-white/50" : "text-ink-soft")}>প্রথম মন্তব্যটি আপনিই করুন</p>}
        {variant === "chat" ? (
          <ul className="space-y-2.5 py-1">
            {list.map((c) => (
              <li key={c.id} className={clsx("group flex items-start gap-2 text-[13px] leading-snug", c.status === "pending" && "opacity-60")}>
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: colorFor(c.name, false) }}
                >
                  {c.name.slice(0, 1)}
                </span>
                <p className={clsx("min-w-0 flex-1", dark ? "text-white/85" : "text-ink/85")}>
                  <b className="mr-1.5 font-semibold" style={{ color: colorFor(c.name, dark) }}>
                    {c.name}
                  </b>
                  {c.body}
                  {c.status === "pending" && <span className="ml-1.5 font-mono-x text-[9.5px] text-[#ffb454]">· রিভিউয়ে</span>}
                </p>
                <button
                  type="button"
                  aria-label="পছন্দ"
                  onClick={() => like(c.id)}
                  disabled={liking.includes(c.id)}
                  aria-busy={liking.includes(c.id)}
                  className={clsx("flex shrink-0 items-center gap-0.5 font-mono-x text-[10px]", c.liked ? "text-[#fa8b9b]" : dark ? "text-white/30 hover:text-white/70" : "text-ink/30 hover:text-ink/70")}
                >
                  <Heart size={11} fill={c.liked ? "currentColor" : "none"} /> {c.likes > 0 && bnCompact(c.likes)}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className={clsx("divide-y", dark ? "divide-white/10" : "divide-ink/10")}>
            {list.map((c) => (
              <li key={c.id} className={clsx("py-3.5", c.status === "pending" && "opacity-70")}>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-serif-bn text-[13px] font-bold text-white" style={{ background: colorFor(c.name, false) }}>
                    {c.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={clsx("text-[13px] font-bold", dark ? "text-white" : "text-ink")}>
                      {c.name} {c.mine && <span className="ml-1 font-mono-x text-[9.5px] font-normal text-ink-soft">(আপনি)</span>}
                    </p>
                    <TimeAgo iso={c.createdAt} className={clsx("text-[11px]", dark ? "text-white/40" : "text-ink-soft")} />
                  </div>
                  {c.status === "pending" && <span className="bg-amberx/15 px-2 py-0.5 font-mono-x text-[9px] text-amberx">রিভিউয়ের অপেক্ষায়</span>}
                </div>
                <p className={clsx("mt-2 pl-[42px] text-[14px] leading-relaxed", dark ? "text-white/80" : "text-ink/85")}>{c.body}</p>
                <div className="mt-1.5 pl-[42px]">
                  <button
                    type="button"
                    onClick={() => like(c.id)}
                  disabled={liking.includes(c.id)}
                  aria-busy={liking.includes(c.id)}
                    className={clsx("inline-flex items-center gap-1 text-[11.5px] font-semibold", c.liked ? "text-alizarin" : dark ? "text-white/40 hover:text-white" : "text-ink-soft hover:text-ink")}
                  >
                    <Heart size={12} fill={c.liked ? "currentColor" : "none"} /> {c.liked ? "পছন্দ করেছেন" : "পছন্দ"} · {bn(c.likes)}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={submit} className={clsx("mt-3 border-t pt-3", dark ? "border-white/10" : "border-ink/12")}>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="আপনার নাম"
            maxLength={40}
            aria-label="আপনার নাম"
            className={clsx(
              "w-[34%] min-w-0 border px-2.5 py-2 text-[13px] outline-none",
              dark ? "border-white/15 bg-white/5 text-white placeholder:text-white/35 focus:border-white/50" : "border-ink/20 bg-card text-ink placeholder:text-ink/40 focus:border-ink",
            )}
          />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={ev.status === "ended" ? "রিপ্লে নিয়ে আপনার মত…" : "লাইভ আলোচনায় যোগ দিন…"}
            maxLength={400}
            aria-label="মন্তব্য"
            className={clsx(
              "min-w-0 flex-1 border px-2.5 py-2 text-[13px] outline-none",
              dark ? "border-white/15 bg-white/5 text-white placeholder:text-white/35 focus:border-white/50" : "border-ink/20 bg-card text-ink placeholder:text-ink/40 focus:border-ink",
            )}
          />
          <button
            type="submit"
            disabled={busy}
            aria-label="পাঠান"
            className={clsx("flex w-10 shrink-0 items-center justify-center transition-colors disabled:opacity-50", dark ? "bg-[#c8f65d] text-[#0a0c10] hover:bg-white" : "bg-ink text-paper hover:bg-alizarin")}
          >
            <Send size={15} />
          </button>
        </div>
        <Notice msg={msg} dark={dark} />
        <div className={clsx("mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono-x text-[9.5px] tracking-[0.08em]", dark ? "text-white/35" : "text-ink-soft")}>
          <span className="inline-flex items-center gap-1">
            <ShieldCheck size={11} /> {ev.moderation === "pre" ? "প্রকাশের আগে রিভিউ" : "রিভিউসহ সরাসরি প্রকাশ"}
          </span>
          {ev.slowMode > 0 && (
            <span className="inline-flex items-center gap-1">
              <Timer size={11} /> স্লো মোড · {bn(ev.slowMode)} সেকেন্ড
            </span>
          )}
          <span>{bn(text.length)}/৪০০</span>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function QABox({ tone = "default", height = 420, className }: { tone?: "default" | "dark"; height?: number; className?: string }) {
  const { feed, ask, upvote } = useLive();
  const dark = tone === "dark";
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  useEffect(() => setName(getStoredName()), []);

  if (!feed.event.qaEnabled) {
    return <p className={clsx("py-10 text-center text-[13px]", dark ? "text-white/60" : "text-ink-soft", className)}>প্রশ্নোত্তর এই মুহূর্তে বন্ধ</p>;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (name.trim().length < 2) return setMsg({ tone: "err", text: "আগে আপনার নাম লিখুন" });
    setBusy(true);
    storeName(name.trim());
    const r = await ask(name.trim(), text.trim());
    setBusy(false);
    if (r.ok) {
      setText("");
      setMsg({ tone: "ok", text: "প্রশ্ন জমা হয়েছে — ডেস্ক যাচাই করে উত্তর দেবে।" });
      setTimeout(() => setMsg(null), 5000);
    } else setMsg({ tone: "err", text: r.error ?? "পাঠানো যায়নি" });
  };

  return (
    <div className={clsx("flex flex-col", className)}>
      <form onSubmit={submit} className={clsx("border p-3", dark ? "border-white/10 bg-white/[0.03]" : "border-ink/15 bg-card")}>
        <p className={clsx("font-mono-x text-[9.5px] tracking-[0.2em] uppercase", dark ? "text-[#c8f65d]" : "text-alizarin")}>ডেস্ককে প্রশ্ন করুন</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="যেমন: বৃষ্টি হলে ম্যাচের ফল কীভাবে নির্ধারণ হবে?"
          rows={2}
          maxLength={300}
          className={clsx("mt-2 w-full resize-none border-0 bg-transparent text-[13.5px] outline-none", dark ? "text-white placeholder:text-white/35" : "text-ink placeholder:text-ink/40")}
        />
        <div className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="আপনার নাম"
            maxLength={40}
            className={clsx("min-w-0 flex-1 border-b bg-transparent py-1 text-[12.5px] outline-none", dark ? "border-white/15 text-white placeholder:text-white/35" : "border-ink/20 text-ink placeholder:text-ink/40")}
          />
          <button type="submit" disabled={busy} className={clsx("px-3.5 py-1.5 text-[12px] font-bold disabled:opacity-50", dark ? "bg-[#c8f65d] text-[#0a0c10]" : "bg-ink text-paper hover:bg-alizarin")}>
            প্রশ্ন পাঠান
          </button>
        </div>
        <Notice msg={msg} dark={dark} />
      </form>

      <ul className="scroll-thin mt-3 space-y-2.5 overflow-y-auto pr-1" style={{ maxHeight: height }}>
        {feed.questions.length === 0 && <li className={clsx("py-6 text-center text-[13px]", dark ? "text-white/50" : "text-ink-soft")}>এখনো কোনো প্রশ্ন প্রকাশিত হয়নি</li>}
        {feed.questions.map((q) => (
          <li key={q.id} className={clsx("flex gap-3 border p-3", dark ? "border-white/10" : "border-ink/12", q.status === "pending" && "opacity-70")}>
            <button
              type="button"
              onClick={() => upvote(q.id)}
              disabled={q.voted}
              aria-label="প্রশ্নটি সমর্থন করুন"
              className={clsx(
                "flex h-12 w-10 shrink-0 flex-col items-center justify-center border text-[11px] font-bold transition",
                q.voted ? (dark ? "border-[#c8f65d] text-[#c8f65d]" : "border-lime text-lime") : dark ? "border-white/15 text-white/70 hover:border-white" : "border-ink/20 text-ink hover:border-ink",
              )}
            >
              <ChevronUp size={15} />
              <span className="font-mono-x tabular">{bn(q.upvotes)}</span>
            </button>
            <div className="min-w-0 flex-1">
              <p className={clsx("text-[13.5px] leading-snug font-semibold", dark ? "text-white" : "text-ink")}>{q.body}</p>
              <p className={clsx("mt-1 text-[11px]", dark ? "text-white/40" : "text-ink-soft")}>
                {q.name} · <TimeAgo iso={q.createdAt} />
                {q.status === "pending" && <span className="ml-1.5 text-amberx">· রিভিউয়ের অপেক্ষায়</span>}
              </p>
              {q.status === "answered" && q.answer && (
                <div className={clsx("mt-2 border-l-2 pl-3", dark ? "border-[#c8f65d]" : "border-lime")}>
                  <p className={clsx("font-mono-x text-[9px] tracking-[0.18em] uppercase", dark ? "text-[#c8f65d]" : "text-lime")}>ডেস্কের উত্তর</p>
                  <p className={clsx("mt-0.5 text-[13px] leading-relaxed", dark ? "text-white/80" : "text-ink/85")}>{q.answer}</p>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function EngageTabs({
  tone = "default",
  height = 420,
  chatVariant = "thread",
  showPoll = true,
  className,
}: {
  tone?: "default" | "dark";
  height?: number;
  chatVariant?: "thread" | "chat";
  showPoll?: boolean;
  className?: string;
}) {
  const { feed } = useLive();
  const dark = tone === "dark";
  const tabs = [
    feed.event.commentsEnabled && { key: "chat", label: "মন্তব্য", count: feed.totals.comments, icon: MessageSquareText },
    feed.event.qaEnabled && { key: "qa", label: "প্রশ্নোত্তর", count: feed.questions.length, icon: HelpCircle },
    showPoll && feed.event.pollsEnabled && feed.poll && { key: "poll", label: "পোল", count: feed.poll.total, icon: BarChart2 },
  ].filter(Boolean) as { key: string; label: string; count: number; icon: typeof HelpCircle }[];
  const [tab, setTab] = useState(tabs[0]?.key ?? "chat");
  if (!tabs.length) return null;
  const current = tabs.some((t) => t.key === tab) ? tab : (tabs[0]?.key ?? "chat");

  return (
    <div className={className}>
      <div className={clsx("flex border-b", dark ? "border-white/10" : "border-ink/15")}>
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={clsx(
                "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-bold transition-colors",
                current === t.key
                  ? dark
                    ? "border-[#c8f65d] text-white"
                    : "border-alizarin text-ink"
                  : dark
                    ? "border-transparent text-white/45 hover:text-white/80"
                    : "border-transparent text-ink-soft hover:text-ink",
              )}
            >
              <Icon size={14} /> {t.label}
              <span className={clsx("font-mono-x text-[10px] font-medium", dark ? "text-white/40" : "text-ink-soft")}>{bnCompact(t.count)}</span>
            </button>
          );
        })}
      </div>
      <div className="pt-4">
        {current === "chat" && <LiveChat variant={chatVariant} tone={tone} height={height} />}
        {current === "qa" && <QABox tone={tone} height={height} />}
        {current === "poll" && <PollCard tone={tone} />}
      </div>
    </div>
  );
}
