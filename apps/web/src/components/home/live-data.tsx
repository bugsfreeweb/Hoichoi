"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AnalyticsRange, AnalyticsSnapshot } from "@/lib/analytics-types";

type LiveData = {
  data: AnalyticsSnapshot | null; loading: boolean; error: string; paused: boolean;
  range: AnalyticsRange; age: number; refresh: () => void;
  setRange: (range: AnalyticsRange) => void; togglePaused: () => void;
};
const Context = createContext<LiveData | null>(null);
export const useLiveData = () => useContext(Context);

export function HomeLiveProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AnalyticsSnapshot | null>(null);
  const [range, setRange] = useState<AnalyticsRange>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paused, setPaused] = useState(false);
  const [trigger, setTrigger] = useState(0);
  const [receivedAt, setReceivedAt] = useState(0);
  const [now, setNow] = useState(0);
  const signature = useRef("");

  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    async function poll() {
      if (busy || document.hidden) return;
      busy = true; setLoading(true);
      const requestController = new AbortController();
      const cancel = () => requestController.abort();
      controller.signal.addEventListener("abort", cancel, { once: true });
      const timeout = setTimeout(cancel, 8000);
      try {
        const response = await fetch(`/api/stats?range=${range}`, { cache: "no-store", signal: requestController.signal });
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error || "সংযোগ পাওয়া যায়নি।");
        if (!controller.signal.aborted) { setData(payload); setReceivedAt(Date.now()); setNow(Date.now()); setError(""); }
      } catch (e) {
        if (!controller.signal.aborted) setError(requestController.signal.aborted ? "সার্ভার সময়মতো সাড়া দেয়নি। সর্বশেষ তথ্য পেতে আবার চেষ্টা করুন।" : e instanceof Error ? e.message : "সংযোগ পাওয়া যায়নি।");
      } finally {
        clearTimeout(timeout);
        controller.signal.removeEventListener("abort", cancel);
        busy = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    const key = `${range}:${trigger}`;
    if (signature.current !== key || !paused) { signature.current = key; void poll(); }
    const timer = !paused ? setInterval(() => void poll(), 10_000) : undefined;
    const visible = () => { if (!document.hidden && !paused) void poll(); };
    document.addEventListener("visibilitychange", visible);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [range, paused, trigger]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  return <Context.Provider value={{ data, range, setRange, loading, error, paused, age: receivedAt ? Math.max(0, Math.floor((now - receivedAt) / 1000)) : 0, refresh: () => setTrigger(v => v + 1), togglePaused: () => setPaused(v => !v) }}>{children}</Context.Provider>;
}