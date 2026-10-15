"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  GraduationCap,
  Headphones,
  Layers3,
  Radio,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { Badge, Btn, LiveDot, SectionHead, SectionShell } from "@/components/ui/primitives";
import PostImage from "@/components/ui/PostImage";
import { Reveal } from "@/components/ui/motion";
import { playClick, playNodePing } from "@/lib/sound";
import { bn, bnTime } from "@/lib/format";

/* ══════════════════════════════════════════════════════════════
   ১ · লাইভ ওয়্যার — নিউজরুমের চলমান কার্যক্রম (technical / live)
   ══════════════════════════════════════════════════════════════ */

type WireKind = "collect" | "hash" | "rewrite" | "gate" | "publish" | "block";

interface WireItem {
  id: number;
  kind: WireKind;
  label: string;
  detail: string;
  hash?: string;
  ok: boolean;
  at: string;
}

const WIRE_TEMPLATES: { kind: WireKind; label: string; detail: string; ok: boolean }[] = [
  { kind: "collect", label: "ওয়াচলিস্ট সংগ্রহ", detail: "ফেসবুক পেজ থেকে নতুন উন্মুক্ত পোস্ট গ্রহণ করা হয়েছে", ok: true },
  { kind: "hash", label: "হ্যাশ গেট পার", detail: "SHA-256 ও SimHash মিলিয়ে পুনরাবৃত্তি যাচাই সম্পন্ন", ok: true },
  { kind: "rewrite", label: "পুনর্লিখন সম্পন্ন", detail: "কাঁচা ক্যাপশন থেকে সংবাদ-শৈলীর প্রতিবেদন তৈরি", ok: true },
  { kind: "gate", label: "ফ্যাক্ট-গেট ০.৯২", detail: "নির্ধারিত ০.৯০ থ্রেশহোল্ড অতিক্রম করে অনুমোদিত", ok: true },
  { kind: "publish", label: "প্রকাশিত", detail: "ISR রিভ্যালিডেশনে পাবলিক সাইটে লাইভ", ok: true },
  { kind: "block", label: "পুনরাবৃত্তি আটকানো", detail: "একই ঘটনার পূর্ব-সংরক্ষিত রেকর্ড শনাক্ত — বাতিল", ok: false },
];

const KIND_STYLE: Record<WireKind, { color: string; Icon: typeof Radio }> = {
  collect: { color: "#56c8ff", Icon: Layers3 },
  hash: { color: "#a78bfa", Icon: ShieldCheck },
  rewrite: { color: "#f5a524", Icon: Sparkles },
  gate: { color: "#4ade80", Icon: ShieldCheck },
  publish: { color: "#ff5c38", Icon: Radio },
  block: { color: "#fb7185", Icon: XCircle },
};

export function LiveWire({ density = "comfortable", variant = "stream" }: { density?: "compact" | "comfortable" | "spacious"; variant?: string }) {
  const seq = useRef(0);
  const detHash = (n: number) => (((n + 3) * 2654435761) >>> 0).toString(16).padStart(8, "0").slice(0, 6);
  /** `initial` items are what the server renders, so they must not use randomness or the clock. */
  const make = (pick: number, initial = false): WireItem => {
    const t = WIRE_TEMPLATES[pick % WIRE_TEMPLATES.length];
    seq.current += 1;
    return {
      id: seq.current,
      kind: t.kind,
      label: t.label,
      detail: t.detail,
      hash: initial ? detHash(seq.current) : Math.random().toString(16).slice(2, 8),
      ok: t.ok,
      at: initial ? "" : bnTime(new Date()),
    };
  };

  const [items, setItems] = useState<WireItem[]>(() => Array.from({ length: 6 }, (_, i) => make(i, true)));
  const [stamp, setStamp] = useState("—");
  useEffect(() => {
    setStamp(bnTime(new Date()));
  }, [items.length]);
  const [live, setLive] = useState(true);

  useEffect(() => {
    if (!live) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let cursor = 3;
    const timer = setInterval(() => {
      cursor += 1;
      setItems((prev) => [make(cursor), ...prev].slice(0, 7));
    }, 4200);
    return () => clearInterval(timer);
  }, [live]);

  const toggle = (
    <button
      onClick={() => {
        playClick(640);
        setLive((v) => !v);
      }}
      className="flex items-center gap-2 rounded-full border border-white/12 px-3.5 py-2 text-[12.5px] font-medium text-mist-200 transition-colors hover:border-white/25"
    >
      <LiveDot tone={live ? "ok" : "warn"} />
      {live ? "সরাসরি প্রবাহ চালু" : "প্রবাহ বিরত"}
    </button>
  );

  /* variant: console — mono pipeline log */
  if (variant === "console") {
    return (
      <SectionShell id="live-wire" density={density}>
        <SectionHead kicker="▚ PIPELINE CONSOLE" title={<>লাইভ <span className="text-gradient">রান কনসোল</span></>} desc="পাইপলাইনের প্রতিটি ধাপ মোনো লগে প্রবাহিত।" right={toggle} />
        <Reveal>
          <div className="surface-hi overflow-hidden rounded-2xl">
            <div className="flex items-center gap-2 border-b border-white/8 bg-ink-950/70 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-gold-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-mint-400/80" />
              <span className="mono-label ml-2 text-mist-400">hoichoi@newsroom:~$ tail -f pipeline.log</span>
            </div>
            <div className="space-y-1.5 p-5 font-mono text-[12.5px] leading-relaxed">
              {items.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center gap-2">
                  <span className="text-mist-400/70">{item.at || stamp}</span>
                  <span style={{ color: KIND_STYLE[item.kind].color }}>[{item.kind.toUpperCase()}]</span>
                  <span className="text-mist-300">{item.label}</span>
                  {item.hash ? <span className="text-mist-400/70">#{item.hash}</span> : null}
                  <span className={clsx("ml-auto", item.ok ? "text-mint-400" : "text-rose-400")}>
                    {item.ok ? "ok" : "blocked"}
                  </span>
                </div>
              ))}
              <div className="pt-1">
                <span className="mono-label text-mist-400">▊</span>
              </div>
            </div>
          </div>
        </Reveal>
      </SectionShell>
    );
  }

  /* variant: cards — event card grid */
  if (variant === "cards") {
    return (
      <SectionShell id="live-wire" density={density}>
        <SectionHead kicker="▚ EVENT CARDS" title={<>পাইপলাইনের <span className="text-gradient">ঘটনা কার্ড</span></>} desc="প্রতিটি ধাপ আলাদা কার্ডে, সঙ্গে ফলাফল।" right={toggle} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 6).map((item) => {
            const meta = KIND_STYLE[item.kind];
            return (
              <Reveal key={item.id}>
                <div className="surface card-lift h-full rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${meta.color}1f`, color: meta.color }}>
                      <meta.Icon className="h-4 w-4" />
                    </span>
                    <span className={clsx("mono-label", item.ok ? "text-mint-400" : "text-rose-400")}>{item.ok ? "OK" : "BLOCK"}</span>
                  </div>
                  <p className="font-display-bn mt-4 text-lg text-mist-100">{item.label}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-mist-400">{item.detail}</p>
                  {item.hash ? <p className="mono-label mt-3 text-mist-400/70">#{item.hash}</p> : null}
                </div>
              </Reveal>
            );
          })}
        </div>
      </SectionShell>
    );
  }

  /* variant: ledger — tabular rows */
  if (variant === "ledger") {
    return (
      <SectionShell id="live-wire" density={density}>
        <SectionHead kicker="▚ PIPELINE LEDGER" title={<>ধাপভিত্তিক <span className="text-gradient">হিসাব-নথি</span></>} desc="সময়, ধাপ, বিবরণ ও ফলাফল সারিবদ্ধ।" right={toggle} />
        <Reveal>
          <div className="surface overflow-hidden rounded-2xl">
            <div className="grid grid-cols-[92px_1fr_auto] gap-3 border-b border-white/8 bg-white/[0.03] px-5 py-3">
              <span className="mono-label text-mist-400">সময়</span>
              <span className="mono-label text-mist-400">ধাপ ও বিবরণ</span>
              <span className="mono-label text-right text-mist-400">ফলাফল</span>
            </div>
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-[92px_1fr_auto] items-start gap-3 border-b border-white/6 px-5 py-3.5 last:border-0 hover:bg-white/[0.02]">
                <span className="mono-label pt-0.5 text-mist-400">{item.at || stamp}</span>
                <div>
                  <p className="text-[14px] font-semibold text-mist-100">{item.label}</p>
                  <p className="mt-0.5 text-[12.5px] text-mist-400">{item.detail}</p>
                </div>
                <span className={clsx("mono-label", item.ok ? "text-mint-400" : "text-rose-400")}>{item.ok ? "OK" : "BLOCK"}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </SectionShell>
    );
  }

  /* variant: compact — minimal status strip */
  if (variant === "compact") {
    return (
      <SectionShell id="live-wire" density={density} className="!py-8">
        <div className="surface flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl px-5 py-4">
          <span className="mono-label flex items-center gap-2 text-mist-300">
            <Activity className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} /> পাইপলাইন অবস্থা
          </span>
          {items.slice(0, 4).map((item) => (
            <span key={item.id} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: KIND_STYLE[item.kind].color }} />
              <span className="text-[13px] text-mist-400">{item.label}</span>
            </span>
          ))}
          <span className="ml-auto flex items-center gap-2">{toggle}</span>
        </div>
      </SectionShell>
    );
  }

  /* default variant: stream */
  return (
    <SectionShell id="live-wire" density={density}>
      <SectionHead
        kicker="▚ নিউজরুম ওয়্যার · প্রতি ১০ সেকেন্ডে"
        title={<>সংবাদকক্ষে এখন <span className="text-gradient">যা ঘটছে</span></>}
        desc="সংগ্রহ, হ্যাশ-যাচাই, পুনর্লিখন, ফ্যাক্ট-গেট ও প্রকাশ — পাইপলাইনের প্রতিটি ধাপ সরাসরি এখানে প্রবাহিত হয়।"
        right={toggle}
      />

      <Reveal>
        <div className="surface relative overflow-hidden rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 bg-white/[0.02] px-5 py-3">
            <span className="mono-label flex items-center gap-2 text-mist-300">
              <Activity className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
              PIPELINE TELEMETRY
            </span>
            <span className="mono-label flex items-center gap-3 text-mist-400">
              {bn(items.length)} ঘটনা
              <span className="h-1 w-1 rounded-full bg-white/20" />
              TURSO DB
            </span>
          </div>

          <ol className="divide-y divide-white/6">
            {items.map((item, i) => {
              const meta = KIND_STYLE[item.kind];
              return (
                <li
                  key={item.id}
                  className={clsx(
                    "group flex items-start gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.03]",
                    i === 0 && live && "bg-white/[0.025]",
                  )}
                >
                  <span
                    className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                    style={{ background: `${meta.color}1f`, color: meta.color }}
                  >
                    <meta.Icon className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold text-mist-100">{item.label}</span>
                      {item.hash ? (
                        <span className="mono-label rounded border border-white/10 px-1.5 py-0.5 text-mist-400">
                          #{item.hash}
                        </span>
                      ) : null}
                      {i === 0 && live ? (
                        <Badge tone="hot">
                          <LiveDot tone="hot" /> নতুন
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-mist-400">{item.detail}</p>
                  </div>

                  <span className={clsx("mono-label shrink-0 pt-1", item.ok ? "text-mint-400" : "text-rose-400")}>
                    {item.ok ? "OK" : "BLOCK"}
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 bg-ink-950/50 px-5 py-3.5">
            <span className="mono-label flex items-center gap-2 text-mist-400">
              <Clock3 className="h-3 w-3" /> সর্বশেষ ঘটনা · {stamp}
            </span>
            <Btn href="#pipeline" variant="ghost" icon={false}>
              পাইপলাইন বিস্তারিত <ChevronRight className="h-3.5 w-3.5" />
            </Btn>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

/* ══════════════════════════════════════════════════════════════
   ২ · সকালের ব্রিফিং — দিনের সারসংক্ষেপ (briefing)
   ══════════════════════════════════════════════════════════════ */

export function Briefing({
  density = "comfortable",
  variant = "accordion",
  posts,
}: {
  density?: "compact" | "comfortable" | "spacious";
  variant?: string;
  posts: { slug: string; title: string; dek: string; category: string; image: string; factScore: number; readMinutes: number }[];
}) {
  const [open, setOpen] = useState<string | null>(posts[0]?.slug ?? null);
  const [speaking, setSpeaking] = useState(false);

  const brief = useMemo(() => posts.slice(0, 5), [posts]);
  const totalMinutes = useMemo(
    () => brief.reduce((sum, p) => sum + p.readMinutes, 0),
    [brief],
  );

  const listen = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    playClick(820);
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const script = `হৈচৈ সকালের ব্রিফিং। ${brief.length}টি গুরুত্বপূর্ণ প্রতিবেদন। ${brief
      .map((p, i) => `${i + 1}. ${p.title}`)
      .join(" ")}`;
    const utter = new SpeechSynthesisUtterance(script.slice(0, 2200));
    utter.lang = "bn-BD";
    utter.rate = 0.98;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((x) => x.lang?.toLowerCase().startsWith("bn"));
    if (v) utter.voice = v;
    utter.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  };

  if (!brief.length) return null;

  const head = (
    <SectionHead
      kicker="▚ দৈনিক ব্রিফিং · সকাল ৭টা"
      title={<>আজকের <span className="text-gradient">সংক্ষিপ্ত ব্রিফিং</span></>}
      desc="দিনের সবচেয়ে গুরুত্বপূর্ণ যাচাইকৃত প্রতিবেদনগুলো এক জায়গায় — কম সময়ে পুরো চিত্র।"
      right={
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="cool">
            <Clock3 className="h-3 w-3" /> মোট {bn(totalMinutes)} মিনিট পাঠ
          </Badge>
          <button
            onClick={listen}
            className="flex items-center gap-1.5 rounded-full border border-white/12 px-3.5 py-2 text-[12.5px] font-medium text-mist-200 transition-colors hover:border-white/25 hover:text-mist-100"
          >
            <Headphones className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
            {speaking ? "বন্ধ করুন" : "ব্রিফিং শুনুন"}
          </button>
        </div>
      }
    />
  );

  if (variant === "cards") {
    return (
      <SectionShell id="briefing" density={density}>
        {head}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brief.map((p, i) => (
            <Reveal key={p.slug} delay={i * 0.05}>
              <Link href={`/post/${p.slug}`} className="group block h-full">
                <article className="surface card-lift flex h-full flex-col overflow-hidden rounded-2xl">
                  <PostImage src={p.image} alt={p.title} ratio="16/9" rounded="rounded-none" scrim>
                    <span className="font-latin absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-[12px] font-bold text-ink-950" style={{ background: "var(--accent)" }}>
                      {bn(i + 1)}
                    </span>
                  </PostImage>
                  <div className="flex flex-1 flex-col p-5">
                    <span className="mono-label" style={{ color: "var(--accent)" }}>{p.category} · {bn(p.readMinutes)} মিনিট</span>
                    <h3 className="font-display-bn mt-2 line-clamp-3 text-[18px] leading-snug text-mist-100">{p.title}</h3>
                    <p className="mt-2 line-clamp-2 flex-1 text-[13px] leading-relaxed text-mist-400">{p.dek}</p>
                    <span className="mono-label mt-4 flex items-center gap-1.5 text-mint-400"><ShieldCheck className="h-3 w-3" /> ফ্যাক্ট {bn(p.factScore)}</span>
                  </div>
                </article>
              </Link>
            </Reveal>
          ))}
        </div>
      </SectionShell>
    );
  }

  if (variant === "rail") {
    return (
      <SectionShell id="briefing" density={density} bleed>
        <div className="mx-auto max-w-[1320px] px-5 md:px-8">{head}</div>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {brief.map((p, i) => (
            <Link key={p.slug} href={`/post/${p.slug}`} className="group w-[290px] shrink-0 snap-start md:w-[340px]">
              <article className="surface card-lift relative h-full overflow-hidden rounded-2xl p-5">
                <span className="font-latin absolute -right-1 -top-5 text-[5.5rem] font-bold leading-none text-white/[0.05]">{bn(i + 1)}</span>
                <span className="mono-label relative" style={{ color: "var(--accent)" }}>{p.category}</span>
                <h3 className="font-display-bn relative mt-3 line-clamp-3 text-[19px] leading-snug text-mist-100">{p.title}</h3>
                <p className="relative mt-3 line-clamp-3 text-[13px] leading-relaxed text-mist-400">{p.dek}</p>
                <span className="mono-label relative mt-4 block text-mist-400">{bn(p.readMinutes)} মিনিট পাঠ</span>
              </article>
            </Link>
          ))}
        </div>
      </SectionShell>
    );
  }

  if (variant === "numbered") {
    return (
      <SectionShell id="briefing" density={density}>
        {head}
        <ol className="mx-auto max-w-4xl border-t border-white/10">
          {brief.map((p, i) => (
            <Reveal key={p.slug} delay={i * 0.05} y={14}>
              <li>
                <Link href={`/post/${p.slug}`} className="group grid grid-cols-[auto_1fr_auto] items-start gap-5 border-b border-white/10 py-5 md:gap-8">
                  <span className="font-latin text-[2.6rem] font-bold leading-none text-white/[0.12] transition-colors group-hover:text-[var(--accent)]">{bn(String(i + 1).padStart(2, "0"))}</span>
                  <span>
                    <span className="mono-label block" style={{ color: "var(--accent)" }}>{p.category}</span>
                    <span className="font-display-bn mt-1.5 block text-[clamp(1.15rem,2.2vw,1.5rem)] leading-snug text-mist-100">{p.title}</span>
                    <span className="mt-1.5 line-clamp-2 block text-[13.5px] leading-relaxed text-mist-400">{p.dek}</span>
                  </span>
                  <ArrowUpRight className="mt-1 h-5 w-5 text-mist-400 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </li>
            </Reveal>
          ))}
        </ol>
      </SectionShell>
    );
  }

  if (variant === "minimal") {
    return (
      <SectionShell id="briefing" density={density} className="!py-10">
        <div className="surface mx-auto max-w-3xl rounded-2xl p-5 md:p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="mono-label text-mist-300">সকালের ব্রিফিং · মোট {bn(totalMinutes)} মিনিট</span>
            <button onClick={listen} className="mono-label flex items-center gap-1.5 text-mist-300 hover:text-mist-100">
              <Headphones className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} /> {speaking ? "বন্ধ" : "শুনুন"}
            </button>
          </div>
          <ul className="divide-y divide-white/8">
            {brief.map((p) => (
              <li key={p.slug}>
                <Link href={`/post/${p.slug}`} className="group flex items-center justify-between gap-4 py-3">
                  <span className="font-display-bn line-clamp-1 text-[16px] text-mist-100 group-hover:text-white">{p.title}</span>
                  <span className="mono-label shrink-0 text-mist-400">{bn(p.readMinutes)} মি</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell id="briefing" density={density}>
      <SectionHead
        kicker="▚ দৈনিক ব্রিফিং · সকাল ৭টা"
        title={<>আজকের <span className="text-gradient">সংক্ষিপ্ত ব্রিফিং</span></>}
        desc="দিনের সবচেয়ে গুরুত্বপূর্ণ যাচাইকৃত প্রতিবেদনগুলো এক জায়গায় — কম সময়ে পুরো চিত্র।"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="cool">
              <Clock3 className="h-3 w-3" /> মোট {bn(totalMinutes)} মিনিট পাঠ
            </Badge>
            <button
              onClick={listen}
              className="flex items-center gap-1.5 rounded-full border border-white/12 px-3.5 py-2 text-[12.5px] font-medium text-mist-200 transition-colors hover:border-white/25 hover:text-mist-100"
            >
              <Headphones className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
              {speaking ? "বন্ধ করুন" : "ব্রিফিং শুনুন"}
            </button>
          </div>
        }
      />

      <Reveal>
        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          {/* expandable brief list */}
          <div className="surface overflow-hidden rounded-2xl">
            {brief.map((p, i) => {
              const active = open === p.slug;
              return (
                <div key={p.slug} className="border-b border-white/6 last:border-0">
                  <button
                    onClick={() => {
                      playClick(active ? 520 : 760);
                      setOpen(active ? null : p.slug);
                    }}
                    className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    <span
                      className="font-latin mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[12px] font-bold text-ink-950"
                      style={{ background: i === 0 ? "var(--accent)" : "rgba(255,255,255,0.09)", color: i === 0 ? "#05060a" : "#d3dae7" }}
                    >
                      {bn(i + 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="mono-label block" style={{ color: "var(--accent)" }}>
                        {p.category} · {bn(p.readMinutes)} মিনিট
                      </span>
                      <span className="font-display-bn mt-1.5 block text-[17px] leading-snug text-mist-100">
                        {p.title}
                      </span>
                    </span>
                    <ChevronRight
                      className={clsx("mt-2 h-4 w-4 shrink-0 text-mist-400 transition-transform duration-400", active && "rotate-90")}
                    />
                  </button>
                  <div
                    className={clsx(
                      "grid transition-all duration-500",
                      active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 pb-5 pl-[4.25rem]"><p className="text-[14px] leading-relaxed text-mist-400">{p.dek}</p><Link href={`/post/${p.slug}`} className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-mist-100 hover:underline">পুরো প্রতিবেদন পড়ুন <ChevronRight className="h-3.5 w-3.5" /></Link></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* summary rail */}
          <div className="surface-hi flex flex-col justify-between rounded-2xl p-6">
            <div>
              <Badge tone="ok">
                <ShieldCheck className="h-3 w-3" /> সব ফ্যাক্ট-গেট পাস
              </Badge>
              <h3 className="font-display-bn mt-5 text-2xl leading-snug text-mist-100">
                আজ সবচেয়ে যাচাইকৃত ৫টি খবর
              </h3>
              <p className="mt-3 text-[13.5px] leading-relaxed text-mist-400">
                প্রতিটি প্রতিবেদন উৎস শনাক্ত, সংখ্যা মিলিয়ে দেখা এবং সম্পাদকীয় রিভিউ পেরিয়ে প্রকাশিত হয়েছে।
              </p>
            </div>

            <div className="mt-6 space-y-2.5">
              {brief.map((p) => (
                <div key={p.slug} className="flex items-center justify-between gap-3 rounded-lg border border-white/8 px-3 py-2.5">
                  <span className="truncate text-[12.5px] text-mist-300">{p.category}</span>
                  <span className="mono-label shrink-0 text-mint-400">{bn(p.factScore)}</span>
                </div>
              ))}
            </div>

            <Link
              href="#latest"
              className="group mt-6 flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-[13.5px] font-semibold text-mist-100 transition-all hover:border-white/25 hover:bg-white/[0.04]"
            >
              সম্পূর্ণ সংগ্রহ দেখুন
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

/* ══════════════════════════════════════════════════════════════
   ৩ · যাচাই একাডেমি — কীভাবে খবর যাচাই করবেন (educational)
   ══════════════════════════════════════════════════════════════ */

const ACADEMY_STEPS = [
  {
    n: "০১",
    title: "মূল উৎস শনাক্ত করুন",
    body: "খবরটি কোথা থেকে এসেছে? মূল পোস্ট, প্রকাশক বা বক্তব্যকারীকে চিহ্নিত করুন। উৎস অজানা হলে সেটি প্রথমই সতর্ক সংকেত।",
    check: "উৎসের নাম, পেজ বা বক্তার পরিচয় পেয়েছেন",
  },
  {
    n: "০২",
    title: "সময় ও স্থান মিলিয়ে দেখুন",
    body: "পোস্টের তারিখ ও ঘটনার স্থান মিলিয়ে দেখুন। পুরোনো ছবি নতুন ঘটনার নামে প্রচার হওয়া সবচেয়ে সাধারণ ভুল।",
    check: "তারিখ ও স্থান বর্তমান ঘটনার সঙ্গে সঙ্গতিপূর্ণ",
  },
  {
    n: "০৩",
    title: "ছবি বা ভিডিও যাচাই করুন",
    body: "রিভার্স ইমেজ সার্চে খুঁজে দেখুন ছবিটি আগে কোথাও ব্যবহৃত হয়েছে কি না। ভিডিও হলে ফ্রেমের প্রেক্ষাপট দেখুন।",
    check: "ছবি বা ভিডিও প্রথমবার প্রকাশ পাচ্ছে",
  },
  {
    n: "০৪",
    title: "সংখ্যা ও নাম মিলান",
    body: "অর্থের পরিমাণ, ক্ষতিগ্রস্তের সংখ্যা বা নাম — সংখ্যাতথ্য অন্য নির্ভরযোগ্য সূত্রে মিলিয়ে নিন।",
    check: "সংখ্যা ও নাম অন্য সূত্রেও মিলেছে",
  },
  {
    n: "০৫",
    title: "দাবি ও প্রমাণ আলাদা করুন",
    body: "কেউ যা বলছেন আর যা প্রমাণিত — দুটি আলাদা বিষয়। 'অভিযোগ' ও 'প্রমাণিত তথ্য' এক করে লিখবেন না।",
    check: "দাবি ও প্রমাণ আলাদাভাবে চিহ্নিত",
  },
];

const QUIZ = [
  {
    q: "একটি খবর শেয়ার করার আগে প্রথম কাজ কোনটি?",
    options: ["শিরোনাম পড়া", "মূল উৎস শনাক্ত করা", "লাইক সংখ্যা দেখা", "বন্ধুকে জিজ্ঞেস করা"],
    answer: 1,
    why: "মূল উৎস ছাড়া খবরের সত্যতা যাচাই করা অসম্ভব।",
  },
  {
    q: "পুরোনো ছবি নতুন ঘটনায় ব্যবহৃত হচ্ছে কি না — কীভাবে বুঝবেন?",
    options: ["ছবির রঙ দেখে", "রিভার্স ইমেজ সার্চ করে", "শেয়ার সংখ্যা দেখে", "ক্যাপশন পড়ে"],
    answer: 1,
    why: "রিভার্স সার্চে ছবির পূর্ববর্তী ব্যবহার ধরা পড়ে।",
  },
  {
    q: "কোনটি প্রমাণিত তথ্য নয়?",
    options: ["সরকারি নথি", "ময়নাতদন্ত প্রতিবেদন", "সামাজিক মাধ্যমের দাবি", "আদালতের রায়"],
    answer: 2,
    why: "সামাজিক মাধ্যমের দাবি অভিযোগ হতে পারে, প্রমাণ নয়।",
  },
];

function useAcademy() {
  const [done, setDone] = useState<number[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>(QUIZ.map(() => null));
  const score = answers.filter((a, i) => a !== null && a === QUIZ[i].answer).length;
  const attempted = answers.filter((a) => a !== null).length;
  const toggle = (i: number) => {
    playNodePing(680 + i * 90);
    setDone((old) => (old.includes(i) ? old.filter((x) => x !== i) : [...old, i]));
  };
  const reset = () => {
    playClick(600);
    setAnswers(QUIZ.map(() => null));
    setDone([]);
  };
  return { done, answers, setAnswers, score, attempted, toggle, reset };
}

type AcademyState = ReturnType<typeof useAcademy>;

function StepList({ a }: { a: AcademyState }) {
  return (
    <div className="surface overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/8 bg-white/[0.02] px-5 py-3">
        <span className="mono-label flex items-center gap-2 text-mist-300">
          <BookOpen className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} /> যাচাইয়ের পাঁচ ধাপ
        </span>
        <span className="mono-label text-mist-400">{bn(a.done.length)} / {bn(ACADEMY_STEPS.length)} সম্পন্ন</span>
      </div>
      <div className="h-1 w-full bg-white/8">
        <div className="h-full transition-all duration-700" style={{ width: `${(a.done.length / ACADEMY_STEPS.length) * 100}%`, background: "linear-gradient(90deg, var(--accent), #4ade80)" }} />
      </div>
      <ol className="divide-y divide-white/6">
        {ACADEMY_STEPS.map((step, i) => {
          const isDone = a.done.includes(i);
          return (
            <li key={step.n}>
              <button onClick={() => a.toggle(i)} className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]">
                <span className={clsx("mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-[12px] font-bold transition-all", isDone ? "border-transparent text-ink-950" : "border-white/12 text-mist-300")} style={isDone ? { background: "#4ade80" } : undefined}>
                  {isDone ? <Check className="h-4 w-4" /> : step.n}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={clsx("block text-[15.5px] font-semibold", isDone ? "text-mist-200" : "text-mist-100")}>{step.title}</span>
                  <span className="mt-1.5 block text-[13.5px] leading-relaxed text-mist-400">{step.body}</span>
                  <span className="mono-label mt-2 block text-mist-400">নিশ্চিত করুন → {step.check}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function QuizPanel({ a }: { a: AcademyState }) {
  return (
    <div className="surface-hi flex h-full flex-col rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <Badge tone="cool"><TriangleAlert className="h-3 w-3" /> নিজেকে যাচাই করুন</Badge>
        <span className="mono-label text-mist-400">স্কোর {bn(a.score)} / {bn(QUIZ.length)}</span>
      </div>
      <div className="mt-5 space-y-5">
        {QUIZ.map((q, qi) => {
          const picked = a.answers[qi];
          return (
            <div key={q.q}>
              <p className="text-[14.5px] font-semibold leading-snug text-mist-100">{bn(qi + 1)}. {q.q}</p>
              <div className="mt-2.5 grid gap-1.5">
                {q.options.map((opt, oi) => {
                  const isPicked = picked === oi;
                  const isCorrect = oi === q.answer;
                  const revealed = picked !== null;
                  return (
                    <button
                      key={opt}
                      onClick={() => {
                        playClick(revealed ? 480 : 840);
                        a.setAnswers((old) => old.map((x, i) => (i === qi ? oi : x)));
                      }}
                      className={clsx("flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left text-[13px] transition-all", revealed && isCorrect ? "border-mint-500/40 bg-mint-500/10 text-mint-400" : revealed && isPicked ? "border-rose-400/40 bg-rose-400/10 text-rose-400" : "border-white/8 text-mist-300 hover:border-white/22 hover:text-mist-100")}
                    >
                      <span className="mono-label opacity-70">{String.fromCharCode(65 + oi)}</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {picked !== null ? (
                <p className="mt-2 text-[12.5px] leading-relaxed text-mist-400">{picked === q.answer ? "✓ সঠিক। " : "✕ ভুল। "}{q.why}</p>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-auto pt-6">
        {a.attempted === QUIZ.length ? (
          <div className="rounded-xl p-4 text-center" style={{ background: a.score === QUIZ.length ? "rgba(74,222,128,0.12)" : "rgba(245,165,36,0.12)" }}>
            <p className="text-[14px] font-semibold text-mist-100">{a.score === QUIZ.length ? "দুর্দান্ত — আপনি যাচাইকারী হওয়ার পথে!" : "ভালো চেষ্টা — আবার পড়ে দেখুন।"}</p>
            <button onClick={a.reset} className="mono-label mt-2 text-mist-300 underline-offset-4 hover:underline">আবার শুরু করুন</button>
          </div>
        ) : (
          <p className="text-center text-[12.5px] text-mist-400">{bn(QUIZ.length - a.attempted)}টি প্রশ্ন বাকি — উত্তর দিয়ে আপনার স্কোর দেখুন।</p>
        )}
      </div>
    </div>
  );
}

export function Academy({ density = "comfortable", variant = "checklist" }: { density?: "compact" | "comfortable" | "spacious"; variant?: string }) {
  const a = useAcademy();
  const head = (
    <SectionHead
      kicker="▚ যাচাই একাডেমি · পাঠকের দক্ষতা"
      title={<>নিজেই হয়ে উঠুন <span className="text-gradient">যাচাইকারী</span></>}
      desc="হৈচৈর সম্পাদকীয় ডেস্ক যে পদ্ধতিতে খবর যাচাই করে, সেই পাঁচ ধাপ শিখে আপনিও ভুয়া খবর চিনতে পারবেন।"
      right={<Badge tone="violet"><GraduationCap className="h-3 w-3" /> মুক্ত পাঠ</Badge>}
    />
  );

  if (variant === "cards") {
    return (
      <SectionShell id="academy" density={density}>
        {head}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACADEMY_STEPS.map((step, i) => {
            const isDone = a.done.includes(i);
            return (
              <Reveal key={step.n} delay={i * 0.05}>
                <button onClick={() => a.toggle(i)} className={clsx("surface card-lift h-full w-full rounded-2xl p-5 text-left", isDone && "!border-mint-500/40")}>
                  <span className="flex items-center justify-between">
                    <span className="font-latin text-3xl font-bold text-white/[0.14]">{step.n}</span>
                    <span className={clsx("grid h-7 w-7 place-items-center rounded-full border", isDone ? "border-transparent text-ink-950" : "border-white/15 text-transparent")} style={isDone ? { background: "#4ade80" } : undefined}><Check className="h-4 w-4" /></span>
                  </span>
                  <span className="font-display-bn mt-3 block text-xl text-mist-100">{step.title}</span>
                  <span className="mt-2 block text-[13px] leading-relaxed text-mist-400">{step.body}</span>
                </button>
              </Reveal>
            );
          })}
          <Reveal delay={0.25}>
            <div className="surface-hi flex h-full flex-col justify-center rounded-2xl p-5 text-center">
              <GraduationCap className="mx-auto h-7 w-7" style={{ color: "var(--accent)" }} />
              <p className="font-display-bn mt-3 text-xl text-mist-100">{bn(a.done.length)} / {bn(ACADEMY_STEPS.length)} ধাপ শেষ</p>
              <a href="#academy-quiz" className="mono-label mt-2 text-mist-300 hover:text-mist-100">কুইজে যান ↓</a>
            </div>
          </Reveal>
        </div>
        <div id="academy-quiz" className="mt-6"><QuizPanel a={a} /></div>
      </SectionShell>
    );
  }

  if (variant === "quiz") {
    return (
      <SectionShell id="academy" density={density}>
        {head}
        <div className="mx-auto max-w-3xl"><QuizPanel a={a} /></div>
      </SectionShell>
    );
  }

  if (variant === "timeline") {
    return (
      <SectionShell id="academy" density={density}>
        {head}
        <div className="relative mx-auto max-w-3xl pl-10">
          <span aria-hidden className="absolute bottom-3 left-[15px] top-3 w-px bg-gradient-to-b from-[var(--accent)] via-white/15 to-transparent" />
          {ACADEMY_STEPS.map((step, i) => {
            const isDone = a.done.includes(i);
            return (
              <Reveal key={step.n} delay={i * 0.06}>
                <div className="relative pb-7">
                  <button onClick={() => a.toggle(i)} aria-label={step.title} className={clsx("absolute -left-10 top-0 grid h-8 w-8 place-items-center rounded-full border-2 text-[11px] font-bold transition-all", isDone ? "border-transparent text-ink-950" : "border-[var(--accent)] bg-ink-950 text-[var(--accent)]")} style={isDone ? { background: "#4ade80" } : undefined}>
                    {isDone ? <Check className="h-4 w-4" /> : bn(i + 1)}
                  </button>
                  <h3 className="font-display-bn text-xl text-mist-100">{step.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-mist-400">{step.body}</p>
                  <p className="mono-label mt-2 text-mist-400">নিশ্চিত করুন → {step.check}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
        <div className="mt-4"><QuizPanel a={a} /></div>
      </SectionShell>
    );
  }

  if (variant === "compact") {
    return (
      <SectionShell id="academy" density={density} className="!py-10">
        <div className="surface mx-auto max-w-4xl rounded-2xl p-5 md:p-6">
          <div className="mb-4 flex items-center gap-2"><GraduationCap className="h-4 w-4" style={{ color: "var(--accent)" }} /><h3 className="font-display-bn text-xl text-mist-100">খবর যাচাইয়ের পাঁচ নিয়ম</h3></div>
          <ol className="grid gap-2 sm:grid-cols-2">
            {ACADEMY_STEPS.map((step, i) => (
              <li key={step.n} className="flex gap-3 rounded-lg border border-white/8 px-3.5 py-3">
                <span className="font-latin text-[13px] font-bold" style={{ color: "var(--accent)" }}>{bn(i + 1)}</span>
                <span><span className="block text-[14px] font-semibold text-mist-100">{step.title}</span><span className="mt-0.5 block text-[12.5px] leading-relaxed text-mist-400">{step.check}</span></span>
              </li>
            ))}
          </ol>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell id="academy" density={density}>
      {head}
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Reveal><StepList a={a} /></Reveal>
        <Reveal delay={0.1}><QuizPanel a={a} /></Reveal>
      </div>
    </SectionShell>
  );
}
