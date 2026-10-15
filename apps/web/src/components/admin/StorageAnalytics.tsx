"use client";

import { useCallback, useEffect, useState } from "react";
import { StorageView } from "@hoichoi/dash";
import type { StorageSnapshot } from "@hoichoi/shared-types";

/**
 * Web-admin wrapper around the shared {@link StorageView}: hydrated with a
 * server snapshot, then refreshed on an interval so the DB/media figure stays
 * live while the operator watches it.
 */
export function StorageAnalytics({ initial }: { initial: StorageSnapshot | null }) {
  const [data, setData] = useState<StorageSnapshot | null>(initial);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/storage", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) throw new Error("অনুমতি নেই");
      const json = (await res.json()) as StorageSnapshot & { ok?: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "লোড ব্যর্থ");
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "লোড ব্যর্থ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  return <StorageView data={data} loading={loading} error={err} />;
}
