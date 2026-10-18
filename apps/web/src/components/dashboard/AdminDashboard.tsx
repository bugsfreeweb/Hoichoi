"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardView, type DashModel, type DashRange, type ExtraTab } from "@hoichoi/dash";
import { TrafficAnalytics } from "@/components/admin/TrafficAnalytics";
import { StorageAnalytics } from "@/components/admin/StorageAnalytics";
import type { StorageSnapshot, TrafficSnapshot } from "@hoichoi/shared-types";

type Toast = { id: number; kind: "ok" | "err" | "info"; title: string; body: string };

const POLL_MS = 2500;
const RUN_TIMEOUT_MS = 120_000;

/**
 * Client shell around the shared {@link DashboardView}. The server page does the
 * initial DB read and hands down a fully-built model; this component owns the
 * interactive bits (range nav, live refresh, manual run) and keeps a local copy
 * of the snapshot so refresh/poll results paint immediately, without waiting on
 * a full route navigation.
 */
export function AdminDashboard({
  model,
  traffic,
  storage,
}: {
  model: DashModel;
  traffic: TrafficSnapshot | null;
  storage: StorageSnapshot | null;
}) {
  const router = useRouter();
  const [live, setLive] = useState<DashModel>(model);
  const [running, setRunning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const stopped = useRef(false);
  const toastId = useRef(0);

  useEffect(() => {
    stopped.current = false;
    return () => {
      stopped.current = true;
    };
  }, []);

  // Adopt every fresh server snapshot (range nav, router.refresh) as the base.
  useEffect(() => {
    setLive(model);
  }, [model]);

  const pushToast = useCallback((kind: Toast["kind"], title: string, body: string) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, kind, title, body }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const snapshot = useCallback(async (range: DashRange): Promise<DashModel | null> => {
    try {
      const res = await fetch(`/api/admin/dashboard?range=${range}`, { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; model?: DashModel };
      if (!res.ok || !data.model) return null;
      if (!stopped.current) setLive(data.model);
      return data.model;
    } catch {
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    const next = await snapshot(live.range);
    if (!stopped.current) {
      setRefreshing(false);
      if (next) pushToast("ok", "স্ন্যাপশট রিফ্রেশ হয়েছে", `${next.runs.length}টি সাম্প্রতিক রান · সব প্যানেল হালনাগাদ`);
      else pushToast("err", "রিফ্রেশ ব্যর্থ", "সার্ভার থেকে স্ন্যাপশট আনা যায়নি — আবার চেষ্টা করুন।");
    }
  }, [refreshing, snapshot, live.range, pushToast]);

  const latestRunId = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/admin/runs?limit=1", { cache: "no-store" });
      const data = (await res.json()) as { runs?: { id?: string }[] };
      return data.runs?.[0]?.id ?? null;
    } catch {
      return null;
    }
  }, []);

  const pollRun = useCallback(
    async (prevId: string | null, startedAt: number) => {
      if (stopped.current) return;
      if (Date.now() - startedAt > RUN_TIMEOUT_MS) {
        setRunning(false);
        void snapshot(live.range);
        pushToast("info", "সময় শেষ", "রান এখনো শেষ হয়নি — পরে আবার দেখুন।");
        return;
      }
      try {
        const res = await fetch("/api/admin/runs?limit=1", { cache: "no-store" });
        const data = (await res.json()) as { runs?: { id?: string; status?: string; error?: string | null }[] };
        const top = data.runs?.[0];
        if (stopped.current) return;
        const fresh = top?.id && top.id !== prevId;
        if (fresh && top?.status === "running") {
          window.setTimeout(() => void pollRun(prevId, startedAt), POLL_MS);
          return;
        }
        if (fresh && (top?.status === "completed" || top?.status === "failed")) {
          setRunning(false);
          await snapshot(live.range);
          if (top.status === "completed") {
            pushToast("ok", "পাইপলাইন সম্পন্ন", "নতুন রান সফলভাবে শেষ হয়েছে — কনটেন্ট সারি হালনাগাদ।");
          } else {
            pushToast("err", "পাইপলাইন ব্যর্থ", top.error ?? "রান ত্রুটির সাথে শেষ হয়েছে।");
          }
          return;
        }
        // Runner hasn't written a new row yet — keep waiting.
        window.setTimeout(() => void pollRun(prevId, startedAt), POLL_MS);
      } catch {
        window.setTimeout(() => void pollRun(prevId, startedAt), POLL_MS + 1000);
      }
    },
    [snapshot, live.range, pushToast],
  );

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    const prevId = await latestRunId();
    try {
      const res = await fetch("/api/admin/run-pipeline", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; local?: boolean; localFallback?: string };
        setRunning(false);
        if (data.local) {
          pushToast(
            "info",
            "রানার কনফিগার করা নেই",
            `সার্ভার-সাইড রানার নেই — লোকালি চালান: ${data.localFallback ?? "pnpm scrape"}`,
          );
        } else {
          pushToast("err", "রান শুরু করা যায়নি", data.error ?? `HTTP ${res.status}`);
        }
        return;
      }
      pushToast("info", "পাইপলাইন শুরু হয়েছে", "রান চলছে — শেষ হলে জানানো হবে।");
      void pollRun(prevId, Date.now());
    } catch (e) {
      setRunning(false);
      pushToast("err", "রান শুরু করা যায়নি", String(e));
    }
  }, [running, latestRunId, pollRun, pushToast]);

  const extraTabs: ExtraTab[] = [
    {
      id: "traffic",
      bn: "ট্রাফিক ও স্টোরেজ",
      en: "TRAFFIC & STORAGE",
      icon: "M3 3v18h18M7 15l4-4 3 3 5-6",
      content: (
        <div className="space-y-10">
          <TrafficAnalytics initial={traffic} />
          <div className="border-t border-white/10 pt-8">
            <StorageAnalytics initial={storage} />
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <DashboardView
        model={live}
        extraTabs={extraTabs}
        actions={{
          onNavigate: (target) => router.push(target),
          onRefresh: () => void refresh(),
          onRangeChange: (range: DashRange) => router.push(`/admin?range=${range}`),
          onRun: () => void run(),
          running,
        }}
      />

      <div className="pointer-events-none fixed top-4 right-4 z-[60] flex w-[min(360px,90vw)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl border p-3 shadow-lg backdrop-blur-md ${
              t.kind === "ok"
                ? "border-emerald-500/30 bg-emerald-500/10"
                : t.kind === "err"
                  ? "border-alizarin/40 bg-alizarin/10"
                  : "border-ink/20 bg-paper/95"
            }`}
          >
            <p className="bn text-[13px] font-bold text-ink">{t.title}</p>
            <p className="bn mt-0.5 text-[11.5px] leading-relaxed text-ink/70">{t.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}
