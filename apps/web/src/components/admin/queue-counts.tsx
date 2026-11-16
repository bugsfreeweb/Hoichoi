"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * Shared queue depths for the whole console shell.
 *
 * The sidebar's open-removal / reader-report / submission rows used to render a
 * literal "?" — the counts were never wired to anything, so the sidebar could not
 * tell an operator that work had arrived. The header bell needs the same numbers.
 *
 * Both read from one poll of `/api/admin/notifications` (a single COUNT query
 * per queue) rather than each counting for itself, so the sidebar badge and the
 * bell can never disagree with each other or with the queue page they link to.
 *
 * Polling pauses while the tab is hidden and refreshes immediately on return, so
 * a console left open overnight stops querying, and a tab you come back to does
 * not briefly show numbers from hours ago.
 */

export type QueueCounts = {
  pending_review: number;
  approved: number;
  published: number;
  removed: number;
  open_removals: number;
  open_reports: number;
  new_submissions: number;
  active_notices: number;
  pending_comments: number;
};

export type AlertItem = {
  id: string;
  kind: string;
  severity: "info" | "warn" | "critical";
  title_bn: string;
  body_bn: string | null;
  href: string | null;
  created_at: string;
  read_at: string | null;
};

type Payload =
  | { ok: true; counts: QueueCounts; urgent: UrgentItem[]; alerts?: AlertItem[]; unread?: number; at: string }
  | { ok: false; error: string };

export type UrgentItem = { key: string; href: string; count: number; label: string };

/** Poll cadence. Exported so the bell can label its own dropdown honestly. */
export const POLL_MS = 30_000;

const EMPTY: QueueCounts = {
  pending_review: 0,
  approved: 0,
  published: 0,
  removed: 0,
  open_removals: 0,
  open_reports: 0,
  new_submissions: 0,
  active_notices: 0,
  pending_comments: 0,
};

type Store = {
  counts: QueueCounts;
  urgent: UrgentItem[];
  /** Real events (provider cooldown, expiring credential, failed cron). */
  alerts: AlertItem[];
  unread: number;
  stale: boolean;
  refresh: () => void;
};

const QueueCountsContext = createContext<Store>({
  counts: EMPTY,
  urgent: [],
  alerts: [],
  unread: 0,
  stale: false,
  refresh: () => {},
});

export function useQueueCounts(): Store {
  return useContext(QueueCountsContext);
}

export function QueueCountsProvider({
  value,
  children,
}: {
  value: Store;
  children: React.ReactNode;
}) {
  return <QueueCountsContext.Provider value={value}>{children}</QueueCountsContext.Provider>;
}

/** Polling hook, mounted once by the shell. */
export function useQueueCountsPolling(): Store {
  const [counts, setCounts] = useState<QueueCounts>(EMPTY);
  const [urgent, setUrgent] = useState<UrgentItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [stale, setStale] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const res = await fetch("/api/admin/notifications", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Payload;
        if (cancelled) return;
        if (data.ok) {
          setCounts(data.counts);
          setUrgent(data.urgent);
          setAlerts(data.alerts ?? []);
          setUnread(data.unread ?? 0);
          setStale(false);
        } else {
          // Keep the last known numbers rather than blanking the badge: a failed
          // poll should mark the display stale, never make a busy queue look empty.
          setStale(true);
        }
      } catch {
        if (!cancelled) setStale(true);
      }
    };

    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    const onVisible = (): void => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [nonce]);

  return { counts, urgent, alerts, unread, stale, refresh: () => setNonce((n) => n + 1) };
}
