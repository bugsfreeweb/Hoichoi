"use client";

import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, CircleDot } from "lucide-react";
import { Badge, Btn, Funnel, LiveDot, SectionHead, SectionShell } from "@/components/mv/ui/primitives";
import { Reveal, Spotlight, Stagger, StaggerItem } from "@/components/mv/ui/motion";
import { FUNNEL_STAGES, PIPELINE_STEPS } from "@/lib/mv/data";
import { bn } from "@/lib/mv/format";

import { RUN_LOG } from "@/lib/mv/data";

export default function Pipeline({
  variant,
  density,
}: {
  variant: string;
  density: "compact" | "comfortable" | "spacious";
}) {
  if (variant === "blueprint") return <BlueprintSteps density={density} />;
  if (variant === "funnel") return <FunnelVariant density={density} />;
  if (variant === "steps") return <VerticalSteps density={density} />;
  if (variant === "terminal") return <TerminalPipeline density={density} />;
  return <FlowLine density={density} />;
}

/* ── variant 1 · flow line with travelling dot ───────────────────────────── */
function FlowLine({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell id="pipeline" density={density}>
      <SectionHead
        kicker="AUTOMATION PIPELINE · EVERY 2 HOURS"
        title={<>ফিড থেকে লাইভ — ছয় ধাপ, <span className="text-gradient">শূন্য ছোঁয়া।</span></>}
        desc="আলোর বিন্দুটি রাস্তাটা দেখিয়ে দিচ্ছে — প্রতিটি রানে ডেটা ঠিক এই পথ ধরে এগোয়: সোর্স থেকে শট, শট থেকে হ্যাশ, হ্যাশ পেরোলে লেখা, লেখা শেষে সোজা প্রোডাকশনে।"
        right={<Btn href="/admin" variant="outline">পুরো ব্লুপ্রিন্ট</Btn>}
      />

      <Reveal>
        <div className="surface relative overflow-hidden rounded-2xl p-6 md:p-10">
          <svg viewBox="0 0 1200 90" className="hidden w-full md:block" aria-hidden>
            <defs>
              <linearGradient id="flowGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ff5c38" stopOpacity="0.15" />
                <stop offset="50%" stopColor="#f5a524" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#4ade80" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            <path id="flowPath" d="M40,45 H1160" stroke="url(#flowGrad)" strokeWidth="2" fill="none" />
            <path d="M40,45 H1160" stroke="rgba(255,255,255,0.22)" strokeWidth="1.4" fill="none" className="dash-flow" />
            <circle r="5" fill="var(--accent)">
              <animateMotion dur="6s" repeatCount="indefinite" path="M40,45 H1160" />
            </circle>
            <circle r="11" fill="var(--accent)" opacity="0.22">
              <animateMotion dur="6s" repeatCount="indefinite" path="M40,45 H1160" />
            </circle>
            {PIPELINE_STEPS.map((_, i) => {
              const x = 40 + (1120 / 5) * i;
              return <circle key={i} cx={x} cy={45} r={i === 0 || i === 5 ? 7 : 5} fill="#0b0e16" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6" />;
            })}
          </svg>

          <div className="grid gap-4 md:grid-cols-6 md:gap-3">
            {PIPELINE_STEPS.map((s, i) => (
              <Reveal key={s.key} delay={i * 0.09}>
                <div className="group relative">
                  <div className="mb-3 flex items-center gap-2 md:hidden">
                    <span className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold text-ink-950" style={{ background: "var(--accent)" }}>
                      {s.n}
                    </span>
                    {i < PIPELINE_STEPS.length - 1 ? <ArrowRight className="h-3.5 w-3.5 text-mist-400" /> : null}
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 transition-all duration-500 group-hover:-translate-y-1.5 group-hover:border-white/22 group-hover:bg-white/[0.05]">
                    <div className="flex items-center justify-between">
                      <span className="mono-label text-mist-400">{s.n}</span>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: i === 5 ? "#4ade80" : "var(--accent)" }} />
                    </div>
                    <p className="font-display-bn mt-2.5 text-[17px] leading-snug text-mist-100">{s.title}</p>
                    <p className="mono-label mt-2 text-mist-400">{s.sub}</p>
                    <p className="mt-3 text-[12.5px] leading-relaxed text-mist-400 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                      {s.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/8 pt-6">
            <Badge tone="ok">
              <LiveDot /> LAST RUN OK
            </Badge>
            <span className="mono-label text-mist-400">সর্বশেষ রান · {bn(11)}:{bn(58)} AM</span>
            <Link href="#live-insights" className="mono-label ml-auto flex items-center gap-1.5 text-mist-200 transition-colors hover:text-white">
              রান মেট্রিক্স দেখুন <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

/* ── variant 2 · blueprint steps ───────────────────────────── */
function BlueprintSteps({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell id="pipeline" density={density}>
      <SectionHead
        kicker="BLUEPRINT · 6 STAGES"
        title={<>পাইপলাইনের <span className="text-gradient">ব্লুপ্রিন্ট</span></>}
        desc="প্রতিটি ধাপ আলাদাভাবে লগ করা, আলাদাভাবে ব্যর্থ হতে পারে — এবং আলাদাভাবে রিট্রাই হয়।"
        right={
          <span className="mono-label flex items-center gap-2 text-mist-400">
            <CircleDot className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} /> SHA-256 × SIMHASH × LLM
          </span>
        }
      />
      <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PIPELINE_STEPS.map((s) => (
          <StaggerItem key={s.key}>
            <Spotlight className="h-full">
              <div className="surface-hi relative h-full overflow-hidden rounded-2xl p-6">
                <span className="font-latin absolute -right-2 -top-5 text-[6rem] font-bold leading-none text-white/[0.035]">
                  {s.n}
                </span>
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg text-[11px] font-bold text-ink-950" style={{ background: "var(--accent)" }}>
                      {s.n}
                    </span>
                    <span className="mono-label text-mist-400">{s.key}</span>
                  </div>
                  <h3 className="font-display-bn mt-4 text-xl text-mist-100">{s.title}</h3>
                  <p className="mono-label mt-1.5 text-mist-300">{s.sub}</p>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-mist-400">{s.body}</p>
                  <div className="mt-5 h-px w-full bg-gradient-to-r from-white/20 to-transparent" />
                </div>
              </div>
            </Spotlight>
          </StaggerItem>
        ))}
      </Stagger>
    </SectionShell>
  );
}

/* ── variant 3 · conversion funnel ───────────────────────────── */
function FunnelVariant({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell id="pipeline" density={density}>
      <SectionHead
        kicker="CONVERSION FUNNEL · LAST 30 DAYS"
        title={<>সংগ্রহ থেকে প্রকাশ — <span className="text-gradient">কতটুকু টিকে থাকে</span></>}
        desc="৪১২টি সংগৃহীত রেকর্ডের মধ্যে কতগুলো হ্যাশ-গেট পেরোয়, কতগুলো রিরাইট হয়, আর কতগুলো শেষ পর্যন্ত প্রকাশিত হয়।"
      />
      <div className={clsx("grid gap-6 lg:grid-cols-[1.25fr_0.75fr]")}>
        <Reveal>
          <div className="surface h-full rounded-2xl p-6 md:p-8">
            <Funnel stages={FUNNEL_STAGES} />
          </div>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="surface-hi flex h-full flex-col justify-between rounded-2xl p-6">
            <div>
              <p className="mono-label text-mist-400">OVERALL YIELD</p>
              <p className="font-latin mt-3 text-[4.5rem] font-bold leading-none text-mist-100">
                {bn(21)}
                <span className="text-3xl" style={{ color: "var(--accent)" }}>%</span>
              </p>
              <p className="mt-3 text-[13.5px] leading-relaxed text-mist-400">
                প্রতি পাঁচটি সংগৃহীত রেকর্ডের একটি প্রকাশিত প্রতিবেদনে রূপান্তরিত হয়। বাকিগুলো ডুপ্লিকেট গেটে আটকায়
                অথবা ফ্যাক্ট-গেট স্কোর ০.৯০-এর নিচে থাকে।
              </p>
            </div>
            <div className="mt-6 space-y-2.5">
              {FUNNEL_STAGES.slice(0, 3).map((f) => (
                <div key={f.key} className="flex items-center justify-between rounded-lg border border-white/8 px-3 py-2">
                  <span className="mono-label text-mist-400">{f.key}</span>
                  <span className="font-latin text-[13px] font-semibold text-mist-100">{bn(f.count)}</span>
                </div>
              ))}
            </div>
            <Btn href="#live-insights" variant="outline" className="mt-6 w-full justify-center">
              বিস্তারিত মেট্রিক্স
            </Btn>
          </div>
        </Reveal>
      </div>
    </SectionShell>
  );
}

/* ── variant 4 · vertical editorial steps ───────────────────────────── */
function VerticalSteps({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell id="pipeline" density={density}>
      <SectionHead
        kicker="EDITORIAL WORKFLOW"
        title={<>ধাপে ধাপে <span className="text-gradient">যাচাই ও প্রকাশ</span></>}
        desc="প্রতিটি খবরের পেছনে ছয়টি ধারাবাহিক সম্পাদকীয় ও প্রযুক্তিগত ধাপ।"
      />
      <div className="mx-auto max-w-3xl space-y-4">
        {PIPELINE_STEPS.map((s, i) => (
          <Reveal key={s.key} delay={i * 0.05}>
            <div className="surface card-lift flex items-start gap-4 rounded-2xl p-6">
              <span className="font-latin grid h-10 w-10 shrink-0 place-items-center rounded-xl text-base font-bold text-ink-950" style={{ background: "var(--accent)" }}>
                {s.n}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display-bn text-xl text-mist-100">{s.title}</h3>
                  <span className="mono-label text-mist-400">· {s.sub}</span>
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-mist-300">{s.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

/* ── variant 5 · cyber terminal pipeline ───────────────────────────── */
function TerminalPipeline({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell id="pipeline" density={density}>
      <SectionHead
        kicker="TERMINAL TELEMETRY"
        title={<>পাইপলাইন <span className="text-gradient">লাইভ রান-লগ</span></>}
        desc="প্রতিটি রানের লাইভ টার্মিনাল লগ ও এক্সিকিউশন টাইম।"
      />
      <Reveal>
        <div className="surface-hi overflow-hidden rounded-2xl">
          <div className="flex items-center gap-2 border-b border-white/8 bg-ink-950/80 px-5 py-3">
            <span className="h-3 w-3 rounded-full bg-rose-400/80" />
            <span className="h-3 w-3 rounded-full bg-gold-400/80" />
            <span className="h-3 w-3 rounded-full bg-mint-400/80" />
            <span className="mono-label ml-2 text-mist-400">hoichoi@pipeline:~$ live_feed --watch</span>
          </div>
          <div className="p-6 font-mono text-[13px] leading-relaxed text-mist-300 space-y-2">
            {RUN_LOG.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/4 pb-2">
                <span className="text-mist-400">{r.at}</span>
                <span className="text-mint-400 font-bold">[{r.step}]</span>
                <span>{bn(r.items)} টি রেকর্ড প্রক্রিয়াধীন</span>
                <span className="text-mist-400">{r.dur}</span>
                <span className={r.ok ? "text-mint-400" : "text-rose-400"}>{r.ok ? "SUCCESS" : "RETRY"}</span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}
