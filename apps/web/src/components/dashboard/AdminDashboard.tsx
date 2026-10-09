"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardView, type DashModel, type DashRange } from "@hoichoi/dash";

/**
 * Client shell around the shared {@link DashboardView}. The server page does the
 * DB reads and hands down a fully-built model; this component only owns the
 * interactive bits (range nav, refresh, manual run) so the heavy data layer
 * stays on the server.
 */
export function AdminDashboard({ model }: { model: DashModel }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const inFlight = useRef(false);
  const stopped = useRef(false);

  useEffect(() => {
    stopped.current = false;
    return () => {
      stopped.current = true;
    };
  }, []);

  const poll = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch("/api/admin/runs?limit=1", { cache: "no-store" });
      const data = (await res.json()) as { runs?: { status?: string }[] };
      const top = data.runs?.[0];
      if (stopped.current) return;
      if (top && top.status === "running") {
        window.setTimeout(() => void poll(), 2500);
      } else {
        setRunning(false);
        router.refresh();
      }
    } catch {
      if (!stopped.current) window.setTimeout(() => void poll(), 3000);
    } finally {
      inFlight.current = false;
    }
  }, [router]);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    try {
      const res = await fetch("/api/admin/run-pipeline", { method: "POST" });
      if (!res.ok) {
        setRunning(false);
        return;
      }
      void poll();
    } catch {
      setRunning(false);
    }
  }, [running, poll]);

  return (
    <DashboardView
      model={model}
      actions={{
        onNavigate: (target) => router.push(target),
        onRefresh: () => router.refresh(),
        onRangeChange: (range: DashRange) => router.push(`/admin?range=${range}`),
        onRun: () => void run(),
        running,
      }}
    />
  );
}
