"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { RecentPipelineRun } from "@hoichoi/db";

function toBn(v: number | string): string {
  return String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);
}

function bnTime(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("bn-BD", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(d));
  } catch {
    return "—";
  }
}

type Msg = null | "ok" | "err" | "local" | "denied";

function runStats(r: RecentPipelineRun | null) {
  const s = (r?.stats ?? {}) as Record<string, unknown>;
  return {
    collected: Number(s.collected ?? s.scraped ?? 0),
    duplicates: Number(s.duplicatesBlocked ?? 0),
    published: Number(s.published ?? 0),
  };
}

/**
 * Manual pipeline trigger with a live progress bar for the dashboard.
 * POSTs `/api/admin/run-pipeline`, then polls `/api/admin/runs` every ~2.5s:
 * the runner inserts a `running` row on start and a `completed`/`failed` row
 * when done, so the web admin mirrors the desktop collector's live status.
 */
export function ManualRun({ initialRuns }: { initialRuns: RecentPipelineRun[] }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [runs, setRuns] = useState<RecentPipelineRun[]>(initialRuns);
  const [polling, setPolling] = useState(false);
  const stopped = useRef(false);
  const inFlight = useRef(false);

  useEffect(() => {
    stopped.current = false;
    return () => {
      stopped.current = true;
    };
  }, []);

  const latest = runs[0] ?? null;
  const running = Boolean(latest && polling && latest.status === "running");
  const lastDone = runs.find((r) => r.status !== "running") ?? null;
  const st = lastDone ? runStats(lastDone) : null;

  const load = async (): Promise<RecentPipelineRun[]> => {
    const res = await fetch("/api/admin/runs?limit=10", { cache: "no-store" });
    const data = (await res.json()) as { runs?: RecentPipelineRun[] };
    return data.runs ?? [];
  };

  const poll = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const next = await load();
      if (stopped.current) return;
      setRuns(next);
      const top = next[0];
      if (top && top.status === "running") {
        window.setTimeout(() => void poll(), 2500);
      } else {
        setPolling(false);
      }
    } catch {
      if (!stopped.current) window.setTimeout(() => void poll(), 3000);
    } finally {
      inFlight.current = false;
    }
  };

  const run = async () => {
    if (busy || running) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/run-pipeline", { method: "POST" });
      const data = (await res.json()) as { error?: string; local?: boolean };
      if (res.status === 401 || res.status === 403) return setMsg("denied");
      if (!res.ok) return setMsg(data?.local ? "local" : "err");
      setMsg("ok");
      setPolling(true);
      void poll();
    } catch {
      setMsg("err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5">
      <style>{`@keyframes hc-run-shimmer { from { transform: translateX(-100%); } to { transform: translateX(300%); } }`}</style>

      <button
        onClick={() => void run()}
        disabled={busy || running}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime py-3 text-[12.5px] font-bold text-night transition-all duration-300 hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {running ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            পাইপলাইন চলছে…
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
            এখনই ম্যানুয়াল রান করুন
          </>
        )}
      </button>

      {busy && !running && (
        <p className="mt-3 flex items-center gap-2 text-[11.5px] font-bold text-white/60">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime" /> ট্রিগার পাঠানো হচ্ছে…
        </p>
      )}

      {running && (
        <div className="mt-4">
          <div className="flex items-center justify-between font-mono-x text-[10px] text-white/50">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime" /> রান চলছে…
            </span>
            <span>লাইভ অগ্রগতি</span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full w-1/3 rounded-full bg-lime"
              style={{ animation: "hc-run-shimmer 1.4s linear infinite" }}
            />
          </div>
          <p className="mt-2 font-mono-x text-[10px] text-white/45">শুরু: {bnTime(latest?.started_at)}</p>
        </div>
      )}

      {!running && lastDone && (
        <p className="mt-3 text-[11.5px] font-bold text-white/75">
          <span className={lastDone.status === "failed" ? "text-rose-300" : "text-lime"}>
            {lastDone.status === "failed" ? "✕" : "✓"}
          </span>{" "}
          {bnTime(lastDone.started_at)} —{" "}
          {lastDone.status === "failed" && lastDone.error
            ? `রান ব্যর্থ: ${lastDone.error}`
            : `+${toBn(st?.published ?? 0)} প্রকাশিত · ${toBn(st?.duplicates ?? 0)} ডুপ্লিকেট ব্লক · ${toBn(st?.collected ?? 0)} সংগৃহীত`}
        </p>
      )}

      {!running && msg === "local" && (
        <div className="mt-3 rounded-lg border border-amber/40 bg-amber/10 p-3">
          <p className="text-[11.5px] leading-relaxed text-white/75">
            <span className="font-bold text-amber">রানার কনফিগার করা নেই।</span>{" "}
            ওয়েবসাইট থেকে GitHub-কে সরাসরি স্ক্র্যাপ চালাতে দুটি সার্ভার ভ্যারিয়েবল দরকার।
            না থাকলে লোকালি চালাতে হবে:{" "}
            <code className="rounded bg-white/10 px-1 font-mono-x text-[10px]">
              pnpm scrape
            </code>
          </p>
          <Link
            href="/admin/setup"
            className="mt-2 inline-block border border-amber/50 px-3 py-1.5 text-[11px] font-bold text-amber transition-colors hover:bg-amber hover:text-night"
          >
            কীভাবে সেট করবেন দেখুন →
          </Link>
        </div>
      )}
      {msg === "denied" && <p className="mt-3 text-[11.5px] font-bold text-rose-300">অনুমতি নেই — admin/editor প্রয়োজন।</p>}
      {msg === "err" && (
        <div className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/10 p-3">
          <p className="text-[11.5px] font-bold text-rose-300">✕ ট্রিগার ব্যর্থ।</p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/55">
            লগে বিস্তারিত দেখুন, অথবা GitHub → Actions → Pipeline cron-এ হাতে চাপ দিন।
          </p>
          <Link
            href="/admin/logs"
            className="mt-2 inline-block border border-white/20 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:border-white/40"
          >
            রান লগ দেখুন →
          </Link>
        </div>
      )}
    </div>
  );
}