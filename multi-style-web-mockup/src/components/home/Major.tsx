/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Mail,
  Send,
  ShieldCheck,
  Terminal as TerminalIcon,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { Badge, Btn, Heatmap, LiveDot, SectionHead, SectionShell } from "@/components/ui/primitives";
import { CountUp, Reveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { CategoryBarChart, ChartCard, DonutChart } from "@/components/charts";
import { CATEGORY_MIX, READ_HEATMAP, RUN_LOG, SERVICES } from "@/lib/data";
import { bn } from "@/lib/format";
import { subscribe } from "@/lib/subscribe";

/* ══════════════════ CATEGORIES ══════════════════ */
export function Categories({
  variant,
  density,
}: {
  variant: string;
  density: "compact" | "comfortable" | "spacious";
}) {
  if (variant === "chips") return <ChipCloud density={density} />;
  if (variant === "rank") return <RankBars density={density} />;
  if (variant === "tiles") return <CategoryTiles density={density} />;
  if (variant === "map") return <CategoryMap density={density} />;
  return <DonutPanel density={density} />;
}

function DonutPanel({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell id="categories" density={density}>
      <SectionHead
        kicker="▚ CATEGORY BREAKDOWN"
        title={<>কোন বিষয়ে <span className="text-gradient">কত প্রতিবেদন</span></>}
        desc="ডোনাটে মাউস রাখলে কেন্দ্রে সেই ক্যাটাগরির সংখ্যা আর মোট ফিডে তার ভাগ দেখা যাবে।"
      />
      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Reveal>
          <ChartCard title="বিষয় বণ্টন" sub="শেষ ৩০ দিন" height={300}>
            <DonutChart data={CATEGORY_MIX} height={300} />
          </ChartCard>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="surface h-full rounded-2xl p-6">
            <p className="mono-label mb-5 text-mist-400">DETAILS</p>
            <div className="divide-y divide-white/6">
              {CATEGORY_MIX.map((c, i) => (
                <div key={c.slug} id={`cat-${c.slug}`} className="group flex items-center gap-4 py-4">
                  <span className="font-latin w-6 text-[13px] font-semibold text-mist-400/70">{bn(String(i + 1).padStart(2, "0"))}</span>
                  <span className="h-9 w-1 rounded-full transition-all duration-500 group-hover:h-11" style={{ background: c.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-mist-100">{c.name}</p>
                    <p className="mono-label mt-0.5 text-mist-400">{c.tone} PRIORITY</p>
                  </div>
                  <div className="hidden w-32 sm:block">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(c.value / 42) * 100}%`, background: c.color }} />
                    </div>
                  </div>
                  <span className="font-latin w-12 text-right text-xl font-bold" style={{ color: c.color }}>
                    <CountUp value={c.value} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </SectionShell>
  );
}

function ChipCloud({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  const chips = CATEGORY_MIX.flatMap((c) => [
    { ...c, kind: "verify", label: `${c.name} · যাচাইকৃত`, size: c.value },
    { ...c, kind: "queue", label: `${c.name} · কিউ`, size: Math.round(c.value * 0.6) },
  ]).sort((a, b) => b.size - a.size);

  return (
    <SectionShell id="categories" density={density}>
      <SectionHead
        kicker="▚ TAG CLOUD"
        title={<>বিষয়ের <span className="text-gradient">চিপ ক্লাউড</span></>}
        desc="চিপের আকার বলে দেয় সেই বিষয়ে কত রেকর্ড জমেছে।"
      />
      <Reveal>
        <div className="surface rounded-2xl p-6 md:p-9">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {chips.map((c) => (
              <span
                key={`${c.slug}-${c.kind}`}
                className="group cursor-default rounded-full border px-4 py-2 transition-all duration-400 hover:-translate-y-1"
                style={{
                  borderColor: `${c.color}55`,
                  background: `${c.color}14`,
                  fontSize: `${Math.max(12, Math.min(23, 11 + c.size / 4.4))}px`,
                }}
              >
                <span className="text-mist-100 transition-colors group-hover:text-white">{c.label}</span>
                <span className="font-latin ml-2 text-[12px] font-bold" style={{ color: c.color }}>
                  {bn(c.size)}
                </span>
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-5 border-t border-white/8 pt-6">
            {CATEGORY_MIX.map((c) => (
              <span key={c.slug} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                <span className="mono-label text-mist-400">{c.name}</span>
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

function RankBars({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  const max = Math.max(...CATEGORY_MIX.map((c) => c.value));
  return (
    <SectionShell id="categories" density={density}>
      <SectionHead
        kicker="▚ RANKING TABLE"
        title={<>ক্যাটাগরি <span className="text-gradient">র‍্যাংকিং</span></>}
        desc="সর্বাধিক সংগৃহীত বিষয় থেকে কম সংগৃহীত বিষয় পর্যন্ত সাজানো।"
        right={<Badge tone="cool">LAST 30 DAYS</Badge>}
      />
      <Reveal>
        <div className="surface overflow-hidden rounded-2xl">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-white/8 bg-white/[0.02] px-5 py-3">
            <span className="mono-label w-8 text-mist-400">#</span>
            <span className="mono-label text-mist-400">CATEGORY / VOLUME</span>
            <span className="mono-label w-24 text-right text-mist-400">RECORDS</span>
          </div>
          {CATEGORY_MIX.map((c, i) => (
            <div key={c.slug} className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-white/6 px-5 py-4 last:border-0 transition-colors hover:bg-white/[0.03]">
              <span className="font-latin w-8 text-[13px] font-bold text-mist-400/70 group-hover:text-mist-100">
                {bn(String(i + 1).padStart(2, "0"))}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-semibold text-mist-100">{c.name}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/6">
                  <div
                    className="h-full rounded-full transition-all duration-1000 group-hover:brightness-125"
                    style={{ width: `${(c.value / max) * 100}%`, background: `linear-gradient(90deg, ${c.color}, ${c.color}66)` }}
                  />
                </div>
              </div>
              <span className="font-latin w-24 text-right text-lg font-bold tabular-nums" style={{ color: c.color }}>
                <CountUp value={c.value} />
              </span>
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal delay={0.12} className="mt-4">
        <ChartCard title="গ্রাফে একই র‍্যাংকিং" sub="অনুভূমিক বার" height={260}>
          <CategoryBarChart data={CATEGORY_MIX} height={260} horizontal />
        </ChartCard>
      </Reveal>
    </SectionShell>
  );
}

function CategoryTiles({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell id="categories" density={density}>
      <SectionHead kicker="▚ BENTO CATEGORIES" title={<>বিষয়ভিত্তিক <span className="text-gradient">টাইলস</span></>} desc="প্রতিটি বিভাগের মোট রেকর্ড ও সক্রিয় অগ্রাধিকার।" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORY_MIX.map((c) => (
          <div key={c.slug} className="surface card-lift rounded-2xl p-6 relative overflow-hidden">
            <span className="mono-label" style={{ color: c.color }}>{c.tone}</span>
            <h3 className="font-display-bn mt-3 text-2xl text-mist-100">{c.name}</h3>
            <p className="font-latin mt-4 text-3xl font-bold" style={{ color: c.color }}><CountUp value={c.value} /> <span className="text-sm font-normal text-mist-400">রেকর্ড</span></p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function CategoryMap({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell id="categories" density={density}>
      <SectionHead kicker="▚ TOPIC MATRIX" title={<>ক্যাটাগরি <span className="text-gradient">পরিসংখ্যান সারণি</span></>} />
      <div className="surface rounded-2xl p-6">
        <div className="space-y-3">
          {CATEGORY_MIX.map((c) => (
            <div key={c.slug} className="flex items-center justify-between border-b border-white/6 pb-3">
              <span className="text-[15px] font-semibold text-mist-100">{c.name}</span>
              <span className="mono-label text-mint-400">যাচাইকৃত {bn(Math.round(c.value * 0.7))} · কিউ {bn(Math.round(c.value * 0.3))}</span>
              <span className="font-latin font-bold" style={{ color: c.color }}>{bn(c.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

/* ══════════════════ SYSTEM HEALTH ══════════════════ */
export function SystemHealth({
  variant,
  density,
}: {
  variant: string;
  density: "compact" | "comfortable" | "spacious";
}) {
  if (variant === "log") return <RunLogTable density={density} />;
  if (variant === "service") return <ServiceCards density={density} />;
  if (variant === "heatmap") return <HeatmapOnly density={density} />;
  if (variant === "uptime") return <UptimeGauges density={density} />;
  return <MonitorGrid density={density} />;
}

const STATUS_ICON = {
  operational: Check,
  degraded: TriangleAlert,
  maintenance: Wrench,
} as const;

function MonitorGrid({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell id="system-health" density={density}>
      <SectionHead
        kicker="▚ SYSTEM MONITOR"
        title={<>সিস্টেম <span className="text-gradient">স্বাস্থ্য</span></>}
        desc="প্রতিটি সার্ভিসের লেটেন্সি, আপটাইম আর পাঠকের পড়ার সময়ের হিটম্যাপ।"
        right={
          <Badge tone="ok">
            <LiveDot /> ALL CORE SYSTEMS LIVE
          </Badge>
        }
      />
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => {
          const tone = s.status === "operational" ? "ok" : s.status === "degraded" ? "warn" : "cool";
          const color = s.status === "operational" ? "#4ade80" : s.status === "degraded" ? "#f5a524" : "#56c8ff";
          const Icon = STATUS_ICON[s.status as keyof typeof STATUS_ICON] ?? Check;
          return (
            <StaggerItem key={s.name}>
              <div className="surface card-lift group relative overflow-hidden rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-semibold text-mist-100">{s.name}</p>
                    <p className="mono-label mt-1 text-mist-400">{s.note}</p>
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: `${color}18`, color }}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="mono-label text-mist-400">LATENCY</p>
                    <p className="font-latin mt-1 text-2xl font-bold text-mist-100">
                      {bn(s.latency)}
                      <span className="text-[13px] text-mist-400"> ms</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="mono-label text-mist-400">UPTIME</p>
                    <p className="font-latin mt-1 text-2xl font-bold" style={{ color }}>
                      <CountUp value={s.uptime} decimals={2} suffix="%" />
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-[3px]">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <span
                      key={i}
                      className="h-6 flex-1 rounded-[2px] transition-all duration-300 group-hover:h-8"
                      style={{
                        background: i % 7 === 3 && s.status !== "operational" ? "#f5a524" : `${color}${i % 4 === 0 ? "cc" : "55"}`,
                        opacity: 0.35 + (i / 24) * 0.65,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-3">
                  <Badge tone={tone}>{s.status === "operational" ? "সক্রিয়" : s.status === "degraded" ? "ধীর" : "রক্ষণাবেক্ষণ"}</Badge>
                </div>
              </div>
            </StaggerItem>
          );
        })}
      </Stagger>

      <Reveal delay={0.1} className="mt-4">
        <div className="surface rounded-2xl p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="mono-label text-mist-400">READING HEATMAP</p>
              <p className="mt-1 text-[14px] text-mist-200">সপ্তাহের কোন দিন, কোন ঘণ্টায় পাঠক বেশি পড়েন</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="mono-label text-mist-400">কম</span>
              {[0.15, 0.35, 0.55, 0.75, 1].map((o) => (
                <span key={o} className="h-3.5 w-6 rounded-[3px]" style={{ background: "var(--accent)", opacity: o }} />
              ))}
              <span className="mono-label text-mist-400">বেশি</span>
            </div>
          </div>
          <Heatmap rows={READ_HEATMAP} />
        </div>
      </Reveal>
    </SectionShell>
  );
}

function RunLogTable({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell id="system-health" density={density}>
      <SectionHead
        kicker="▚ RUN LOG · LAST 8 ENTRIES"
        title={<>পাইপলাইন <span className="text-gradient">রান লগ</span></>}
        desc="প্রতিটি ধাপের সময়, প্রসেস করা আইটেম ও ফলাফল — কাঁচা লগ ফরম্যাটে।"
      />
      <Reveal>
        <div className="surface overflow-hidden rounded-2xl">
          <div className="grid grid-cols-[1.1fr_1fr_0.7fr_0.7fr_0.6fr] gap-3 border-b border-white/8 bg-white/[0.02] px-5 py-3">
            {["RUN ID", "STEP", "ITEMS", "DURATION", "RESULT"].map((h) => (
              <span key={h} className="mono-label text-mist-400">
                {h}
              </span>
            ))}
          </div>
          {RUN_LOG.map((r, i) => (
            <div
              key={r.id}
              className={clsx(
                "grid grid-cols-[1.1fr_1fr_0.7fr_0.7fr_0.6fr] items-center gap-3 border-b border-white/6 px-5 py-3.5 font-mono text-[12.5px] transition-colors last:border-0 hover:bg-white/[0.03]",
                i % 2 === 1 && "bg-white/[0.012]",
              )}
            >
              <span className="truncate text-mist-300">{r.id}</span>
              <span className="text-mist-100">{r.step}</span>
              <span className="text-mist-400">{bn(r.items)}</span>
              <span className="text-mist-400">{r.dur}</span>
              <span className={r.ok ? "text-mint-400" : "text-rose-400"}>{r.ok ? "OK" : "FAIL"}</span>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 bg-ink-950/60 px-5 py-4">
            <span className="mono-label flex items-center gap-2 text-mist-400">
              <LiveDot /> STREAMING · প্রতি ১০ সেকেন্ডে
            </span>
            <Btn href="/admin" variant="outline" icon={false}>
              <ShieldCheck className="h-4 w-4" /> পাইপলাইন কনফিগ
            </Btn>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

function ServiceCards({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell id="system-health" density={density}>
      <SectionHead kicker="SERVICES TELEMETRY" title={<>সার্ভিস <span className="text-gradient">কার্ড সারি</span></>} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <div key={s.name} className="surface rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-mist-100">{s.name}</p>
              <LiveDot tone={s.status === "operational" ? "ok" : "warn"} />
            </div>
            <p className="mono-label mt-3 text-mist-400">UPTIME: {bn(s.uptime)}% · {bn(s.latency)}ms</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function HeatmapOnly({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell id="system-health" density={density}>
      <SectionHead kicker="READERSHIP ACTIVITY" title={<>সাপ্তাহিক <span className="text-gradient">সচলতা মানচিত্র</span></>} />
      <div className="surface rounded-3xl p-6 md:p-8">
        <Heatmap rows={READ_HEATMAP} />
      </div>
    </SectionShell>
  );
}

function UptimeGauges({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell id="system-health" density={density}>
      <SectionHead kicker="SYSTEM RELIABILITY" title={<>আপটাইম <span className="text-gradient">সূচক ও স্বাস্থ্য</span></>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.slice(0, 4).map((s) => (
          <div key={s.name} className="surface-hi card-lift rounded-2xl p-6 text-center">
            <p className="font-latin text-3xl font-bold text-mint-400">{bn(s.uptime)}%</p>
            <p className="mt-2 text-[14px] font-semibold text-mist-100">{s.name}</p>
            <p className="mono-label mt-1 text-mist-400">{s.note}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ══════════════════ NEWSLETTER ══════════════════ */
export function Newsletter({
  variant,
  density,
}: {
  variant: string;
  density: "compact" | "comfortable" | "spacious";
}) {
  if (variant === "terminal") return <TerminalForm density={density} />;
  if (variant === "split") return <SplitGlow density={density} />;
  if (variant === "editorial") return <EditorialLetter density={density} />;
  if (variant === "minimal") return <MinimalNewsletter density={density} />;
  return <CtaBand density={density} />;
}

function SubscribeForm({ dark = false, source = "home" }: { dark?: boolean; source?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const sent = state === "done";
  return (
    <div className="w-full max-w-md">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (state === "busy") return;
          setState("busy");
          setMsg("");
          const r = await subscribe(email, source);
          if (r.ok) {
            setState("done");
            setMsg(r.already ? "এই ইমেইল আগেই যুক্ত আছে — ধন্যবাদ!" : "যুক্ত হয়েছে — সকাল ৭টার ডাইজেস্টে দেখা হবে।");
            setEmail("");
          } else {
            setState("error");
            setMsg(r.error ?? "সম্পন্ন করা যায়নি");
          }
        }}
        className="flex w-full items-center gap-2"
      >
        <div className={clsx("flex flex-1 items-center gap-2 rounded-full border px-4 py-2.5", dark ? "border-white/15 bg-white/[0.06]" : "border-white/10 bg-ink-950/60")}>
          <Mail className="h-4 w-4 shrink-0 text-mist-400" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state !== "idle") setState("idle");
            }}
            placeholder="আপনার ইমেইল"
            aria-label="ইমেইল ঠিকানা"
            className="w-full bg-transparent text-[14px] text-mist-100 outline-none placeholder:text-mist-400/70"
          />
        </div>
        <button
          type="submit"
          disabled={state === "busy"}
          className="sheen flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-semibold text-ink-950 transition-all hover:brightness-110 disabled:opacity-60"
          style={{ background: dark ? "#0b0e16" : "var(--accent)", color: dark ? "#eef1f7" : "#05060a" }}
        >
          {sent ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          {state === "busy" ? "পাঠানো হচ্ছে…" : sent ? "যুক্ত হয়েছে" : "সাবস্ক্রাইব"}
        </button>
      </form>
      <p aria-live="polite" className={clsx("mt-2 min-h-[1.1rem] pl-2 text-[12.5px]", state === "error" ? "text-rose-400" : dark ? "text-[#0b0e16]/80" : "text-mint-400")}>
        {msg}
      </p>
    </div>
  );
}

function CtaBand({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell id="newsletter" density={density}>
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-white/10">
          <div className="absolute inset-0" style={{ background: "linear-gradient(115deg, var(--accent), #f5a524 45%, #7c2d12 100%)" }} />
          <div aria-hidden className="grid-bg absolute inset-0 opacity-25" />
          <img src="/images/newsroom.jpg" alt="" className="ken-burns absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-luminosity" />
          <div className="relative flex flex-col items-start gap-8 p-8 md:flex-row md:items-center md:justify-between md:p-14">
            <div className="max-w-xl">
              <span className="mono-label text-ink-950/70">DAILY DIGEST · 07:00 BST</span>
              <h2 className="font-display-bn mt-3 text-[clamp(1.9rem,4vw,3rem)] leading-tight text-ink-950">
                প্রতিদিন সকালে যাচাই করা খবর, সরাসরি ইনবক্সে।
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-950/75">
                বিজ্ঞাপন নেই, ট্র্যাকিং নেই — শুধু হৈচৈ ডেস্কের সম্পাদিত সংক্ষিপ্তসার আর দিনের সেরা গ্রাফ।
              </p>
            </div>
            <div className="w-full max-w-md">
              <SubscribeForm dark />
              <p className="mono-label mt-4 text-ink-950/60">
                ইতিমধ্যে <span className="font-bold">{bn(4280)}</span> জন সাবস্ক্রাইবার
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

function TerminalForm({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  const [line, setLine] = useState("$ hoichoi subscribe --digest=daily");
  return (
    <SectionShell id="newsletter" density={density}>
      <Reveal>
        <div className="surface-hi overflow-hidden rounded-2xl">
          <div className="flex items-center gap-2 border-b border-white/8 bg-ink-950/70 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-gold-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-mint-400/80" />
            <span className="mono-label ml-2 text-mist-400">subscribe — hoichoi-cli</span>
            <TerminalIcon className="ml-auto h-3.5 w-3.5 text-mist-400" />
          </div>
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-9">
            <div>
              <p className="font-mono text-[13px] leading-relaxed text-mist-300">
                <span className="text-mint-400">➜</span> <span style={{ color: "var(--accent)" }}>~</span> {line}
                <span className="caret ml-1">▊</span>
              </p>
              <h2 className="font-display-bn mt-4 text-3xl leading-tight text-mist-100">
                কমান্ড লাইন থেকেই সাবস্ক্রাইব।
              </h2>
              <p className="mt-2 text-[14px] text-mist-400">
                ইমেইল লিখে Enter চাপুন — <span className="font-mono text-mist-200">--digest=daily</span> ফ্ল্যাগসহ প্রতিদিন
                সকাল ৭টায় ডাইজেস্ট যাবে।
              </p>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const el = e.currentTarget.elements.namedItem("email") as HTMLInputElement | null;
                setLine("$ hoichoi subscribe … sending");
                const r = await subscribe(el?.value ?? "", "terminal");
                setLine(r.ok ? (r.already ? "$ ✓ already subscribed" : "$ ✓ subscribed · digest scheduled 07:00 BST") : `$ ✗ ${r.error ?? "failed"}`);
                if (r.ok && el) el.value = "";
              }}
              className="flex w-full max-w-sm items-center gap-2 rounded-xl border border-white/10 bg-ink-950/70 p-2 font-mono"
            >
              <span className="pl-2 text-[13px] text-mist-400">❯</span>
              <input
                required
                name="email"
                type="email"
                placeholder="you@domain.com"
                className="w-full bg-transparent text-[13px] text-mint-400 outline-none placeholder:text-mist-400/50"
              />
              <button type="submit" className="mono-label shrink-0 rounded-lg px-3 py-2 text-ink-950 transition-all hover:brightness-110" style={{ background: "var(--accent)" }}>
                RUN
              </button>
            </form>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

function SplitGlow({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  const [open, setOpen] = useState(false);
  return (
    <SectionShell id="newsletter" density={density}>
      <Reveal>
        <div className="grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 lg:grid-cols-2">
          <div className="relative bg-ink-900 p-8 md:p-12">
            <div aria-hidden className="absolute -left-20 top-0 h-64 w-64 rounded-full opacity-25 blur-3xl" style={{ background: "var(--accent)" }} />
            <div className="relative">
              <span className="mono-label" style={{ color: "var(--accent)" }}>
                HOICHOI DESK · NEWSLETTER
              </span>
              <h2 className="font-display-bn mt-4 text-[clamp(1.9rem,3.6vw,2.9rem)] leading-tight text-mist-100">
                শহরের হৈচৈ প্রতিদিন সকালে আপনার ইনবক্সে।
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-mist-400">
                দিনের সবচেয়ে যাচাইকৃত পাঁচটি প্রতিবেদন, এক নজরের গ্রাফ আর পাইপলাইন রিপোর্ট — এক ইমেইলে।
              </p>
              <ul className="mt-7 space-y-2.5">
                {["সম্পাদকীয় ডেস্কের বাছাই করা খবর", "দিনের সেরা ডেটা ভিজ্যুয়ালাইজেশন", "যেকোনো সময় এক ক্লিকে বন্ধ"].map((x) => (
                  <li key={x} className="flex items-center gap-2.5 text-[14px] text-mist-300">
                    <span className="grid h-5 w-5 place-items-center rounded-full" style={{ background: "var(--accent-soft)" }}>
                      <Check className="h-3 w-3" style={{ color: "var(--accent)" }} />
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="relative flex flex-col justify-center bg-ink-950 p-8 md:p-12">
            <SubscribeForm />
            <div className="mt-8 rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <p className="mono-label mb-3 text-mist-400">PREVIEW · আজকের ডাইজেস্ট</p>
              <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
                <span className="text-[14px] font-medium text-mist-100">৫টি শিরোনাম, ৩টি গ্রাফ</span>
                <ChevronDown className={clsx("h-4 w-4 text-mist-400 transition-transform duration-400", open && "rotate-180")} />
              </button>
              <div className={clsx("grid transition-all duration-500", open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                <div className="overflow-hidden">
                  <div className="space-y-2">
                    {CATEGORY_MIX.slice(0, 4).map((c) => (
                      <div key={c.slug} className="flex items-center gap-3">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
                        <span className="text-[13px] text-mist-300">{c.name}</span>
                        <span className="mono-label ml-auto text-mist-400">{bn(c.value)} টি</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t border-white/8 pt-3">
                    <ArrowRight className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
                    <span className="mono-label text-mist-400">সম্পূর্ণ ডাইজেস্ট · সকাল ৭:০০</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

function EditorialLetter({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell id="newsletter" density={density}>
      <Reveal>
        <div className="surface mx-auto max-w-3xl rounded-3xl p-8 md:p-12 text-center">
          <p className="mono-label" style={{ color: "var(--accent)" }}>সম্পাদকীয় বার্তা</p>
          <h2 className="font-display-bn mt-3 text-3xl md:text-4xl text-mist-100">প্রতিদিনের সেরা যাচাই, সরাসরি আপনার ঠিকানায়</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-mist-300">
            আমরা বিজ্ঞাপনের পেছনে ছুটি না—ছুটি সত্য তথ্যের পেছনে। সকাল ৭টায় একটি মাত্র চিঠিতে পান দিনের সারসংক্ষেপ।
          </p>
          <div className="mt-8 flex justify-center">
            <SubscribeForm />
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

function MinimalNewsletter({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell id="newsletter" density={density} className="!py-8">
      <Reveal>
        <div className="surface mx-auto flex max-w-4xl flex-col items-center justify-between gap-6 rounded-2xl p-6 sm:flex-row md:p-8">
          <div>
            <p className="font-display-bn text-xl text-mist-100">হৈচৈ নিউজলেটার</p>
            <p className="text-[13px] text-mist-400 mt-1">সকাল ৭টায় সংক্ষিপ্ত বাংলা ডাইজেস্ট</p>
          </div>
          <SubscribeForm />
        </div>
      </Reveal>
    </SectionShell>
  );
}
